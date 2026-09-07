// ================================================================
//  addLanguageColumn.js — Migration: thêm cột 'language' vào dbo.users
//  Chạy: node src/addLanguageColumn.js
// ================================================================
require('dotenv').config();
const { poolPromise } = require('./config/db');

(async () => {
    try {
        const pool = await poolPromise;
        // An toàn khi chạy lại: chỉ thêm cột nếu chưa tồn tại
        await pool.request().query(`
            IF COL_LENGTH('dbo.users', 'language') IS NULL
            BEGIN
                ALTER TABLE dbo.users
                    ADD language VARCHAR(8) NULL
                    CONSTRAINT DF_users_language DEFAULT ('vi') WITH VALUES;
            END
        `);
        // Set giá trị mặc định cho các bản ghi hiện có
        await pool.request().query(`
            UPDATE dbo.users SET language = 'vi' WHERE language IS NULL;
        `);
        console.log('✅ Migration OK: cột dbo.users.language đã sẵn sàng (mặc định vi).');
        process.exit(0);
    } catch (err) {
        console.error('❌ Migration thất bại:', err.message);
        process.exit(1);
    }
})();
