-- ================================================================
-- clean_qty_quotes.sql (Đã cập nhật chuẩn theo 14 bảng Staging mới)
-- LÀM SẠCH KÝ TỰ QUOTE (") BỊ THỪA TRONG CỘT SỐ LƯỢNG
-- (lỗi phát sinh khi BULK INSERT từ CSV: "1" thay vì 1)
-- ================================================================

-- 1. Staging_SBN27
UPDATE dbo.Staging_SBN27
SET Shipment_Qty = REPLACE(Shipment_Qty, N'"', ''),
    Pack_Qty     = REPLACE(Pack_Qty,     N'"', ''),
    IQA_Scrap    = REPLACE(IQA_Scrap,    N'"', ''),
    Qty_Ton_Kho  = REPLACE(Qty_Ton_Kho,  N'"', ''),
    Tong_Qty_Ton = REPLACE(Tong_Qty_Ton, N'"', '')
WHERE Shipment_Qty LIKE N'%"%' OR Pack_Qty LIKE N'%"%' 
   OR IQA_Scrap LIKE N'%"%' OR Qty_Ton_Kho LIKE N'%"%' OR Tong_Qty_Ton LIKE N'%"%';

-- 2. Staging_CLO27
UPDATE dbo.Staging_CLO27
SET Shipment_Qty = REPLACE(Shipment_Qty, N'"', ''),
    Pack_Qty     = REPLACE(Pack_Qty,     N'"', ''),
    IQA_Scrap    = REPLACE(IQA_Scrap,    N'"', ''),
    Qty_Ton_Kho  = REPLACE(Qty_Ton_Kho,  N'"', ''),
    Tong_Qty_Ton = REPLACE(Tong_Qty_Ton, N'"', '')
WHERE Shipment_Qty LIKE N'%"%' OR Pack_Qty LIKE N'%"%' 
   OR IQA_Scrap LIKE N'%"%' OR Qty_Ton_Kho LIKE N'%"%' OR Tong_Qty_Ton LIKE N'%"%';

-- 3. Staging_SC_A_27
UPDATE dbo.Staging_SC_A_27
SET Shipment_Qty = REPLACE(Shipment_Qty, N'"', ''),
    Pack_Qty     = REPLACE(Pack_Qty,     N'"', ''),
    IQA_Scrap    = REPLACE(IQA_Scrap,    N'"', ''),
    Qty_Ton_Kho  = REPLACE(Qty_Ton_Kho,  N'"', ''),
    Tong_Qty_Ton = REPLACE(Tong_Qty_Ton, N'"', '')
WHERE Shipment_Qty LIKE N'%"%' OR Pack_Qty LIKE N'%"%' 
   OR IQA_Scrap LIKE N'%"%' OR Qty_Ton_Kho LIKE N'%"%' OR Tong_Qty_Ton LIKE N'%"%';

-- 4. Staging_PDX27
UPDATE dbo.Staging_PDX27
SET Shipment_Qty = REPLACE(Shipment_Qty, N'"', ''),
    Pack_Qty     = REPLACE(Pack_Qty,     N'"', ''),
    IQA_Scrap    = REPLACE(IQA_Scrap,    N'"', ''),
    Qty_Ton_Kho  = REPLACE(Qty_Ton_Kho,  N'"', ''),
    Tong_Qty_Ton = REPLACE(Tong_Qty_Ton, N'"', '')
WHERE Shipment_Qty LIKE N'%"%' OR Pack_Qty LIKE N'%"%' 
   OR IQA_Scrap LIKE N'%"%' OR Qty_Ton_Kho LIKE N'%"%' OR Tong_Qty_Ton LIKE N'%"%';

-- 5. Staging_PSM27
UPDATE dbo.Staging_PSM27
SET Shipment_Qty = REPLACE(Shipment_Qty, N'"', ''),
    Pack_Qty     = REPLACE(Pack_Qty,     N'"', ''),
    IQA_Scrap    = REPLACE(IQA_Scrap,    N'"', ''),
    Qty_Ton_Kho  = REPLACE(Qty_Ton_Kho,  N'"', ''),
    Tong_Qty_Ton = REPLACE(Tong_Qty_Ton, N'"', '')
WHERE Shipment_Qty LIKE N'%"%' OR Pack_Qty LIKE N'%"%' 
   OR IQA_Scrap LIKE N'%"%' OR Qty_Ton_Kho LIKE N'%"%' OR Tong_Qty_Ton LIKE N'%"%';

-- 6. Staging_ATW
UPDATE dbo.Staging_ATW
SET Shipment_Qty = REPLACE(Shipment_Qty, N'"', ''),
    Pack_Qty     = REPLACE(Pack_Qty,     N'"', ''),
    IQA_Scrap    = REPLACE(IQA_Scrap,    N'"', ''),
    Qty_Ton_Kho  = REPLACE(Qty_Ton_Kho,  N'"', ''),
    Tong_Qty_Ton = REPLACE(Tong_Qty_Ton, N'"', '')
WHERE Shipment_Qty LIKE N'%"%' OR Pack_Qty LIKE N'%"%' 
   OR IQA_Scrap LIKE N'%"%' OR Qty_Ton_Kho LIKE N'%"%' OR Tong_Qty_Ton LIKE N'%"%';

-- 7. Staging_RENO27
UPDATE dbo.Staging_RENO27
SET Shipment_Qty = REPLACE(Shipment_Qty, N'"', ''),
    Pack_Qty     = REPLACE(Pack_Qty,     N'"', ''),
    IQA_Scrap    = REPLACE(IQA_Scrap,    N'"', ''),
    Qty_Ton_Kho  = REPLACE(Qty_Ton_Kho,  N'"', ''),
    Tong_Qty_Ton = REPLACE(Tong_Qty_Ton, N'"', '')
WHERE Shipment_Qty LIKE N'%"%' OR Pack_Qty LIKE N'%"%' 
   OR IQA_Scrap LIKE N'%"%' OR Qty_Ton_Kho LIKE N'%"%' OR Tong_Qty_Ton LIKE N'%"%';

-- 8. Staging_CHS
UPDATE dbo.Staging_CHS
SET Shipment_Qty = REPLACE(Shipment_Qty, N'"', ''),
    Pack_Qty     = REPLACE(Pack_Qty,     N'"', ''),
    IQA_Scrap    = REPLACE(IQA_Scrap,    N'"', ''),
    Qty_Ton_Kho  = REPLACE(Qty_Ton_Kho,  N'"', ''),
    Tong_Qty_Ton = REPLACE(Tong_Qty_Ton, N'"', '')
WHERE Shipment_Qty LIKE N'%"%' OR Pack_Qty LIKE N'%"%' 
   OR IQA_Scrap LIKE N'%"%' OR Qty_Ton_Kho LIKE N'%"%' OR Tong_Qty_Ton LIKE N'%"%';

-- 9. Staging_NVL_Tray (Xử lý các cột xuất từ 1 đến 8)
UPDATE dbo.Staging_NVL_Tray
SET Shipment_Qty  = REPLACE(Shipment_Qty,  N'"', ''),
    Qty_Xuat_Hang = REPLACE(Qty_Xuat_Hang, N'"', ''),
    Ton_Kho       = REPLACE(Ton_Kho,       N'"', ''),
    Tong_Qty_Ton  = REPLACE(Tong_Qty_Ton,  N'"', ''),
    Xuat_1_Qty    = REPLACE(Xuat_1_Qty,    N'"', ''),
    Xuat_2_Qty    = REPLACE(Xuat_2_Qty,    N'"', ''),
    Xuat_3_Qty    = REPLACE(Xuat_3_Qty,    N'"', ''),
    Xuat_4_Qty    = REPLACE(Xuat_4_Qty,    N'"', ''),
    Xuat_5_Qty    = REPLACE(Xuat_5_Qty,    N'"', ''),
    Xuat_6_Qty    = REPLACE(Xuat_6_Qty,    N'"', ''),
    Xuat_7_Qty    = REPLACE(Xuat_7_Qty,    N'"', ''),
    Xuat_8_Qty    = REPLACE(Xuat_8_Qty,    N'"', '')
WHERE Shipment_Qty LIKE N'%"%' OR Qty_Xuat_Hang LIKE N'%"%' OR Ton_Kho LIKE N'%"%' OR Tong_Qty_Ton LIKE N'%"%'
   OR Xuat_1_Qty LIKE N'%"%' OR Xuat_2_Qty LIKE N'%"%' OR Xuat_3_Qty LIKE N'%"%' OR Xuat_4_Qty LIKE N'%"%'
   OR Xuat_5_Qty LIKE N'%"%' OR Xuat_6_Qty LIKE N'%"%' OR Xuat_7_Qty LIKE N'%"%' OR Xuat_8_Qty LIKE N'%"%';

-- 10. Staging_NVL_Cap
UPDATE dbo.Staging_NVL_Cap
SET Shipment_Qty  = REPLACE(Shipment_Qty,  N'"', ''),
    Qty_Xuat_Hang = REPLACE(Qty_Xuat_Hang, N'"', ''),
    Ton_Kho       = REPLACE(Ton_Kho,       N'"', ''),
    Tong_Qty_Ton  = REPLACE(Tong_Qty_Ton,  N'"', ''),
    Xuat_1_Qty    = REPLACE(Xuat_1_Qty,    N'"', ''),
    Xuat_2_Qty    = REPLACE(Xuat_2_Qty,    N'"', ''),
    Xuat_3_Qty    = REPLACE(Xuat_3_Qty,    N'"', ''),
    Xuat_4_Qty    = REPLACE(Xuat_4_Qty,    N'"', ''),
    Xuat_5_Qty    = REPLACE(Xuat_5_Qty,    N'"', ''),
    Xuat_6_Qty    = REPLACE(Xuat_6_Qty,    N'"', ''),
    Xuat_7_Qty    = REPLACE(Xuat_7_Qty,    N'"', ''),
    Xuat_8_Qty    = REPLACE(Xuat_8_Qty,    N'"', '')
WHERE Shipment_Qty LIKE N'%"%' OR Qty_Xuat_Hang LIKE N'%"%' OR Ton_Kho LIKE N'%"%' OR Tong_Qty_Ton LIKE N'%"%'
   OR Xuat_1_Qty LIKE N'%"%' OR Xuat_2_Qty LIKE N'%"%' OR Xuat_3_Qty LIKE N'%"%' OR Xuat_4_Qty LIKE N'%"%'
   OR Xuat_5_Qty LIKE N'%"%' OR Xuat_6_Qty LIKE N'%"%' OR Xuat_7_Qty LIKE N'%"%' OR Xuat_8_Qty LIKE N'%"%';

-- 11. Staging_NVL_SMT27
UPDATE dbo.Staging_NVL_SMT27
SET Shipment_Qty  = REPLACE(Shipment_Qty,  N'"', ''),
    Qty_Xuat_Hang = REPLACE(Qty_Xuat_Hang, N'"', ''),
    Ton_Kho       = REPLACE(Ton_Kho,       N'"', ''),
    Tong_Qty_Ton  = REPLACE(Tong_Qty_Ton,  N'"', ''),
    Xuat_1_Qty    = REPLACE(Xuat_1_Qty,    N'"', ''),
    Xuat_2_Qty    = REPLACE(Xuat_2_Qty,    N'"', ''),
    Xuat_3_Qty    = REPLACE(Xuat_3_Qty,    N'"', ''),
    Xuat_4_Qty    = REPLACE(Xuat_4_Qty,    N'"', ''),
    Xuat_5_Qty    = REPLACE(Xuat_5_Qty,    N'"', ''),
    Xuat_6_Qty    = REPLACE(Xuat_6_Qty,    N'"', ''),
    Xuat_7_Qty    = REPLACE(Xuat_7_Qty,    N'"', ''),
    Xuat_8_Qty    = REPLACE(Xuat_8_Qty,    N'"', '')
WHERE Shipment_Qty LIKE N'%"%' OR Qty_Xuat_Hang LIKE N'%"%' OR Ton_Kho LIKE N'%"%' OR Tong_Qty_Ton LIKE N'%"%'
   OR Xuat_1_Qty LIKE N'%"%' OR Xuat_2_Qty LIKE N'%"%' OR Xuat_3_Qty LIKE N'%"%' OR Xuat_4_Qty LIKE N'%"%'
   OR Xuat_5_Qty LIKE N'%"%' OR Xuat_6_Qty LIKE N'%"%' OR Xuat_7_Qty LIKE N'%"%' OR Xuat_8_Qty LIKE N'%"%';

-- 12. Staging_NVL_HTCC_SMT
UPDATE dbo.Staging_NVL_HTCC_SMT
SET Shipment_Qty  = REPLACE(Shipment_Qty,  N'"', ''),
    Qty_Ton_Kho   = REPLACE(Qty_Ton_Kho,   N'"', ''),
    Tong_Qty_Ton  = REPLACE(Tong_Qty_Ton,  N'"', '')
WHERE Shipment_Qty LIKE N'%"%' OR Qty_Ton_Kho LIKE N'%"%' OR Tong_Qty_Ton LIKE N'%"%';

-- 13. Staging_SparePart
UPDATE dbo.Staging_SparePart
SET Qty         = REPLACE(Qty,         N'"', ''),
    Ton_Kho     = REPLACE(Ton_Kho,     N'"', ''),
    Xuat_1_Qty  = REPLACE(Xuat_1_Qty,  N'"', '')
WHERE Qty LIKE N'%"%' OR Ton_Kho LIKE N'%"%' OR Xuat_1_Qty LIKE N'%"%';

-- 14. Staging_TongTon
UPDATE dbo.Staging_TongTon
SET Shipment_Qty = REPLACE(Shipment_Qty, N'"', ''),
    Tong_ton     = REPLACE(Tong_ton,     N'"', '')
WHERE Shipment_Qty LIKE N'%"%' OR Tong_ton LIKE N'%"%';


-- ================================================================
-- KIỂM TRA KẾT QUẢ SAU KHI LÀM SẠCH (Đảm bảo không còn dòng nào chứa ký tự ")
-- ================================================================
SELECT 'Staging_SBN27' AS Bang, (SELECT COUNT(*) FROM dbo.Staging_SBN27 WHERE Shipment_Qty LIKE N'%"%') AS ConQuote
UNION ALL SELECT 'Staging_CLO27', (SELECT COUNT(*) FROM dbo.Staging_CLO27 WHERE Shipment_Qty LIKE N'%"%')
UNION ALL SELECT 'Staging_SC_A_27', (SELECT COUNT(*) FROM dbo.Staging_SC_A_27 WHERE Shipment_Qty LIKE N'%"%')
UNION ALL SELECT 'Staging_PDX27', (SELECT COUNT(*) FROM dbo.Staging_PDX27 WHERE Shipment_Qty LIKE N'%"%')
UNION ALL SELECT 'Staging_PSM27', (SELECT COUNT(*) FROM dbo.Staging_PSM27 WHERE Shipment_Qty LIKE N'%"%')
UNION ALL SELECT 'Staging_ATW', (SELECT COUNT(*) FROM dbo.Staging_ATW WHERE Shipment_Qty LIKE N'%"%')
UNION ALL SELECT 'Staging_RENO27', (SELECT COUNT(*) FROM dbo.Staging_RENO27 WHERE Shipment_Qty LIKE N'%"%')
UNION ALL SELECT 'Staging_CHS', (SELECT COUNT(*) FROM dbo.Staging_CHS WHERE Shipment_Qty LIKE N'%"%')
UNION ALL SELECT 'Staging_NVL_Tray', (SELECT COUNT(*) FROM dbo.Staging_NVL_Tray WHERE Shipment_Qty LIKE N'%"%')
UNION ALL SELECT 'Staging_NVL_Cap', (SELECT COUNT(*) FROM dbo.Staging_NVL_Cap WHERE Shipment_Qty LIKE N'%"%')
UNION ALL SELECT 'Staging_NVL_SMT27', (SELECT COUNT(*) FROM dbo.Staging_NVL_SMT27 WHERE Shipment_Qty LIKE N'%"%')
UNION ALL SELECT 'Staging_NVL_HTCC_SMT', (SELECT COUNT(*) FROM dbo.Staging_NVL_HTCC_SMT WHERE Shipment_Qty LIKE N'%"%')
UNION ALL SELECT 'Staging_SparePart', (SELECT COUNT(*) FROM dbo.Staging_SparePart WHERE Qty LIKE N'%"%')
UNION ALL SELECT 'Staging_TongTon', (SELECT COUNT(*) FROM dbo.Staging_TongTon WHERE Shipment_Qty LIKE N'%"%');