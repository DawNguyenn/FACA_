/* ============================================================
   add_sync_folder_mappings.sql — Khai báo ÁNH XẠ đường dẫn LOCAL → URL REMOTE cho
   các thư mục con là THƯ MỤC ĐƯỢC CHIA SẺ (shortcut nằm trên OneDrive của người khác).

   Vì sao cần: khi một thư mục trong dự án là shortcut trỏ sang OneDrive của người
   khác, trên web nó nằm ở SITE KHÁC và có thể mang TÊN KHÁC tên thư mục trên máy.
   Ghép URL chỉ bằng đường dẫn local sẽ ra link sai → PowerPoint báo
   "Chúng tôi không kết nối được đến <tên file>. Vui lòng bảo đảm bạn đang dùng đúng địa chỉ web."

   Nội dung script:
     1. Tạo bảng dbo.SyncFolderMappings (local_subpath → remote_url_prefix).
     2. Seed 3 ánh xạ của dự án PSM27_Library:
          Tệp của Phạm Trung Hiếu - EE → https://…/personal/671445_sv_vnua_edu_vn/Documents/PSM27 Library/EE
          Tệp của Phạm Trung Hiếu - ME → https://…/personal/671445_sv_vnua_edu_vn/Documents/PSM27 Library/ME
          Tệp của Phạm Trung Hiếu - OE → https://…/personal/671445_sv_vnua_edu_vn/Documents/PSM27 Library/OE
     3. Sửa dbo.SyncFolders.sharepoint_url_prefix của PSM27_Library về đúng site của tài khoản
        OneDrive đang đồng bộ trên máy (671279_sv_vnua_edu_vn, KHÔNG phải dat_vnua_edu_vn —
        alias đó không tồn tại → HTTP 404).
     4. In kết quả để kiểm tra.

   Script idempotent — chạy lại nhiều lần không lỗi, không nhân bản dữ liệu.
   Chạy:
     sqlcmd -S DAWNGUYENN -U sa -P <password> -d FACA_DB -i sql\add_sync_folder_mappings.sql

   CÁCH LẤY remote_url_prefix CHÍNH XÁC cho một thư mục được chia sẻ:
     a) Mở thư mục đó trên OneDrive web (onedrive.live.com/f/sharepoint) → chuột phải → "Sao chép
        liên kết" / hoặc mở thư mục rồi copy URL trên thanh địa chỉ, rồi BỎ phần ?id=... / ?e=...
        Kết quả có dạng: https://<tenant>-my.sharepoint.com/personal/<alias_nguoi_chia_se>/Documents/<duong_dan>
     b) Hoặc đọc từ OneDrive sync engine trên máy: bảng od_ScopeInfo_Records của
        %LOCALAPPDATA%\Microsoft\OneDrive\settings\Business1\SyncEngineDatabase.db
        → webURL  = https://…/personal/<alias>   và   remotePath = <duong_dan trong Documents>
        (ghép lại thành https://<webURL>/Documents/<remotePath>).
   ============================================================ */
USE FACA_DB;
GO

-- 1. Bảng ánh xạ đường dẫn local → URL remote
IF OBJECT_ID('dbo.SyncFolderMappings', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.SyncFolderMappings (
        mapping_id       INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_SyncFolderMappings PRIMARY KEY,
        -- NULL = áp dụng cho mọi thư mục dự án; nếu gắn folder_id thì chỉ áp dụng cho dòng SyncFolders đó
        folder_id        INT NULL,
        -- Đường dẫn thư mục con TÍNH TỪ GỐC thư mục dự án, dùng dấu \ hoặc / đều được
        local_subpath    NVARCHAR(500) NOT NULL,
        -- URL THƯ MỤC TRỰC TIẾP trên web (copy từ OneDrive/SharePoint), KHÔNG phải link chia sẻ/trang chủ
        remote_url_prefix NVARCHAR(1000) NOT NULL,
        note             NVARCHAR(500) NULL,
        is_active        BIT NOT NULL CONSTRAINT DF_SyncFolderMappings_is_active DEFAULT (1),
        created_at       DATETIME2 NOT NULL CONSTRAINT DF_SyncFolderMappings_created_at DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT FK_SyncFolderMappings_SyncFolders
            FOREIGN KEY (folder_id) REFERENCES dbo.SyncFolders (folder_id)
    );
    PRINT N'➕ Đã tạo bảng dbo.SyncFolderMappings.';
END
ELSE
    PRINT N'ℹ️  Bảng dbo.SyncFolderMappings đã tồn tại, bỏ qua.';
GO

-- 2. Seed ánh xạ 3 thư mục được chia sẻ của dự án PSM27_Library
IF NOT EXISTS (SELECT 1 FROM dbo.SyncFolderMappings WHERE local_subpath = N'Tệp của Phạm Trung Hiếu - EE')
    INSERT INTO dbo.SyncFolderMappings (folder_id, local_subpath, remote_url_prefix, note)
    VALUES (NULL, N'Tệp của Phạm Trung Hiếu - EE',
            N'https://vnuaeduvn-my.sharepoint.com/personal/671445_sv_vnua_edu_vn/Documents/PSM27 Library/EE',
            N'Thư mục EE được chia sẻ từ OneDrive của Phạm Trung Hiếu (671445@sv.vnua.edu.vn)');
GO

IF NOT EXISTS (SELECT 1 FROM dbo.SyncFolderMappings WHERE local_subpath = N'Tệp của Phạm Trung Hiếu - ME')
    INSERT INTO dbo.SyncFolderMappings (folder_id, local_subpath, remote_url_prefix, note)
    VALUES (NULL, N'Tệp của Phạm Trung Hiếu - ME',
            N'https://vnuaeduvn-my.sharepoint.com/personal/671445_sv_vnua_edu_vn/Documents/PSM27 Library/ME',
            N'Thư mục ME được chia sẻ từ OneDrive của Phạm Trung Hiếu (671445@sv.vnua.edu.vn)');
GO

IF NOT EXISTS (SELECT 1 FROM dbo.SyncFolderMappings WHERE local_subpath = N'Tệp của Phạm Trung Hiếu - OE')
    INSERT INTO dbo.SyncFolderMappings (folder_id, local_subpath, remote_url_prefix, note)
    VALUES (NULL, N'Tệp của Phạm Trung Hiếu - OE',
            N'https://vnuaeduvn-my.sharepoint.com/personal/671445_sv_vnua_edu_vn/Documents/PSM27 Library/OE',
            N'Thư mục OE được chia sẻ từ OneDrive của Phạm Trung Hiếu (671445@sv.vnua.edu.vn)');
GO

-- 3. Prefix của thư mục dự án: phải là site/tài khoản OneDrive ĐANG đồng bộ trên máy
--    (671279_sv_vnua_edu_vn). Alias "dat_vnua_edu_vn" không tồn tại → OneDrive trả 404.
UPDATE dbo.SyncFolders
SET sharepoint_url_prefix = N'https://vnuaeduvn-my.sharepoint.com/personal/671279_sv_vnua_edu_vn/Documents/PSM27_Library'
WHERE folder_path = N'C:\Users\laptop\OneDrive - vnua.edu.vn\PSM27_Library'
  AND (sharepoint_url_prefix IS NULL
       OR sharepoint_url_prefix NOT LIKE N'%671279_sv_vnua_edu_vn%');
GO

-- 4. Kiểm tra kết quả
SELECT folder_id, project_name, sharepoint_url_prefix, is_active
FROM dbo.SyncFolders
ORDER BY folder_id;

SELECT mapping_id, folder_id, local_subpath, remote_url_prefix, is_active
FROM dbo.SyncFolderMappings
ORDER BY mapping_id;
GO
