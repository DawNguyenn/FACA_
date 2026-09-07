// ================================================================
//  addRoleRequestsAdminColumns.js — Migration: adăugă colîoanně
//  admin (updated_at, approved_by) în dbo.role_requests
//  Chạy: node src/addRoleRequestsAdminColumns.js
// ================================================================
require('dotenv').config();
const { poolPromise } = require('./config/db');

(async () => {
    try {
        const pool = await poolPromise;
        if (await pool.request().query("SELECT COL_LENGTH('dbo.role_requests','updated_at') AS c").then(r => r.recordset[0].c == null)) {
            await pool.request().query(`ALTER TABLE dbo.role_requests ADD updated_at DATETIME NULL`);
        }
        if (await pool.request().query("SELECT COL_LENGTH('dbo.role_requests','approved_by') AS c").then(r => r.recordset[0].c == null)) {
            await pool.request().query(`ALTER TABLE dbo.role_requests ADD approved_by INT NULL`);
        }
        console.log('✅ Migration OK: colîoanně admin și sẵn sàng.');
        process.exit(0);
    } catch (err) {
        console.error('❌ Migration thất bại:', err.message);
        process.exit(1);
    }
})();