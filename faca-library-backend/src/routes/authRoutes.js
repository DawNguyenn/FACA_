const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middlewares/authMiddleware');

// POST /api/auth/register
router.post('/register', authController.register);

// POST /api/auth/login
router.post('/login', authController.login);

// GET /api/auth/me  (Bảo vệ bằng JWT middleware)
router.get('/me', authMiddleware, authController.getMe);

// POST /api/auth/forgot-password — Gửi email đặt lại mật khẩu
router.post('/forgot-password', authController.forgotPassword);

// POST /api/auth/reset-password — Đặt lại mật khẩu bằng token trong email
router.post('/reset-password', authController.resetPassword);

module.exports = router;