// ================================================================
//  createPasswordResetsTable.js — Migration tạo bảng password_resets
//  dùng cho tính năng "Quên mật khẩu". Chạy: node src/createPasswordResetsTable.js
// ================================================================
const { poolPromise } = require('./config/db');

(async () => {
    try {
        const pool = await poolPromise;
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[password_resets]') AND type = N'U')
            BEGIN
                CREATE TABLE dbo.password_resets (
                    reset_id INT IDENTITY(1,1) PRIMARY KEY,
                    user_id INT NOT NULL,
                    token_hash VARCHAR(64) NOT NULL,
                    expires_at DATETIME NOT NULL,
                    created_at DATETIME NOT NULL DEFAULT GETDATE(),
                    attempts INT NOT NULL DEFAULT 0
                );
            END
        `);
        // Bổ sung cột attempts cho bảng đã tạo trước đó (đếm số lần nhập sai OTP)
        await pool.request().query(`
            IF COL_LENGTH('dbo.password_resets', 'attempts') IS NULL
            BEGIN
                ALTER TABLE dbo.password_resets
                ADD attempts INT NOT NULL CONSTRAINT DF_password_resets_attempts DEFAULT 0;
            END
        `);
        console.log('✅ Đã đảm bảo bảng dbo.password_resets tồn tại (có cột attempts).');
        process.exit(0);
    } catch (error) {
        console.error('❌ Lỗi tạo bảng password_resets:', error);
        process.exit(1);
    }
})();