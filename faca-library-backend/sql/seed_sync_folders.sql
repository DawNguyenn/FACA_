/* ============================================================
   seed_sync_folders.sql — Cấu hình thư mục OneDrive cần quét cho tính năng
   "Thư viện báo cáo lỗi PowerPoint" (EE / OE / ME).

   Bảng liên quan (đã có sẵn trong FACA_DB):
     - dbo.SyncFolders        : danh sách thư mục dự án cần quét (is_active = 1)
     - dbo.PresentationReports: cache file PowerPoint sau khi quét

   Script idempotent — chạy lại nhiều lần không nhân bản dữ liệu.
   Chạy:
     sqlcmd -S DAWNGUYENN -U sa -P <password> -d FACA_DB -i sql\seed_sync_folders.sql
   Lưu ý: Backend cũng tự seed dòng mặc định khi bảng SyncFolders chưa có dòng active
   (xem services/scannerService.js → ensureSyncFoldersSeed), nên script này là tùy chọn.
   ============================================================ */
USE FACA_DB;
GO

-- 1. Thư mục dự án PSM27_Library (OneDrive - vnua.edu.vn)
IF NOT EXISTS (
    SELECT 1 FROM dbo.SyncFolders
    WHERE folder_path = N'C:\Users\laptop\OneDrive - vnua.edu.vn\PSM27_Library'
)
BEGIN
    INSERT INTO dbo.SyncFolders (project_name, folder_path, sharepoint_url_prefix, is_active)
    VALUES (
        N'PSM27_Library',
        N'C:\Users\laptop\OneDrive - vnua.edu.vn\PSM27_Library',
        -- ✅ URL THƯ MỤC TRỰC TIẾP của dự án trên OneDrive for Business (KHÔNG phải trang chủ OneDrive),
        --    nhờ đó scanner mới ghép được đường dẫn file con → click là mở thẳng file .pptx.
        --    Alias phải là tài khoản OneDrive đang đồng bộ trên máy (671279_sv_vnua_edu_vn).
        --    Nếu để sai, scanner vẫn tự suy ra link trực tiếp từ SHAREPOINT_TENANT_BASE trong .env.
        --    Lưu ý: các thư mục con là thư mục được chia sẻ (shortcut) cần khai báo thêm ánh xạ
        --    trong bảng dbo.SyncFolderMappings (xem sql/add_sync_folder_mappings.sql).
        N'https://vnuaeduvn-my.sharepoint.com/personal/671279_sv_vnua_edu_vn/Documents/PSM27_Library',
        1
    );
    PRINT N'➕ Đã thêm cấu hình SyncFolders cho PSM27_Library.';
END
ELSE
    PRINT N'ℹ️  Cấu hình SyncFolders cho PSM27_Library đã tồn tại, bỏ qua.';
GO

-- 2. Chỉ mục hỗ trợ UPSERT theo full_local_path + lọc nhanh theo danh mục lỗi
IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = 'UX_PresentationReports_full_local_path'
      AND object_id = OBJECT_ID('dbo.PresentationReports')
)
BEGIN
    CREATE UNIQUE INDEX UX_PresentationReports_full_local_path
        ON dbo.PresentationReports (full_local_path);
    PRINT N'➕ Đã tạo UNIQUE INDEX UX_PresentationReports_full_local_path.';
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = 'IX_PresentationReports_category_code'
      AND object_id = OBJECT_ID('dbo.PresentationReports')
)
BEGIN
    CREATE INDEX IX_PresentationReports_category_code
        ON dbo.PresentationReports (category_code) INCLUDE (last_modified);
    PRINT N'➕ Đã tạo INDEX IX_PresentationReports_category_code.';
END
GO

SELECT folder_id, project_name, folder_path, sharepoint_url_prefix, is_active
FROM dbo.SyncFolders
ORDER BY folder_id;
GO
