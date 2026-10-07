const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const { requireRoles } = require('../middlewares/roleMiddleware');

const {
  getMaterials,
  getInventoryLotsPaginated,
  getProjectsPaginated,
  getVendorsPaginated,
  getBuildsPaginated,
} = require('../controllers/warehouseDataController');

const {
    listStagingSbn27,
    listStagingClo27,
    listStagingSca27,
    listStagingPdx27,
    listStagingPsm27,
    listStagingAtw,
    listStagingReno27,
    listStagingChs,
    listStagingNvlTray,
    listStagingNvlCap,
    listStagingNvlSmt,
    listStagingNvlHtcc,
    listStagingSparePart,
    listStagingTongTon,
    listStagingGeneric,
    listSourcesHandler,
    createSourceHandler,
    deleteSourceHandler,
    updateStagingRowHandler,
    insertStagingRowHandler,
    addStagingColumnHandler,
    deleteStagingRowHandler,
    deleteStagingColumnHandler,
    bulkSaveHandler,
    getSheetMetaHandler,
    updateSheetMetaHandler,
    listAuditLogsHandler,
    listAuditTablesHandler,
    restoreAuditLogHandler,
} = require('../controllers/stagingDataController');

/**
 * GET /api/warehouse/materials
 * Paginated materials list with optional search.
 */
router.get('/materials', authMiddleware, getMaterials);

/**
 * GET /api/warehouse/inventory-lots
 * Paginated inventory lots list with optional search.
 */
router.get('/inventory-lots', authMiddleware, getInventoryLotsPaginated);

/**
 * GET /api/warehouse/projects
 * Paginated projects list with optional search.
 */
router.get('/projects', authMiddleware, getProjectsPaginated);

/**
 * GET /api/warehouse/vendors
 * Paginated vendors list with optional search.
 */
router.get('/vendors', authMiddleware, getVendorsPaginated);

/**
 * GET /api/warehouse/builds
 * Paginated builds list with optional search.
 */
router.get('/builds', authMiddleware, getBuildsPaginated);

/**
 * GET /api/warehouse/:source — hiển thị dữ liệu từ các bảng staging
 * SQL-Centric: SELECT + LIKE search + OFFSET/FETCH pagination.
 * Dữ liệu được BULK INSERT thủ công vào bảng staging.
 */
// 14 nguồn khớp 14 bảng staging (sql/create_staging_split_tables.sql):
//   8 sheet dự án NPI:   /sbn27 /clo27 /sca27 /pdx27 /psm27 /atw /reno27 /chs
//   3 sheet NVL:         /tray /cap /smt
//   NVL HTCC-SMT:        /htcc
//   SparePart:           /sparepart
//   Tổng tồn:            /tongton
router.get('/sbn27', authMiddleware, listStagingSbn27);
router.get('/clo27', authMiddleware, listStagingClo27);
router.get('/sca27', authMiddleware, listStagingSca27);
router.get('/pdx27', authMiddleware, listStagingPdx27);
router.get('/psm27', authMiddleware, listStagingPsm27);
router.get('/atw', authMiddleware, listStagingAtw);
router.get('/reno27', authMiddleware, listStagingReno27);
router.get('/chs', authMiddleware, listStagingChs);
router.get('/tray', authMiddleware, listStagingNvlTray);
router.get('/cap', authMiddleware, listStagingNvlCap);
router.get('/smt', authMiddleware, listStagingNvlSmt);
router.get('/htcc', authMiddleware, listStagingNvlHtcc);
router.get('/sparepart', authMiddleware, listStagingSparePart);
router.get('/tongton', authMiddleware, listStagingTongTon);

// Danh muc sheet dong + tao/xoa sheet (dat TRUOC route /:source generic)
router.get('/sources', authMiddleware, listSourcesHandler);

/**
 * Inline editing trên dữ liệu staging — CHỈ Admin (role_id=1) và Warehouse (role_id=4):
 *   PUT    /api/warehouse/:source/rows/:id          — sửa 1 dòng (theo StagingID)
 *   POST   /api/warehouse/:source/rows              — thêm 1 dòng mới
 *   POST   /api/warehouse/:source/columns           — thêm cột mới động (ALTER TABLE + metadata)
 *   DELETE /api/warehouse/:source/rows/:id          — xóa 1 dòng (theo StagingID)
 *   DELETE /api/warehouse/:source/columns/:name     — xóa cột động (chỉ cột custom)
 *   POST   /api/warehouse/:source/bulk-save         — lưu Data Grid (JSON: columns + rows)
 * Sheet moi tao qua POST /sources dung chung cac route generic nay,
 * khong can them route moi trong code.
 */
const warehouseEditor = requireRoles([1, 4]);
router.post('/sources', authMiddleware, warehouseEditor, createSourceHandler);
router.delete('/sources/:source', authMiddleware, warehouseEditor, deleteSourceHandler);

// Metadata HEADER của sheet (thông tin file gốc hiển thị trên đầu bảng dữ liệu kho):
//   GET /api/warehouse/sources/:source/meta  — xem (mọi user đã đăng nhập)
//   PUT /api/warehouse/sources/:source/meta  — sửa (chỉ Admin & Warehouse)
router.get('/sources/:source/meta', authMiddleware, getSheetMetaHandler);
router.put('/sources/:source/meta', authMiddleware, warehouseEditor, updateSheetMetaHandler);

// Nhật ký & lịch sử chỉnh sửa dữ liệu (Audit Log) — ai đã sửa gì, lúc nào, giá trị trước/sau:
//   GET /api/warehouse/audit-logs         — danh sách (lọc table/action/ngày/người + phân trang)
//   GET /api/warehouse/audit-logs/tables  — danh sách bảng có phát sinh nhật ký
// PHẢI đăng ký TRƯỚC route '/:source' để không bị Express bắt nhầm "audit-logs" là tên sheet.
router.get('/audit-logs/tables', authMiddleware, listAuditTablesHandler);
router.get('/audit-logs', authMiddleware, listAuditLogsHandler);
// Khôi phục dữ liệu từ nhật ký — CHỈ Admin (rollback DELETE/UPDATE đơn theo StagingID)
router.post('/audit-logs/:id/restore', authMiddleware, requireRoles([1]), restoreAuditLogHandler);
router.post('/:source/bulk-save', authMiddleware, warehouseEditor, bulkSaveHandler);
router.get('/:source', authMiddleware, listStagingGeneric);
router.put('/:source/rows/:id', authMiddleware, warehouseEditor, updateStagingRowHandler);
router.post('/:source/rows', authMiddleware, warehouseEditor, insertStagingRowHandler);
router.post('/:source/columns', authMiddleware, warehouseEditor, addStagingColumnHandler);
router.delete('/:source/rows/:id', authMiddleware, warehouseEditor, deleteStagingRowHandler);
router.delete('/:source/columns/:columnName', authMiddleware, warehouseEditor, deleteStagingColumnHandler);

module.exports = router;
