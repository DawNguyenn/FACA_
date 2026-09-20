-- ================================================================
--  Migration: Chuẩn bị cho Inline Editing trên Kho Dữ Liệu
--  1. Tạo bảng Staging_CustomColumns lưu metadata cột mở rộng
--  2. Thêm cột StagingID (BIGINT IDENTITY) làm khóa định danh từng dòng
--     vào các bảng dữ liệu staging (loại trừ Staging_CustomColumns).
-- ================================================================
USE FACA_DB;
GO

-- 1. Bảng metadata cột mở rộng (idempotent)
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'Staging_CustomColumns')
BEGIN
    CREATE TABLE dbo.Staging_CustomColumns (
        CustomColumnId INT IDENTITY(1,1) PRIMARY KEY,
        SourceKey      NVARCHAR(30)  NOT NULL,   -- sbn27 / clo27 / tray / cap / smt / htcc / sparepart / tongton ...
        ColumnName     NVARCHAR(100) NOT NULL,   -- tên cột vật lý trong bảng staging
        Label          NVARCHAR(200) NULL,       -- nhãn hiển thị (tùy chọn)
        DataType       NVARCHAR(20)  NOT NULL CONSTRAINT DF_StagingCustomColumns_DataType DEFAULT (N'NVARCHAR(255)'),
        CreatedAt      DATETIME2     NOT NULL CONSTRAINT DF_StagingCustomColumns_CreatedAt DEFAULT (SYSDATETIME()),
        CONSTRAINT UQ_StagingCustomColumns_Source_Col UNIQUE (SourceKey, ColumnName)
    );
END
GO

-- 2. Thêm StagingID vào từng bảng dữ liệu staging (loại trừ bảng metadata Staging_CustomColumns)
DECLARE @sql NVARCHAR(MAX) = N'';

SELECT @sql += N'IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(''[dbo].[' + t.name + N']'') AND name = ''StagingID'')
    ALTER TABLE [dbo].[' + t.name + N'] ADD StagingID BIGINT IDENTITY(1,1);
'
FROM sys.tables t
WHERE t.name LIKE 'Staging_%' 
  AND t.name NOT IN ('Staging_CustomColumns'); -- ✅ Loại trừ bảng metadata

EXEC sp_executesql @sql;
GO

-- Kiểm tra danh sách bảng Staging đã có StagingID
SELECT t.name AS Table_Name, c.name AS Has_StagingID
FROM sys.tables t
JOIN sys.columns c ON c.object_id = t.object_id AND c.name = 'StagingID'
WHERE t.name LIKE 'Staging_%'
ORDER BY t.name;
GO