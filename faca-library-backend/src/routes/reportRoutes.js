const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const { getReports, syncReports } = require('../controllers/errorController');

// Tra cứu báo cáo PowerPoint đã cache (giao diện Quản lý Lỗi)
// GET /api/reports?category=ALL|LOI_DIEN|LOI_QUANG|LOI_CO&search=capacitor
router.get('/', authMiddleware, getReports);

// Quét lại thư mục OneDrive local và cập nhật cache PresentationReports
// POST /api/reports/sync   (body tùy chọn: { "folder_id": 1 })
router.post('/sync', authMiddleware, syncReports);

module.exports = router;
