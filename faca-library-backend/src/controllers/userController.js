const { poolPromise, sql } = require('../config/db');

const VALID_STATUSES = ['active', 'inactive', 'blocked'];

// --- Select dòng người dùng theo contract API --------------------
// Lưu ý: tên cột trả về phải khớp với frontend ManageUsers.jsx:
//   full_name, email, department, role_id, role_name, is_active, avatar_url
const SELECT_COLUMNS = `
    u.user_id AS user_id,
    u.full_name,
    u.email,
    u.role_id,
    r.role_name,
    u.department,
    u.is_active,
    u.status,
    ISNULL(u.avatar_url, '') AS avatar_url,
    ISNULL(u.language, 'vi') AS language,
    u.created_at,
    u.last_login_at
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
            LEFT JOIN dbo.roles r ON u.role_id = r.role_id
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
            LEFT JOIN dbo.roles r ON u.role_id = r.role_id
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
            query += ` AND u.is_active = @status`;
            request.input('status', sql.Bit, status === 'active' ? 1 : 0);
        }

        query += ` ORDER BY u.created_at DESC, u.user_id DESC`;

        const result = await request.query(query);

        // Đảm bảo trả về đầy đủ các trường không null để frontend không crash
        const users = result.recordset.map(u => ({
            user_id: u.user_id,
            full_name: u.full_name || '',
            email: u.email || '',
            role_id: u.role_id || null,
            role_name: u.role_name || '',
            department: u.department || '',
            is_active: u.is_active !== undefined ? u.is_active : true,
            status: u.status || 'active',
            avatar_url: u.avatar_url || '',
            language: u.language || 'vi',
            created_at: u.created_at || null,
            last_login_at: u.last_login_at || null
        }));

        res.status(200).json({
            success: true,
            count: users.length,
            data: users
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

// 1b. GET /api/admin/users — Lấy danh sách người dùng (Admin only)
// Route được bảo vệ bởi authMiddleware + requireAdmin trong adminRoutes.js
const getAdminUsers = async (req, res) => {
    try {
        const { search, role, status } = req.query;
        const pool = await poolPromise;

        let query = `
            SELECT ${SELECT_COLUMNS}
            FROM dbo.users u
            LEFT JOIN dbo.roles r ON u.role_id = r.role_id
            WHERE 1=1
        `;
        const request = pool.request();

        if (search) {
            query += ` AND (u.full_name LIKE @search OR u.email LIKE @search OR u.department LIKE @search)`;
            request.input('search', sql.NVarChar, `%${search}%`);
        }
        if (role && role !== 'All') {
            query += ` AND r.role_name = @role`;
            request.input('role', sql.NVarChar, role);
        }
        if (status && status !== 'All') {
            query += ` AND u.is_active = @status`;
            request.input('status', sql.Bit, status === 'active' ? 1 : 0);
        }

        query += ` ORDER BY u.created_at DESC, u.user_id DESC`;

        const result = await request.query(query);

        // Đảm bảo trả về đầy đủ các trường không null để frontend không crash
        const users = result.recordset.map(u => ({
            user_id: u.user_id,
            full_name: u.full_name || '',
            email: u.email || '',
            role_id: u.role_id || null,
            role_name: u.role_name || '',
            department: u.department || '',
            is_active: u.is_active !== undefined ? u.is_active : true,
            status: u.status || 'active',
            avatar_url: u.avatar_url || '',
            language: u.language || 'vi',
            created_at: u.created_at || null,
            last_login_at: u.last_login_at || null
        }));

        res.status(200).json({
            success: true,
            count: users.length,
            data: users
        });

    } catch (error) {
        console.error('Lỗi Admin Get Users:', error.message);
        res.status(500).json({
            success: false,
            message: 'Lỗi kết nối cơ sở dữ liệu khi tải danh sách người dùng.',
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

// 2b. PUT /api/admin/users/:id/toggle-lock — Khóa/Mở khóa tài khoản (Admin only)
const toggleUserLock = async (req, res) => {
    try {
        const userId = parseInt(req.params.id, 10);
        if (isNaN(userId)) {
            return res.status(400).json({ success: false, message: 'ID người dùng không hợp lệ.' });
        }

        // Không cho phép admin tự khóa tài khoản của chính mình
        if (req.user && req.user.userId === userId) {
            return res.status(400).json({ success: false, message: 'Không thể khóa tài khoản của chính mình.' });
        }

        const { is_active } = req.body;
        if (is_active === undefined || is_active === null) {
            return res.status(400).json({ success: false, message: 'Thiếu tham số is_active.' });
        }

        const pool = await poolPromise;

        // Kiểm tra user có tồn tại không
        const checkResult = await pool.request()
            .input('id', sql.Int, userId)
            .query('SELECT user_id, full_name FROM dbo.users WHERE user_id = @id');

        if (checkResult.recordset.length === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng.' });
        }

        // Cập nhật trạng thái khóa/mở khóa
        const upd = await pool.request()
            .input('user_id', sql.Int, userId)
            .input('is_active', sql.Bit, is_active ? 1 : 0)
            .query(`
                UPDATE dbo.users
                SET is_active = @is_active,
                    status = CASE WHEN @is_active = 1 THEN 'active' ELSE 'inactive' END
                WHERE user_id = @user_id
            `);

        if (upd.rowsAffected[0] === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng để cập nhật.' });
        }

        // Trả về bản ghi mới nhất
        const updated = await getUserRowById(userId);
        res.status(200).json({
            success: true,
            message: is_active ? 'Đã mở khóa tài khoản.' : 'Đã khóa tài khoản.',
            data: updated
        });

    } catch (error) {
        console.error('Lỗi Toggle User Lock:', error.message);
        res.status(500).json({
            success: false,
            message: 'Lỗi hệ thống khi cập nhật trạng thái tài khoản.',
            error: error.message
        });
    }
};

// 3. POST /api/users
const createUser = async (req, res) => {
    try {
        // Payload khớp với contract snake_case (đồng bộ với response & DB):
        // { full_name, email, role_name, department, status, avatar_url }
        const { full_name: name, email, role_name: role, department, status, avatar_url: avatarUrl } = req.body || {};
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
        // Contract snake_case — đồng bộ với request frontend & response:
        // { full_name, email, role_name, department, status, avatar_url }
        const name = body.full_name ?? existing.full_name;
        const email = body.email ?? existing.email;
        const role = body.role_name ?? existing.role_name;
        const department = body.department ?? existing.department;
        const status = VALID_STATUSES.includes(body.status) ? body.status : existing.status;
        const avatarUrl = body.avatar_url !== undefined ? body.avatar_url : existing.avatar_url;

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

const VALID_LANGUAGES = ['vi', 'en', 'ko'];

// 6. PUT /api/users/me — Cập nhật thông tin cá nhân của user đang đăng nhập (JWT)
// Payload: { full_name, department, avatar_url, language }
// Lưu ý T-SQL: với parameterized query của mssql, Unicode (tiếng Việt có dấu)
// được đảm bảo bằng cách khai báo kiểu sql.NVarChar cho parameter.
// (Tiền tố N chỉ áp dụng cho literal, ví dụ N'Nguyễn Văn A' — "N@full_name" là cú pháp KHÔNG hợp lệ.)
const updateMyProfile = async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Không tìm thấy thông tin người dùng trong token.' });
        }

        const { full_name, department, avatar_url, language } = req.body || {};

        if (full_name !== undefined && !String(full_name).trim()) {
            return res.status(400).json({ success: false, message: 'Họ và tên không được để trống.' });
        }

        // Chỉ chấp nhận ngôn ngữ được hỗ trợ (vi/en/ko)
        if (language !== undefined && language !== null && !VALID_LANGUAGES.includes(language)) {
            return res.status(400).json({ success: false, message: `Ngôn ngữ không được hỗ trợ. Các ngôn ngữ khả dụng: ${VALID_LANGUAGES.join(', ')}.` });
        }

        // Giới hạn độ dài avatar_url để tránh payload bất thường
        if (avatar_url && String(avatar_url).length > 2048) {
            return res.status(400).json({ success: false, message: 'Đường dẫn ảnh đại diện không hợp lệ.' });
        }

        const pool = await poolPromise;

        // T-SQL: UPDATE Users SET full_name = @full_name, department = @department,
        // avatar_url = @avatar_url WHERE user_id = @user_id (theo user hiện hành trong token)
        const upd = await pool.request()
            .input('user_id', sql.Int, userId)
            .input('full_name', sql.NVarChar, full_name !== undefined ? String(full_name).trim() : null)
            .input('department', sql.NVarChar, department !== undefined ? String(department).trim() : null)
            .input('avatar_url', sql.NVarChar, avatar_url !== undefined ? String(avatar_url) : null)
            .input('language', sql.VarChar, language !== undefined && language !== null ? String(language) : null)
            .query(`
                UPDATE dbo.users
                SET full_name   = COALESCE(@full_name, full_name),
                    department  = COALESCE(@department, department),
                    avatar_url  = COALESCE(@avatar_url, avatar_url),
                    language    = COALESCE(@language, language)
                WHERE user_id = @user_id
            `);

        if (upd.rowsAffected[0] === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng để cập nhật.' });
        }

        // Trả về bản ghi mới nhất để Frontend đồng bộ State
        const updated = await getUserRowById(userId);
        res.status(200).json({ success: true, message: 'Cập nhật thông tin cá nhân thành công!', data: updated, user: updated });

    } catch (error) {
        console.error('Lỗi khi cập nhật thông tin cá nhân:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi hệ thống khi cập nhật thông tin cá nhân.',
            error: error.message
        });
    }
};

module.exports = {
    getUsers,
    getAdminUsers,
    toggleUserLock,
    getUserById,
    createUser,
    updateUser,
    deleteUser,
    updateMyProfile
};
