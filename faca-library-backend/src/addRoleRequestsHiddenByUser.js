// ================================================================
//  addRoleRequestsHiddenByUser.js — Migration: thêm cột hidden_by_user
//  vào dbo.role_requests.
//
//  Ý nghĩa: khi NGƯỜI DÙNG xóa yêu cầu cấp quyền của mình, hệ thống
//  KHÔNG xóa thật mà chỉ set hidden_by_user = 1 → yêu cầu biến mất khỏi
//  "Yêu cầu của tôi" (GET /api/role-requests/me) nhưng QUẢN TRỊ VIÊN
//  vẫn thấy đầy đủ ở GET /api/role-requests/all cho tới khi chính Admin
//  bấm xóa (khi đó mới DELETE cứng khỏi bảng).
//
//  Chạy: node src/addRoleRequestsHiddenByUser.js  (idempotent)
// ================================================================
require('dotenv').config();
const { poolPromise } = require('./config/db');

(async () => {
    try {
        const pool = await poolPromise;

        const existing = await pool.request()
            .query("SELECT COL_LENGTH('dbo.role_requests', 'hidden_by_user') AS c");

        if (existing.recordset[0].c == null) {
            await pool.request().query(`
                ALTER TABLE dbo.role_requests
                ADD hidden_by_user BIT NOT NULL
                    CONSTRAINT DF_role_requests_hidden DEFAULT (0)
            `);
            console.log('➕ Đã thêm cột dbo.role_requests.hidden_by_user');
        } else {
            console.log('ℹ️  Cột hidden_by_user đã tồn tại — bỏ qua.');
        }

        console.log('✅ Migration OK: dbo.role_requests sẵn sàng cho việc ẩn yêu cầu theo người dùng.');
        process.exit(0);
    } catch (err) {
        console.error('❌ Migration thất bại:', err.message);
        process.exit(1);
    }
})();