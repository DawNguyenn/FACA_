const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { sql, poolPromise } = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_key_faca_library';

// 1. Đăng ký tài khoản
exports.register = async (req, res) => {
    const { email, password, full_name, department, language } = req.body;
    const VALID_LANGUAGES = ['vi', 'en', 'ko'];

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
        // Lưu ngôn ngữ người dùng chọn trên trang Đăng ký (mặc định 'vi')
        await pool.request()
            .input('email', sql.VarChar, email)
            .input('password_hash', sql.VarChar, password_hash)
            .input('full_name', sql.NVarChar, full_name)
            .input('department', sql.NVarChar, department || '')
            .input('language', sql.VarChar, VALID_LANGUAGES.includes(language) ? language : 'vi')
            .query(`
                INSERT INTO dbo.users (email, password_hash, full_name, department, language, role_id, is_active, created_at)
                VALUES (@email, @password_hash, @full_name, @department, @language, 2, 1, GETDATE())
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
            .query('SELECT user_id, email, password_hash, full_name, department, language, role_id, is_active FROM dbo.users WHERE email = @email');

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

        // Đồng bộ ngôn ngữ người dùng chọn trên trang Login (nếu hợp lệ)
        const VALID_LANGUAGES = ['vi', 'en', 'ko'];
        if (VALID_LANGUAGES.includes(req.body?.language)) {
            await pool.request()
                .input('user_id', sql.Int, user.user_id)
                .input('language', sql.VarChar, req.body.language)
                .query('UPDATE dbo.users SET language = @language WHERE user_id = @user_id');
            user.language = req.body.language;
        }

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
                Department: user.department,
                language: user.language || 'vi'
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
        // JOIN dbo.roles để lấy tên vai trò (hiển thị ở trang cá nhân)
        const result = await pool.request()
            .input('user_id', sql.Int, userId)
            .query(`
                SELECT u.user_id AS UserId,
                       u.full_name AS full_name,
                       COALESCE(NULLIF(u.full_name, ''), u.email) AS Username,
                       u.email AS Email,
                       u.role_id AS RoleId,
                       r.role_name AS role_name,
                       r.description AS role_description,
                       u.department AS Department,
                       u.department AS department,
                       u.avatar_url AS avatar_url,
                       ISNULL(u.language, 'vi') AS language,
                       u.is_active
                FROM dbo.users u
                LEFT JOIN dbo.roles r ON u.role_id = r.role_id
                WHERE u.user_id = @user_id
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
                Department: user.Department,
                // Các trường đầy đủ phục vụ trang /profile
                full_name: user.full_name,
                department: user.department,
                avatar_url: user.avatar_url || '',
                language: user.language || 'vi',
                // Vai trò (lấy từ dbo.roles) để trang cá nhân hiển thị — chỉ xem, không sửa
                role_id: user.RoleId,
                role_name: user.role_name || '',
                role_description: user.role_description || ''
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

// 4. Quên mật khẩu (POST /api/auth/forgot-password)
// Sinh mã OTP 6 số, lưu SHA256 hash vào bảng password_resets (hết hạn sau 5 phút)
// rồi gửi email chứa mã OTP tới người dùng (xem mailer.js → sendOtpEmail)
exports.forgotPassword = async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({
            success: false,
            message: 'Vui lòng nhập email.'
        });
    }

    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('email', sql.VarChar, email.trim())
            .query('SELECT user_id, email, full_name, password_hash FROM dbo.users WHERE email = @email');

        // Trả về message chung để tránh dò email tồn tại trong hệ thống
        const GENERIC_MESSAGE = 'Nếu email của bạn tồn tại trong hệ thống, chúng tôi đã gửi mã OTP đặt lại mật khẩu. Vui lòng kiểm tra hộp thư (kể cả mục Spam).';

        if (result.recordset.length === 0) {
            return res.json({ success: true, message: GENERIC_MESSAGE });
        }

        const user = result.recordset[0];

        // Tài khoản Azure AD (không có mật khẩu nội bộ) → không đặt lại được
        if (!user.password_hash) {
            return res.json({ success: true, message: GENERIC_MESSAGE });
        }

        // Sinh mã OTP 6 chữ số và lưu SHA256 hash vào DB (không lưu mã gốc)
        const crypto = require('crypto');
        const otp = crypto.randomInt(0, 1000000).toString().padStart(6, '0');
        const otpHash = crypto.createHash('sha256').update(otp).digest('hex');

        // Vô hiệu hóa các OTP cũ của user này, rồi tạo OTP mới (expires 5 phút)
        await pool.request()
            .input('user_id', sql.Int, user.user_id)
            .query('DELETE FROM dbo.password_resets WHERE user_id = @user_id');

        await pool.request()
            .input('user_id', sql.Int, user.user_id)
            .input('token_hash', sql.VarChar, otpHash)
            .query(`
                INSERT INTO dbo.password_resets (user_id, token_hash, expires_at, created_at, attempts)
                VALUES (@user_id, @token_hash, DATEADD(MINUTE, 5, GETDATE()), GETDATE(), 0)
            `);

        // Gửi email chứa mã OTP
        try {
            const { sendOtpEmail } = require('./mailer');
            const mailResult = await sendOtpEmail(user.email, otp);
            // sendOtpEmail không throw mà trả về { success, message }
            if (mailResult && mailResult.success === false) {
                throw new Error(mailResult.message || 'Gửi email thất bại');
            }
        } catch (mailError) {
            console.error('Lỗi gửi email đặt lại mật khẩu:', mailError);
            return res.status(500).json({
                success: false,
                message: 'Không thể gửi email đặt lại mật khẩu. Vui lòng thử lại sau.'
            });
        }

        return res.json({ success: true, message: GENERIC_MESSAGE });

    } catch (error) {
        console.error('Lỗi ForgotPassword:', error);
        return res.status(500).json({
            success: false,
            message: 'Lỗi hệ thống, vui lòng thử lại sau.'
        });
    }
};

// 5. Đặt lại mật khẩu (POST /api/auth/reset-password)
// Body: { email, password, otp }  HOẶC  { email, password, token }
//  - otp  : mã OTP 6 số gửi qua email (hiệu lực 5 phút)
//  - token: token trong link email (hiệu lực 15 phút)
// Sai quá 5 lần → hủy OTP, người dùng phải yêu cầu lại.
exports.resetPassword = async (req, res) => {
    const { email, password } = req.body;
    // Chấp nhận cả `otp` (mã 6 số) và `token` (link email)
    const code = (req.body.otp || req.body.token || '').toString().trim();

    if (!email || !code || !password) {
        return res.status(400).json({
            success: false,
            message: 'Thiếu thông tin đặt lại mật khẩu.'
        });
    }

    if (password.length < 6) {
        return res.status(400).json({
            success: false,
            message: 'Mật khẩu mới phải có ít nhất 6 ký tự.'
        });
    }

    try {
        const crypto = require('crypto');
        const codeHash = crypto.createHash('sha256').update(code).digest('hex');

        const pool = await poolPromise;

        // Tìm user theo email
        const userResult = await pool.request()
            .input('email', sql.VarChar, email.trim())
            .query('SELECT user_id, is_active FROM dbo.users WHERE email = @email');

        if (userResult.recordset.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Mã đặt lại mật khẩu không hợp lệ.'
            });
        }

        const user = userResult.recordset[0];

        // Kiểm tra mã hợp lệ và chưa hết hạn
        const codeResult = await pool.request()
            .input('user_id', sql.Int, user.user_id)
            .input('token_hash', sql.VarChar, codeHash)
            .query(`
                SELECT reset_id FROM dbo.password_resets
                WHERE user_id = @user_id
                  AND token_hash = @token_hash
                  AND expires_at > GETDATE()
            `);

        if (codeResult.recordset.length === 0) {
            // Đếm số lần nhập sai: quá 5 lần thì hủy mã, bắt người dùng yêu cầu lại
            const bumped = await pool.request()
                .input('user_id', sql.Int, user.user_id)
                .query(`
                    UPDATE dbo.password_resets
                    SET attempts = ISNULL(attempts, 0) + 1
                    OUTPUT INSERTED.attempts
                    WHERE user_id = @user_id AND expires_at > GETDATE()
                `);

            const attempts = bumped.recordset[0] ? bumped.recordset[0].attempts : null;

            if (attempts !== null && attempts >= 5) {
                await pool.request()
                    .input('user_id', sql.Int, user.user_id)
                    .query('DELETE FROM dbo.password_resets WHERE user_id = @user_id');

                return res.status(400).json({
                    success: false,
                    message: 'Bạn đã nhập sai quá nhiều lần. Vui lòng yêu cầu gửi lại mã OTP.'
                });
            }

            return res.status(400).json({
                success: false,
                message: 'Mã đặt lại mật khẩu không hợp lệ hoặc đã hết hạn. Vui lòng yêu cầu lại.'
            });
        }

        // Cập nhật mật khẩu mới
        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);

        await pool.request()
            .input('user_id', sql.Int, user.user_id)
            .input('password_hash', sql.VarChar, password_hash)
            .query('UPDATE dbo.users SET password_hash = @password_hash WHERE user_id = @user_id');

        // Xóa OTP/token sau khi dùng (chỉ dùng được một lần)
        await pool.request()
            .input('user_id', sql.Int, user.user_id)
            .query('DELETE FROM dbo.password_resets WHERE user_id = @user_id');

        return res.json({
            success: true,
            message: 'Đặt lại mật khẩu thành công! Bạn có thể đăng nhập bằng mật khẩu mới.'
        });

    } catch (error) {
        console.error('Lỗi ResetPassword:', error);
        return res.status(500).json({
            success: false,
            message: 'Lỗi hệ thống, vui lòng thử lại sau.'
        });
    }
};
