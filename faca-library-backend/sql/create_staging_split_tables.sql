-- ================================================================
--  create_staging_split_tables.sql
--  Tạo 7 bảng staging tương ứng 7 sheet của file
--  Quan_Ly_Nguyen_Vat_Lieu_NPI.xlsx (header nằm ở dòng 4 — index 3):
--
--    Sheet "CHS"         → dbo.Staging_CHS        (schema NPI Standard)
--    Sheet "PSM27"       → dbo.Staging_PSM27      (schema NPI Standard)
--    Sheet "PDX27"       → dbo.Staging_PDX27      (schema NPI Standard)
--    Sheet "Dự Án Khác"  → dbo.Staging_DuAnKhac   (schema NPI Standard)
--    Sheet "NVL - TRAY"  → dbo.Staging_NVL_Tray   (schema NVL Special)
--    Sheet "NVL - CAP"   → dbo.Staging_NVL_Cap    (schema NVL Special)
--    Sheet "NVL - SMT"   → dbo.Staging_NVL_Smt    (schema NVL Special)
--
--  4 sheet NPI dùng chung bộ cột như dbo.Staging_NPI_Standard;
--  3 sheet NVL dùng chung bộ cột như dbo.Staging_NVL_Special.
--  Cột để kiểu NVARCHAR vì BULK INSERT từ Excel (đơn vị: dòng văn bản),
--  phần tìm kiếm LIKE phía API yêu cầu kiểu chuỗi.
-- ================================================================

-- ---------------------------------------------
-- 1. Bảng cho 4 sheet dự án NPI (schema NPI)
-- ---------------------------------------------
DECLARE @sql NVARCHAR(MAX) = N'';

IF OBJECT_ID('dbo.Staging_CHS', 'U') IS NULL
    SET @sql = @sql + N'
    CREATE TABLE dbo.Staging_CHS (
        Change_Date   NVARCHAR(50)  NULL,
        Model         NVARCHAR(100) NULL,
        Build         NVARCHAR(50)  NULL,
        Received_Date NVARCHAR(50)  NULL,
        Material      NVARCHAR(100) NULL,
        Vendor        NVARCHAR(100) NULL,
        Description   NVARCHAR(255) NULL,
        Config        NVARCHAR(100) NULL,
        Lot_ID        NVARCHAR(100) NULL,
        Shipment_Qty  NVARCHAR(50)  NULL,
        RnD           NVARCHAR(50)  NULL,
        Qty_Ton_Kho   NVARCHAR(50)  NULL,
        Output_Date   NVARCHAR(50)  NULL,
        Receiver      NVARCHAR(100) NULL,
        Ma_NV         NVARCHAR(50)  NULL,
        Ghi_Chu       NVARCHAR(255) NULL,
        Tong_Qty_Ton  NVARCHAR(50)  NULL,
        Bill          NVARCHAR(100) NULL,
        IV            NVARCHAR(100) NULL
    );';

IF OBJECT_ID('dbo.Staging_PSM27', 'U') IS NULL
    SET @sql = @sql + N'
    CREATE TABLE dbo.Staging_PSM27 (
        Change_Date   NVARCHAR(50)  NULL,
        Model         NVARCHAR(100) NULL,
        Build         NVARCHAR(50)  NULL,
        Received_Date NVARCHAR(50)  NULL,
        Material      NVARCHAR(100) NULL,
        Vendor        NVARCHAR(100) NULL,
        Description   NVARCHAR(255) NULL,
        Config        NVARCHAR(100) NULL,
        Lot_ID        NVARCHAR(100) NULL,
        Shipment_Qty  NVARCHAR(50)  NULL,
        RnD           NVARCHAR(50)  NULL,
        Qty_Ton_Kho   NVARCHAR(50)  NULL,
        Output_Date   NVARCHAR(50)  NULL,
        Receiver      NVARCHAR(100) NULL,
        Ma_NV         NVARCHAR(50)  NULL,
        Ghi_Chu       NVARCHAR(255) NULL,
        Tong_Qty_Ton  NVARCHAR(50)  NULL,
        Bill          NVARCHAR(100) NULL,
        IV            NVARCHAR(100) NULL
    );';

IF OBJECT_ID('dbo.Staging_PDX27', 'U') IS NULL
    SET @sql = @sql + N'
    CREATE TABLE dbo.Staging_PDX27 (
        Change_Date   NVARCHAR(50)  NULL,
        Model         NVARCHAR(100) NULL,
        Build         NVARCHAR(50)  NULL,
        Received_Date NVARCHAR(50)  NULL,
        Material      NVARCHAR(100) NULL,
        Vendor        NVARCHAR(100) NULL,
        Description   NVARCHAR(255) NULL,
        Config        NVARCHAR(100) NULL,
        Lot_ID        NVARCHAR(100) NULL,
        Shipment_Qty  NVARCHAR(50)  NULL,
        RnD           NVARCHAR(50)  NULL,
        Qty_Ton_Kho   NVARCHAR(50)  NULL,
        Output_Date   NVARCHAR(50)  NULL,
        Receiver      NVARCHAR(100) NULL,
        Ma_NV         NVARCHAR(50)  NULL,
        Ghi_Chu       NVARCHAR(255) NULL,
        Tong_Qty_Ton  NVARCHAR(50)  NULL,
        Bill          NVARCHAR(100) NULL,
        IV            NVARCHAR(100) NULL
    );';

IF OBJECT_ID('dbo.Staging_DuAnKhac', 'U') IS NULL
    SET @sql = @sql + N'
    CREATE TABLE dbo.Staging_DuAnKhac (
        Change_Date   NVARCHAR(50)  NULL,
        Model         NVARCHAR(100) NULL,
        Build         NVARCHAR(50)  NULL,
        Received_Date NVARCHAR(50)  NULL,
        Material      NVARCHAR(100) NULL,
        Vendor        NVARCHAR(100) NULL,
        Description   NVARCHAR(255) NULL,
        Config        NVARCHAR(100) NULL,
        Lot_ID        NVARCHAR(100) NULL,
        Shipment_Qty  NVARCHAR(50)  NULL,
        RnD           NVARCHAR(50)  NULL,
        Qty_Ton_Kho   NVARCHAR(50)  NULL,
        Output_Date   NVARCHAR(50)  NULL,
        Receiver      NVARCHAR(100) NULL,
        Ma_NV         NVARCHAR(50)  NULL,
        Ghi_Chu       NVARCHAR(255) NULL,
        Tong_Qty_Ton  NVARCHAR(50)  NULL,
        Bill          NVARCHAR(100) NULL,
        IV            NVARCHAR(100) NULL
    );';

-- ---------------------------------------------
-- 2. Bảng cho 3 sheet NVL chuyên biệt (schema NVL)
-- ---------------------------------------------
IF OBJECT_ID('dbo.Staging_NVL_Tray', 'U') IS NULL
    SET @sql = @sql + N'
    CREATE TABLE dbo.Staging_NVL_Tray (
        Change_Date   NVARCHAR(50)  NULL,
        Model         NVARCHAR(100) NULL,
        Build         NVARCHAR(50)  NULL,
        Received_Date NVARCHAR(50)  NULL,
        Material      NVARCHAR(100) NULL,
        Vendor        NVARCHAR(100) NULL,
        Description   NVARCHAR(255) NULL,
        Bill          NVARCHAR(100) NULL,
        IV            NVARCHAR(100) NULL,
        Qty_Xuat_Hang NVARCHAR(50)  NULL,
        Ton_Kho       NVARCHAR(50)  NULL,
        IQA_Result    NVARCHAR(100) NULL,
        Special_Note  NVARCHAR(255) NULL,
        Xuat_1_Date   NVARCHAR(50)  NULL,
        Xuat_1_DRI    NVARCHAR(100) NULL,
        Xuat_1_Qty    NVARCHAR(50)  NULL,
        Xuat_2_Date   NVARCHAR(50)  NULL,
        Xuat_2_DRI    NVARCHAR(100) NULL,
        Xuat_2_Qty    NVARCHAR(50)  NULL,
        Xuat_3_Date   NVARCHAR(50)  NULL,
        Xuat_3_DRI    NVARCHAR(100) NULL,
        Xuat_3_Qty    NVARCHAR(50)  NULL
    );';

IF OBJECT_ID('dbo.Staging_NVL_Cap', 'U') IS NULL
    SET @sql = @sql + N'
    CREATE TABLE dbo.Staging_NVL_Cap (
        Change_Date   NVARCHAR(50)  NULL,
        Model         NVARCHAR(100) NULL,
        Build         NVARCHAR(50)  NULL,
        Received_Date NVARCHAR(50)  NULL,
        Material      NVARCHAR(100) NULL,
        Vendor        NVARCHAR(100) NULL,
        Description   NVARCHAR(255) NULL,
        Bill          NVARCHAR(100) NULL,
        IV            NVARCHAR(100) NULL,
        Qty_Xuat_Hang NVARCHAR(50)  NULL,
        Ton_Kho       NVARCHAR(50)  NULL,
        IQA_Result    NVARCHAR(100) NULL,
        Special_Note  NVARCHAR(255) NULL,
        Xuat_1_Date   NVARCHAR(50)  NULL,
        Xuat_1_DRI    NVARCHAR(100) NULL,
        Xuat_1_Qty    NVARCHAR(50)  NULL,
        Xuat_2_Date   NVARCHAR(50)  NULL,
        Xuat_2_DRI    NVARCHAR(100) NULL,
        Xuat_2_Qty    NVARCHAR(50)  NULL,
        Xuat_3_Date   NVARCHAR(50)  NULL,
        Xuat_3_DRI    NVARCHAR(100) NULL,
        Xuat_3_Qty    NVARCHAR(50)  NULL
    );';

IF OBJECT_ID('dbo.Staging_NVL_Smt', 'U') IS NULL
    SET @sql = @sql + N'
    CREATE TABLE dbo.Staging_NVL_Smt (
        Change_Date   NVARCHAR(50)  NULL,
        Model         NVARCHAR(100) NULL,
        Build         NVARCHAR(50)  NULL,
        Received_Date NVARCHAR(50)  NULL,
        Material      NVARCHAR(100) NULL,
        Vendor        NVARCHAR(100) NULL,
        Description   NVARCHAR(255) NULL,
        Bill          NVARCHAR(100) NULL,
        IV            NVARCHAR(100) NULL,
        Qty_Xuat_Hang NVARCHAR(50)  NULL,
        Ton_Kho       NVARCHAR(50)  NULL,
        IQA_Result    NVARCHAR(100) NULL,
        Special_Note  NVARCHAR(255) NULL,
        Xuat_1_Date   NVARCHAR(50)  NULL,
        Xuat_1_DRI    NVARCHAR(100) NULL,
        Xuat_1_Qty    NVARCHAR(50)  NULL,
        Xuat_2_Date   NVARCHAR(50)  NULL,
        Xuat_2_DRI    NVARCHAR(100) NULL,
        Xuat_2_Qty    NVARCHAR(50)  NULL,
        Xuat_3_Date   NVARCHAR(50)  NULL,
        Xuat_3_DRI    NVARCHAR(100) NULL,
        Xuat_3_Qty    NVARCHAR(50)  NULL
    );';

EXEC sp_executesql @sql;
PRINT N'Done - 7 bang staging da san sang (bang da ton tai se duoc bo qua).';
GO

-- ================================================================
--  3. Huong dan nap du lieu tu file Excel
--
--  File Quan_Ly_Nguyen_Vat_Lieu_NPI.xlsx co header nam o DONG 4,
--  nen truoc khi BULK INSERT can xuat tung sheet ra CSV (UTF-8,
--  chi gom header + du lieu) roi chay vi du:
--
--  BULK INSERT dbo.Staging_CHS
--  FROM 'D:\exports\CHS.csv'
--  WITH (
--      FIRSTROW = 2,            -- bo dong header cua CSV
--      FIELDTERMINATOR = ',',
--      ROWTERMINATOR = '\n',
--      CODEPAGE = '65001'       -- UTF-8
--  );
--
--  Lap lai tuong tu cho:
--    PSM27      -> dbo.Staging_PSM27
--    PDX27      -> dbo.Staging_PDX27
--    Du An Khac -> dbo.Staging_DuAnKhac
--    NVL - TRAY -> dbo.Staging_NVL_Tray
--    NVL - CAP  -> dbo.Staging_NVL_Cap
--    NVL - SMT  -> dbo.Staging_NVL_Smt
--
--  Sau khi nap xong, trang /warehouse se tu hien thi 7 tab moi
--  (GET /api/warehouse/chs | /psm27 | /pdx27 | /khac | /tray | /cap | /smt).
-- ================================================================