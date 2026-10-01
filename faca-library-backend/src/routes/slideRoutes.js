const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const authMiddleware = require('../middlewares/authMiddleware');
const { searchSlides, getSlideImage, streamSlideFile, streamSlidePdf } = require('../controllers/slideController');
const { runSlideScanOnce } = require('../services/cronScanner');

// GET /api/slides/search?keyword=... (can dang nhap)
router.get('/search', authMiddleware, searchSlides);

/**
 * GET /api/slides/image?fileId=...&slideIndex=N&token=...
 *
 * Anh PNG cua slide. Dung <img src> o frontend nen KHONG gui duoc header
 * Authorization -> chap nhan them token qua query string. Van xac thuc JWT that,
 * chi khac cho phep lay token tu query thay vi header.
 */
router.get('/image', (req, res, next) => {
    if (req.headers.authorization) return authMiddleware(req, res, next);
    const token = String(req.query.token || '');
    if (!token) {
        return res.status(401).json({ success: false, message: 'Khong tim thay token xac thuc.' });
    }
    try {
        req.user = jwt.verify(token, process.env.JWT_SECRET || 'super_secret_key_faca_library');
        return next();
    } catch (err) {
        return res.status(401).json({ success: false, message: 'Token khong hop le hoac da het han.' });
    }
}, getSlideImage);

// GET /api/slides/file?fileId=...&token=... -> stream .pptx INLINE (khong download).
// Cung co che token-qua-query nhu /image vi iframe/<a> khong gui duoc header Authorization.
// Header tra ve: Content-Type pptx + Content-Disposition inline + ho tro Range.
router.get('/file', (req, res, next) => {
    if (req.headers.authorization) return authMiddleware(req, res, next);
    const token = String(req.query.token || '');
    if (!token) {
        return res.status(401).json({ success: false, message: 'Khong tim thay token xac thuc.' });
    }
    try {
        req.user = jwt.verify(token, process.env.JWT_SECRET || 'super_secret_key_faca_library');
        return next();
    } catch (err) {
        return res.status(401).json({ success: false, message: 'Token khong hop le hoac da het han.' });
    }
}, streamSlideFile);

// GET /api/slides/pdf?fileId=...&token=... -> convert .pptx sang .pdf (PowerPoint
// COM la chinh, LibreOffice la du phong — xem services/pdfConverter.js) roi serve
// INLINE (Content-Type: application/pdf) de xem + tim kiem text trong trinh duyet.
// Dau ra co the mat 1-3 phut voi file nang -> client nen co timeout lon.
const pdfQueryAuth = (req, res, next) => {
    if (req.headers.authorization) return authMiddleware(req, res, next);
    const token = String(req.query.token || '');
    if (!token) {
        return res.status(401).json({ success: false, message: 'Khong tim thay token xac thuc.' });
    }
    try {
        req.user = jwt.verify(token, process.env.JWT_SECRET || 'super_secret_key_faca_library');
        return next();
    } catch (err) {
        return res.status(401).json({ success: false, message: 'Token khong hop le hoac da het han.' });
    }
};
router.get('/pdf', pdfQueryAuth, streamSlidePdf);

// POST /api/slides/reindex - kich hoat quet lai (can dang nhap)
// Tra ve summary chi tiet: tong file, da index, offline (cloud-only), loi tung file.
router.post('/reindex', authMiddleware, async (req, res) => {
    try {
        const summary = await runSlideScanOnce();
        const msg = `Da quet ${summary.total} file: ${summary.indexed} index moi, ` +
            `${summary.skipped} bo qua, ${summary.offline || 0} file OneDrive chua tai ve, ` +
            `${summary.failed} loi. Tong ${summary.slides || 0} slide.`;
        res.json({ success: true, message: msg, data: summary });
    } catch (e) {
        res.status(500).json({ success: false, message: 'Loi quet.', error: e.message });
    }
});

// GET /api/slides/status - bao cao trang thai index (can dang nhap)
router.get('/status', authMiddleware, async (req, res) => {
    try {
        const { poolPromise } = require('../config/db');
        const pool = await poolPromise;
        const total = await pool.request().query(
            `SELECT COUNT(*) AS slideRows, COUNT(DISTINCT FileId) AS files,
                    MAX(LastScannedAt) AS lastScan FROM dbo.SlideIndexes WHERE SlideIndex > 0`);
        const files = await pool.request().query(
            `SELECT FileName, COUNT(*) AS slides, MAX(LastScannedAt) AS lastScan
             FROM dbo.SlideIndexes WHERE SlideIndex > 0 GROUP BY FileName ORDER BY FileName`);
        res.json({ success: true, data: { ...(total.recordset[0] || {}), files: files.recordset || [] } });
    } catch (e) {
        res.status(500).json({ success: false, message: 'Loi lay trang thai.', error: e.message });
    }
});

module.exports = router;
