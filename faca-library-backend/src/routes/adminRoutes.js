// ================================================================
//  adminRoutes.js — /api/admin (yêu cầu quyền Admin)
// ================================================================
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const { requireAdmin } = require('../middlewares/roleMiddleware');
const {
    getAdminUsers,
    toggleUserLock,
    getUserById
} = require('../controllers/userController');

// Tất cả route admin đều yêu cầu: đăng nhập (JWT) + có quyền Admin
router.use(authMiddleware, requireAdmin);

// GET /api/admin/users — Lấy danh sách người dùng (hỗ trợ ?search=&role=&status=)
router.get('/users', getAdminUsers);

// PUT /api/admin/users/:id/toggle-lock — Khóa/Mở khóa tài khoản
router.put('/users/:id/toggle-lock', toggleUserLock);

// GET /api/admin/users/:id — Lấy chi tiết 1 người dùng
router.get('/users/:id', getUserById);

module.exports = router;
