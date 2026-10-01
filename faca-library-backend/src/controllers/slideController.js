/**
 * slideController.js - API tim kiem slide theo tu khoa.
 * GET /api/slides/search?keyword=...
 *
 * Tim 2 tang de luon co ket qua huu ich:
 *  1) Tang SLIDE : khop noi dung tung slide trong dbo.SlideIndexes (chi index duoc file
 *                  da tai ve may - OneDrive cloud-only khong doc duoc noi dung).
 *  2) Tang FILE  : khop TEN FILE / duong dan trong dbo.PresentationReports (moi file .pptx
 *                  deu co, ke ca file chua tai ve may) -> van mo duoc tren PowerPoint Online.
 *
 * Cung 1 file co the nam o NHIEU goc SyncFolders (OneDrive goc con cloud-only + ban sao tai
 * ve thu muc local "mirror") nen ket qua duoc khu trung theo TEN FILE, uu tien ban co noi dung slide.
 */
const { poolPromise, sql } = require('../config/db');
const { ensureSlideIndexesTable } = require('../services/slideIndexer');
const { renderSlidePng } = require('../services/slideRenderer');
const fs = require('fs');
const path = require('path');
const { convertPptxToPdf } = require('../services/pdfConverter');

/**
 * Giai ma fileId tu query (dung chung cho /file va /pdf):
 * Express da decode 1 lan nhung dau `+` van la space — chuan hoa + decode lap.
 */
const decodeFileId = (rawId) => {
    let fileId = String(rawId || '').replace(/\+/g, ' ');
    try { fileId = decodeURIComponent(fileId); } catch { /* giu nguyen */ }
    try { fileId = decodeURIComponent(fileId); } catch { /* toi da 2 lan */ }
    return fileId.replace(/\+/g, ' ').trim();
};

/**
 * Kiem tra fileId co that trong dbo.PresentationReports khong.
 * Tra ve { fileName, fullPath } hoac null.
 */
const findLibraryFile = async (fileId) => {
    const pool = await poolPromise;
    const check = await pool.request()
        .input('fileId', sql.NVarChar(1000), String(fileId || '').slice(0, 1000))
        .query('SELECT TOP 1 file_name, full_local_path FROM dbo.PresentationReports WHERE full_local_path = @fileId');
    const row = check.recordset && check.recordset[0];
    if (!row) return null;
    return { fileName: row.file_name, fullPath: String(row.full_local_path || '') };
};

/** Escape ky tu dai dien cua LIKE de chong SQL injection (dung cho ca 2 tang). */
const escapeLike = (keyword) => String(keyword || '').replace(/([[%_\\])/g, '\\$1');

/** Ghe them wdSlideIndex=N de iframe nhay dung slide (danh tu 1). */
const appendSlideIndex = (baseUrl, slideIndex) => {
    const base = String(baseUrl || '');
    if (!base) return '';
    const noDup = base.replace(/([?&])wdSlideIndex=\d+/gi, '$1').replace(/[?&]$/, '');
    const sep = noDup.includes('?') ? '&' : '?';
    return `${noDup}${sep}wdSlideIndex=${Number(slideIndex) || 1}`;
};

/**
 * Doi link SharePoint "?web=1" / "action=embedview" sang dung dinh dang EMBED VIEWER.
 * Day la ham CHONG "Save As": chi duy nhat action=embedview + wdSlideIndex moi
 * mo trinh xem online tren trinh duyet thay vi tai file ve may.
 *   https://<tenant>.sharepoint.com/.../Doc.aspx?sourcedoc={GUID}&action=embedview&wdSlideIndex=N
 * - bo moi tham so ? / & cuoi cung de khong sinh "?&"
 * - giu nguyen GUID/neu path, chi chuan hoa action + wdSlideIndex
 */
const toEmbedUrl = (webUrl, slideIndex) => {
    const raw = String(webUrl || '').trim();
    if (!raw) return '';
    // 1) Cat phan query -> chi lay duong dan goc den file .pptx
    const base = raw.split('?')[0].split('#')[0];
    if (!base) return '';
    // 2) Chuan hoa action ve dang embedview (bo moi action/action=... cu)
    const embed = `${base}?action=embedview`;
    // 3) Luon kem wdSlideIndex (1-based) -> trinh duyet nhay dung slide
    return appendSlideIndex(embed, slideIndex);
};

/**
 * URL xem online qua dich vu cong cong cua Microsoft (Office Online Viewer).
 * Chi hoat dong voi file PUBLIC tren Internet (http/https) - dung khi tao
 * file o che do "Anyone with the link" tren SharePoint/OneDrive.
 *   https://view.officeapps.live.com/op/embed.aspx?src={ENCODED_URL}
 * Tra ve chuoi rong khi khong co URL http(s) hop le.
 *
 * FIX man hinh den: ban cu tinh `sep` tu chuoi `src` DA encode (khong bao gio
 * chua '?') nen luon tra ve '?wdSlideIndex=' -> URL cuoi thanh
 * `...embed.aspx?src=...?wdSlideIndex=` (2 dau '?') -> Office tra man den.
 * Ban moi luon dung '&' vi embed.aspx da co san '?src='.
 */
const toOfficeViewerUrl = (webUrl, slideIndex) => {
    const base = String(webUrl || '').split('?')[0].split('#')[0];
    if (!/^https?:\/\//i.test(base)) return '';
    const src = encodeURIComponent(base);
    return `https://view.officeapps.live.com/op/embed.aspx?src=${src}`;
};

/** Cat doan snippet quanh tu khoa (toi da 220 ky tu). */
const buildSnippet = (text, keyword, maxLen = 220) => {
    const t = String(text || '');
    if (!keyword) return t.slice(0, maxLen);
    const idx = t.toLowerCase().indexOf(String(keyword).toLowerCase());
    if (idx < 0) return t.slice(0, maxLen);
    const start = Math.max(0, idx - 60);
    const cut = t.slice(start, start + maxLen);
    return (start > 0 ? '...' : '') + cut + (start + maxLen < t.length ? '...' : '');
};

/** Tang 1: tim theo NOI DUNG slide (dbo.SlideIndexes). */
const searchSlideRows = async (pool, keyword, top) => {
    const result = await pool.request()
        .input('Keyword', sql.NVarChar(200), `%${escapeLike(keyword)}%`)
        .input('Top', sql.Int, top)
        .query(`
            SELECT TOP (@Top)
                si.FileId, si.FileName, si.SharePointEmbedUrl, si.SlideIndex, si.SlideText,
                pr.category_code, pr.sharepoint_web_url, pr.powerpoint_app_url, si.FileId AS file_path
            FROM dbo.SlideIndexes si
            LEFT JOIN dbo.PresentationReports pr ON pr.full_local_path = si.FileId
            WHERE si.SlideIndex > 0
              AND si.SlideText COLLATE Latin1_General_CI_AI LIKE @Keyword ESCAPE '\\'
            ORDER BY si.FileName, si.SlideIndex;
        `);
    return (result.recordset || []).map((r) => ({
        type: 'slide',
        fileId: r.FileId,
        fileName: r.FileName,
        slideIndex: r.SlideIndex,
        snippet: buildSnippet(r.SlideText, keyword),
        // Embed Viewer chuan cua SharePoint: ?action=embedview&wdSlideIndex=N
        embedUrl: toEmbedUrl(r.SharePointEmbedUrl, r.SlideIndex),
        // Backup: dich vu cong cong cua Microsoft (can file public)
        officeViewerUrl: toOfficeViewerUrl(r.sharepoint_web_url, r.SlideIndex),
        webUrl: r.sharepoint_web_url || null,
        appUrl: r.powerpoint_app_url || null,
        // Duong dan luu tren may (hien thi o thanh header cua khung xem)
        filePath: r.file_path || r.FileId || null,
        categoryCode: r.category_code || null,
        contentIndexed: true,
    }));
};

/** Tang 2: tim theo TEN FILE / duong dan (gom ca file OneDrive chua tai ve may). */
const searchFileRows = async (pool, keyword, top) => {
    const result = await pool.request()
        .input('Keyword', sql.NVarChar(200), `%${escapeLike(keyword)}%`)
        .input('Top', sql.Int, top)
        .query(`
            SELECT TOP (@Top)
                pr.report_id, pr.file_name, pr.full_local_path, pr.relative_path,
            pr.full_local_path AS file_path,
                pr.sharepoint_web_url, pr.powerpoint_app_url, pr.category_code,
                pr.file_size_mb, pr.last_modified,
                CASE WHEN EXISTS (
                        SELECT 1 FROM dbo.SlideIndexes si
                        WHERE si.FileId = pr.full_local_path AND si.SlideIndex > 0
                     ) THEN 1 ELSE 0 END AS is_indexed
            FROM dbo.PresentationReports pr
            WHERE pr.file_name COLLATE Latin1_General_CI_AI LIKE @Keyword ESCAPE '\\'
               OR pr.relative_path COLLATE Latin1_General_CI_AI LIKE @Keyword ESCAPE '\\'
               -- Ten file dung '_' thay cho dau cach (Lens_Blur_Report) nen doi '_' -> ' '
               -- truoc khi so khop de go "lens blur" van tim thay.
               OR REPLACE(pr.file_name, '_', ' ') COLLATE Latin1_General_CI_AI LIKE @Keyword ESCAPE '\\'
               OR REPLACE(pr.relative_path, '_', ' ') COLLATE Latin1_General_CI_AI LIKE @Keyword ESCAPE '\\'
            ORDER BY pr.file_name;
        `);
    return (result.recordset || []).map((r) => ({
        type: 'file',
        fileId: r.full_local_path,
        fileName: r.file_name,
        relativePath: r.relative_path,
        slideIndex: null,
        snippet: r.relative_path || '',
        // File chua co slide duoc index -> mac dinh slide 1 de embed URL luon hop le
        // (truoc day nhanh bi bo qua wdSlideIndex -> trinh duyet co the tai file ve may).
        embedUrl: toEmbedUrl(r.sharepoint_web_url, 1),
        officeViewerUrl: toOfficeViewerUrl(r.sharepoint_web_url, 1),
        webUrl: r.sharepoint_web_url || null,
        appUrl: r.powerpoint_app_url || null,
        filePath: r.file_path || r.full_local_path || null,
        categoryCode: r.category_code || null,
        fileSizeMb: r.file_size_mb ?? null,
        lastModified: r.last_modified || null,
        contentIndexed: !!r.is_indexed,
    }));
};

/** Thong ke do phu cua chi muc (hien banner canh bao tren UI). */
const loadIndexStats = async (pool) => {
    const r = await pool.request().query(`
        SELECT
            -- Dem theo TEN FILE (khong dem theo dong): cung 1 file co the duoc khai bao o
            -- nhieu goc SyncFolders (OneDrive goc + thu muc mirror) -> tranh dem trung.
            (SELECT COUNT(DISTINCT file_name) FROM dbo.PresentationReports) AS totalFiles,
            (SELECT COUNT(DISTINCT FileName) FROM dbo.SlideIndexes WHERE SlideIndex > 0) AS indexedFiles,
            (SELECT COUNT(*) FROM dbo.SlideIndexes WHERE SlideIndex > 0) AS indexedSlides,
            (SELECT MAX(LastScannedAt) FROM dbo.SlideIndexes) AS lastScan;
    `);
    const row = r.recordset[0] || {};
    const totalFiles = row.totalFiles || 0;
    const indexedFiles = row.indexedFiles || 0;
    return {
        totalFiles,
        indexedFiles,
        indexedSlides: row.indexedSlides || 0,
        pendingFiles: Math.max(0, totalFiles - indexedFiles),
        lastScan: row.lastScan || null,
    };
};

const searchSlides = async (req, res) => {
    try {
        const keyword = String(req.query.keyword || '').trim();
        if (!keyword) return res.status(400).json({ success: false, message: 'Thieu keyword.' });
        if (keyword.length > 200) return res.status(400).json({ success: false, message: 'Keyword qua dai.' });

        const pool = await poolPromise;
        await ensureSlideIndexesTable(pool);
        const top = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 200);
        // includeFiles=0 -> chi tim theo noi dung slide (mac dinh 1: gom ca khop ten file)
        const includeFiles = String(req.query.includeFiles ?? '1') !== '0';

        const slides = await searchSlideRows(pool, keyword, top);
        let files = [];
        if (includeFiles) {
            // Cung 1 file co the khop o NHIEU goc (OneDrive cloud-only + ban sao trong thu muc
            // mirror) va o ca 2 tang -> khu trung theo TEN FILE, uu tien ket qua co noi dung slide.
            // Chuan hoa NFC truoc khi so sanh: ten file tieng Viet co the o dang NFC/NFD khac nhau.
            const normName = (v) => String(v || '').normalize('NFC').toLowerCase();
            const seenIds = new Set(slides.map((s) => String(s.fileId || '').toLowerCase()));
            const seenNames = new Set(slides.map((s) => normName(s.fileName)));
            files = (await searchFileRows(pool, keyword, top)).filter((f) => {
                const id = String(f.fileId || '').toLowerCase();
                const name = normName(f.fileName);
                if (seenIds.has(id) || seenNames.has(name)) return false;
                seenIds.add(id);
                seenNames.add(name);
                return true;
            });
        }
        const stats = await loadIndexStats(pool);
        return res.json({
            success: true,
            keyword,
            count: slides.length + files.length,
            slideCount: slides.length,
            fileCount: files.length,
            stats,
            // Con file chua tai ve may thi chi tim duoc theo TEN FILE -> nhac nguoi dung
            note: stats.pendingFiles > 0
                ? `Con ${stats.pendingFiles}/${stats.totalFiles} file chua tai ve may nen chi tim duoc theo TEN FILE (chua co noi dung slide).`
                : null,
            data: [...slides, ...files],
        });
    } catch (error) {
        console.error('Loi search slide:', error);
        return res.status(500).json({ success: false, message: 'Loi he thong khi tim slide.', error: error.message });
    }
};

/**
 * GET /api/slides/image?fileId=<duong dan local>&slideIndex=N
 *
 * Tra ve ANH PNG cua 1 slide de hien thi trong web (khu vuc den cua iframe SharePoint).
 * - `fileId` la DUONG DAN LOCAL cua file .pptx lay tu DB (frontend khong tu nhap gi).
 *   Server LUON kiem tra lai duong dan nay co that trong dbo.PresentationReports
 *   -> chong doc file ngoai thu vien.
 * - Token nhan qua query `?token=` vi the <img src> khong gui duoc header Authorization.
 *   Route nay da qua authMiddleware (hoac qua kiem tra token noi bo o day).
 */
const getSlideImage = async (req, res) => {
    try {
        const fileId = String(req.query.fileId || '').trim();
        const slideIndex = Math.max(1, parseInt(req.query.slideIndex, 10) || 1);
        if (!fileId) return res.status(400).json({ success: false, message: 'Thieu fileId.' });

        const pool = await poolPromise;
        // Bat buoc: chi render file da duoc quet vao DB -> khong lo doc file bat ky.
        const check = await pool.request()
            .input('fileId', sql.NVarChar(255), fileId.slice(0, 255))
            .query('SELECT TOP 1 full_local_path FROM dbo.PresentationReports WHERE full_local_path = @fileId');
        const row = check.recordset && check.recordset[0];
        if (!row) {
            return res.status(404).json({ success: false, message: 'Khong tim thay file trong thu vien.' });
        }

        const out = await renderSlidePng(row.full_local_path, slideIndex);
        // res.sendFile tu dong nem loi 404/500 -> chi can set header roi tra file.
        res.setHeader('Content-Type', 'image/png');
        res.setHeader('Cache-Control', 'private, max-age=86400');
        return res.sendFile(out.file, (err) => {
            if (err) console.error('Loi gui anh slide:', err.message);
        });
    } catch (error) {
        console.error('Loi render slide:', error);
        // Khong tra nguyen loi PowerShell cho client (nhieu dong, lo thong tin may).
        // Lay dung thong diep de nguoi dung hieu vi sao khong xem duoc.
        const raw = String(error && error.message ? error.message : '');
        let friendly = 'Khong render duoc anh slide.';
        if (/ngoai khoang 1\.\./i.test(raw)) {
            friendly = 'Slide nay khong ton tai trong file (chi so vuot qua so slide thuc te).';
        } else if (/khong ton tai tren may|OneDrive chua tai ve/i.test(raw)) {
            friendly = 'File .pptx chua duoc tai ve may (OneDrive cloud-only) - hay tai ve file roi quet lai chi muc.';
        } else if (/Chi ho tro file/i.test(raw)) {
            friendly = 'Chi ho tro file .pptx.';
        } else if (/PowerPoint khong xuat duoc/i.test(raw)) {
            friendly = 'PowerPoint khong xuat duoc anh slide. Hay thu lai hoac mo file bang PowerPoint de kiem tra.';
        }
        return res.status(500).json({ success: false, message: friendly });
    }
};

/**
 * GET /api/slides/file?fileId=<duong dan local>&token=...
 * Stream file .pptx goc ve trinh duyet de xem INLINE (khong tai xuong).
 *
 * FIX loi "man hinh den + tu dong tai file":
 *  - Header bat buoc la `Content-Disposition: inline` (khong phai `attachment`)
 *    + `Content-Type: application/vnd.openxmlformats-officedocument.presentationml.presentation`
 *    thi trinh duyet / Office Online moi hien thi truc tiep thay vi download.
 *  - Chi stream file da co trong dbo.PresentationReports (chong doc file ngoai thu vien).
 *  - Ho tro Range request de Office Online Viewer co the doc tung phan file lon.
 * FIX ERR_INVALID_RESPONSE khi bam "Mo tab moi":
 *  - `req.query.fileId` chua duong dan tieng Viet co dau / khoang trang / dau `+`
 *    da duoc Express decode 1 lan; ham nay chuan hoa dau `+` thanh space va decode
 *    them truoc khi so sanh voi DB (tranh lech + decode URI failure).
 *  - Tra loi JSON co Content-Type ro rang cho moi nhanh loi (400/404/416/500)
 *    thay vi de Express dong ket noi dot ngot.
 *  - Gan `error` handler cho moi read stream (ca full + range) de khong bao gio
 *    nem Unhandled Exception lam sap response giua chung.
 */
const streamSlideFile = async (req, res) => {
    try {
        const rawId = String(req.query.fileId || '').trim();
        if (!rawId) {
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            return res.status(400).json({ success: false, message: 'Thieu tham so fileId.' });
        }

        // Decode dung chuan (Express da decode 1 lan, dau `+` van la space).
        const fileId = decodeFileId(rawId);

        let found;
        try {
            found = await findLibraryFile(fileId);
        } catch (dbErr) {
            console.error('API /api/slides/file: loi ket noi DB:', dbErr && dbErr.message);
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            if (!res.headersSent) return res.status(500).json({ success: false, message: 'Loi ket noi may chu du lieu.' });
            return undefined;
        }
        if (!found) {
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            return res.status(404).json({ success: false, message: 'Khong tim thay tep tin yeu cau.' });
        }
        const row = { file_name: found.fileName, full_local_path: found.fullPath };

        const absPath = String(row.full_local_path || '');
        if (!/\.pptx$/i.test(absPath) || !fs.existsSync(absPath)) {
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            return res.status(404).json({ success: false, message: 'File .pptx chua duoc tai ve may (OneDrive cloud-only).' });
        }

        let stat;
        try {
            stat = fs.statSync(absPath);
        } catch (statErr) {
            console.error('API /api/slides/file: khong doc duoc file:', statErr && statErr.message);
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            return res.status(500).json({ success: false, message: 'Loi trong qua trinh doc file.' });
        }
        const total = stat.size;
        // Lam sach ten file cho header: bo dau nhay + ky tu dieu khien (tranh vo header).
        const rawName = String(row.file_name || path.basename(absPath) || 'presentation.pptx').replace(/["\r\n]/g, '').trim() || 'presentation.pptx';
        const encodedName = encodeURIComponent(rawName);

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
        res.setHeader('Content-Disposition', `inline; filename="presentation.pptx"; filename*=UTF-8''${encodedName}`);
        res.setHeader('Accept-Ranges', 'bytes');
        res.setHeader('Cache-Control', 'private, max-age=3600');
        // Cho phep Office Online (cross-origin iframe) doc duoc noi dung khi can.
        res.setHeader('Access-Control-Allow-Origin', '*');

        // Pipe an toan: stream loi giua chung thi ket thuc response sach se,
        // khong bao gio de socket treo gay ERR_INVALID_RESPONSE.
        const pipeSafe = (stream) => {
            stream.on('error', (streamErr) => {
                console.error('API /api/slides/file Stream Error:', streamErr && streamErr.message);
                try {
                    if (!res.headersSent) {
                        res.setHeader('Content-Type', 'application/json; charset=utf-8');
                        res.status(500).json({ success: false, message: 'Loi trong qua trinh doc file.' });
                    } else {
                        res.end();
                    }
                } catch { /* bo qua loi dong response */ }
            });
            return stream.pipe(res);
        };

        const range = String(req.headers.range || '');
        if (range) {
            const m = /bytes=(\d*)-(\d*)/.exec(range);
            let start = m && m[1] ? parseInt(m[1], 10) : 0;
            let end = m && m[2] ? parseInt(m[2], 10) : total - 1;
            if (Number.isNaN(start) || start < 0) start = 0;
            if (Number.isNaN(end) || end >= total) end = total - 1;
            if (start > end) {
                res.setHeader('Content-Type', 'application/json; charset=utf-8');
                res.setHeader('Content-Range', `bytes */${total}`);
                return res.status(416).json({ success: false, message: 'Yeu cau pham vi du lieu khong hop le.' });
            }
            res.status(206);
            res.setHeader('Content-Range', `bytes ${start}-${end}/${total}`);
            res.setHeader('Content-Length', String(end - start + 1));
            return pipeSafe(fs.createReadStream(absPath, { start, end }));
        }

        res.setHeader('Content-Length', String(total));
        return pipeSafe(fs.createReadStream(absPath));
    } catch (error) {
        console.error('API /api/slides/file Error:', error && error.message);
        try {
            if (!res.headersSent) {
                res.setHeader('Content-Type', 'application/json; charset=utf-8');
                return res.status(500).json({ success: false, message: 'Loi may chu noi bo.' });
            }
            return res.end();
        } catch { return undefined; }
    }
};

/**
 * GET /api/slides/pdf?fileId=<duong dan local>&token=...
 * Convert .pptx -> .pdf (LibreOffice headless `soffice --headless --convert-to pdf`,
 * fallback PowerPoint COM tren Windows) roi serve PDF INLINE de frontend hien thi
 * + tim kiem text trong trinh duyet qua pdfjs-dist.
 *
 * Header: Content-Type: application/pdf + Content-Disposition: inline.
 * Co che bao mat + giai ma fileId + stream an toan giong /file.
 */
const streamSlidePdf = async (req, res) => {
    try {
        const rawId = String(req.query.fileId || '').trim();
        if (!rawId) {
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            return res.status(400).json({ success: false, message: 'Thieu tham so fileId.' });
        }
        const fileId = decodeFileId(rawId);

        let found;
        try {
            found = await findLibraryFile(fileId);
        } catch (dbErr) {
            console.error('API /api/slides/pdf: loi ket noi DB:', dbErr && dbErr.message);
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            if (!res.headersSent) return res.status(500).json({ success: false, message: 'Loi ket noi may chu du lieu.' });
            return undefined;
        }
        if (!found) {
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            return res.status(404).json({ success: false, message: 'Khong tim thay tep tin yeu cau.' });
        }

        let pdf;
        try {
            pdf = await convertPptxToPdf(found.fullPath);
        } catch (convErr) {
            console.error('API /api/slides/pdf: loi convert:', convErr && convErr.message);
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            const msg = String((convErr && convErr.message) || '');
            const status = /khong ton tai|OneDrive/i.test(msg) ? 404 : 500;
            return res.status(status).json({ success: false, message: msg || 'Khong convert duoc PDF.' });
        }

        const pdfPath = pdf.file;
        let stat;
        try {
            stat = fs.statSync(pdfPath);
        } catch (statErr) {
            console.error('API /api/slides/pdf: khong doc duoc PDF:', statErr && statErr.message);
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            return res.status(500).json({ success: false, message: 'Loi trong qua trinh doc file PDF.' });
        }

        const baseName = String(found.fileName || 'presentation.pptx').replace(/\.pptx$/i, '').replace(/["\r\n]/g, '').trim() || 'presentation';
        const encodedName = encodeURIComponent(`${baseName}.pdf`);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="presentation.pdf"; filename*=UTF-8''${encodedName}`);
        res.setHeader('Accept-Ranges', 'bytes');
        res.setHeader('Cache-Control', 'private, max-age=3600');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('X-Pdf-Cached', pdf.cached ? '1' : '0');
        if (pdf.pages != null) res.setHeader('X-Pdf-Pages', String(pdf.pages));

        const stream = fs.createReadStream(pdfPath);
        stream.on('error', (streamErr) => {
            console.error('API /api/slides/pdf Stream Error:', streamErr && streamErr.message);
            try {
                if (!res.headersSent) {
                    res.setHeader('Content-Type', 'application/json; charset=utf-8');
                    res.status(500).json({ success: false, message: 'Loi trong qua trinh doc file PDF.' });
                } else {
                    res.end();
                }
            } catch { /* bo qua */ }
        });

        const range = String(req.headers.range || '');
        if (range) {
            const total = stat.size;
            const m = /bytes=(\d*)-(\d*)/.exec(range);
            let start = m && m[1] ? parseInt(m[1], 10) : 0;
            let end = m && m[2] ? parseInt(m[2], 10) : total - 1;
            if (Number.isNaN(start) || start < 0) start = 0;
            if (Number.isNaN(end) || end >= total) end = total - 1;
            if (start > end) {
                res.setHeader('Content-Type', 'application/json; charset=utf-8');
                res.setHeader('Content-Range', `bytes */${total}`);
                return res.status(416).json({ success: false, message: 'Yeu cau pham vi du lieu khong hop le.' });
            }
            res.status(206);
            res.setHeader('Content-Range', `bytes ${start}-${end}/${total}`);
            res.setHeader('Content-Length', String(end - start + 1));
            return fs.createReadStream(pdfPath, { start, end }).pipe(res);
        }

        res.setHeader('Content-Length', String(stat.size));
        return stream.pipe(res);
    } catch (error) {
        console.error('API /api/slides/pdf Error:', error && error.message);
        try {
            if (!res.headersSent) {
                res.setHeader('Content-Type', 'application/json; charset=utf-8');
                return res.status(500).json({ success: false, message: 'Loi may chu noi bo.' });
            }
            return res.end();
        } catch { return undefined; }
    }
};

module.exports = { searchSlides, getSlideImage, streamSlideFile, streamSlidePdf, appendSlideIndex, buildSnippet, toEmbedUrl, toOfficeViewerUrl, escapeLike };