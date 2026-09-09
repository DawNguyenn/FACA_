const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { poolPromise, sql } = require('./config/db');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware cơ bản (PHẢI đặt TRƯỚC khi mount các Route)
// - cors(): Cho phép Front-end (React/Vite) gọi API
// - express.json() & express.urlencoded(): Parse dữ liệu từ body request
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Import các Routes
const path = require('path');
const issueRoutes = require('./routes/issueRoutes');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const adminRoutes = require('./routes/adminRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const roleRequestRoutes = require('./routes/roleRequestRoutes');
const warehouseExcelRoutes = require('./routes/warehouseExcelRoutes');

// Serve ảnh đã upload (avatar...) dưới dạng file tĩnh
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Sử dụng các Routes
app.use('/api/issues', issueRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/role-requests', roleRequestRoutes);
// Đọc Excel quản lý kho: /api/sheets, /api/sheet-data?name=...
app.use('/api', warehouseExcelRoutes);

// Route kiểm tra trạng thái Server (Health Check)
app.get('/', (req, res) => {
    res.json({
        message: 'FACA Library API Service đang hoạt động!',
        timestamp: new Date()
    });
});

// Route mẫu thử truy vấn Database SQL Server
app.get('/api/test-db', async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query('SELECT GETDATE() AS CurrentTime, @@VERSION AS SQLVersion');
        
        res.json({
            success: true,
            data: result.recordset[0]
        });
    } catch (error) {
        console.error('Lỗi khi query thử DB:', error);
        res.status(500).json({
            success: false,
            message: 'Không thể kết nối hoặc truy vấn CSDL.',
            error: error.message
        });
    }
});

// Khởi chạy Server
app.listen(PORT, () => {
    console.log(`🚀 Server FACA Library Backend đang chạy tại: http://localhost:${PORT}`);
});