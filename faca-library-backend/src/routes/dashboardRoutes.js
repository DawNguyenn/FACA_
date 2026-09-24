const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const dashboardController = require('../controllers/dashboardController');

router.get('/stats', authMiddleware, dashboardController.getStats);

module.exports = router;
