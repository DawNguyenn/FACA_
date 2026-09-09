// ================================================================
//  warehouseExcelRoutes.js — /api
//  Đọc & hiển thị file Excel quản lý kho dưới dạng JSON
// ================================================================
const express = require('express');
const router = express.Router();
const { getSheets, getSheetData } = require('../controllers/warehouseExcelController');

// GET /api/sheets — danh sách tên các Sheet
router.get('/sheets', getSheets);

// GET /api/sheet-data?name={sheetName}&range={n} — dữ liệu của 1 sheet
router.get('/sheet-data', getSheetData);

module.exports = router;