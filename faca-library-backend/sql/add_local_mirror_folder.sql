/* ============================================================
   add_local_mirror_folder.sql — Thêm "thư mục mirror local" làm gốc quét CHÍNH
   cho tính năng Slide Search, dùng khi OneDrive cloud-only không tải file về máy được.

   BỐI CẢNH (xem docs/slide-search.md):
     - 25/26 file .pptx nằm trong thư mục được chia sẻ của OneDrive người khác
       (671445@sv.vnua.edu.vn) và đang ở trạng thái cloud-only (chỉ có placeholder).
     - OneDrive trên máy không gắn được Cloud Files provider cho account vnua.edu.vn
       → đọc file trả lỗi "The cloud file provider is not running" → không index được nội dung.
     - Cách xử lý không phụ thuộc OneDrive: tải các file .pptx về 1 thư mục LOCAL bình thường
       (giữ nguyên cấu trúc thư mục con) rồi khai báo thư mục đó thành 1 dòng SyncFolders.
       Cron scanner sẽ index nội dung từ bản local, còn link nhúng iframe vẫn trỏ SharePoint
       (nhờ cột sharepoint_url_prefix + bảng dbo.SyncFolderMappings đã có sẵn).

   THỨ TỰ THỰC HIỆN:
     1. Tải file .pptx từ OneDrive/SharePoint web về đúng thư mục mirror (xem @MirrorRoot).
     2. Chạy script này (idempotent — chạy lại nhiều lần không nhân bản dữ liệu).
     3. POST /api/slides/reindex  (hoặc chờ cron 15 phút) rồi kiểm tra lại Slide Search.

   Chạy:
     sqlcmd -S DAWNGUYENN -U sa -P <password> -d FACA_DB -i sql\add_local_mirror_folder.sql
   ============================================================ */
USE FACA_DB;
GO

-- ============ CẤU HÌNH (đổi ở đây nếu dùng ổ đĩa/đường dẫn khác) ============
DECLARE @MirrorRoot  NVARCHAR(500) = N'D:\FACA_Library\PSM27_Library';
DECLARE @ProjectName NVARCHAR(255) = N'PSM27_Library (local mirror)';
-- URL THƯ MỤC TRỰC TIẾP trên OneDrive web của thư mục gốc (KHÔNG phải trang chủ OneDrive).
-- Thư mục gốc PSM27 Library nằm trên OneDrive của 671445@sv.vnua.edu.vn (được chia sẻ cho 671279@sv.vnua.edu.vn).
DECLARE @DirectPrefix NVARCHAR(500) =
    N'https://vnuaeduvn-my.sharepoint.com/personal/671445_sv_vnua_edu_vn/Documents/PSM27 Library';

-- 1. Thêm gốc quét local mirror
IF NOT EXISTS (SELECT 1 FROM dbo.SyncFolders WHERE folder_path = @MirrorRoot)
BEGIN
    INSERT INTO dbo.SyncFolders (project_name, folder_path, sharepoint_url_prefix, is_active)
    VALUES (@ProjectName, @MirrorRoot, @DirectPrefix, 1);
    PRINT N'➕ Đã thêm SyncFolders (local mirror): ' + @MirrorRoot;
END
ELSE
BEGIN
    UPDATE dbo.SyncFolders
       SET project_name = @ProjectName,
           sharepoint_url_prefix = @DirectPrefix,
           is_active = 1
     WHERE folder_path = @MirrorRoot;
    PRINT N'ℹ️  Đã cập nhật SyncFolders (local mirror): ' + @MirrorRoot;
END
GO

-- 2. Sửa prefix SAI của gốc OneDrive gốc: alias 671279 + tên thư mục 'PSM27_Library'
--    không tồn tại trên web (thư mục thật là 'PSM27 Library' và thuộc alias 671445).
--    Trước đây link đúng chỉ nhờ bảng ánh xạ thư mục con (EE/ME/OE) — xem sql/add_sync_folder_mappings.sql.
UPDATE dbo.SyncFolders
   SET sharepoint_url_prefix =
       N'https://vnuaeduvn-my.sharepoint.com/personal/671445_sv_vnua_edu_vn/Documents/PSM27 Library'
 WHERE folder_path = N'C:\Users\laptop\OneDrive - vnua.edu.vn\PSM27_Library'
   AND sharepoint_url_prefix LIKE N'%671279_sv_vnua_edu_vn%';
GO

-- 3. Kiểm tra: cả 2 gốc quét đều active + ánh xạ thư mục con dùng chung (folder_id = NULL)
SELECT folder_id, project_name, folder_path, sharepoint_url_prefix, is_active
FROM dbo.SyncFolders
ORDER BY folder_id;
GO

SELECT mapping_id, local_subpath, remote_url_prefix, is_active
FROM dbo.SyncFolderMappings
ORDER BY local_subpath;
GO
