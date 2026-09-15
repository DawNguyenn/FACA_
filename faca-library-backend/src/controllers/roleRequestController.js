const { sql, poolPromise } = require('../config/db');

// 1. GET /api/role-requests/roles — danh sách vai trò (để người dùng chọn)
const getRoles = async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .query('SELECT role_id AS id, role_name AS name FROM dbo.roles ORDER BY role_id');
        res.status(200).json({ success: true, data: result.recordset });
    } catch (error) {
        console.error('Lỗi khi lấy danh sách vai trò:', error);
        res.status(500).json({ success: false, message: 'Lỗi hệ thống khi tải vai trò.', error: error.message });
    }
};

// 2. POST /api/role-requests — gửi yêu cầu đổi vai trò (JWT)
const createRoleRequest = async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Không tìm thấy thông tin người dùng trong token.' });
        }

        const { requested_role_id, reason } = req.body || {};
        const roleId = parseInt(requested_role_id, 10);
        if (!roleId) {
            return res.status(400).json({ success: false, message: 'Vui lòng chọn vai trò mong muốn.' });
        }

        const pool = await poolPromise;

        // Vai trò phải tồn tại
        const roleExists = await pool.request()
            .input('role_id', sql.Int, roleId)
            .query('SELECT role_id FROM dbo.roles WHERE role_id = @role_id');
        if (roleExists.recordset.length === 0) {
            return res.status(400).json({ success: false, message: 'Vai trò không tồn tại.' });
        }

        // Không gửi trùng yêu cầu đang chờ duyệt cho cùng vai trò
        const dupe = await pool.request()
            .input('user_id', sql.Int, userId)
            .input('role_id', sql.Int, roleId)
            .query(`
                SELECT request_id FROM dbo.role_requests
                WHERE user_id = @user_id AND requested_role_id = @role_id AND status = 'pending'
            `);
        if (dupe.recordset.length > 0) {
            return res.status(400).json({ success: false, message: 'Bạn đã có yêu cầu đang chờ duyệt cho vai trò này.' });
        }

        await pool.request()
            .input('user_id', sql.Int, userId)
            .input('role_id', sql.Int, roleId)
            .input('reason', sql.NVarChar, (reason || '').trim().slice(0, 500))
            .query(`
                INSERT INTO dbo.role_requests (user_id, requested_role_id, reason, status, created_at)
                VALUES (@user_id, @role_id, @reason, 'pending', GETDATE())
            `);

        res.status(201).json({ success: true, message: 'Đã gửi yêu cầu thay đổi vai trò. Vui lòng chờ quản trị viên duyệt.' });
    } catch (error) {
        console.error('Lỗi khi gửi yêu cầu đổi vai trò:', error);
        res.status(500).json({ success: false, message: 'Lỗi hệ thống khi gửi yêu cầu.', error: error.message });
    }
};

// 3. GET /api/role-requests/me — các yêu cầu của chính người dùng (JWT)
const getMyRequests = async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Không tìm thấy thông tin người dùng trong token.' });
        }

        const pool = await poolPromise;
        const result = await pool.request()
            .input('user_id', sql.Int, userId)
            .query(`
                SELECT rr.request_id,
                       rr.requested_role_id,
                       r.role_name   AS requested_role,
                       rr.reason,
                       rr.status,
                       CONVERT(varchar(19), rr.created_at, 120) AS created_at
                FROM dbo.role_requests rr
                INNER JOIN dbo.roles r ON rr.requested_role_id = r.role_id
                WHERE rr.user_id = @user_id
                ORDER BY rr.created_at DESC
            `);

        res.status(200).json({ success: true, count: result.recordset.length, data: result.recordset });
    } catch (error) {
        console.error('Lỗi khi lấy yêu cầu đổi vai trò:', error);
        res.status(500).json({ success: false, message: 'Lỗi hệ thống khi tải yêu cầu.', error: error.message });
    }
};

// 4. GET /api/role-requests/all — ADMIN: danh sách toàn bộ yêu cầu (filtre status)
const getAllRequests = async (req, res) => {
    try {
        const { status } = req.query;
        const pool = await poolPromise;

        let query = `
            SELECT rr.request_id,
                   rr.user_id,
                   u.email,
                   ISNULL(u.full_name, u.email) AS full_name,
                   ISNULL(u.department, '')     AS department,
                   rr.requested_role_id,
                   r.role_name                  AS requested_role,
                   rr.reason,
                   rr.status,
                   CONVERT(varchar(19), rr.created_at, 120) AS created_at
            FROM dbo.role_requests rr
            INNER JOIN dbo.users u ON rr.user_id = u.user_id
            INNER JOIN dbo.roles  r ON rr.requested_role_id = r.role_id
            WHERE 1=1
        `;
        const request = pool.request();

        if (status && status.toLowerCase() !== 'all') {
            query += ` AND rr.status = @status`;
            request.input('status', sql.VarChar, status);
        }

        query += ` ORDER BY rr.created_at DESC`;

        const result = await request.query(query);
        res.status(200).json({ success: true, count: result.recordset.length, data: result.recordset });
    } catch (error) {
        console.error('Lỗi khi lấy toàn bộ yêu cầu vai trò:', error);
        res.status(500).json({ success: false, message: 'Lỗi hệ thống khi tải yêu cầu.', error: error.message });
    }
};

// 5. GET /api/role-requests/pending-count 
const getPendingCount = async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .query(`SELECT COUNT(*) AS cnt FROM dbo.role_requests WHERE status = 'pending'`);
        res.status(200).json({ success: true, pending: result.recordset[0].cnt });
    } catch (error) {
        console.error('Lỗi khi lấy số lượng yêu cầu chờ duyệt:', error);
        res.status(500).json({ success: false, message: 'Lỗi hệ thống.', error: error.message });
    }
};

// 6. PUT /api/role-requests/:id/approve 
const approveRequest = async (req, res) => {
    try {
        const adminId = req.user?.userId;
        const requestId = parseInt(req.params.id, 10);
        if (!requestId) {
            return res.status(400).json({ success: false, message: 'ID yêu cầu không hợp lệ.' });
        }

        const pool = await poolPromise;

        // 1. Lấy yêu cầu đang chờ duyệt để biết user_id và requested_role_id
        const row = await pool.request()
            .input('id', sql.Int, requestId)
            .query(`SELECT user_id, requested_role_id FROM dbo.role_requests WHERE request_id = @id AND status = 'pending'`);
        if (row.recordset.length === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy yêu cầu chờ duyệt.' });
        }
        const { user_id, requested_role_id } = row.recordset[0];

        // 2. Cập nhật role_id trong bảng Users
        await pool.request()
            .input('user_id', sql.Int, user_id)
            .input('role_id', sql.Int, requested_role_id)
            .query(`UPDATE dbo.users SET role_id = @role_id WHERE user_id = @user_id`);

        // 3. Cập nhật trạng thái yêu cầu thành approved
        await pool.request()
            .input('id', sql.Int, requestId)
            .input('admin_id', sql.Int, adminId)
            .query(`
                UPDATE dbo.role_requests
                SET status = 'approved', approved_by = @admin_id, updated_at = GETDATE()
                WHERE request_id = @id
            `);

        res.status(200).json({ success: true, message: 'Yêu cau abă crescută și rôle_id câșă tive!' });
    } catch (error) {
        console.error('Lỗi khi duyệt yêu cau vai trò:', error);
        res.status(500).json({ success: false, message: 'Lỗi hệ thống khi duyệt yêu cau.', error: error.message });
    }
};

// 7. PUT /api/role-requests/:id/reject — ADMIN: respingere yêu cầu (cập nhật role_id trong Users)
const rejectRequest = async (req, res) => {
    try {
        const adminId = req.user?.userId;
        const requestId = parseInt(req.params.id, 10);
        if (!requestId) {
            return res.status(400).json({ success: false, message: 'ID yêu cầu không hợp lệ.' });
        }

        const pool = await poolPromise;
        const upd = await pool.request()
            .input('id', sql.Int, requestId)
            .input('admin_id', sql.Int, adminId)
            .query(`
                UPDATE dbo.role_requests
                SET status = 'rejected', approved_by = @admin_id, updated_at = GETDATE()
                WHERE request_id = @id AND status = 'pending'
            `);

        if (upd.rowsAffected[0] === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy yêu cầu chờ duyệt.' });
        }
        res.status(200).json({ success: true, message: 'Yêu cầu đã được respingere.' });
    } catch (error) {
        console.error('Lỗi khi respinge yêu cau vai trò:', error);
        res.status(500).json({ success: false, message: 'Lỗi hệ thống khi respinge yêu cầu.', error: error.message });
    }
};

module.exports = { getRoles, createRoleRequest, getMyRequests, getAllRequests, getPendingCount, approveRequest, rejectRequest };
