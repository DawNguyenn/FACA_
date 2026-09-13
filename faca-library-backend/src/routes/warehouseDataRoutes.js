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

module.exports = router;
