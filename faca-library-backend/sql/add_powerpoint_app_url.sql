/* ============================================================
   add_powerpoint_app_url.sql — Nâng cấp thư viện báo cáo lỗi PowerPoint
   để click trên web FACTS là mở THẲNG file .pptx (không ra trang danh sách chung).

   Nội dung:
     1. Thêm cột dbo.PresentationReports.powerpoint_app_url
        (link protocol handler ms-powerpoint:ofe|u|<url> → mở bằng app PowerPoint Desktop).
     2. Cập nhật dbo.SyncFolders.sharepoint_url_prefix từ link trang chủ OneDrive
        sang URL THƯ MỤC TRỰC TIẾP (để ghép được đường dẫn file).
     3. Backfill powerpoint_app_url cho các dòng cache cũ (sau đó nên bấm
        "Quét lại thư mục" trên web để sinh lại toàn bộ link chuẩn).

   Script idempotent — chạy lại nhiều lần không lỗi, không nhân bản dữ liệu.
   Chạy:
     sqlcmd -S DAWNGUYENN -U sa -P <password> -d FACA_DB -i sql\add_powerpoint_app_url.sql
   ============================================================ */
USE FACA_DB;
GO

-- 1. Cột lưu link mở bằng ứng dụng PowerPoint Desktop (protocol handler ms-powerpoint:)
--    Dài 2000 ký tự (thay vì 1000) để không bị cắt cụt URL đã thêm tiền tố 20 ký tự.
IF COL_LENGTH('dbo.PresentationReports', 'powerpoint_app_url') IS NULL
BEGIN
    ALTER TABLE dbo.PresentationReports ADD powerpoint_app_url NVARCHAR(2000) NULL;
    PRINT N'➕ Đã thêm cột dbo.PresentationReports.powerpoint_app_url (NVARCHAR(2000)).';
END
ELSE
    PRINT N'ℹ️  Cột dbo.PresentationReports.powerpoint_app_url đã tồn tại, bỏ qua.';
GO

-- 2. Chuyển sharepoint_url_prefix sang URL thư mục TRỰC TIẾP trên OneDrive for Business.
--    URL trực tiếp = URL khi mở thư mục trên OneDrive web (Copy link), KHÔNG phải trang chủ.
IF EXISTS (
    SELECT 1 FROM dbo.SyncFolders
    WHERE sharepoint_url_prefix LIKE N'%sharepoint.aspx%'
       OR sharepoint_url_prefix LIKE N'%/_layouts/%'
)
BEGIN
    UPDATE dbo.SyncFolders
    SET sharepoint_url_prefix = N'https://vnuaeduvn-my.sharepoint.com/personal/671279_sv_vnua_edu_vn/Documents/PSM27_Library'
    WHERE folder_path = N'C:\Users\laptop\OneDrive - vnua.edu.vn\PSM27_Library';

    PRINT N'➕ Đã cập nhật sharepoint_url_prefix sang URL thư mục trực tiếp.';
END
ELSE
    PRINT N'ℹ️  sharepoint_url_prefix đã là URL trực tiếp, bỏ qua.';
GO

-- 3. Backfill link mở bằng app PowerPoint cho dòng cache cũ (chưa đồng bộ lại).
--    Lưu ý: bỏ cờ ?web=1 vì cờ này chỉ dùng cho trình duyệt, protocol handler ms-powerpoint: không cần.
UPDATE dbo.PresentationReports
SET powerpoint_app_url = N'ms-powerpoint:ofe|u|' + REPLACE(sharepoint_web_url, N'?web=1', N'')
WHERE (powerpoint_app_url IS NULL OR powerpoint_app_url = N'')
  AND sharepoint_web_url IS NOT NULL
  AND sharepoint_web_url LIKE N'http%';

PRINT N'➕ Đã backfill powerpoint_app_url cho các dòng cache cũ.';
GO

-- 4. Kiểm tra kết quả
SELECT TOP 5
    report_id,
    file_name,
    category_code,
    sharepoint_web_url,
    powerpoint_app_url
FROM dbo.PresentationReports
ORDER BY report_id DESC;

SELECT folder_id, project_name, folder_path, sharepoint_url_prefix, is_active
FROM dbo.SyncFolders
ORDER BY folder_id;
GO
