const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const { requireAdmin } = require('../middlewares/roleMiddleware');
const { getRoles, createRoleRequest, getMyRequests, getAllRequests, getPendingCount, approveRequest, rejectRequest } = require('../controllers/roleRequestController');

// GET /api/role-requests/roles — danh sách vai trò để chọn
router.get('/roles', authMiddleware, getRoles);

// POST /api/role-requests — gửi yêu cầu đổi vai trò
router.post('/', authMiddleware, createRoleRequest);

// GET /api/role-requests/me — yêu cầu của chính mình
router.get('/me', authMiddleware, getMyRequests);

// ADMIN: toàn bộ yêu cầu (filtre ?status=pending|approved|rejected|all)
router.get('/all', authMiddleware, requireAdmin, getAllRequests);

// ADMIN: numărul yêu cau ângă chờ duyệt (pentă badge în Header)
router.get('/pending-count', authMiddleware, getPendingCount);

// ADMIN: duyệt / respinge yêu cau (cập nhăță role_id în Users)
router.put('/:id/approve', authMiddleware, requireAdmin, approveRequest);
router.put('/:id/reject', authMiddleware, requireAdmin, rejectRequest);

module.exports = router;
