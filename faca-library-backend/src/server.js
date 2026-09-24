const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { poolPromise } = require('./config/db');

const app = express();
const PORT = process.env.PORT || 5000;

// ==========================================
// 1. MIDDLEWARES CƠ BẢN (PHẢI ĐẶT ĐẦU TIÊN)
// ==========================================
app.use(cors());
// Body JSON lớn hơn mặc định (100kb) vì Data Grid nhập liệu gửi cả sheet (columns + rows) 1 lần.
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Serve ảnh đã upload (avatar...) dưới dạng file tĩnh
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


// ==========================================
// 2. API ROUTES
// ==========================================

// Import & Sử dụng các Routes hệ thống
const issueRoutes = require('./routes/issueRoutes');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const adminRoutes = require('./routes/adminRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const roleRequestRoutes = require('./routes/roleRequestRoutes');
const inventoryImportRoutes = require('./routes/inventoryImportRoutes');
const inventoryListRoutes = require('./routes/inventoryListRoutes');
const inventoryDataRoutes = require('./routes/warehouseDataRoutes');
const reportRoutes = require('./routes/reportRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');

app.use('/api/issues', issueRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/role-requests', roleRequestRoutes);

// Thư viện báo cáo lỗi PowerPoint (quét file .pptx từ thư mục OneDrive local)
app.use('/api/reports', reportRoutes);

// Async Excel import pipeline & inventory list
app.use('/api/inventory', inventoryImportRoutes);
app.use('/api/inventory', inventoryListRoutes);

// Đọc dữ liệu kho SQL-Centric
app.use('/api/warehouse', inventoryDataRoutes);

// Số liệu thật cho Trang chủ (Home): báo cáo FACA / sự cố chờ xử lý / tồn kho
app.use('/api/dashboard', dashboardRoutes);

// Route Health Check & Test DB
app.get('/', (req, res) => {
  res.json({
    message: 'FACA Library API Service đang hoạt động!',
    timestamp: new Date()
  });
});

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


// ==========================================
// 3. ĐẢM BẢO SCHEMA CẦN THIẾT (idempotent)
// ==========================================
/**
 * role_requests.hidden_by_user: phục vụ việc NGƯỜI DÙNG xóa yêu cầu cấp quyền
 * theo kiểu "xóa mềm" — chỉ ẩn khỏi danh sách của họ, còn quản trị viên vẫn
 * thấy đầy đủ cho tới khi chính Admin xóa vĩnh viễn.
 * Bọc try/catch để không bao giờ chặn server khởi động.
 */
async function ensureRoleRequestsSchema() {
  try {
    const pool = await poolPromise;
    const col = await pool.request()
      .query("SELECT COL_LENGTH('dbo.role_requests', 'hidden_by_user') AS c");

    if (col.recordset[0].c == null) {
      await pool.request().query(`
        ALTER TABLE dbo.role_requests
        ADD hidden_by_user BIT NOT NULL CONSTRAINT DF_role_requests_hidden DEFAULT (0)
      `);
      console.log('➕ Đã thêm cột dbo.role_requests.hidden_by_user (xóa mềm theo người dùng).');
    }
  } catch (error) {
    console.warn('⚠️  Bỏ qua kiểm tra schema dbo.role_requests:', error.message);
  }
}

ensureRoleRequestsSchema();


// ==========================================
// 4. KHỞI CHẠY SERVER
// ==========================================
app.listen(PORT, () => {
  console.log(`🚀 Server FACA Library Backend đang chạy tại: http://localhost:${PORT}`);
});