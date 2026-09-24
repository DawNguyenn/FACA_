/**
 * errorController.js — API thư viện báo cáo lỗi PowerPoint (EE / OE / ME).
 * Dữ liệu đọc từ cache dbo.PresentationReports (được đồng bộ bởi services/scannerService).
 *
 *  - GET  /api/reports       → danh sách báo cáo (?category=ALL|LOI_DIEN|LOI_QUANG|LOI_CO&search=...)
 *  - POST /api/reports/sync  → quét lại các thư mục OneDrive local và cập nhật cache
 *
 * Mỗi báo cáo trả về 2 link mở TRỰC TIẾP file .pptx (click là mở đúng file, không ra trang danh sách):
 *   - sharepoint_web_url : PowerPoint Online trong trình duyệt (...?web=1)
 *   - powerpoint_app_url : ứng dụng PowerPoint Desktop qua protocol handler (ms-powerpoint:ofe|u|...)
 */
const { poolPromise, sql } = require('../config/db');
const { scanPresentations, CATEGORY_CODES } = require('../services/scannerService');

// 1. LẤY DANH SÁCH BÁO CÁO POWERPOINT (lọc theo danh mục lỗi + từ khóa tìm kiếm)
const getReports = async (req, res) => {
    try {
        const { category, search } = req.query;
        const pool = await poolPromise;

        let query = `
            SELECT
                r.report_id,
                r.file_name,
                r.relative_path,
                r.folder_id,
                f.project_name,
                r.category_code,
                r.sharepoint_web_url,
                r.powerpoint_app_url,
                r.file_size_mb,
                r.last_modified
            FROM dbo.PresentationReports r
            LEFT JOIN dbo.SyncFolders f ON f.folder_id = r.folder_id
            WHERE 1 = 1
        `;

        const request = pool.request();

        // Lọc theo danh mục lỗi (EE / OE / ME). 'ALL' hoặc bỏ trống = lấy tất cả.
        if (category && category !== 'ALL') {
            if (!CATEGORY_CODES.includes(category)) {
                return res.status(400).json({
                    success: false,
                    message: `Danh mục không hợp lệ. Chỉ chấp nhận: ALL, ${CATEGORY_CODES.join(', ')}`,
                });
            }
            query += ` AND r.category_code = @category_code`;
            request.input('category_code', sql.NVarChar(50), category);
        }

        // Tìm kiếm theo tên file / đường dẫn tương đối / tên dự án
        if (search && String(search).trim()) {
            query += ` AND (r.file_name LIKE @search OR r.relative_path LIKE @search OR f.project_name LIKE @search)`;
            request.input('search', sql.NVarChar(500), `%${String(search).trim()}%`);
        }

        query += ` ORDER BY r.last_modified DESC, r.report_id DESC`;

        const result = await request.query(query);

        // Bổ sung link mở bằng app PowerPoint cho các dòng cache cũ (chưa có cột powerpoint_app_url)
        const data = result.recordset.map((row) => ({
            ...row,
            powerpoint_app_url:
                row.powerpoint_app_url ||
                (row.sharepoint_web_url
                    // Link protocol handler của app Desktop không cần cờ ?web=1 (cờ này chỉ dành cho trình duyệt)
                    ? `ms-powerpoint:ofe|u|${String(row.sharepoint_web_url).replace('?web=1', '')}`
                    : null),
        }));

        res.status(200).json({
            success: true,
            count: data.length,
            data,
        });
    } catch (error) {
        console.error('Lỗi khi lấy danh sách báo cáo PowerPoint:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi hệ thống khi tải danh sách báo cáo.',
            error: error.message,
        });
    }
};

// 2. QUÉT LẠI THƯ MỤC ONEDRIVE LOCAL (trigger thủ công từ giao diện Quản lý Lỗi)
const syncReports = async (req, res) => {
    try {
        const rawFolderId = req.body?.folder_id;
        const parsedFolderId = Number.parseInt(rawFolderId, 10);
        const folderId = Number.isInteger(parsedFolderId) ? parsedFolderId : null;

        const summary = await scanPresentations({ folderId });

        res.status(200).json({
            success: true,
            message: `Đã quét ${summary.totalFiles} báo cáo PowerPoint trong ${summary.scannedFolders} thư mục.`,
            data: summary,
        });
    } catch (error) {
        console.error('Lỗi khi quét thư mục PowerPoint:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi hệ thống khi quét thư mục báo cáo.',
            error: error.message,
        });
    }
};

module.exports = {
    getReports,
    syncReports,
};
