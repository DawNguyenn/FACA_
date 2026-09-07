const express = require('express');
const router = express.Router();
const {
    getIssues,
    getIssueById,
    createIssue,
    updateIssue,
    deleteIssue
} = require('../controllers/issueController');

// Tra cứu danh sách & Tìm kiếm Lỗi (Staff & Admin dùng chung)
// GET /api/issues?search=MIPI&category_id=1&config_name=AA_V2
router.get('/', getIssues);

// Xem chi tiết 1 bài lỗi theo ID
// GET /api/issues/1
router.get('/:id', getIssueById);

// Thêm mới Lỗi (Dành cho Admin/Leader)
// POST /api/issues
router.post('/', createIssue);

// Cập nhật Lỗi
// PUT /api/issues/1
router.put('/:id', updateIssue);

// Xóa Lỗi
// DELETE /api/issues/1
router.delete('/:id', deleteIssue);

module.exports = router;