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
    deleteUser
} = require('../controllers/userController');

// GET /api/users  (hỗ trợ query: ?search=&role=&status=)
router.get('/', getUsers);

// GET /api/users/:id
router.get('/:id', getUserById);

// POST /api/users — tạo người dùng mới
router.post('/', createUser);

// PUT /api/users/:id — cập nhật thông tin / trạng thái
router.put('/:id', updateUser);

// DELETE /api/users/:id — xóa người dùng
router.delete('/:id', deleteUser);

module.exports = router;
