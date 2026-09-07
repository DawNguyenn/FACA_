const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { sql, poolPromise } = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_key_faca_library';

// 1. Đăng ký tài khoản
exports.register = async (req, res) => {
    const { email, password, full_name, department } = req.body;

    try {
        const pool = await poolPromise;

        // Kiểm tra email đã tồn tại chưa
        const checkUser = await pool.request()
            .input('email', sql.VarChar, email)
            .query('SELECT user_id FROM dbo.users WHERE email = @email');

        if (checkUser.recordset.length > 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'Email này đã được sử dụng.' 
            });
        }

        // Mã hóa mật khẩu
        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);

        // Thêm user mới vào SQL Server (Mặc định role_id = 2 - Staff)
        await pool.request()
            .input('email', sql.VarChar, email)
            .input('password_hash', sql.VarChar, password_hash)
            .input('full_name', sql.NVarChar, full_name)
            .input('department', sql.NVarChar, department || '')
            .query(`
                INSERT INTO dbo.users (email, password_hash, full_name, department, role_id, is_active, created_at)
                VALUES (@email, @password_hash, @full_name, @department, 2, 1, GETDATE())
            `);

        return res.status(201).json({
            success: true,
            message: 'Đăng ký tài khoản thành công!'
        });

    } catch (error) {
        console.error('Lỗi Register:', error);
        return res.status(500).json({ 
            success: false, 
            message: 'Lỗi hệ thống, vui lòng thử lại sau.' 
        });
    }
};

// 2. Đăng nhập bằng Email & Password
exports.login = async (req, res) => {
    const { email, password } = req.body;

    try {
        const pool = await poolPromise;
        
        // Lấy thêm role_id và is_active
        const result = await pool.request()
            .input('email', sql.VarChar, email)
            .query('SELECT user_id, email, password_hash, full_name, department, role_id, is_active FROM dbo.users WHERE email = @email');

        if (result.recordset.length === 0) {
            return res.status(401).json({ 
                success: false, 
                message: 'Email hoặc mật khẩu không chính xác.' 
            });
        }

        const user = result.recordset[0];

        // Kiểm tra tài khoản có bị khóa không
        if (!user.is_active) {
            return res.status(403).json({
                success: false,
                message: 'Tài khoản của bạn đã bị khóa.'
            });
        }

        // Nếu tài khoản không có password_hash (đăng nhập bằng Azure AD)
        if (!user.password_hash) {
            return res.status(400).json({
                success: false,
                message: 'Tài khoản này chỉ hỗ trợ đăng nhập qua Microsoft (Azure AD).'
            });
        }

        // So sánh mật khẩu
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ 
                success: false, 
                message: 'Email hoặc mật khẩu không chính xác.' 
            });
        }

        // Cập nhật last_login_at
        await pool.request()
            .input('user_id', sql.Int, user.user_id)
            .query('UPDATE dbo.users SET last_login_at = GETDATE() WHERE user_id = @user_id');

        // Tạo Token JWT (Bổ sung role_id)
        const token = jwt.sign(
            { 
                userId: user.user_id, 
                email: user.email,
                roleId: user.role_id
            },
            JWT_SECRET,
            { expiresIn: '8h' }
        );

        return res.json({
            success: true,
            message: 'Đăng nhập thành công!',
            token,
            user: {
                UserId: user.user_id,
                Username: user.full_name || user.username || user.email,
                Email: user.email,
                RoleId: user.role_id,
                Department: user.department
            }
        });

    } catch (error) {
        console.error('Lỗi Login:', error);
        return res.status(500).json({ 
            success: false, 
            message: 'Lỗi hệ thống, vui lòng thử lại sau.' 
        });
    }
};

// 3. Lấy thông tin cá nhân qua token (GET /api/auth/me)
exports.getMe = async (req, res) => {
    // req.user được middleware authMiddleware đính từ JWT payload
    const userId = req.user.userId;

    if (!userId) {
        return res.status(401).json({
            success: false,
            message: 'Không tìm thấy thông tin người dùng trong token.'
        });
    }

    try {
        const pool = await poolPromise;

        // Query lại thông tin user từ SQL Server dựa trên UserId trong token
        const result = await pool.request()
            .input('user_id', sql.Int, userId)
            .query(`
                SELECT user_id AS UserId,
                       COALESCE(NULLIF(full_name, ''), email) AS Username,
                       email AS Email,
                       role_id AS RoleId,
                       department AS Department,
                       is_active
                FROM dbo.users
                WHERE user_id = @user_id
            `);

        if (result.recordset.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy tài khoản người dùng.'
            });
        }

        const user = result.recordset[0];

        if (!user.is_active) {
            return res.status(403).json({
                success: false,
                message: 'Tài khoản của bạn đã bị khóa.'
            });
        }

        return res.json({
            success: true,
            user: {
                UserId: user.UserId,
                Username: user.Username,
                Email: user.Email,
                RoleId: user.RoleId,
                Department: user.Department
            }
        });

    } catch (error) {
        console.error('Lỗi GetMe:', error);
        return res.status(500).json({
            success: false,
            message: 'Lỗi hệ thống, vui lòng thử lại sau.'
        });
    }
};