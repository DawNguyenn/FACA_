const express = require('express');
const router = express.Router();
const { getSheets, getSheetData } = require('../controllers/warehouseExcelController');
const authMiddleware = require('../middlewares/authMiddleware');

// Mọi user đã đăng nhập đều được XEM/TÌM KIẾM dữ liệu kho
// (quyền import sẽ được kiểm soát riêng ở /api/inventory/import)
router.get('/warehouse/sheets', authMiddleware, getSheets);
router.get('/warehouse/sheet-data', authMiddleware, getSheetData);
// Lưu ý: GET /api/inventory đã được xử lý bởi inventoryImportRoutes.js
// (app.use('/api/inventory', ...) trong server.js) — không khai báo lại ở đây.

module.exports = router;