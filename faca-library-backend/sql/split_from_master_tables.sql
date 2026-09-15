-- ================================================================
--  split_from_master_tables.sql
--  NẠP DỮ LIỆU TRỰC TIẾP VÀO 7 BẢNG STAGING
--  (bản cũ tách từ dbo.Staging_NPI_Standard / dbo.Staging_NVL_Special
--   — 2 bảng tổng này đã bị xóa nên thay bằng import trực tiếp)
--
--  Cách dùng:
--    1. Chạy create_staging_split_tables.sql để tạo 7 bảng (nếu chưa có).
--    2. Xuất từng sheet của file Quan_Ly_Nguyen_Vat_Lieu_NPI.xlsx
--       ra CSV UTF-8 (chỉ gồm 1 dòng header + dữ liệu), ví dụ:
--         D:\exports\CHS.csv, PSM27.csv, PDX27.csv, DuAnKhac.csv,
--         Tray.csv, Cap.csv, Smt.csv
--    3. Chạy 7 lệnh BULK INSERT bên dưới (sửa đường dẫn cho đúng máy).
--
--  Script an toàn khi chạy lại: mỗi bảng được TRUNCATE trước khi nạp,
--  dữ liệu cũ không bị nhân đôi.
-- ================================================================

-- ---------------------------------------------
-- 1. Làm sạch 7 bảng trước khi nạp
-- ---------------------------------------------
TRUNCATE TABLE dbo.Staging_CHS;
TRUNCATE TABLE dbo.Staging_PSM27;
TRUNCATE TABLE dbo.Staging_PDX27;
TRUNCATE TABLE dbo.Staging_DuAnKhac;
TRUNCATE TABLE dbo.Staging_NVL_Tray;
TRUNCATE TABLE dbo.Staging_NVL_Cap;
TRUNCATE TABLE dbo.Staging_NVL_Smt;
GO

-- ---------------------------------------------
-- 2. 4 sheet dự án NPI
-- ---------------------------------------------
BULK INSERT dbo.Staging_CHS
FROM 'D:\exports\CHS.csv'
WITH (
    FIRSTROW = 2,          -- bỏ dòng header của CSV
    FIELDTERMINATOR = ',',
    ROWTERMINATOR = '\n',
    CODEPAGE = '65001',    -- UTF-8
    ERRORFILE = 'D:\exports\CHS.err',
    MAXERRORS = 100
);

BULK INSERT dbo.Staging_PSM27
FROM 'D:\exports\PSM27.csv'
WITH (
    FIRSTROW = 2,
    FIELDTERMINATOR = ',',
    ROWTERMINATOR = '\n',
    CODEPAGE = '65001',
    ERRORFILE = 'D:\exports\PSM27.err',
    MAXERRORS = 100
);

BULK INSERT dbo.Staging_PDX27
FROM 'D:\exports\PDX27.csv'
WITH (
    FIRSTROW = 2,
    FIELDTERMINATOR = ',',
    ROWTERMINATOR = '\n',
    CODEPAGE = '65001',
    ERRORFILE = 'D:\exports\PDX27.err',
    MAXERRORS = 100
);

BULK INSERT dbo.Staging_DuAnKhac
FROM 'D:\exports\DuAnKhac.csv'
WITH (
    FIRSTROW = 2,
    FIELDTERMINATOR = ',',
    ROWTERMINATOR = '\n',
    CODEPAGE = '65001',
    ERRORFILE = 'D:\exports\DuAnKhac.err',
    MAXERRORS = 100
);
GO

-- ---------------------------------------------
-- 3. 3 sheet NVL chuyên biệt
-- ---------------------------------------------
BULK INSERT dbo.Staging_NVL_Tray
FROM 'D:\exports\Tray.csv'
WITH (
    FIRSTROW = 2,
    FIELDTERMINATOR = ',',
    ROWTERMINATOR = '\n',
    CODEPAGE = '65001',
    ERRORFILE = 'D:\exports\Tray.err',
    MAXERRORS = 100
);

BULK INSERT dbo.Staging_NVL_Cap
FROM 'D:\exports\Cap.csv'
WITH (
    FIRSTROW = 2,
    FIELDTERMINATOR = ',',
    ROWTERMINATOR = '\n',
    CODEPAGE = '65001',
    ERRORFILE = 'D:\exports\Cap.err',
    MAXERRORS = 100
);

BULK INSERT dbo.Staging_NVL_Smt
FROM 'D:\exports\Smt.csv'
WITH (
    FIRSTROW = 2,
    FIELDTERMINATOR = ',',
    ROWTERMINATOR = '\n',
    CODEPAGE = '65001',
    ERRORFILE = 'D:\exports\Smt.err',
    MAXERRORS = 100
);
GO

-- ---------------------------------------------
-- 4. Kiểm tra kết quả sau khi nạp
-- ---------------------------------------------
SELECT 'Staging_CHS'      AS Bang, COUNT(*) AS SoDong FROM dbo.Staging_CHS
UNION ALL SELECT 'Staging_PSM27',    COUNT(*) FROM dbo.Staging_PSM27
UNION ALL SELECT 'Staging_PDX27',    COUNT(*) FROM dbo.Staging_PDX27
UNION ALL SELECT 'Staging_DuAnKhac', COUNT(*) FROM dbo.Staging_DuAnKhac
UNION ALL SELECT 'Staging_NVL_Tray', COUNT(*) FROM dbo.Staging_NVL_Tray
UNION ALL SELECT 'Staging_NVL_Cap',  COUNT(*) FROM dbo.Staging_NVL_Cap
UNION ALL SELECT 'Staging_NVL_Smt',  COUNT(*) FROM dbo.Staging_NVL_Smt;
GO

-- ================================================================
--  Ghi chú:
--  - Nếu CSV dùng dấu phân cách ';', đổi FIELDTERMINATOR = ';'.
--  - Nếu CSV chứa ký tự dấu phẩy trong dữ liệu, nên bao giá trị
--    bằng dấu nháy kép và dùng FORMAT = 'CSV' (SQL Server 2017+):
--        WITH (FORMAT = 'CSV', FIRSTROW = 2, CODEPAGE = '65001')
--  - Sau khi nạp xong, trang /warehouse tự hiển thị 7 tab
--    (GET /api/warehouse/chs | /psm27 | /pdx27 | /khac | /tray | /cap | /smt).
-- ================================================================