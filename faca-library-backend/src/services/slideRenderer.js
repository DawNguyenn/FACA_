/**
 * slideRenderer.js - Render 1 slide cu the .pptx thanh anh PNG de hien thi trong web.
 *
 * VAN DE: khung <iframe> trong trang Tim kiem Slide bi DEN/TRONG. Nguyen nhan that su
 * KHONG phai duong dan local C:\... ma la link SharePoint tra ve HTTP 401 (can dang
 * nhap). Trinh duyet nhung cross-origin nen khong gui duoc cookie phien SharePoint ->
 * SharePoint tra 401 -> iframe den. Cach khuac phuc: render slide thanh ANH o may chu
 * (khong can quyen mang) roi hien thi bang <img> cung backend.
 *
 * Co che: dung PowerPoint COM (Office 16 da cai san tren may nay) xuat slide thanh PNG.
 * File .pptx phai ton tai local (OneDrive da tai ve) - cung dung dau moi doc noi dung slide.
 *
 * An toan: KHONG bao gio nhan duong dan tu client. Controller phai tra ve `fileId` lay tu
 * DB; ham nay kiem tra lai file do co that trong DB + duoi .pptx truoc khi render.
 */
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { execFile } = require('child_process');
const { promisify } = require('util');

const execFileAsync = promisify(execFile);

const CACHE_DIR = path.join(__dirname, '..', '..', 'tmp', 'slide-cache');
const RENDER_WIDTH = 1600;
const RENDER_HEIGHT = 900;
// PowerShell khoang 30-60s: mo file .pptx to + export + quit la mat thoi gian.
const RENDER_TIMEOUT_MS = 90_000;
// Giu anh lai 7 ngay roi xoa de thu muc cache khong phinh to.
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * PowerPoint COM khong chay song song: nhieu request cung luc se lam treo/khong an
 * PowerPoint. Giu mot hang doi (queue) de chi 1 lan mo file tai mot thoi diem.
 */
let queue = Promise.resolve();

/** Chay 1 tac vu theo thu tu; loi cua task truoc khong chan cac task sau. */
const enqueue = (task) => {
    const run = queue.then(task, task);
    queue = run.then(() => undefined, () => undefined);
    return run;
};

/**
 * Script PowerPoint xuat slide -> PNG.
 * Duong dan file duoc truyen qua FILE JSON (khong truyen tren command line) de khong
 * loi voi duong dan tieng Viet co dau / dau nhay.
 */
const buildScript = (jobFile) => `
$ErrorActionPreference = 'Stop'
$job = Get-Content -LiteralPath '${jobFile}' -Raw -Encoding UTF8 | ConvertFrom-Json
$ppt = $null
$pres = $null
try {
    $ppt = New-Object -ComObject PowerPoint.Application
    # ReadOnly=$true, Untitled=$false, WithWindow=$false -> mo khong hien cua so
    $pres = $ppt.Presentations.Open($job.FilePath, $true, $false, $false)
    $idx = [int]$job.SlideIndex
    if ($idx -lt 1 -or $idx -gt $pres.Slides.Count) {
        throw "Slide index $idx ngoai khoang 1..$($pres.Slides.Count)"
    }
    $pres.Slides.Item($idx).Export($job.OutPath, 'PNG', ${RENDER_WIDTH}, ${RENDER_HEIGHT})
    Write-Output "OK:$($pres.Slides.Count)"
} finally {
    if ($pres -ne $null) { $pres.Close() }
    if ($ppt -ne $null) { $ppt.Quit() }
    if ($ppt -ne $null) { [System.Runtime.InteropServices.Marshal]::ReleaseComObject($ppt) | Out-Null }
}
`;

/** Xoa anh cache cu (goi nhac - khong await, loi thi bo qua). */
const pruneCache = () => {
    try {
        const now = Date.now();
        for (const name of fs.readdirSync(CACHE_DIR)) {
            const full = path.join(CACHE_DIR, name);
            try {
                if (now - fs.statSync(full).mtimeMs > CACHE_TTL_MS) fs.unlinkSync(full);
            } catch { /* bo qua */ }
        }
    } catch { /* bo qua */ }
};


/**
 * Render 1 slide thanh PNG (co cache).
 * @param {string} filePath  Duong dan .pptx local - da duoc controller xac thuc la file trong DB.
 * @param {number} slideIndex Chi so slide 1-based.
 * @returns {Promise<{file:string; cached:boolean; totalSlides:number|null}>}
 */
const renderSlidePng = async (filePath, slideIndex) => {
    if (!filePath || !fs.existsSync(filePath)) {
        throw new Error('File .pptx khong ton tai tren may (OneDrive chua tai ve) - khong render duoc.');
    }
    if (!/\.pptx$/i.test(filePath)) {
        throw new Error('Chi ho tro file .pptx.');
    }

    const idx = Math.max(1, parseInt(slideIndex, 10) || 1);
    let stat;
    try {
        stat = fs.statSync(filePath);
    } catch {
        throw new Error('Khong doc duoc thong tin file .pptx.');
    }

    // Khoa cache theo duong dan + so slide + thoi gian sua file -> doi file thi anh doi theo.
    const key = crypto.createHash('sha1')
        .update(`${filePath}|${idx}|${stat.mtimeMs}|${stat.size}|${RENDER_WIDTH}x${RENDER_HEIGHT}`)
        .digest('hex');
    const outFile = path.join(CACHE_DIR, `${key}.png`);

    if (fs.existsSync(outFile) && fs.statSync(outFile).size > 0) {
        return { file: outFile, cached: true, totalSlides: null };
    }

    fs.mkdirSync(CACHE_DIR, { recursive: true });
    pruneCache();

    return enqueue(async () => {
        // Task truoc co the da render cung file -> check lai truoc khi lam lao.
        if (fs.existsSync(outFile) && fs.statSync(outFile).size > 0) {
            return { file: outFile, cached: true, totalSlides: null };
        }
        const jobFile = path.join(os.tmpdir(), `slide-job-${process.pid}-${key}.json`);
        const scriptFile = path.join(os.tmpdir(), `slide-job-${process.pid}-${key}.ps1`);
        fs.writeFileSync(jobFile, JSON.stringify({ FilePath: filePath, SlideIndex: idx, OutPath: outFile }), 'utf8');
        fs.writeFileSync(scriptFile, buildScript(jobFile), 'utf8');

        try {
            const { stdout } = await execFileAsync('powershell.exe', [
                '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass',
                '-File', scriptFile,
            ], { timeout: RENDER_TIMEOUT_MS, windowsHide: true, maxBuffer: 4 * 1024 * 1024 });

            if (!fs.existsSync(outFile) || fs.statSync(outFile).size === 0) {
                throw new Error('PowerPoint khong xuat duoc anh slide.');
            }
            const m = /OK:(\d+)/.exec(String(stdout || ''));
            return { file: outFile, cached: false, totalSlides: m ? parseInt(m[1], 10) : null };
        } finally {
            try { fs.unlinkSync(jobFile); } catch { /* bo qua */ }
            try { fs.unlinkSync(scriptFile); } catch { /* bo qua */ }
        }
    });
};

module.exports = { renderSlidePng, CACHE_DIR, RENDER_WIDTH, RENDER_HEIGHT };
