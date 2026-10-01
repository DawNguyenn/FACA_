const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { execFile } = require('child_process');
const { promisify } = require('util');

const execFileAsync = promisify(execFile);

const PDF_CACHE_DIR = path.join(__dirname, '..', '..', 'tmp', 'pdf-cache');
const CONVERT_TIMEOUT_MS = 180_000;
const PDF_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

let queue = Promise.resolve();

const enqueue = (task) => {
    const run = queue.then(task, task);
    queue = run.then(() => undefined, () => undefined);
    return run;
};

const pruneCache = () => {
    try {
        const now = Date.now();
        for (const name of fs.readdirSync(PDF_CACHE_DIR)) {
            const full = path.join(PDF_CACHE_DIR, name);
            try {
                if (now - fs.statSync(full).mtimeMs > PDF_CACHE_TTL_MS) fs.unlinkSync(full);
            } catch { /* bo qua */ }
        }
    } catch { /* bo qua */ }
};

/**
 * Script PowerPoint xuat ca file -> PDF (duong dan qua FILE JSON de khong loi
 * voi duong dan tieng Viet co dau / dau nhay).
 */
const buildPdfScript = (jobFile) => `
$ErrorActionPreference = 'Stop'
$job = Get-Content -LiteralPath '${jobFile}' -Raw -Encoding UTF8 | ConvertFrom-Json
$ppt = $null
$pres = $null
try {
    $ppt = New-Object -ComObject PowerPoint.Application
    $pres = $ppt.Presentations.Open($job.FilePath, $true, $false, $false)
    $pres.SaveAs($job.OutPath, 32)
    Write-Output "OK:$($pres.Slides.Count)"
} finally {
    if ($pres -ne $null) { $pres.Close() }
    if ($ppt -ne $null) { $ppt.Quit() }
}
`;

/** Convert bang PowerPoint COM (Windows + Office). */
const convertWithPowerPoint = async (filePath, outFile) => {
    const key = crypto.randomBytes(8).toString('hex');
    const jobFile = path.join(os.tmpdir(), `pdf-job-${process.pid}-${key}.json`);
    const scriptFile = path.join(os.tmpdir(), `pdf-job-${process.pid}-${key}.ps1`);
    fs.writeFileSync(jobFile, JSON.stringify({ FilePath: filePath, OutPath: outFile }), 'utf8');
    fs.writeFileSync(scriptFile, buildPdfScript(jobFile), 'utf8');
    try {
        const { stdout } = await execFileAsync('powershell.exe', [
            '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass',
            '-File', scriptFile,
        ], { timeout: CONVERT_TIMEOUT_MS, windowsHide: true, maxBuffer: 4 * 1024 * 1024 });
        if (!fs.existsSync(outFile) || fs.statSync(outFile).size === 0) {
            throw new Error('PowerPoint khong xuat duoc file PDF.');
        }
        const m = /OK:(\d+)/.exec(String(stdout || ''));
        return m ? parseInt(m[1], 10) : null;
    } finally {
        try { fs.unlinkSync(jobFile); } catch { /* bo qua */ }
        try { fs.unlinkSync(scriptFile); } catch { /* bo qua */ }
    }
};

/** Convert bang LibreOffice headless (soffice --headless --convert-to pdf). */
const convertWithLibreOffice = async (filePath, outFile) => {
    const outDir = path.dirname(outFile);
    await execFileAsync('soffice', [
        '--headless', '--nologo', '--nolockcheck',
        '--convert-to', 'pdf', '--outdir', outDir, filePath,
    ], { timeout: CONVERT_TIMEOUT_MS, maxBuffer: 8 * 1024 * 1024 });
    const base = path.basename(filePath, path.extname(filePath));
    const produced = path.join(outDir, `${base}.pdf`);
    if (produced !== outFile) {
        if (!fs.existsSync(produced) || fs.statSync(produced).size === 0) {
            throw new Error('LibreOffice khong xuat duoc file PDF.');
        }
        fs.renameSync(produced, outFile);
    }
    if (!fs.existsSync(outFile) || fs.statSync(outFile).size === 0) {
        throw new Error('LibreOffice khong xuat duoc file PDF.');
    }
    return null;
};

/**
 * Convert 1 file .pptx thanh PDF (co cache, queue chong chay song song).
 * @param {string} filePath Duong dan .pptx local - da duoc controller xac thuc.
 * @returns {Promise<{file:string; cached:boolean; pages:number|null}>}
 */
const convertPptxToPdf = async (filePath) => {
    if (!filePath || !fs.existsSync(filePath)) {
        throw new Error('File .pptx khong ton tai tren may (OneDrive chua tai ve).');
    }
    if (!/\.pptx$/i.test(filePath)) {
        throw new Error('Chi ho tro file .pptx.');
    }
    let stat;
    try {
        stat = fs.statSync(filePath);
    } catch {
        throw new Error('Khong doc duoc thong tin file .pptx.');
    }

    const key = crypto.createHash('sha1')
        .update(`${filePath}|${stat.mtimeMs}|${stat.size}|pdf`)
        .digest('hex');
    const outFile = path.join(PDF_CACHE_DIR, `${key}.pdf`);

    if (fs.existsSync(outFile) && fs.statSync(outFile).size > 0) {
        return { file: outFile, cached: true, pages: null };
    }

    fs.mkdirSync(PDF_CACHE_DIR, { recursive: true });
    pruneCache();

    return enqueue(async () => {
        if (fs.existsSync(outFile) && fs.statSync(outFile).size > 0) {
            return { file: outFile, cached: true, pages: null };
        }
        let pages = null;
        let lastErr = null;
        if (process.platform === 'win32') {
            try {
                pages = await convertWithPowerPoint(filePath, outFile);
            } catch (err) {
                lastErr = err;
            }
        }
        if (!fs.existsSync(outFile) || fs.statSync(outFile).size === 0) {
            try {
                pages = await convertWithLibreOffice(filePath, outFile);
            } catch (loErr) {
                const hint = process.platform === 'win32'
                    ? ' Cai LibreOffice (co soffice) hoac mo PowerPoint tren may chu.'
                    : ' Can cai LibreOffice (soffice) tren may chu.';
                throw new Error(`Khong convert duoc PDF (${(lastErr && lastErr.message) || loErr.message}).${hint}`);
            }
        }
        return { file: outFile, cached: false, pages };
    });
};

module.exports = { convertPptxToPdf, PDF_CACHE_DIR, CONVERT_TIMEOUT_MS };
