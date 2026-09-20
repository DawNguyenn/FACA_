-- ================================================================
--  split_from_master_tables.sql (Đã cập nhật theo cấu trúc 14 bảng mới)
--  NẠP DỮ LIỆU TRỰC TIẾP VÀO CÁC BẢNG STAGING
-- ================================================================

-- ---------------------------------------------
-- 1. Làm sạch (TRUNCATE) các bảng trước khi nạp
-- ---------------------------------------------
TRUNCATE TABLE dbo.Staging_SBN27;
TRUNCATE TABLE dbo.Staging_CLO27;
TRUNCATE TABLE dbo.Staging_SC_A_27;
TRUNCATE TABLE dbo.Staging_PDX27;
TRUNCATE TABLE dbo.Staging_PSM27;
TRUNCATE TABLE dbo.Staging_ATW;
TRUNCATE TABLE dbo.Staging_RENO27;
TRUNCATE TABLE dbo.Staging_CHS;
TRUNCATE TABLE dbo.Staging_NVL_Tray;
TRUNCATE TABLE dbo.Staging_NVL_Cap;
TRUNCATE TABLE dbo.Staging_NVL_SMT27;
TRUNCATE TABLE dbo.Staging_NVL_HTCC_SMT;
TRUNCATE TABLE dbo.Staging_SparePart;
TRUNCATE TABLE dbo.Staging_TongTon;
GO

-- ---------------------------------------------
-- 2. BULK INSERT cho các bảng Dự án NPI & Tổng hợp
-- ---------------------------------------------

BULK INSERT dbo.Staging_SBN27
FROM 'D:\exports\SBN27.csv'
WITH (FIRSTROW = 2, FIELDTERMINATOR = ',', ROWTERMINATOR = '\n', CODEPAGE = '65001');

BULK INSERT dbo.Staging_CLO27
FROM 'D:\exports\CLO27.csv'
WITH (FIRSTROW = 2, FIELDTERMINATOR = ',', ROWTERMINATOR = '\n', CODEPAGE = '65001');

BULK INSERT dbo.Staging_SC_A_27
FROM 'D:\exports\SC_A_27.csv'
WITH (FIRSTROW = 2, FIELDTERMINATOR = ',', ROWTERMINATOR = '\n', CODEPAGE = '65001');

BULK INSERT dbo.Staging_PDX27
FROM 'D:\exports\PDX27.csv'
WITH (FIRSTROW = 2, FIELDTERMINATOR = ',', ROWTERMINATOR = '\n', CODEPAGE = '65001');

BULK INSERT dbo.Staging_PSM27
FROM 'D:\exports\PSM27.csv'
WITH (FIRSTROW = 2, FIELDTERMINATOR = ',', ROWTERMINATOR = '\n', CODEPAGE = '65001');

BULK INSERT dbo.Staging_ATW
FROM 'D:\exports\ATW.csv'
WITH (FIRSTROW = 2, FIELDTERMINATOR = ',', ROWTERMINATOR = '\n', CODEPAGE = '65001');

BULK INSERT dbo.Staging_RENO27
FROM 'D:\exports\RENO27.csv'
WITH (FIRSTROW = 2, FIELDTERMINATOR = ',', ROWTERMINATOR = '\n', CODEPAGE = '65001');

BULK INSERT dbo.Staging_CHS
FROM 'D:\exports\CHS.csv'
WITH (FIRSTROW = 2, FIELDTERMINATOR = ',', ROWTERMINATOR = '\n', CODEPAGE = '65001');
GO

-- ---------------------------------------------
-- 3. BULK INSERT cho các bảng NVL Chuyên biệt & SparePart
-- ---------------------------------------------

BULK INSERT dbo.Staging_NVL_Tray
FROM 'D:\exports\Tray.csv'
WITH (FIRSTROW = 2, FIELDTERMINATOR = ',', ROWTERMINATOR = '\n', CODEPAGE = '65001');

BULK INSERT dbo.Staging_NVL_Cap
FROM 'D:\exports\Cap.csv'
WITH (FIRSTROW = 2, FIELDTERMINATOR = ',', ROWTERMINATOR = '\n', CODEPAGE = '65001');

BULK INSERT dbo.Staging_NVL_SMT27
FROM 'D:\exports\SMT27.csv'
WITH (FIRSTROW = 2, FIELDTERMINATOR = ',', ROWTERMINATOR = '\n', CODEPAGE = '65001');

BULK INSERT dbo.Staging_NVL_HTCC_SMT
FROM 'D:\exports\HTCC_SMT.csv'
WITH (FIRSTROW = 2, FIELDTERMINATOR = ',', ROWTERMINATOR = '\n', CODEPAGE = '65001');

BULK INSERT dbo.Staging_SparePart
FROM 'D:\exports\Spare_Part.csv'
WITH (FIRSTROW = 2, FIELDTERMINATOR = ',', ROWTERMINATOR = '\n', CODEPAGE = '65001');

BULK INSERT dbo.Staging_TongTon
FROM 'D:\exports\TongTon.csv' 
WITH (FIRSTROW = 2, FIELDTERMINATOR = ',', ROWTERMINATOR = '\n', CODEPAGE = '65001');

GO

-- ---------------------------------------------
-- 4. Kiểm tra số dòng dữ liệu sau khi nạp
-- ---------------------------------------------
SELECT 'Staging_SBN27' AS Bang, COUNT(*) AS SoDong FROM dbo.Staging_SBN27
UNION ALL SELECT 'Staging_CLO27', COUNT(*) FROM dbo.Staging_CLO27
UNION ALL SELECT 'Staging_SC_A_27', COUNT(*) FROM dbo.Staging_SC_A_27
UNION ALL SELECT 'Staging_PDX27', COUNT(*) FROM dbo.Staging_PDX27
UNION ALL SELECT 'Staging_PSM27', COUNT(*) FROM dbo.Staging_PSM27
UNION ALL SELECT 'Staging_ATW', COUNT(*) FROM dbo.Staging_ATW
UNION ALL SELECT 'Staging_RENO27', COUNT(*) FROM dbo.Staging_RENO27
UNION ALL SELECT 'Staging_CHS', COUNT(*) FROM dbo.Staging_CHS
UNION ALL SELECT 'Staging_NVL_Tray', COUNT(*) FROM dbo.Staging_NVL_Tray
UNION ALL SELECT 'Staging_NVL_Cap', COUNT(*) FROM dbo.Staging_NVL_Cap
UNION ALL SELECT 'Staging_NVL_SMT27', COUNT(*) FROM dbo.Staging_NVL_SMT27
UNION ALL SELECT 'Staging_NVL_HTCC_SMT', COUNT(*) FROM dbo.Staging_NVL_HTCC_SMT
UNION ALL SELECT 'Staging_SparePart', COUNT(*) FROM dbo.Staging_SparePart
UNION ALL SELECT 'Staging_TongTon', COUNT(*) FROM dbo.Staging_TongTon;
GO