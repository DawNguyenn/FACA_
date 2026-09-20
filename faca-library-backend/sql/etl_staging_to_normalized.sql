-- ================================================================
--  ETL: Staging_* (dữ liệu thô Excel) -> Bảng chuẩn hóa
--  Vendors / Projects / Builds / Materials / InventoryLots / InventoryTransactions
--  An toàn chạy lại (idempotent) nhờ NOT EXISTS.
--  Lọc bỏ: dòng rỗng hoàn toàn + dòng header Excel (Model = 'Model').
-- ================================================================
SET XACT_ABORT ON;
BEGIN TRAN;

DECLARE @VendorTypeId INT = 8;      -- SMT-NPI
DECLARE @SystemUserId INT = 3;      -- user hệ thống (FK NOT NULL của InventoryTransactions)

---------------------------------------------------------------
-- 0. Gom dữ liệu staging vào #Raw
---------------------------------------------------------------
IF OBJECT_ID('tempdb..#Raw') IS NOT NULL DROP TABLE #Raw;
CREATE TABLE #Raw (
    Src nvarchar(20), Model nvarchar(200), Build nvarchar(200),
    Received_Date nvarchar(50), Material nvarchar(500), Vendor nvarchar(300),
    Description nvarchar(max), Config nvarchar(200),
    Shipment_Qty nvarchar(50), Lot_ID nvarchar(100), IQA_Scrap nvarchar(50),
    Qty_Ton_Kho nvarchar(50), Bill nvarchar(100), IV nvarchar(100),
    Ghi_Chu nvarchar(max), Output_Date nvarchar(50),
    XuatN tinyint, Xuat_Date nvarchar(50), Xuat_Qty nvarchar(50),
    RN int IDENTITY(1,1)
);

-- 8 bảng dự án (có Output_Date)
INSERT INTO #Raw (Src, Model, Build, Received_Date, Material, Vendor, Description, Config, Shipment_Qty, Lot_ID, IQA_Scrap, Qty_Ton_Kho, Bill, IV, Ghi_Chu, Output_Date)
SELECT 'SBN27', Model, Build, Received_Date, Material, Vendor, Description, Config, Shipment_Qty, Lot_ID, IQA_Scrap, Qty_Ton_Kho, Bill, IV, Ghi_Chu, Output_Date FROM Staging_SBN27
UNION ALL SELECT 'CLO27', Model, Build, Received_Date, Material, Vendor, Description, Config, Shipment_Qty, Lot_ID, IQA_Scrap, Qty_Ton_Kho, Bill, IV, Ghi_Chu, Output_Date FROM Staging_CLO27
UNION ALL SELECT 'SCA27', Model, Build, Received_Date, Material, Vendor, Description, Config, Shipment_Qty, Lot_ID, IQA_Scrap, Qty_Ton_Kho, Bill, IV, Ghi_Chu, Output_Date FROM Staging_SC_A_27
UNION ALL SELECT 'PDX27', Model, Build, Received_Date, Material, Vendor, Description, Config, Shipment_Qty, Lot_ID, IQA_Scrap, Qty_Ton_Kho, Bill, IV, Ghi_Chu, Output_Date FROM Staging_PDX27
UNION ALL SELECT 'PSM27', Model, Build, Received_Date, Material, Vendor, Description, Config, Shipment_Qty, Lot_ID, IQA_Scrap, Qty_Ton_Kho, Bill, IV, Ghi_Chu, Output_Date FROM Staging_PSM27
UNION ALL SELECT 'ATW',   Model, Build, Received_Date, Material, Vendor, Description, Config, Shipment_Qty, Lot_ID, IQA_Scrap, Qty_Ton_Kho, Bill, IV, Ghi_Chu, Output_Date FROM Staging_ATW
UNION ALL SELECT 'RENO27',Model, Build, Received_Date, Material, Vendor, Description, Config, Shipment_Qty, Lot_ID, IQA_Scrap, Qty_Ton_Kho, Bill, IV, Ghi_Chu, Output_Date FROM Staging_RENO27
UNION ALL SELECT 'CHS',   Model, Build, Received_Date, Material, Vendor, Description, Config, Shipment_Qty, Lot_ID, IQA_Scrap, Qty_Ton_Kho, Bill, IV, Ghi_Chu, Output_Date FROM Staging_CHS;

-- NVL_HTCC_SMT (có Lot_ID, không có xuất)
INSERT INTO #Raw (Src, Model, Build, Received_Date, Material, Vendor, Description, Config, Shipment_Qty, Lot_ID, Qty_Ton_Kho, Ghi_Chu)
SELECT 'HTCC', Model, Build, Received_Date, Material, Vendor, Description, Config, Shipment_Qty, Lot_ID, Qty_Ton_Kho, Ghi_Chu FROM Staging_NVL_HTCC_SMT;

-- 3 bảng NVL: bung Xuat_1..8 thành 8 dòng
INSERT INTO #Raw (Src, Model, Build, Received_Date, Material, Vendor, Description, Shipment_Qty, Qty_Ton_Kho, Bill, IV, Ghi_Chu, XuatN, Xuat_Date, Xuat_Qty)
SELECT 'TRAY', Model, Build, Received_Date, Material, Vendor, Description, Shipment_Qty, Ton_Kho, Bill, IV, Ghi_Chu, n,
       CASE n WHEN 1 THEN Xuat_1_Date WHEN 2 THEN Xuat_2_Date WHEN 3 THEN Xuat_3_Date WHEN 4 THEN Xuat_4_Date
              WHEN 5 THEN Xuat_5_Date WHEN 6 THEN Xuat_6_Date WHEN 7 THEN Xuat_7_Date ELSE Xuat_8_Date END,
       CASE n WHEN 1 THEN Xuat_1_Qty  WHEN 2 THEN Xuat_2_Qty  WHEN 3 THEN Xuat_3_Qty  WHEN 4 THEN Xuat_4_Qty
              WHEN 5 THEN Xuat_5_Qty  WHEN 6 THEN Xuat_6_Qty  WHEN 7 THEN Xuat_7_Qty  ELSE Xuat_8_Qty END
FROM Staging_NVL_Tray CROSS JOIN (VALUES(1),(2),(3),(4),(5),(6),(7),(8)) v(n)
UNION ALL
SELECT 'CAP', Model, Build, Received_Date, Material, Vendor, Description, Shipment_Qty, Ton_Kho, Bill, IV, Ghi_Chu, n,
       CASE n WHEN 1 THEN Xuat_1_Date WHEN 2 THEN Xuat_2_Date WHEN 3 THEN Xuat_3_Date WHEN 4 THEN Xuat_4_Date
              WHEN 5 THEN Xuat_5_Date WHEN 6 THEN Xuat_6_Date WHEN 7 THEN Xuat_7_Date ELSE Xuat_8_Date END,
       CASE n WHEN 1 THEN Xuat_1_Qty  WHEN 2 THEN Xuat_2_Qty  WHEN 3 THEN Xuat_3_Qty  WHEN 4 THEN Xuat_4_Qty
              WHEN 5 THEN Xuat_5_Qty  WHEN 6 THEN Xuat_6_Qty  WHEN 7 THEN Xuat_7_Qty  ELSE Xuat_8_Qty END
FROM Staging_NVL_Cap CROSS JOIN (VALUES(1),(2),(3),(4),(5),(6),(7),(8)) v(n)
UNION ALL
SELECT 'SMT', Model, Build, Received_Date, Material, Vendor, Description, Shipment_Qty, Ton_Kho, Bill, IV, Ghi_Chu, n,
       CASE n WHEN 1 THEN Xuat_1_Date WHEN 2 THEN Xuat_2_Date WHEN 3 THEN Xuat_3_Date WHEN 4 THEN Xuat_4_Date
              WHEN 5 THEN Xuat_5_Date WHEN 6 THEN Xuat_6_Date WHEN 7 THEN Xuat_7_Date ELSE Xuat_8_Date END,
       CASE n WHEN 1 THEN Xuat_1_Qty  WHEN 2 THEN Xuat_2_Qty  WHEN 3 THEN Xuat_3_Qty  WHEN 4 THEN Xuat_4_Qty
              WHEN 5 THEN Xuat_5_Qty  WHEN 6 THEN Xuat_6_Qty  WHEN 7 THEN Xuat_7_Qty  ELSE Xuat_8_Qty END
FROM Staging_NVL_SMT27 CROSS JOIN (VALUES(1),(2),(3),(4),(5),(6),(7),(8)) v(n);

-- Lọc dòng dữ liệu thật: loại dòng rỗng, dòng header Excel, và dữ liệu rác mock 'Data-xxx'
DELETE FROM #Raw
WHERE Model IS NULL OR LTRIM(RTRIM(Model)) = '' OR LTRIM(RTRIM(Model)) = 'Model'
   OR Model LIKE 'Data-%' OR Vendor LIKE 'Data-%' OR Material LIKE 'Data-%';

---------------------------------------------------------------
-- 1. Vendors
---------------------------------------------------------------
INSERT INTO Vendors (VendorName, Country, IsActive)
SELECT DISTINCT NULLIF(LTRIM(RTRIM(r.Vendor)), ''), NULL, 1
FROM #Raw r
WHERE NULLIF(LTRIM(RTRIM(r.Vendor)), '') IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM Vendors v WHERE v.VendorName = NULLIF(LTRIM(RTRIM(r.Vendor)), ''));

---------------------------------------------------------------
-- 2. Projects  (Model = mã dự án)
---------------------------------------------------------------
INSERT INTO Projects (ProjectCode, ProjectName, Status, CreatedDate)
SELECT DISTINCT NULLIF(LTRIM(RTRIM(r.Model)), ''), NULLIF(LTRIM(RTRIM(r.Model)), ''), 1, GETDATE()
FROM #Raw r
WHERE NULLIF(LTRIM(RTRIM(r.Model)), '') IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM Projects p WHERE p.ProjectCode = NULLIF(LTRIM(RTRIM(r.Model)), ''));

---------------------------------------------------------------
-- 3. Builds  (Model + Build)
---------------------------------------------------------------
INSERT INTO Builds (ProjectId, BuildCode, CreatedDate)
SELECT DISTINCT p.ProjectId, NULLIF(LTRIM(RTRIM(r.Build)), ''), GETDATE()
FROM #Raw r
JOIN Projects p ON p.ProjectCode = NULLIF(LTRIM(RTRIM(r.Model)), '')
WHERE NULLIF(LTRIM(RTRIM(r.Build)), '') IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM Builds b WHERE b.ProjectId = p.ProjectId AND b.BuildCode = NULLIF(LTRIM(RTRIM(r.Build)), ''));

---------------------------------------------------------------
-- 4. Materials  (Material + Vendor)
---------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM Vendors WHERE VendorName = N'Unknown')
    INSERT INTO Vendors (VendorName, Country, IsActive) VALUES (N'Unknown', NULL, 1);

INSERT INTO Materials (MaterialName, MaterialTypeID, VendorID, Config, Description)
SELECT m.MaterialName, @VendorTypeId, v.VendorId, m.Config, m.[Description]
FROM (
    SELECT NULLIF(LTRIM(RTRIM(Material)), '') AS MaterialName,
           NULLIF(LTRIM(RTRIM(Vendor)), '')   AS VendorName,
           MIN(NULLIF(LTRIM(RTRIM(Config)), ''))          AS Config,
           MIN(NULLIF(LTRIM(RTRIM([Description])), ''))   AS [Description]
    FROM #Raw
    WHERE NULLIF(LTRIM(RTRIM(Material)), '') IS NOT NULL
    GROUP BY NULLIF(LTRIM(RTRIM(Material)), ''), NULLIF(LTRIM(RTRIM(Vendor)), '')
) m
JOIN Vendors v ON v.VendorName = m.VendorName
WHERE NOT EXISTS (SELECT 1 FROM Materials x WHERE x.MaterialName = m.MaterialName AND x.VendorID = v.VendorId);

-- Material mà Vendor rỗng -> gán vendor Unknown
INSERT INTO Materials (MaterialName, MaterialTypeID, VendorID, Config, Description)
SELECT m.MaterialName, @VendorTypeId, (SELECT VendorId FROM Vendors WHERE VendorName = N'Unknown'), m.Config, m.[Description]
FROM (
    SELECT NULLIF(LTRIM(RTRIM(Material)), '') AS MaterialName,
           MIN(NULLIF(LTRIM(RTRIM(Config)), ''))        AS Config,
           MIN(NULLIF(LTRIM(RTRIM([Description])), '')) AS [Description]
    FROM #Raw
    WHERE NULLIF(LTRIM(RTRIM(Material)), '') IS NOT NULL
      AND NULLIF(LTRIM(RTRIM(Vendor)), '') IS NULL
    GROUP BY NULLIF(LTRIM(RTRIM(Material)), '')
) m
WHERE NOT EXISTS (
    SELECT 1 FROM Materials x
    JOIN Vendors v2 ON v2.VendorId = x.VendorID
    WHERE x.MaterialName = m.MaterialName AND v2.VendorName = N'Unknown'
);

---------------------------------------------------------------
-- 5. InventoryLots  (mỗi dòng dữ liệu staging = 1 lot)
--    Gắn LotCode UNIQUE per (Project, Material) để join được với transactions
---------------------------------------------------------------
INSERT INTO InventoryLots (ProjectID, BuildID, MaterialID, LotCode, ReceiveDate, ShipmentQty, IQAScrapQty, StockQty, DRI, BillNo, InvoiceNo, Remark, CreateDate)
SELECT
    p.ProjectId,
    b.BuildId,
    m.MaterialID,
    CONCAT(r.Src, '-', r.RN, '-', ISNULL(NULLIF(LTRIM(RTRIM(r.Lot_ID)), ''), 'NOLOT')),
    TRY_CONVERT(date, NULLIF(LTRIM(RTRIM(r.Received_Date)), ''), 23),
    ISNULL(TRY_CONVERT(int, NULLIF(LTRIM(RTRIM(r.Shipment_Qty)), '')), 0),
    ISNULL(TRY_CONVERT(int, NULLIF(LTRIM(RTRIM(r.IQA_Scrap)), '')), 0),
    ISNULL(TRY_CONVERT(int, NULLIF(LTRIM(RTRIM(r.Qty_Ton_Kho)), '')), 0),
    NULL,                       -- DRI FK -> users; mã DRI-xx không tồn tại trong users
    NULLIF(LTRIM(RTRIM(r.Bill)), ''),
    NULLIF(LTRIM(RTRIM(r.IV)), ''),
    r.Ghi_Chu,
    ISNULL(TRY_CONVERT(date, NULLIF(LTRIM(RTRIM(r.Received_Date)), ''), 23), GETDATE())
FROM #Raw r
JOIN Projects p  ON p.ProjectCode  = NULLIF(LTRIM(RTRIM(r.Model)), '')
LEFT JOIN Builds b  ON b.ProjectId = p.ProjectId AND b.BuildCode = NULLIF(LTRIM(RTRIM(r.Build)), '')
LEFT JOIN Vendors v ON v.VendorName = NULLIF(LTRIM(RTRIM(r.Vendor)), '')
LEFT JOIN Materials m ON m.MaterialName = NULLIF(LTRIM(RTRIM(r.Material)), '') AND m.VendorID = v.VendorId
WHERE m.MaterialID IS NOT NULL
  AND TRY_CONVERT(date, NULLIF(LTRIM(RTRIM(r.Received_Date)), ''), 23) IS NOT NULL
  AND NOT EXISTS (
      SELECT 1 FROM InventoryLots il
      WHERE il.ProjectID = p.ProjectId AND il.MaterialID = m.MaterialID
        AND il.LotCode = CONCAT(r.Src, '-', r.RN, '-', ISNULL(NULLIF(LTRIM(RTRIM(r.Lot_ID)), ''), 'NOLOT'))
  );

---------------------------------------------------------------
-- 6. InventoryTransactions  (Xuat_n trong bảng NVL + Output_Date bảng dự án)
---------------------------------------------------------------
INSERT INTO InventoryTransactions (InventoryLotID, TransactionType, TransactionDate, Quantity, EmployeeID, DRI, Note)
SELECT
    il.InventoryLotID,
    'XUAT_KHO',
    CASE WHEN r.XuatN IS NOT NULL
         THEN TRY_CONVERT(date, NULLIF(LTRIM(RTRIM(r.Xuat_Date)), ''), 23)
         ELSE TRY_CONVERT(date, NULLIF(LTRIM(RTRIM(r.Output_Date)), ''), 23) END,
    CASE WHEN r.XuatN IS NOT NULL
         THEN ISNULL(TRY_CONVERT(int, NULLIF(LTRIM(RTRIM(r.Xuat_Qty)), '')), 0)
         ELSE ISNULL(TRY_CONVERT(int, NULLIF(LTRIM(RTRIM(r.Qty_Ton_Kho)), '')), 0) END,
    @SystemUserId,
    NULL,
    CONCAT('Src: ', r.Src, CASE WHEN r.XuatN IS NOT NULL THEN CONCAT(' — Lần xuất #', r.XuatN) ELSE ' — Output_Date' END)
FROM #Raw r
JOIN Projects p ON p.ProjectCode = NULLIF(LTRIM(RTRIM(r.Model)), '')
LEFT JOIN Vendors v ON v.VendorName = NULLIF(LTRIM(RTRIM(r.Vendor)), '')
LEFT JOIN Materials m ON m.MaterialName = NULLIF(LTRIM(RTRIM(r.Material)), '') AND m.VendorID = v.VendorId
JOIN InventoryLots il ON il.ProjectID = p.ProjectId AND il.MaterialID = m.MaterialID
    AND il.LotCode = CONCAT(r.Src, '-', r.RN, '-', ISNULL(NULLIF(LTRIM(RTRIM(r.Lot_ID)), ''), 'NOLOT'))
WHERE m.MaterialID IS NOT NULL
  AND r.XuatN IS NOT NULL
  AND TRY_CONVERT(date, NULLIF(LTRIM(RTRIM(r.Xuat_Date)), ''), 23) IS NOT NULL
  AND NOT EXISTS (
      SELECT 1 FROM InventoryTransactions it
      WHERE it.InventoryLotID = il.InventoryLotID
        AND it.TransactionDate = TRY_CONVERT(date, NULLIF(LTRIM(RTRIM(r.Xuat_Date)), ''), 23)
        AND it.Quantity = ISNULL(TRY_CONVERT(int, NULLIF(LTRIM(RTRIM(r.Xuat_Qty)), '')), 0)
        AND it.Note = CONCAT('Src: ', r.Src, ' — Lần xuất #', r.XuatN)
  );

---------------------------------------------------------------
-- Kiểm tra kết quả
---------------------------------------------------------------
SELECT 'Vendors' T, COUNT(*) C FROM Vendors
UNION ALL SELECT 'Projects', COUNT(*) FROM Projects
UNION ALL SELECT 'Builds', COUNT(*) FROM Builds
UNION ALL SELECT 'Materials', COUNT(*) FROM Materials
UNION ALL SELECT 'InventoryLots', COUNT(*) FROM InventoryLots
UNION ALL SELECT 'InventoryTransactions', COUNT(*) FROM InventoryTransactions;

COMMIT TRAN;
