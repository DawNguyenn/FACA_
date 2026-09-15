const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');

const {
  getMaterials,
  getInventoryLotsPaginated,
  getProjectsPaginated,
  getVendorsPaginated,
  getBuildsPaginated,
} = require('../controllers/warehouseDataController');

const {
    listStagingChs,
    listStagingPsm27,
    listStagingPdx27,
    listStagingDuAnKhac,
    listStagingNvlTray,
    listStagingNvlCap,
    listStagingNvlSmt,
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
 * GET /api/warehouse/npi  — hiển thị dbo.Staging_NPI_Standard
 * GET /api/warehouse/nvl  — hiển thị dbo.Staging_NVL_Special
 * SQL-Centric: SELECT + LIKE search + OFFSET/FETCH pagination.
 * Dữ liệu được BULK INSERT thủ công vào bảng staging.
 */
// 7 sheet tách theo file Quan_Ly_Nguyen_Vat_Lieu_NPI.xlsx:
//   /chs  /psm27  /pdx27  /khac  (schema NPI Standard)
//   /tray /cap /smt               (schema NVL Special)
router.get('/chs', authMiddleware, listStagingChs);
router.get('/psm27', authMiddleware, listStagingPsm27);
router.get('/pdx27', authMiddleware, listStagingPdx27);
router.get('/khac', authMiddleware, listStagingDuAnKhac);
router.get('/tray', authMiddleware, listStagingNvlTray);
router.get('/cap', authMiddleware, listStagingNvlCap);
router.get('/smt', authMiddleware, listStagingNvlSmt);

module.exports = router;
