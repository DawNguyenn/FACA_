// ================================================================
//  inventoryListRoutes.js — /api/inventory/list
//  Phân trang dữ liệu kho từ SQL Server (thay thế đọc file Excel)
// ================================================================
const express = require('express');
const router = express.Router();
const { getInventoryList } = require('../controllers/inventoryListController');

// GET /api/inventory/list?page=1&limit=50&search=...
// Trả về dữ liệu phân trang từ SQL Server
router.get('/list', getInventoryList);

module.exports = router;