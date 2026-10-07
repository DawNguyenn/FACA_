-- ================================================================
-- add_sheet_title_columns.sql
-- Thêm cột SheetTitle (tiêu đề dòng 1 của file Excel gốc) cho:
--   1. dbo.Staging_SheetMeta  -> bảng metadata của từng sheet kho (UI đọc để hiển thị)
--   2. dbo.FileImportHistory  -> lịch sử import file Excel (đường import InventoryLots)
--
-- Idempotent: chạy lại nhiều lần vẫn an toàn.
-- LƯU Ý: Backend tự ALTER khi khởi động
--        (services/sheetMetaService.ensureSheetMetaSchema) -> file này TUỲ CHỌN.
-- ================================================================
USE FACA_DB;
GO

-- 1. Staging_SheetMeta: thêm SheetTitle nếu chưa có
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Staging_SheetMeta') AND name = 'SheetTitle')
BEGIN
    ALTER TABLE dbo.Staging_SheetMeta ADD SheetTitle NVARCHAR(255) NULL;
    PRINT '➕ Đã thêm cột dbo.Staging_SheetMeta.SheetTitle';
END
ELSE
    PRINT 'ℹ️ dbo.Staging_SheetMeta.SheetTitle đã tồn tại';
GO

-- 2. FileImportHistory: thêm SheetTitle nếu chưa có
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.FileImportHistory') AND name = 'SheetTitle')
BEGIN
    ALTER TABLE dbo.FileImportHistory ADD SheetTitle NVARCHAR(255) NULL;
    PRINT '➕ Đã thêm cột dbo.FileImportHistory.SheetTitle';
END
ELSE
    PRINT 'ℹ️ dbo.FileImportHistory.SheetTitle đã tồn tại';
GO

-- 3. Kiểm tra
SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME IN ('Staging_SheetMeta', 'FileImportHistory')
  AND COLUMN_NAME = 'SheetTitle';
GO