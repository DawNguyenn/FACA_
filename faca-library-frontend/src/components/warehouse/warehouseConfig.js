/**
 * Cấu hình hiển thị dùng chung cho khu vực "Kho Dữ Liệu" (WarehouseExcelViewer).
 * Tách riêng file .js (không phải .jsx) để trang & các component con dùng chung
 * mà không vi phạm rule react-refresh (file component chỉ export component).
 */

// Danh mục sheet mặc định, dùng khi backend chưa kịp phản hồi GET /warehouse/sources
export const FALLBACK_SOURCES = [
    // 8 sheet dự án NPI
    { key: 'sbn27', label: 'SBN27', table: 'Staging_SBN27' },
    { key: 'clo27', label: 'CLO27', table: 'Staging_CLO27' },
    { key: 'sca27', label: 'SC-A 27', table: 'Staging_SC_A_27' },
    { key: 'pdx27', label: 'PDX27', table: 'Staging_PDX27' },
    { key: 'psm27', label: 'PSM27', table: 'Staging_PSM27' },
    { key: 'atw', label: 'ATW', table: 'Staging_ATW' },
    { key: 'reno27', label: 'RENO27', table: 'Staging_RENO27' },
    { key: 'chs', label: 'CHS', table: 'Staging_CHS' },
    // 3 sheet NVL chuyên biệt
    { key: 'tray', label: 'NVL - TRAY', table: 'Staging_NVL_Tray' },
    { key: 'cap', label: 'NVL - CAP', table: 'Staging_NVL_Cap' },
    { key: 'smt', label: 'NVL - SMT', table: 'Staging_NVL_SMT27' },
    // NVL HTCC-SMT / SparePart / Tổng tồn
    { key: 'htcc', label: 'NVL - HTCC-SMT', table: 'Staging_NVL_HTCC_SMT' },
    { key: 'sparepart', label: 'SparePart', table: 'Staging_SparePart' },
    { key: 'tongton', label: 'Tổng tồn', table: 'Staging_TongTon' },
];

// Từ điển nhãn cột (tên cột SQL -> nhãn tiếng Việt hiển thị trên bảng)
export const COLUMN_LABELS = {
    Change_Date: 'Ngày thay đổi',
    Model: 'Model',
    Build: 'Build',
    Received_Date: 'Ngày nhận',
    Material: 'Vật liệu',
    Vendor: 'Nhà cung cấp',
    Description: 'Mô tả',
    Config: 'Config',
    Lot_ID: 'Lot ID',
    Shipment_Qty: 'SL nhập',
    STT_pack: 'STT pack',
    Pack_Qty: 'SL pack',
    IQA_Scrap: 'IQA / Scrap',
    RnD: 'RnD',
    DRI: 'DRI',
    Qty_Ton_Kho: 'Tồn kho',
    Output_Date: 'Ngày xuất',
    Receiver: 'Người nhận',
    Ma_NV: 'Mã NV',
    Ghi_Chu: 'Ghi chú',
    Tong_Qty_Ton: 'Tổng tồn',
    Dem_SL: 'Đếm SL',
    Bill: 'Bill',
    IV: 'I/V',
    NO_ID: 'NO ID',
    Qty_Xuat_Hang: 'SL xuất hàng',
    Ton_Kho: 'Tồn kho',
    IQA_Result: 'Kết quả IQA',
    Location: 'Vị trí',
    Special_Note: 'Ghi chú đặc biệt',
    Xuat_1_Date: 'Xuất 1 — Ngày',
    Xuat_1_DRI: 'Xuất 1 — DRI',
    Xuat_1_Qty: 'Xuất 1 — SL',
    Xuat_2_Date: 'Xuất 2 — Ngày',
    Xuat_2_DRI: 'Xuất 2 — DRI',
    Xuat_2_Qty: 'Xuất 2 — SL',
    Xuat_3_Date: 'Xuất 3 — Ngày',
    Xuat_3_DRI: 'Xuất 3 — DRI',
    Xuat_3_Qty: 'Xuất 3 — SL',
    Xuat_4_Date: 'Xuất 4 — Ngày',
    Xuat_4_DRI: 'Xuất 4 — DRI',
    Xuat_4_Qty: 'Xuất 4 — SL',
    Xuat_5_Date: 'Xuất 5 — Ngày',
    Xuat_5_DRI: 'Xuất 5 — DRI',
    Xuat_5_Qty: 'Xuất 5 — SL',
    Xuat_6_Date: 'Xuất 6 — Ngày',
    Xuat_6_DRI: 'Xuất 6 — DRI',
    Xuat_6_Qty: 'Xuất 6 — SL',
    Xuat_7_Date: 'Xuất 7 — Ngày',
    Xuat_7_DRI: 'Xuất 7 — DRI',
    Xuat_7_Qty: 'Xuất 7 — SL',
    Xuat_8_Date: 'Xuất 8 — Ngày',
    Xuat_8_DRI: 'Xuất 8 — DRI',
    Xuat_8_Qty: 'Xuất 8 — SL',
    // SparePart / Tổng tồn
    Invoice: 'Invoice',
    BL: 'B/L',
    Po_No: 'Số PO',
    Part_No: 'Part No',
    Fabrication_Name: 'Hãng sản xuất',
    UOM: 'Đơn vị',
    Qty: 'Số lượng',
    Receiving_Date: 'Ngày nhận',
    Output_date: 'Ngày xuất',
    Xuat_1_Note: 'Xuất 1 — Ghi chú',
    So_pack: 'Số pack',
    Tong_ton: 'Tổng tồn',
};

// Các cột kiểu số -> hiển thị có dấu phân cách nghìn
export const NUMERIC_COLS = new Set([
    'Shipment_Qty', 'Pack_Qty', 'Qty_Ton_Kho', 'Tong_Qty_Ton', 'Dem_SL', 'RnD',
    'Qty_Xuat_Hang', 'Ton_Kho', 'Qty',
    'Xuat_1_Qty', 'Xuat_2_Qty', 'Xuat_3_Qty', 'Xuat_4_Qty',
    'Xuat_5_Qty', 'Xuat_6_Qty', 'Xuat_7_Qty', 'Xuat_8_Qty',
    'So_pack', 'Tong_ton',
]);

// Template dự phòng cho modal "Tạo sheet mới" khi backend chưa trả về danh sách templates
export const FALLBACK_TEMPLATES = [
    { value: 'npi', label: 'npi — Dự án NPI' },
    { value: 'tray', label: 'tray — NVL Tray' },
    { value: 'cap', label: 'cap — NVL Cap' },
    { value: 'smt', label: 'smt — NVL SMT27' },
    { value: 'htcc', label: 'htcc — NVL HTCC-SMT' },
    { value: 'sparepart', label: 'sparepart — SparePart' },
    { value: 'tongton', label: 'tongton — Tổng tồn' },
    { value: 'blank', label: 'blank — Bảng trống' },
];

/** Nhãn hiển thị mặc định của 1 cột (không xét cột mở rộng) */
export const columnLabel = (name) => COLUMN_LABELS[name] || name;

/**
 * Tạo hàm lấy nhãn cột có xét metadata cột mở rộng (customColumns từ backend).
 * @param {Array<{ColumnName: string, Label?: string}>} customColumns
 * @returns {(col: string) => string}
 */
export const makeColumnLabel = (customColumns = []) => (col) => {
    const custom = customColumns.find((c) => c.ColumnName === col);
    if (custom && custom.Label) return custom.Label;
    return COLUMN_LABELS[col] || col;
};

/** Chuẩn hoá giá trị 1 ô để hiển thị: bỏ dấu " thừa, định dạng số kiểu vi-VN */
export const displayValue = (col, value) => {
    if (value === null || value === undefined) return '';
    const cleaned = String(value).replace(/"/g, '').trim();
    if (NUMERIC_COLS.has(col) && cleaned !== '' && !Number.isNaN(Number(cleaned))) {
        return Number(cleaned).toLocaleString('vi-VN');
    }
    return cleaned;
};
