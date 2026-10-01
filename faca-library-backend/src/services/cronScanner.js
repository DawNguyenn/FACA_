/**
 * cronScanner.js - Cron quet tu dong chi muc slide .pptx (15 phut/lan).
 * Khong dung Graph Admin: doc file tu thu muc OneDrive local da sync.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFile } = require('child_process');
const cron = require('node-cron');
const { poolPromise, sql } = require('../config/db');
const scanner = require('./scannerService');
const { processAndIndexPPTX, ensureSlideIndexesTable } = require('./slideIndexer');

const CRON_EXPR = process.env.SLIDE_CRON || '*/15 * * * *';
const TEMP_DIR = path.join(os.tmpdir(), 'faca-pptx-index');
let running = false;
let scheduledTask = null;

// ============ OneDrive Files On-Demand (cloud-only placeholder) ============
// File chua tai ve may doc ra loi UNKNOWN/EIO (Windows tra ERROR_CLOUD_FILE_*).
// Cach xu ly: ghim "Always keep on this device" (attrib +P) roi CHO OneDrive tai ve.
const HYDRATE_ENABLED = String(process.env.SLIDE_HYDRATE ?? 'true').toLowerCase() !== 'false';
const HYDRATE_WAIT_MS = Math.max(0, parseInt(process.env.SLIDE_HYDRATE_WAIT_MS, 10) || 8000);
const HYDRATE_MAX_STRIKES = 2; // sau bao nhieu lan het thoi gian cho thi bo qua cac file sau (tiet kiem thoi gian quet)

/** Loi do file la cloud-only placeholder (chua tai ve may). */
const isCloudPlaceholderError = (e) => {
    const code = String(e && e.code || '');
    return code === 'UNKNOWN' || code === 'EIO' || code === 'EBUSY' || code === 'EPERM';
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Ghim file de OneDrive luon giu tren may (attrib +P) — tac nhan tai file ve. */
const pinForOffline = (fullPath) => new Promise((resolve) => {
    if (process.platform !== 'win32') return resolve(false);
    execFile('attrib', ['+P', fullPath], { windowsHide: true }, (err) => resolve(!err));
});

/** Xoa file tam - LUON goi trong finally de tranh day o cung. */
const cleanupTempFile = (p) => {
    try { if (p && fs.existsSync(p)) fs.unlinkSync(p); } catch { /* bo qua */ }
};

/**
 * Doc file .pptx thanh Buffer, tu dong xu ly OneDrive cloud-only placeholder:
 *  1) Doc truc tiep (nhanh nhat, file da co tren may).
 *  2) Loi cloud-only -> ghim +P (Always keep on this device) roi CHO OneDrive tai ve.
 *  3) Neu cho mai khong duoc (OneDrive khong chay / chua dang nhap) -> tra loi de
 *     bo qua file nay, khong lam hong ca luot quet.
 * @param {object} state trang thai dung chung 1 luot quet ({ strikes, unavailable })
 */
const readFileWithHydration = async (fullPath, state) => {
    try {
        return { buffer: fs.readFileSync(fullPath) };
    } catch (first) {
        if (!HYDRATE_ENABLED || state.unavailable || !isCloudPlaceholderError(first)) {
            return { error: first, cloudOnly: isCloudPlaceholderError(first) };
        }
        const fileName = path.basename(fullPath);
        const pinned = await pinForOffline(fullPath);
        const deadline = Date.now() + HYDRATE_WAIT_MS;
        while (Date.now() < deadline) {
            await sleep(1000);
            try {
                const buffer = fs.readFileSync(fullPath);
                console.log(`  ☁️ ➜ 💾 Da tai ve may: ${fileName}`);
                return { buffer };
            } catch { /* chua xong, cho tiep */ }
        }
        state.strikes += 1;
        if (state.strikes >= HYDRATE_MAX_STRIKES) {
            state.unavailable = true;
            console.warn(
                '  ⚠️  OneDrive khong tai file ve may (kiem tra OneDrive dang chay + da dang nhap). ' +
                `Bo qua ${HYDRATE_WAIT_MS}ms cho/file cho cac file cloud-only con lai.`
            );
        } else {
            console.warn(`  ⚠️  ${fileName}: chua tai ve may trong ${HYDRATE_WAIT_MS}ms (pinned=${pinned}).`);
        }
        return { error: first, cloudOnly: true };
    }
};

/** Copy file goc sang temp/ roi index (giu file goc an toan khi dang sync).
 *  FIX cloud-only placeholder: ghim +P va cho OneDrive tai ve truoc khi doc;
 *  file nao khong the tai ve -> bo qua + dem vao summary.offline, khong fail ca lot. */
const indexOneFileViaTemp = async (folder, file, prefix, mappings, state) => {
    if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });
    const read = await readFileWithHydration(file.fullPath, state);
    if (read.error) {
        return {
            ok: false,
            skipped: true,
            offline: !!read.cloudOnly,
            error: read.cloudOnly
                ? `OneDrive chua tai file ve may (cloud-only): ${read.error.message}`
                : read.error.message,
        };
    }
    let buffer = read.buffer;
    const safeName = `${Date.now()}-${Math.random().toString(36).slice(2)}-${file.fileName}`;
    const tempPath = path.join(TEMP_DIR, safeName);
    try {
        fs.writeFileSync(tempPath, buffer);
        buffer = null;
        const urls = scanner.buildDirectPowerPointUrls(file.fullPath, {
            folderPath: folder.folder_path, folderPrefix: prefix, mappings,
        });
        // Link nhung dung cho <iframe>: ?action=embedview (cho phep nhung),
        // con ?web=1 chi dung mo tab moi. Giu embedview + ghe &wdSlideIndex=N luc search.
        const base = String(urls.sharepointWebUrl || '').split('?')[0];
        const embedBase = base ? `${base}?action=embedview` : urls.sharepointWebUrl;
        const res = await processAndIndexPPTX(tempPath, {
            fileId: file.fullPath.slice(0, 255),
            fileName: file.fileName,
            sharePointEmbedUrl: embedBase,
        });
        return { ok: true, slides: res.slideCount };
    } catch (e) {
        return { ok: false, error: e.message };
    } finally {
        buffer = null;
        cleanupTempFile(tempPath);
    }
};

/** Chi index file MOI hoac DOI (so LastScannedAt voi mtime) - tu nang cap index. */
const needsIndexing = async (pool, fullPath, mtime) => {
    const r = await pool.request().input('fid', sql.NVarChar(255), String(fullPath).slice(0, 255))
        .query('SELECT MAX(LastScannedAt) AS t, COUNT(*) AS c FROM dbo.SlideIndexes WHERE FileId = @fid');
    const row = r.recordset[0] || {};
    if (!row.c) return true;
    if (!row.t || !mtime) return true;
    return new Date(mtime).getTime() > new Date(row.t).getTime();
};

/** 1 luot quet: SyncFolders active -> file .pptx moi/doi -> index -> don temp. */
const runSlideScanOnce = async () => {
    if (running) return { skipped: true };
    running = true;
    const summary = { total: 0, indexed: 0, skipped: 0, failed: 0, offline: 0, slides: 0, errors: [], files: [], offlineFiles: [], missingFolders: [] };
    try {
        const pool = await poolPromise;
        await ensureSlideIndexesTable(pool);
        await scanner.ensureSyncFoldersSeed(pool);
        const folders = (await pool.request().query(
            'SELECT folder_id, project_name, folder_path, sharepoint_url_prefix FROM dbo.SyncFolders WHERE is_active = 1 ORDER BY folder_id'
        )).recordset || [];
        const mappings = await scanner.loadPathMappings(pool);
        const state = { strikes: 0, unavailable: false };
        for (const folder of folders) {
            if (!folder.folder_path || !fs.existsSync(folder.folder_path)) {
                summary.missingFolders.push(folder.folder_path || folder.project_name);
                continue;
            }
            const prefix = scanner.resolveDirectPrefix(folder).prefix;
            const found = scanner.walkSlideFiles(folder.folder_path);
            const pptx = found.files.filter((f) => String(f.fileName).toLowerCase().endsWith('.pptx'));
            for (const file of pptx) {
                summary.total += 1;
                const entry = { file: file.fileName, status: 'pending' };
                summary.files.push(entry);
                try {
                    if (!(await needsIndexing(pool, file.fullPath, file.lastModified))) { summary.skipped += 1; entry.status = 'skipped'; continue; }
                    const r = await indexOneFileViaTemp(folder, file, prefix, mappings, state);
                    if (r.ok) { summary.indexed += 1; summary.slides += (r.slides || 0); entry.status = `indexed:${r.slides || 0}`; }
                    else if (r.skipped) {
                        summary.skipped += 1;
                        entry.status = r.offline ? 'offline' : 'skipped';
                        if (r.offline) { summary.offline += 1; summary.offlineFiles.push(file.fileName); }
                        else summary.errors.push(`${file.fileName}: ${r.error}`);
                    } else { summary.failed += 1; entry.status = 'failed'; summary.errors.push(`${file.fileName}: ${r.error}`); }
                } catch (e) {
                    summary.failed += 1;
                    entry.status = 'failed';
                    summary.errors.push(`${file.fileName}: ${e.message}`);
                }
            }
        }
        try {
            if (fs.existsSync(TEMP_DIR)) {
                for (const n of fs.readdirSync(TEMP_DIR)) cleanupTempFile(path.join(TEMP_DIR, n));
            }
        } catch { /* bo qua */ }
        console.log(
            `Slide scan: ${summary.indexed} indexed / ${summary.total} files ` +
            `(skip ${summary.skipped}, offline ${summary.offline}, fail ${summary.failed}, ${summary.slides} slide moi)`
        );
        if (summary.offlineFiles.length) {
            console.warn(`  ⚠️  ${summary.offlineFiles.length} file chua tai ve may (OneDrive cloud-only) — se thu lai o luot quet sau.`);
        }
        if (summary.missingFolders.length) {
            console.warn(`  ⚠️  ${summary.missingFolders.length} thu muc trong SyncFolders khong ton tai tren may.`);
        }
        return summary;
    } finally {
        running = false;
    }
};

/** Lap lich chay dinh ky. Tra ve task de test co the stop(). */
const startSlideCron = () => {
    if (scheduledTask) return scheduledTask;
    if (!cron.validate(CRON_EXPR)) {
        console.warn(`  SLIDE_CRON khong hop le: ${CRON_EXPR}`);
        return null;
    }
    scheduledTask = cron.schedule(CRON_EXPR, () => {
        runSlideScanOnce().catch((e) => console.error('Slide cron loi:', e.message));
    });
    console.log(`Da lap lich slide-index: "${CRON_EXPR}"`);
    return scheduledTask;
};

module.exports = {
    runSlideScanOnce,
    startSlideCron,
    cleanupTempFile,
    readFileWithHydration,
    isCloudPlaceholderError,
    CRON_EXPR,
    HYDRATE_ENABLED,
    HYDRATE_WAIT_MS,
};