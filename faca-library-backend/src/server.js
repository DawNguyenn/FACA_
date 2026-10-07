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
const slideRoutes = require('./routes/slideRoutes');

app.use('/api/issues', issueRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/role-requests', roleRequestRoutes);

// Thư viện báo cáo lỗi PowerPoint (quét file .pptx từ thư mục OneDrive local)
app.use('/api/reports', reportRoutes);

// Tìm kiếm nội dung từng slide .pptx + nhảy trực tiếp tới slide (wdSlideIndex)
app.use('/api/slides', slideRoutes);

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

/**
 * dbo.Staging_SheetMeta: metadata header của từng sheet kho (tên file gốc,
 * người nhập, thời điểm nhập, dự án/build, trạng thái, mô tả).
 * Tự tạo idempotent — không đụng tới dữ liệu staging hiện có.
 */
async function ensureSheetMeta() {
    try {
        const { ensureSheetMetaSchema } = require('./services/sheetMetaService');
        const pool = await poolPromise;
        await ensureSheetMetaSchema(pool);
        console.log('✅ Bảng dbo.Staging_SheetMeta đã sẵn sàng (metadata header cho sheet kho).');
    } catch (error) {
        console.warn('⚠️  Bỏ qua kiểm tra schema dbo.Staging_SheetMeta:', error.message);
    }
}
ensureSheetMeta();

/**
 * dbo.data_audit_logs: nhật ký thao tác dữ liệu (ai sửa / lúc nào / sửa gì /
 * giá trị trước-sau). Tự tạo idempotent — không ảnh hưởng dữ liệu hiện có.
 */
async function ensureAuditLogs() {
    try {
        const { ensureAuditLogsSchema } = require('./services/auditLogService');
        const pool = await poolPromise;
        await ensureAuditLogsSchema(pool);
        console.log('✅ Bảng dbo.data_audit_logs đã sẵn sàng (nhật ký chỉnh sửa dữ liệu).');
    } catch (error) {
        console.warn('⚠️  Bỏ qua kiểm tra schema dbo.data_audit_logs:', error.message);
    }
}
ensureAuditLogs();


// Cron quét chỉ mục slide .pptx tự động (mặc định 15 phút/lần, đổi qua SLIDE_CRON).
try {
  const { startSlideCron } = require('./services/cronScanner');
  if (process.env.DISABLE_SLIDE_CRON !== '1') startSlideCron();
} catch (error) {
  console.warn('⚠️  Không khởi động được slide cron:', error.message);
}


// ==========================================
// 4. KIỂM TRA SMTP KHI KHỞI ĐỘNG (tùy chọn, không chặn)
// ==========================================
// Log chi tiết mã response / TLS handshake để chẩn đoán lỗi gửi OTP trong
// mạng nội bộ (firewall/proxy doanh nghiệp). Chạy `npm run test:smtp` để
// chẩn đoán đầy đủ hơn (raw SMTP + DNS SPF/DKIM/DMARC + REST HTTPS 443).
try {
  const { verifyOnStartup } = require('./controllers/mailer');
  verifyOnStartup(); // fire-and-forget — bên trong đã try/catch toàn bộ
} catch (error) {
  console.warn('⚠️  Không khởi động được kiểm tra SMTP:', error.message);
}

// ==========================================
// 5. KHỞI CHẠY SERVER
// ==========================================
app.listen(PORT, () => {
  console.log(`🚀 Server FACA Library Backend đang chạy tại: http://localhost:${PORT}`);
});