-- ================================================================
--  clean_qty_quotes.sql
--  LÀM SẠCH KÝ TỰ QUOTE (") BỊ THỪA TRONG CỘT SỐ LƯỢNG
--  (lỗi phát sinh khi BULK INSERT từ CSV: "1" → "1 thay vì 1)
--
--  Áp dụng cho 7 bảng staging, các cột lượng/qty:
--    NPI: Shipment_Qty, Qty_Ton_Kho, Tong_Qty_Ton, RnD
--    NVL: Qty_Xuat_Hang, Ton_Kho, Xuat_1_Qty, Xuat_2_Qty, Xuat_3_Qty
-- ================================================================

UPDATE dbo.Staging_CHS
SET Shipment_Qty = REPLACE(Shipment_Qty, N'"', ''),
    Qty_Ton_Kho  = REPLACE(Qty_Ton_Kho,  N'"', ''),
    Tong_Qty_Ton = REPLACE(Tong_Qty_Ton, N'"', ''),
    RnD          = REPLACE(RnD,          N'"', '')
WHERE Shipment_Qty LIKE N'%"%' OR Qty_Ton_Kho LIKE N'%"%'
   OR Tong_Qty_Ton LIKE N'%"%' OR RnD LIKE N'"%';

UPDATE dbo.Staging_PSM27
SET Shipment_Qty = REPLACE(Shipment_Qty, N'"', ''),
    Qty_Ton_Kho  = REPLACE(Qty_Ton_Kho,  N'"', ''),
    Tong_Qty_Ton = REPLACE(Tong_Qty_Ton, N'"', ''),
    RnD          = REPLACE(RnD,          N'"', '')
WHERE Shipment_Qty LIKE N'%"%' OR Qty_Ton_Kho LIKE N'%"%'
   OR Tong_Qty_Ton LIKE N'%"%' OR RnD LIKE N'"%';

UPDATE dbo.Staging_PDX27
SET Shipment_Qty = REPLACE(Shipment_Qty, N'"', ''),
    Qty_Ton_Kho  = REPLACE(Qty_Ton_Kho,  N'"', ''),
    Tong_Qty_Ton = REPLACE(Tong_Qty_Ton, N'"', ''),
    RnD          = REPLACE(RnD,          N'"', '')
WHERE Shipment_Qty LIKE N'%"%' OR Qty_Ton_Kho LIKE N'%"%'
   OR Tong_Qty_Ton LIKE N'%"%' OR RnD LIKE N'"%';

UPDATE dbo.Staging_DuAnKhac
SET Shipment_Qty = REPLACE(Shipment_Qty, N'"', ''),
    Qty_Ton_Kho  = REPLACE(Qty_Ton_Kho,  N'"', ''),
    Tong_Qty_Ton = REPLACE(Tong_Qty_Ton, N'"', ''),
    RnD          = REPLACE(RnD,          N'"', '')
WHERE Shipment_Qty LIKE N'%"%' OR Qty_Ton_Kho LIKE N'%"%'
   OR Tong_Qty_Ton LIKE N'%"%' OR RnD LIKE N'"%';

UPDATE dbo.Staging_NVL_Tray
SET Qty_Xuat_Hang = REPLACE(Qty_Xuat_Hang, N'"', ''),
    Ton_Kho       = REPLACE(Ton_Kho,       N'"', ''),
    Xuat_1_Qty    = REPLACE(Xuat_1_Qty,    N'"', ''),
    Xuat_2_Qty    = REPLACE(Xuat_2_Qty,    N'"', ''),
    Xuat_3_Qty    = REPLACE(Xuat_3_Qty,    N'"', '')
WHERE Qty_Xuat_Hang LIKE N'%"%' OR Ton_Kho LIKE N'%"%'
   OR Xuat_1_Qty LIKE N'%"%' OR Xuat_2_Qty LIKE N'%"%' OR Xuat_3_Qty LIKE N'"%';

UPDATE dbo.Staging_NVL_Cap
SET Qty_Xuat_Hang = REPLACE(Qty_Xuat_Hang, N'"', ''),
    Ton_Kho       = REPLACE(Ton_Kho,       N'"', ''),
    Xuat_1_Qty    = REPLACE(Xuat_1_Qty,    N'"', ''),
    Xuat_2_Qty    = REPLACE(Xuat_2_Qty,    N'"', ''),
    Xuat_3_Qty    = REPLACE(Xuat_3_Qty,    N'"', '')
WHERE Qty_Xuat_Hang LIKE N'%"%' OR Ton_Kho LIKE N'%"%'
   OR Xuat_1_Qty LIKE N'%"%' OR Xuat_2_Qty LIKE N'%"%' OR Xuat_3_Qty LIKE N'"%';

UPDATE dbo.Staging_NVL_Smt
SET Qty_Xuat_Hang = REPLACE(Qty_Xuat_Hang, N'"', ''),
    Ton_Kho       = REPLACE(Ton_Kho,       N'"', ''),
    Xuat_1_Qty    = REPLACE(Xuat_1_Qty,    N'"', ''),
    Xuat_2_Qty    = REPLACE(Xuat_2_Qty,    N'"', ''),
    Xuat_3_Qty    = REPLACE(Xuat_3_Qty,    N'"', '')
WHERE Qty_Xuat_Hang LIKE N'%"%' OR Ton_Kho LIKE N'%"%'
   OR Xuat_1_Qty LIKE N'%"%' OR Xuat_2_Qty LIKE N'%"%' OR Xuat_3_Qty LIKE N'"%';

-- Kiểm tra kết quả: không còn dòng nào chứa "
SELECT 'Staging_CHS' AS Bang,
       (SELECT COUNT(*) FROM dbo.Staging_CHS WHERE Shipment_Qty LIKE N'%"%') AS ConQuote
UNION ALL SELECT 'Staging_PSM27',
       (SELECT COUNT(*) FROM dbo.Staging_PSM27 WHERE Shipment_Qty LIKE N'%"%')
UNION ALL SELECT 'Staging_PDX27',
       (SELECT COUNT(*) FROM dbo.Staging_PDX27 WHERE Shipment_Qty LIKE N'%"%')
UNION ALL SELECT 'Staging_DuAnKhac',
       (SELECT COUNT(*) FROM dbo.Staging_DuAnKhac WHERE Shipment_Qty LIKE N'%"%')
UNION ALL SELECT 'Staging_NVL_Tray',
       (SELECT COUNT(*) FROM dbo.Staging_NVL_Tray WHERE Qty_Xuat_Hang LIKE N'%"%')
UNION ALL SELECT 'Staging_NVL_Cap',
       (SELECT COUNT(*) FROM dbo.Staging_NVL_Cap WHERE Qty_Xuat_Hang LIKE N'%"%')
UNION ALL SELECT 'Staging_NVL_Smt',
       (SELECT COUNT(*) FROM dbo.Staging_NVL_Smt WHERE Qty_Xuat_Hang LIKE N'%"%');