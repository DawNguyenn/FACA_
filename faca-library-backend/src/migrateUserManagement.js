/**
 * Khởi chạy migration mở rộng schema quản lý người dùng (idempotent).
 *
 * Các bước:
 *  1. Thêm cột dbo.users.status     varchar(20)  (tri-state: active | inactive | blocked)
 *  2. Thêm cột dbo.users.avatar_url varchar(500)
 *  3. Backfill status từ is_active cho dữ liệu đã tồn tại
 *  4. Thêm các vai trò còn thiếu (Engineer, QC, Warehouse, User) vào dbo.roles
 *
 * Chạy:  node src/migrateUserManagement.js
 */
require('dotenv').config();
const sql = require('mssql');

const cfg = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_DATABASE,
    port: parseInt(process.env.DB_PORT, 10) || 1433,
    options: { encrypt: false, trustServerCertificate: true },
    connectionTimeout: 10000,
    requestTimeout: 15000,
    pool: { max: 5, min: 0, idleTimeoutMillis: 30000 }
};

const statements = [
    // 1. Thêm cột status (chỉ khi chưa tồn tại)
    `
    IF COL_LENGTH('dbo.users', 'status') IS NULL
    BEGIN
        ALTER TABLE dbo.users ADD status varchar(20) NOT NULL CONSTRAINT DF_users_status DEFAULT 'active';
    END
    `,
    // 2. Thêm cột avatar_url (chỉ khi chưa tồn tại)
    `
    IF COL_LENGTH('dbo.users', 'avatar_url') IS NULL
    BEGIN
        ALTER TABLE dbo.users ADD avatar_url varchar(500) NULL;
    END
    `,
    // 3. Backfill: is_active = 0  =>  status = 'blocked'
    `UPDATE dbo.users SET status = 'blocked' WHERE is_active = 0 AND status = 'active' AND user_id NOT IN (SELECT user_id FROM dbo.users WHERE status IN ('inactive','blocked'))`,
    // 4a. Vai trò Engineer
    `IF NOT EXISTS (SELECT 1 FROM dbo.roles WHERE role_name = 'Engineer')
        INSERT INTO dbo.roles (role_name, description) VALUES ('Engineer', N'Kỹ sư / Nhân viên kỹ thuật');`,
    // 4b. Vai trò QA (trước đây đặt tên 'QC' — chấp nhận cả hai để không tạo trùng)
    `IF NOT EXISTS (SELECT 1 FROM dbo.roles WHERE role_name IN ('QA', 'QC'))
        INSERT INTO dbo.roles (role_name, description) VALUES ('QA', N'Kiểm soát chất lượng');`,
    // 4c. Vai trò WareHouse (so khớp không phân biệt hoa/thường nên không tạo trùng 'Warehouse')
    `IF NOT EXISTS (SELECT 1 FROM dbo.roles WHERE role_name = 'Warehouse')
        INSERT INTO dbo.roles (role_name, description) VALUES ('WareHouse', N'Kho vận / Logistics');`,
    // 4d. Vai trò User
    `IF NOT EXISTS (SELECT 1 FROM dbo.roles WHERE role_name = 'User')
        INSERT INTO dbo.roles (role_name, description) VALUES ('User', N'Người dùng thông thường');`,
];

(async () => {
    const pool = await new sql.ConnectionPool(cfg).connect();
    console.log('✅ Kết nối DB thành công.');
    try {
        for (const stmt of statements) {
            await pool.request().batch(stmt);
        }
        const result = await pool.request().query(
            `SELECT role_name FROM dbo.roles ORDER BY role_id`
        );
        console.log('📦 Vai trò hiện tại:', result.recordset.map(r => r.role_name).join(', '));
        console.log('🧪 Kiểm tra cột:',
            await pool.request().query(`SELECT COL_LENGTH('dbo.users','status') AS has_status, COL_LENGTH('dbo.users','avatar_url') AS has_avatar`)
                .then(r => `status=${r.recordset[0].has_status !== null}, avatar_url=${r.recordset[0].has_avatar !== null}`));
        console.log('✅ Migration người dùng hoàn tất.');
    } finally {
        await pool.close();
    }
    process.exit(0);
})().catch((e) => { console.error('❌ Lỗi migration:', e.message); process.exit(1); });