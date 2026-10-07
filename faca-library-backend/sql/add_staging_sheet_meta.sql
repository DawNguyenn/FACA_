-- ================================================================
-- add_staging_sheet_meta.sql
-- Metadata HEADER cho từng sheet kho (hiển thị trên đầu bảng dữ liệu).
--  - dbo.Staging_SheetMeta: 1 dòng / SourceKey: tên file gốc, người nhập,
--    thời điểm nhập, dự án/build, trạng thái, mô tả.
--  - Idempotent: chạy lại an toàn. KHÔNG đụng tới dữ liệu staging hiện có.
-- LƯU Ý: Backend cũng tự tạo bảng này khi khởi động
--        (services/sheetMetaService.ensureSheetMetaSchema) nên chạy file này
--        là TUỲ CHỌN (dùng khi muốn tạo thủ công trong SSMS).
-- ================================================================
USE FACA_DB;
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'Staging_SheetMeta')
BEGIN
    CREATE TABLE dbo.Staging_SheetMeta (
        SourceKey    NVARCHAR(30)   NOT NULL PRIMARY KEY,   -- khớp dbo.Staging_Sources.SourceKey
        FileName     NVARCHAR(400)  NULL,                   -- tên file Excel gốc
        ImportedBy   NVARCHAR(200)  NULL,                   -- người nhập / import
        ImportedAt   DATETIME2(0)   NULL,                   -- thời điểm nhập gần nhất
        ProjectCode  NVARCHAR(100)  NULL,                   -- dự án (vd SBN27)
        BuildVersion NVARCHAR(100)  NULL,                   -- build (vd DVT1/EVT1)
        Status       NVARCHAR(30)   NOT NULL
            CONSTRAINT DF_Staging_SheetMeta_Status DEFAULT (N'ACTIVE'),
        Description  NVARCHAR(1000) NULL,                   -- mô tả / ghi chú
        UpdatedAt    DATETIME2(0)   NOT NULL
            CONSTRAINT DF_Staging_SheetMeta_UpdatedAt DEFAULT (SYSDATETIME())
    );
END
GO

SELECT SourceKey, FileName, ImportedBy, ImportedAt, ProjectCode, BuildVersion, Status
FROM dbo.Staging_SheetMeta ORDER BY SourceKey;
GO
