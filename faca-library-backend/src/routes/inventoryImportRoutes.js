// ================================================================
//  inventoryImportRoutes.js — /api/inventory/import
//  Stream-based async Excel import endpoints
// ================================================================

const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const { requireRoles } = require('../middlewares/roleMiddleware');
const {
    importInventory,
    getImportStatus,
    getImportErrors,
    getInventoryLots,
    upload,
} = require('../controllers/inventoryImportController');

// Chỉ Admin (role_id=1) hoặc Warehouse (role_id=4) mới được IMPORT dữ liệu
const IMPORT_ROLES = [1, 4];

// GET /api/inventory
//  List inventory lots (backing the frontend ['inventoryList'] query)
//  — mọi user đã đăng nhập đều được xem
router.get('/', authMiddleware, getInventoryLots);

// POST /api/inventory/import
//  Upload an Excel file → 202 Accepted immediately, background processing
//  — chỉ Admin / Warehouse được phép import
router.post(
    '/import',
    authMiddleware,
    requireRoles(IMPORT_ROLES),
    upload.single('file'),
    (req, res, next) => {
        // Custom error handler for multer upload errors
        // (e.g. file too large, unsupported type)
        if (req instanceof Error) {
            return res.status(400).json({
                success: false,
                message: req.message || 'Lỗi tải lên tệp.',
            });
        }
        next();
    },
    importInventory
);

// GET /api/inventory/import/:importId/status
//  Poll for import completion (PENDING → SUCCESS / PARTIAL / FAILED)
router.get(
    '/import/:importId/status',
    authMiddleware,
    getImportStatus
);

// GET /api/inventory/import/:importId/errors
//  Retrieve failed-row diagnostics from staging
router.get(
    '/import/:importId/errors',
    authMiddleware,
    getImportErrors
);

module.exports = router;
