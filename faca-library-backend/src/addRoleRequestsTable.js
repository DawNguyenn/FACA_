// ================================================================
//  addRoleRequestsTable.js — Migration: tạo bảng dbo.role_requests
//  (lưu yêu cầu "Xin cấp quyền / Đổi vai trò" từ người dùng)
//  Chạy: node src/addRoleRequestsTable.js
// ================================================================
require('dotenv').config();
const { poolPromise } = require('./config/db');

(async () => {
    try {
        const pool = await poolPromise;
        await pool.request().query(`
            IF OBJECT_ID('dbo.role_requests', 'U') IS NULL
            BEGIN
                CREATE TABLE dbo.role_requests (
                    request_id        INT IDENTITY(1,1) PRIMARY KEY,
                    user_id           INT NOT NULL,
                    requested_role_id INT NOT NULL,
                    reason            NVARCHAR(500) NULL,
                    status            VARCHAR(20) NOT NULL CONSTRAINT DF_role_requests_status DEFAULT ('pending'),
                    created_at        DATETIME NOT NULL CONSTRAINT DF_role_requests_created DEFAULT (GETDATE())
                );
            END
        `);
        console.log('✅ Migration OK: bảng dbo.role_requests đã sẵn sàng.');
        process.exit(0);
    } catch (err) {
        console.error('❌ Migration thất bại:', err.message);
        process.exit(1);
    }
})();
