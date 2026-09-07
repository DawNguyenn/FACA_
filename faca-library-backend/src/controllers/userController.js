const { poolPromise, sql } = require('../config/db');

const VALID_STATUSES = ['active', 'inactive', 'blocked'];

// --- Select dòng người dùng theo contract API --------------------
const SELECT_COLUMNS = `
    u.user_id AS id,
    u.full_name AS name,
    u.email,
    r.role_name AS role,
    u.department,
    u.status,
    ISNULL(u.avatar_url, '') AS avatarUrl,
    CONVERT(varchar(10), u.created_at, 23) AS createdAt
`;

// Lấy userId -> role_id theo tên vai trò (trả null nếu không tồn tại)
async function findRoleId(role) {
    const pool = await poolPromise;
    const result = await pool.request()
        .input('role_name', sql.NVarChar, role)
        .query('SELECT role_id FROM dbo.roles WHERE role_name = @role_name');
    return result.recordset.length ? result.recordset[0].role_id : null;
}

// Lấy 1 user theo id (đã chuẩn hóa contract)
async function getUserRowById(id) {
    const pool = await poolPromise;
    const result = await pool.request()
        .input('id', sql.Int, id)
        .query(`
            SELECT ${SELECT_COLUMNS}
            FROM dbo.users u
            INNER JOIN dbo.roles r ON u.role_id = r.role_id
            WHERE u.user_id = @id
        `);
    return result.recordset[0] || null;
}

// 1. GET /api/users  (hỗ trợ query: search, role, status)
const getUsers = async (req, res) => {
    try {
        const { search, role, status } = req.query;
        const pool = await poolPromise;

        let query = `
            SELECT ${SELECT_COLUMNS}
            FROM dbo.users u
            INNER JOIN dbo.roles r ON u.role_id = r.role_id
            WHERE 1=1
        `;
        const request = pool.request();

        if (search) {
            query += ` AND (u.full_name LIKE @search OR u.email LIKE @search)`;
            request.input('search', sql.NVarChar, `%${search}%`);
        }
        if (role && role !== 'All') {
            query += ` AND r.role_name = @role`;
            request.input('role', sql.NVarChar, role);
        }
        if (status && status !== 'All') {
            query += ` AND u.status = @status`;
            request.input('status', sql.VarChar, status);
        }

        query += ` ORDER BY u.created_at DESC, u.user_id DESC`;

        const result = await request.query(query);

        res.status(200).json({
            success: true,
            count: result.recordset.length,
            data: result.recordset
        });

    } catch (error) {
        console.error('Lỗi khi lấy danh sách người dùng:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi hệ thống khi tải danh sách người dùng.',
            error: error.message
        });
    }
};

// 2. GET /api/users/:id
const getUserById = async (req, res) => {
    try {
        const user = await getUserRowById(req.params.id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng.' });
        }
        res.status(200).json({ success: true, data: user });
    } catch (error) {
        console.error('Lỗi khi lấy chi tiết người dùng:', error);
        res.status(500).json({ success: false, message: 'Lỗi hệ thống.', error: error.message });
    }
};

// 3. POST /api/users
const createUser = async (req, res) => {
    try {
        const { name, email, role, department, status, avatarUrl } = req.body || {};
        const finalStatus = VALID_STATUSES.includes(status) ? status : 'active';

        if (!name || !name.trim()) {
            return res.status(400).json({ success: false, message: 'Tên người dùng là bắt buộc.' });
        }
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({ success: false, message: 'Email không hợp lệ.' });
        }
        const roleId = await findRoleId(role);
        if (!roleId) {
            return res.status(400).json({ success: false, message: `Vai trò "${role}" không tồn tại.` });
        }

        const pool = await poolPromise;

        const dupe = await pool.request()
            .input('email', sql.VarChar, email)
            .query('SELECT user_id FROM dbo.users WHERE email = @email');
        if (dupe.recordset.length) {
            return res.status(400).json({ success: false, message: 'Email này đã được sử dụng.' });
        }

        const ins = await pool.request()
            .input('email', sql.VarChar, email)
            .input('full_name', sql.NVarChar, name)
            .input('department', sql.NVarChar, department || '')
            .input('role_id', sql.Int, roleId)
            .input('status', sql.VarChar, finalStatus)
            .input('avatar_url', sql.VarChar, avatarUrl || '')
            .query(`
                INSERT INTO dbo.users
                    (email, full_name, department, role_id, is_active, status, avatar_url, created_at)
                OUTPUT INSERTED.user_id
                VALUES
                    (@email, @full_name, @department, @role_id,
                     CASE WHEN @status = 'blocked' THEN 0 ELSE 1 END,
                     @status, @avatar_url, GETDATE())
            `);

        const newId = ins.recordset[0].user_id;
        const created = await getUserRowById(newId);

        res.status(201).json({
            success: true,
            message: 'Tạo người dùng thành công!',
            data: created
        });

    } catch (error) {
        console.error('Lỗi khi tạo người dùng:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi hệ thống khi tạo người dùng.',
            error: error.message
        });
    }
};

// 4. PUT /api/users/:id  (hỗ trợ cập nhật từng phần — ví dụ chỉ đổi status)
const updateUser = async (req, res) => {
    try {
        const id = req.params.id;
        const existing = await getUserRowById(id);
        if (!existing) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng để cập nhật.' });
        }

        const body = req.body || {};
        const name = body.name ?? existing.name;
        const email = body.email ?? existing.email;
        const role = body.role ?? existing.role;
        const department = body.department ?? existing.department;
        const status = VALID_STATUSES.includes(body.status) ? body.status : existing.status;
        const avatarUrl = body.avatarUrl !== undefined ? body.avatarUrl : existing.avatarUrl;

        if (!name || !name.trim()) {
            return res.status(400).json({ success: false, message: 'Tên người dùng là bắt buộc.' });
        }
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({ success: false, message: 'Email không hợp lệ.' });
        }
        const roleId = await findRoleId(role);
        if (!roleId) {
            return res.status(400).json({ success: false, message: `Vai trò "${role}" không tồn tại.` });
        }

        const pool = await poolPromise;

        const dupe = await pool.request()
            .input('email', sql.VarChar, email)
            .input('id', sql.Int, id)
            .query('SELECT user_id FROM dbo.users WHERE email = @email AND user_id <> @id');
        if (dupe.recordset.length) {
            return res.status(400).json({ success: false, message: 'Email này đã được sử dụng bởi người dùng khác.' });
        }

        const upd = await pool.request()
            .input('id', sql.Int, id)
            .input('email', sql.VarChar, email)
            .input('full_name', sql.NVarChar, name)
            .input('department', sql.NVarChar, department || '')
            .input('role_id', sql.Int, roleId)
            .input('status', sql.VarChar, status)
            .input('avatar_url', sql.VarChar, avatarUrl || '')
            .query(`
                UPDATE dbo.users
                SET email = @email,
                    full_name = @full_name,
                    department = @department,
                    role_id = @role_id,
                    status = @status,
                    avatar_url = @avatar_url,
                    is_active = CASE WHEN @status = 'blocked' THEN 0 ELSE 1 END
                WHERE user_id = @id
            `);

        if (upd.rowsAffected[0] === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng để cập nhật.' });
        }

        const updated = await getUserRowById(id);
        res.status(200).json({ success: true, message: 'Cập nhật người dùng thành công!', data: updated });

    } catch (error) {
        console.error('Lỗi khi cập nhật người dùng:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi hệ thống khi cập nhật người dùng.',
            error: error.message
        });
    }
};

// 5. DELETE /api/users/:id
const deleteUser = async (req, res) => {
    try {
        const id = req.params.id;
        const pool = await poolPromise;

        const del = await pool.request()
            .input('id', sql.Int, id)
            .query('DELETE FROM dbo.users WHERE user_id = @id');

        if (del.rowsAffected[0] === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng để xóa.' });
        }

        res.status(200).json({ success: true, message: 'Xóa người dùng thành công!' });

    } catch (error) {
        console.error('Lỗi khi xóa người dùng:', error);
        res.status(500).json({ success: false, message: 'Lỗi hệ thống khi xóa người dùng.', error: error.message });
    }
};

module.exports = {
    getUsers,
    getUserById,
    createUser,
    updateUser,
    deleteUser
};
