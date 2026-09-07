const sql = require('mssql');
require('dotenv').config();

const dbConfig = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_DATABASE,
    port: parseInt(process.env.DB_PORT, 10) || 1433,
    options: {
        encrypt: false, 
        trustServerCertificate: true, 
    },
    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
    }
};

// Tạo Connection Pool
const poolPromise = new sql.ConnectionPool(dbConfig)
    .connect()
    .then(pool => {
        console.log('✅ Đã kết nối thành công tới SQL Server database:', process.env.DB_DATABASE);
        return pool;
    })
    .catch(err => {
        console.error('❌ Lỗi kết nối SQL Server: ', err);
        process.exit(1);
    });

module.exports = {
    sql,
    poolPromise
};