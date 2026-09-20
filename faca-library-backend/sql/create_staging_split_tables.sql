-- ================================================================
-- create_staging_split_tables.sql (Đã sửa lỗi cấu trúc và tên bảng)
-- ================================================================

-- 1. Staging_SBN27
IF OBJECT_ID(N'dbo.Staging_SBN27', N'U') IS NOT NULL DROP TABLE dbo.Staging_SBN27;
CREATE TABLE dbo.Staging_SBN27 (
    Change_Date     NVARCHAR(50)  NULL,
    Model           NVARCHAR(100) NULL,
    Build           NVARCHAR(50)  NULL,
    Received_Date   NVARCHAR(50)  NULL,
    Material        NVARCHAR(100) NULL,
    Vendor          NVARCHAR(100) NULL,
    Description     NVARCHAR(255) NULL,
    Config          NVARCHAR(100) NULL,
    Shipment_Qty    NVARCHAR(50)  NULL,
    STT_pack        NVARCHAR(50)  NULL,
    Lot_ID          NVARCHAR(255) NULL,
    Pack_Qty        NVARCHAR(50)  NULL,
    IQA_Scrap       NVARCHAR(50)  NULL,
    DRI             NVARCHAR(50)  NULL,
    Qty_Ton_Kho     NVARCHAR(50)  NULL,
    Output_Date     NVARCHAR(50)  NULL,
    Receiver        NVARCHAR(100) NULL,
    Ma_NV           NVARCHAR(50)  NULL,
    Ghi_Chu         NVARCHAR(255) NULL,
    Tong_Qty_Ton    NVARCHAR(50)  NULL,
    Dem_SL          NVARCHAR(50)  NULL,
    Bill            NVARCHAR(100) NULL,
    IV              NVARCHAR(100) NULL
);

-- 2. Staging_CLO27
IF OBJECT_ID(N'dbo.Staging_CLO27', N'U') IS NOT NULL DROP TABLE dbo.Staging_CLO27;
CREATE TABLE dbo.Staging_CLO27 (
    Change_Date     NVARCHAR(50)  NULL,
    Model           NVARCHAR(100) NULL,
    Build           NVARCHAR(50)  NULL,
    Received_Date   NVARCHAR(50)  NULL,
    Material        NVARCHAR(100) NULL,
    Vendor          NVARCHAR(100) NULL,
    Description     NVARCHAR(255) NULL,
    Config          NVARCHAR(100) NULL,
    Shipment_Qty    NVARCHAR(50)  NULL,
    STT_pack        NVARCHAR(50)  NULL,
    Lot_ID          NVARCHAR(255) NULL,
    Pack_Qty        NVARCHAR(50)  NULL,
    IQA_Scrap       NVARCHAR(50)  NULL,
    DRI             NVARCHAR(50)  NULL,
    Qty_Ton_Kho     NVARCHAR(50)  NULL,
    Output_Date     NVARCHAR(50)  NULL,
    Receiver        NVARCHAR(100) NULL,
    Ma_NV           NVARCHAR(50)  NULL,
    Ghi_Chu         NVARCHAR(255) NULL,
    Tong_Qty_Ton    NVARCHAR(50)  NULL,
    Dem_SL          NVARCHAR(50)  NULL,
    Bill            NVARCHAR(100) NULL,
    IV              NVARCHAR(100) NULL
);

-- 3. Staging_SC_A_27
IF OBJECT_ID(N'dbo.Staging_SC_A_27', N'U') IS NOT NULL DROP TABLE dbo.Staging_SC_A_27;
CREATE TABLE dbo.Staging_SC_A_27 (
    Change_Date     NVARCHAR(50)  NULL,
    Model           NVARCHAR(100) NULL,
    Build           NVARCHAR(50)  NULL,
    Received_Date   NVARCHAR(50)  NULL,
    Material        NVARCHAR(100) NULL,
    Vendor          NVARCHAR(100) NULL,
    Description     NVARCHAR(255) NULL,
    Config          NVARCHAR(100) NULL,
    Shipment_Qty    NVARCHAR(50)  NULL,
    STT_pack        NVARCHAR(50)  NULL,
    Lot_ID          NVARCHAR(255) NULL,
    Pack_Qty        NVARCHAR(50)  NULL,
    IQA_Scrap       NVARCHAR(50)  NULL,
    DRI             NVARCHAR(50)  NULL,
    Qty_Ton_Kho     NVARCHAR(50)  NULL,
    Output_Date     NVARCHAR(50)  NULL,
    Receiver        NVARCHAR(100) NULL,
    Ma_NV           NVARCHAR(50)  NULL,
    Ghi_Chu         NVARCHAR(255) NULL,
    Tong_Qty_Ton    NVARCHAR(50)  NULL,
    Dem_SL          NVARCHAR(50)  NULL,
    Bill            NVARCHAR(100) NULL,
    IV              NVARCHAR(100) NULL
);

-- 4. Staging_PDX27
IF OBJECT_ID(N'dbo.Staging_PDX27', N'U') IS NOT NULL DROP TABLE dbo.Staging_PDX27;
CREATE TABLE dbo.Staging_PDX27 (
    Change_Date     NVARCHAR(50)  NULL,
    Model           NVARCHAR(100) NULL,
    Build           NVARCHAR(50)  NULL,
    Received_Date   NVARCHAR(50)  NULL,
    Material        NVARCHAR(100) NULL,
    Vendor          NVARCHAR(100) NULL,
    Description     NVARCHAR(255) NULL,
    Config          NVARCHAR(100) NULL,
    Shipment_Qty    NVARCHAR(50)  NULL,
    STT_pack        NVARCHAR(50)  NULL,
    Lot_ID          NVARCHAR(255) NULL,
    Pack_Qty        NVARCHAR(50)  NULL,
    IQA_Scrap       NVARCHAR(50)  NULL,
    DRI             NVARCHAR(50)  NULL,
    Qty_Ton_Kho     NVARCHAR(50)  NULL,
    Output_Date     NVARCHAR(50)  NULL,
    Receiver        NVARCHAR(100) NULL,
    Ma_NV           NVARCHAR(50)  NULL,
    Ghi_Chu         NVARCHAR(255) NULL,
    Tong_Qty_Ton    NVARCHAR(50)  NULL,
    Dem_SL          NVARCHAR(50)  NULL,
    Bill            NVARCHAR(100) NULL,
    IV              NVARCHAR(100) NULL
);

-- 5. Staging_PSM27
IF OBJECT_ID(N'dbo.Staging_PSM27', N'U') IS NOT NULL DROP TABLE dbo.Staging_PSM27;
CREATE TABLE dbo.Staging_PSM27 (
    Change_Date     NVARCHAR(50)  NULL,
    Model           NVARCHAR(100) NULL,
    Build           NVARCHAR(50)  NULL,
    Received_Date   NVARCHAR(50)  NULL,
    Material        NVARCHAR(100) NULL,
    Vendor          NVARCHAR(100) NULL,
    Description     NVARCHAR(255) NULL,
    Config          NVARCHAR(100) NULL,
    Shipment_Qty    NVARCHAR(50)  NULL,
    STT_pack        NVARCHAR(50)  NULL,
    Lot_ID          NVARCHAR(255) NULL,
    Pack_Qty        NVARCHAR(50)  NULL,
    IQA_Scrap       NVARCHAR(50)  NULL,
    DRI             NVARCHAR(50)  NULL,
    Qty_Ton_Kho     NVARCHAR(50)  NULL,
    Output_Date     NVARCHAR(50)  NULL,
    Receiver        NVARCHAR(100) NULL,
    Ma_NV           NVARCHAR(50)  NULL,
    Ghi_Chu         NVARCHAR(255) NULL,
    Tong_Qty_Ton    NVARCHAR(50)  NULL,
    Dem_SL          NVARCHAR(50)  NULL,
    Bill            NVARCHAR(100) NULL,
    IV              NVARCHAR(100) NULL
);

-- 6. Staging_ATW
IF OBJECT_ID(N'dbo.Staging_ATW', N'U') IS NOT NULL DROP TABLE dbo.Staging_ATW;
CREATE TABLE dbo.Staging_ATW (
    Change_Date     NVARCHAR(50)  NULL,
    Model           NVARCHAR(100) NULL,
    Build           NVARCHAR(50)  NULL,
    Received_Date   NVARCHAR(50)  NULL,
    Material        NVARCHAR(100) NULL,
    Vendor          NVARCHAR(100) NULL,
    Description     NVARCHAR(255) NULL,
    Config          NVARCHAR(100) NULL,
    Shipment_Qty    NVARCHAR(50)  NULL,
    STT_pack        NVARCHAR(50)  NULL,
    Lot_ID          NVARCHAR(255) NULL,
    Pack_Qty        NVARCHAR(50)  NULL,
    IQA_Scrap       NVARCHAR(50)  NULL,
    DRI             NVARCHAR(50)  NULL,
    Qty_Ton_Kho     NVARCHAR(50)  NULL,
    Output_Date     NVARCHAR(50)  NULL,
    Receiver        NVARCHAR(100) NULL,
    Ma_NV           NVARCHAR(50)  NULL,
    Ghi_Chu         NVARCHAR(255) NULL,
    Tong_Qty_Ton    NVARCHAR(50)  NULL,
    Dem_SL          NVARCHAR(50)  NULL,
    Bill            NVARCHAR(100) NULL,
    IV              NVARCHAR(100) NULL
);

-- 7. Staging_RENO27
IF OBJECT_ID(N'dbo.Staging_RENO27', N'U') IS NOT NULL DROP TABLE dbo.Staging_RENO27;
CREATE TABLE dbo.Staging_RENO27 (
    Change_Date     NVARCHAR(50)  NULL,
    Model           NVARCHAR(100) NULL,
    Build           NVARCHAR(50)  NULL,
    Received_Date   NVARCHAR(50)  NULL,
    Material        NVARCHAR(100) NULL,
    Vendor          NVARCHAR(100) NULL,
    Description     NVARCHAR(255) NULL,
    Config          NVARCHAR(100) NULL,
    Shipment_Qty    NVARCHAR(50)  NULL,
    STT_pack        NVARCHAR(50)  NULL,
    Lot_ID          NVARCHAR(255) NULL,
    Pack_Qty        NVARCHAR(50)  NULL,
    IQA_Scrap       NVARCHAR(50)  NULL,
    DRI             NVARCHAR(50)  NULL,
    Qty_Ton_Kho     NVARCHAR(50)  NULL,
    Output_Date     NVARCHAR(50)  NULL,
    Receiver        NVARCHAR(100) NULL,
    Ma_NV           NVARCHAR(50)  NULL,
    Ghi_Chu         NVARCHAR(255) NULL,
    Tong_Qty_Ton    NVARCHAR(50)  NULL,
    Dem_SL          NVARCHAR(50)  NULL,
    Bill            NVARCHAR(100) NULL,
    IV              NVARCHAR(100) NULL
);

-- 8. Staging_CHS
IF OBJECT_ID(N'dbo.Staging_CHS', N'U') IS NOT NULL DROP TABLE dbo.Staging_CHS;
CREATE TABLE dbo.Staging_CHS (
    Change_Date     NVARCHAR(50)  NULL,
    Model           NVARCHAR(100) NULL,
    Build           NVARCHAR(50)  NULL,
    Received_Date   NVARCHAR(50)  NULL,
    Material        NVARCHAR(100) NULL,
    Vendor          NVARCHAR(100) NULL,
    Description     NVARCHAR(255) NULL,
    Config          NVARCHAR(100) NULL,
    Shipment_Qty    NVARCHAR(50)  NULL,
    STT_pack        NVARCHAR(50)  NULL,
    Lot_ID          NVARCHAR(255) NULL,
    Pack_Qty        NVARCHAR(50)  NULL,
    IQA_Scrap       NVARCHAR(50)  NULL,
    DRI             NVARCHAR(50)  NULL,
    Qty_Ton_Kho     NVARCHAR(50)  NULL,
    Output_Date     NVARCHAR(50)  NULL,
    Receiver        NVARCHAR(100) NULL,
    Ma_NV           NVARCHAR(50)  NULL,
    Ghi_Chu         NVARCHAR(255) NULL,
    Tong_Qty_Ton    NVARCHAR(50)  NULL,
    Dem_SL          NVARCHAR(50)  NULL,
    Bill            NVARCHAR(100) NULL,
    IV              NVARCHAR(100) NULL
);

-- 9. Staging_NVL_Tray
IF OBJECT_ID(N'dbo.Staging_NVL_Tray', N'U') IS NOT NULL DROP TABLE dbo.Staging_NVL_Tray;
CREATE TABLE dbo.Staging_NVL_Tray (
    Change_Date     NVARCHAR(50)  NULL,
    Model           NVARCHAR(100) NULL,
    Build           NVARCHAR(50)  NULL,
    Received_Date   NVARCHAR(50)  NULL,
    Material        NVARCHAR(100) NULL,
    Vendor          NVARCHAR(100) NULL,
    Description     NVARCHAR(255) NULL,
    Bill            NVARCHAR(100) NULL,
    IV              NVARCHAR(100) NULL,
    Shipment_Qty    NVARCHAR(100) NULL,
    Qty_Xuat_Hang   NVARCHAR(50)  NULL,
    Ton_Kho         NVARCHAR(50)  NULL,
    IQA_Result      NVARCHAR(100) NULL,
    Special_Note    NVARCHAR(255) NULL,
    Ma_NV           NVARCHAR(50)  NULL,
    Ghi_Chu         NVARCHAR(255) NULL,
    Tong_Qty_Ton    NVARCHAR(50)  NULL,
    Xuat_1_Date     NVARCHAR(50)  NULL, Xuat_1_DRI NVARCHAR(100) NULL, Xuat_1_Qty NVARCHAR(50) NULL,
    Xuat_2_Date     NVARCHAR(50)  NULL, Xuat_2_DRI NVARCHAR(100) NULL, Xuat_2_Qty NVARCHAR(50) NULL,
    Xuat_3_Date     NVARCHAR(50)  NULL, Xuat_3_DRI NVARCHAR(100) NULL, Xuat_3_Qty NVARCHAR(50) NULL,
    Xuat_4_Date     NVARCHAR(50)  NULL, Xuat_4_DRI NVARCHAR(100) NULL, Xuat_4_Qty NVARCHAR(50) NULL,
    Xuat_5_Date     NVARCHAR(50)  NULL, Xuat_5_DRI NVARCHAR(100) NULL, Xuat_5_Qty NVARCHAR(50) NULL,
    Xuat_6_Date     NVARCHAR(50)  NULL, Xuat_6_DRI NVARCHAR(100) NULL, Xuat_6_Qty NVARCHAR(50) NULL,
    Xuat_7_Date     NVARCHAR(50)  NULL, Xuat_7_DRI NVARCHAR(100) NULL, Xuat_7_Qty NVARCHAR(50) NULL,
    Xuat_8_Date     NVARCHAR(50)  NULL, Xuat_8_DRI NVARCHAR(100) NULL, Xuat_8_Qty NVARCHAR(50) NULL
);

-- 10. Staging_NVL_Cap
IF OBJECT_ID(N'dbo.Staging_NVL_Cap', N'U') IS NOT NULL DROP TABLE dbo.Staging_NVL_Cap;
CREATE TABLE dbo.Staging_NVL_Cap (
    Change_Date     NVARCHAR(50)  NULL,
    Model           NVARCHAR(100) NULL,
    Build           NVARCHAR(50)  NULL,
    Received_Date   NVARCHAR(50)  NULL,
    Material        NVARCHAR(100) NULL,
    Vendor          NVARCHAR(100) NULL,
    Description     NVARCHAR(255) NULL,
    Bill            NVARCHAR(100) NULL,
    IV              NVARCHAR(100) NULL,
    Shipment_Qty    NVARCHAR(100) NULL,
    Qty_Xuat_Hang   NVARCHAR(50)  NULL,
    Ton_Kho         NVARCHAR(50)  NULL,
    IQA_Result      NVARCHAR(100) NULL,
    Location        NVARCHAR(50)  NULL,
    Special_Note    NVARCHAR(255) NULL,
    Ma_NV           NVARCHAR(50)  NULL,
    Ghi_Chu         NVARCHAR(255) NULL,
    Tong_Qty_Ton    NVARCHAR(50)  NULL,
    Xuat_1_Date     NVARCHAR(50)  NULL, Xuat_1_DRI NVARCHAR(100) NULL, Xuat_1_Qty NVARCHAR(50) NULL,
    Xuat_2_Date     NVARCHAR(50)  NULL, Xuat_2_DRI NVARCHAR(100) NULL, Xuat_2_Qty NVARCHAR(50) NULL,
    Xuat_3_Date     NVARCHAR(50)  NULL, Xuat_3_DRI NVARCHAR(100) NULL, Xuat_3_Qty NVARCHAR(50) NULL,
    Xuat_4_Date     NVARCHAR(50)  NULL, Xuat_4_DRI NVARCHAR(100) NULL, Xuat_4_Qty NVARCHAR(50) NULL,
    Xuat_5_Date     NVARCHAR(50)  NULL, Xuat_5_DRI NVARCHAR(100) NULL, Xuat_5_Qty NVARCHAR(50) NULL,
    Xuat_6_Date     NVARCHAR(50)  NULL, Xuat_6_DRI NVARCHAR(100) NULL, Xuat_6_Qty NVARCHAR(50) NULL,
    Xuat_7_Date     NVARCHAR(50)  NULL, Xuat_7_DRI NVARCHAR(100) NULL, Xuat_7_Qty NVARCHAR(50) NULL,
    Xuat_8_Date     NVARCHAR(50)  NULL, Xuat_8_DRI NVARCHAR(100) NULL, Xuat_8_Qty NVARCHAR(50) NULL
);

-- 11. Staging_NVL_SMT27
IF OBJECT_ID(N'dbo.Staging_NVL_SMT27', N'U') IS NOT NULL DROP TABLE dbo.Staging_NVL_SMT27;
CREATE TABLE dbo.Staging_NVL_SMT27 (
    Change_Date     NVARCHAR(50)  NULL,
    Model           NVARCHAR(100) NULL,
    Build           NVARCHAR(50)  NULL,
    Received_Date   NVARCHAR(50)  NULL,
    Material        NVARCHAR(100) NULL,
    Vendor          NVARCHAR(100) NULL,
    Description     NVARCHAR(255) NULL,
    Bill            NVARCHAR(100) NULL,
    IV              NVARCHAR(100) NULL,
    NO_ID           NVARCHAR(100) NULL,
    Shipment_Qty    NVARCHAR(100) NULL,
    Qty_Xuat_Hang   NVARCHAR(50)  NULL,
    Ton_Kho         NVARCHAR(50)  NULL,
    IQA_Result      NVARCHAR(100) NULL,
    Special_Note    NVARCHAR(255) NULL,
    Ma_NV           NVARCHAR(50)  NULL,
    Ghi_Chu         NVARCHAR(255) NULL,
    Tong_Qty_Ton    NVARCHAR(50)  NULL,
    Xuat_1_Date     NVARCHAR(50)  NULL, Xuat_1_DRI NVARCHAR(100) NULL, Xuat_1_Qty NVARCHAR(50) NULL,
    Xuat_2_Date     NVARCHAR(50)  NULL, Xuat_2_DRI NVARCHAR(100) NULL, Xuat_2_Qty NVARCHAR(50) NULL,
    Xuat_3_Date     NVARCHAR(50)  NULL, Xuat_3_DRI NVARCHAR(100) NULL, Xuat_3_Qty NVARCHAR(50) NULL,
    Xuat_4_Date     NVARCHAR(50)  NULL, Xuat_4_DRI NVARCHAR(100) NULL, Xuat_4_Qty NVARCHAR(50) NULL,
    Xuat_5_Date     NVARCHAR(50)  NULL, Xuat_5_DRI NVARCHAR(100) NULL, Xuat_5_Qty NVARCHAR(50) NULL,
    Xuat_6_Date     NVARCHAR(50)  NULL, Xuat_6_DRI NVARCHAR(100) NULL, Xuat_6_Qty NVARCHAR(50) NULL,
    Xuat_7_Date     NVARCHAR(50)  NULL, Xuat_7_DRI NVARCHAR(100) NULL, Xuat_7_Qty NVARCHAR(50) NULL,
    Xuat_8_Date     NVARCHAR(50)  NULL, Xuat_8_DRI NVARCHAR(100) NULL, Xuat_8_Qty NVARCHAR(50) NULL
);

-- 12. Staging_NVL_HTCC_SMT
IF OBJECT_ID(N'dbo.Staging_NVL_HTCC_SMT', N'U') IS NOT NULL DROP TABLE dbo.Staging_NVL_HTCC_SMT;
CREATE TABLE dbo.Staging_NVL_HTCC_SMT (
    Change_Date     NVARCHAR(50)  NULL,
    Model           NVARCHAR(100) NULL,
    Build           NVARCHAR(50)  NULL,
    Received_Date   NVARCHAR(50)  NULL,
    Material        NVARCHAR(100) NULL,
    Vendor          NVARCHAR(100) NULL,
    Description     NVARCHAR(255) NULL,
    Config          NVARCHAR(100) NULL,
    Lot_ID          NVARCHAR(255) NULL,
    Shipment_Qty    NVARCHAR(50)  NULL,
    RnD             NVARCHAR(100) NULL,
    Qty_Ton_Kho     NVARCHAR(50)  NULL,
    Output_Date     NVARCHAR(50)  NULL,
    Receiver        NVARCHAR(100) NULL,
    Ma_NV           NVARCHAR(50)  NULL,
    Ghi_Chu         NVARCHAR(255) NULL,
    Tong_Qty_Ton    NVARCHAR(50)  NULL
);

-- 13. Staging_SparePart (Đã sửa tên bảng từ Staging_NVL_Smt thành Staging_SparePart cho đúng với thiết kế)
IF OBJECT_ID(N'dbo.Staging_SparePart', N'U') IS NOT NULL DROP TABLE dbo.Staging_SparePart;
CREATE TABLE dbo.Staging_SparePart (
    Invoice             NVARCHAR(50)  NULL,
    BL                  NVARCHAR(50)  NULL,
    Po_No               NVARCHAR(50)  NULL,
    Part_No             NVARCHAR(50)  NULL,
    Description         NVARCHAR(100) NULL,
    Fabrication_Name    NVARCHAR(255) NULL,
    UOM                 NVARCHAR(50)  NULL,
    Qty                 NVARCHAR(50)  NULL,       
    Vendor              NVARCHAR(50)  NULL,
    DRI                 NVARCHAR(50)  NULL,
    Receiving_Date      NVARCHAR(50)  NULL,
    Ton_Kho             NVARCHAR(50)  NULL,
    Output_date         NVARCHAR(50)  NULL,
    Xuat_1_Qty          NVARCHAR(50)  NULL,
    Xuat_1_DRI          NVARCHAR(100) NULL,
    Xuat_1_Note         NVARCHAR(50)  NULL
);

-- 14. Staging_TongTon
IF OBJECT_ID(N'dbo.Staging_TongTon', N'U') IS NOT NULL DROP TABLE dbo.Staging_TongTon;
CREATE TABLE dbo.Staging_TongTon (
    Model           NVARCHAR(100) NULL,
    Build           NVARCHAR(50)  NULL,
    Received_Date   NVARCHAR(50)  NULL,
    Material        NVARCHAR(100) NULL,
    Vendor          NVARCHAR(100) NULL,
    Description     NVARCHAR(255) NULL,
    Config          NVARCHAR(100) NULL,
    Shipment_Qty    NVARCHAR(100) NULL,
    So_pack         NVARCHAR(50)  NULL,
    Tong_ton        NVARCHAR(100) NULL,
    Bill            NVARCHAR(100) NULL,
    IV              NVARCHAR(100) NULL
);

PRINT N'Done - 14 bảng staging đã được tạo mới hoàn toàn (bảng cũ nếu có đã bị xóa và thay thế bằng cấu trúc mới).';
GO