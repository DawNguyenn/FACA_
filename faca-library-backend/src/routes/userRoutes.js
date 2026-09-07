// ================================================================
//  userRoutes.js — /api/users
// ================================================================
const express = require('express');
const router = express.Router();
const {
    getUsers,
    getUserById,
    createUser,
    updateUser,
    deleteUser,
    updateMyProfile
} = require('../controllers/userController');
const authMiddleware = require('../middlewares/authMiddleware');

// GET /api/users  (hỗ trợ query: ?search=&role=&status=)
router.get('/', getUsers);

// PUT /api/users/me — cập nhật thông tin cá nhân (JWT)
// PHẢI đăng ký TRƯỚC '/:id' để không bị nuốt bởi route tham số
router.put('/me', authMiddleware, updateMyProfile);

// GET /api/users/:id
router.get('/:id', getUserById);

// POST /api/users — tạo người dùng mới
router.post('/', createUser);

// PUT /api/users/:id — cập nhật thông tin / trạng thái
router.put('/:id', updateUser);

// DELETE /api/users/:id — xóa người dùng
router.delete('/:id', deleteUser);

module.exports = router;
