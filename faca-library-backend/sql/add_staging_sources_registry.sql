-- ================================================================
-- add_staging_sources_registry.sql
-- Registry cho sheet động: thêm sheet mới không cần sửa code.
--  - dbo.Staging_Sources: danh mục { SourceKey, Label, TableName, OrderBy, IsBuiltIn }
--  - Seed 14 sheet hiện có (idempotent, không xóa dữ liệu cũ)
--  - Đảm bảo dbo.Staging_CustomColumns tồn tại (cho cột động)
-- Chạy 1 lần trong SSMS. Sau đó mọi sheet mới tạo qua API
-- POST /api/warehouse/sources sẽ tự INSERT vào đây + CREATE TABLE.
-- ================================================================
USE FACA_DB;
GO

-- 1. Bảng registry (idempotent)
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'Staging_Sources')
BEGIN
    CREATE TABLE dbo.Staging_Sources (
        SourceKey  NVARCHAR(30)  NOT NULL PRIMARY KEY,   -- vd: sbn27, tray, pkd28 ...
        Label      NVARCHAR(100) NOT NULL,               -- nhãn hiển thị trên dropdown
        TableName  NVARCHAR(128) NOT NULL UNIQUE,        -- vd: dbo.Staging_SBN27
        OrderBy    NVARCHAR(255) NULL,                   -- vd: Change_Date DESC, Model
        IsBuiltIn  BIT NOT NULL CONSTRAINT DF_StagingSources_IsBuiltIn DEFAULT (0),
        CreatedAt  DATETIME2 NOT NULL CONSTRAINT DF_StagingSources_CreatedAt DEFAULT (SYSDATETIME())
    );
END
GO

-- 2. Seed 14 sheet built-in (MERGE = insert nếu chưa có, update label/table nếu đổi)
MERGE INTO dbo.Staging_Sources AS T
USING (VALUES
    (N'sbn27',     N'SBN27',         N'dbo.Staging_SBN27',      N'Change_Date DESC, Lot_ID, Model, Material', 1),
    (N'clo27',     N'CLO27',         N'dbo.Staging_CLO27',      N'Change_Date DESC, Lot_ID, Model, Material', 1),
    (N'sca27',     N'SC-A 27',       N'dbo.Staging_SC_A_27',    N'Change_Date DESC, Lot_ID, Model, Material', 1),
    (N'pdx27',     N'PDX27',         N'dbo.Staging_PDX27',      N'Change_Date DESC, Lot_ID, Model, Material', 1),
    (N'psm27',     N'PSM27',         N'dbo.Staging_PSM27',      N'Change_Date DESC, Lot_ID, Model, Material', 1),
    (N'atw',       N'ATW',           N'dbo.Staging_ATW',        N'Change_Date DESC, Lot_ID, Model, Material', 1),
    (N'reno27',    N'RENO27',        N'dbo.Staging_RENO27',     N'Change_Date DESC, Lot_ID, Model, Material', 1),
    (N'chs',       N'CHS',           N'dbo.Staging_CHS',        N'Change_Date DESC, Lot_ID, Model, Material', 1),
    (N'tray',      N'NVL - TRAY',    N'dbo.Staging_NVL_Tray',   N'Change_Date DESC, Model, Material, Bill', 1),
    (N'cap',       N'NVL - CAP',     N'dbo.Staging_NVL_Cap',    N'Change_Date DESC, Model, Material, Bill', 1),
    (N'smt',       N'NVL - SMT',     N'dbo.Staging_NVL_SMT27',  N'Change_Date DESC, Model, Material, Bill', 1),
    (N'htcc',      N'NVL - HTCC-SMT',N'dbo.Staging_NVL_HTCC_SMT', N'Change_Date DESC, Lot_ID, Model, Material', 1),
    (N'sparepart', N'SparePart',     N'dbo.Staging_SparePart',  N'Receiving_Date DESC, Part_No, Po_No', 1),
    (N'tongton',   N'Tổng tồn',      N'dbo.Staging_TongTon',    N'Model, Material, Bill', 1)
) AS S (SourceKey, Label, TableName, OrderBy, IsBuiltIn)
ON T.SourceKey = S.SourceKey
WHEN MATCHED THEN UPDATE SET Label = S.Label, TableName = S.TableName, OrderBy = S.OrderBy, IsBuiltIn = S.IsBuiltIn
WHEN NOT MATCHED THEN INSERT (SourceKey, Label, TableName, OrderBy, IsBuiltIn)
VALUES (S.SourceKey, S.Label, S.TableName, S.OrderBy, S.IsBuiltIn);
GO

-- 3. Đảm bảo bảng metadata cột động tồn tại
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'Staging_CustomColumns')
BEGIN
    CREATE TABLE dbo.Staging_CustomColumns (
        CustomColumnId INT IDENTITY(1,1) PRIMARY KEY,
        SourceKey      NVARCHAR(30)  NOT NULL,
        ColumnName     NVARCHAR(100) NOT NULL,
        Label          NVARCHAR(200) NULL,
        DataType       NVARCHAR(20)  NOT NULL CONSTRAINT DF_StagingCustomColumns_DataType2 DEFAULT (N'NVARCHAR(255)'),
        CreatedAt      DATETIME2     NOT NULL CONSTRAINT DF_StagingCustomColumns_CreatedAt2 DEFAULT (SYSDATETIME()),
        CONSTRAINT UQ_StagingCustomColumns_Source_Col2 UNIQUE (SourceKey, ColumnName)
    );
END
GO

SELECT SourceKey, Label, TableName, IsBuiltIn FROM dbo.Staging_Sources ORDER BY IsBuiltIn DESC, Label;
GO
