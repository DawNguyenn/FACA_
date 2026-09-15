// ================================================================
//  stagingDataController.js — SQL-CENTRIC (chỉ HIỂN THỊ)
//  Dữ liệu được BULK INSERT thủ công vào các bảng staging:
//    - dbo.Staging_CHS / Staging_PSM27 / Staging_PDX27 / Staging_DuAnKhac
//      (4 sheet dự án của file Quan_Ly_Nguyen_Vat_Lieu_NPI.xlsx — schema NPI)
//    - dbo.Staging_NVL_Tray / Staging_NVL_Cap / Staging_NVL_Smt
//      (3 sheet NVL chuyên biệt — schema NVL)
//  (2 bảng tổng Staging_NPI_Standard / Staging_NVL_Special đã bị DROP)
//  API chỉ làm nhiệm vụ SELECT trực tiếp từ SQL Server:
//    - Tìm kiếm: WHERE <col> LIKE @Search (parameterized)
//    - Phân trang: ORDER BY ... OFFSET @Offset ROWS FETCH NEXT @Limit
//  KHÔNG đọc/parse file Excel ở backend.
// ================================================================

const { sql, poolPromise } = require('../config/db');

// ---------------------------------------------------------------
// Cấu hình các nguồn dữ liệu staging
//  - columns: danh sách cột hiển thị + tìm kiếm (tên cố định,
//    không lấy từ request → an toàn SQL Injection)
//  - orderBy: thứ tự ổn định cho OFFSET/FETCH (các bảng staging
//    không có PK/IDENTITY nên dùng tổ hợp nhiều cột)
//  4 sheet NPI (CHS, PSM27, PDX27, Dự Án Khác) share NPI_COLUMNS;
//  3 sheet NVL (TRAY, CAP, SMT) share NVL_COLUMNS — giống hệt
//  cấu trúc từng sheet trong file Excel gốc.
// ---------------------------------------------------------------

const NPI_COLUMNS = [
    'Change_Date', 'Model', 'Build', 'Received_Date', 'Material',
    'Vendor', 'Description', 'Config', 'Lot_ID', 'Shipment_Qty',
    'RnD', 'Qty_Ton_Kho', 'Output_Date', 'Receiver', 'Ma_NV',
    'Ghi_Chu', 'Tong_Qty_Ton', 'Bill', 'IV',
];

const NVL_COLUMNS = [
    'Change_Date', 'Model', 'Build', 'Received_Date', 'Material',
    'Vendor', 'Description', 'Bill', 'IV', 'Qty_Xuat_Hang',
    'Ton_Kho', 'IQA_Result', 'Special_Note',
    'Xuat_1_Date', 'Xuat_1_DRI', 'Xuat_1_Qty',
    'Xuat_2_Date', 'Xuat_2_DRI', 'Xuat_2_Qty',
    'Xuat_3_Date', 'Xuat_3_DRI', 'Xuat_3_Qty',
];

const STAGING_SOURCES = {
    // ---- 4 sheet dự án NPI (schema NPI Standard) ----
    chs: {
        table: 'dbo.Staging_CHS',
        orderBy: 'Change_Date DESC, Lot_ID, Model, Material',
        columns: NPI_COLUMNS,
    },
    psm27: {
        table: 'dbo.Staging_PSM27',
        orderBy: 'Change_Date DESC, Lot_ID, Model, Material',
        columns: NPI_COLUMNS,
    },
    pdx27: {
        table: 'dbo.Staging_PDX27',
        orderBy: 'Change_Date DESC, Lot_ID, Model, Material',
        columns: NPI_COLUMNS,
    },
    khac: {
        table: 'dbo.Staging_DuAnKhac',
        orderBy: 'Change_Date DESC, Lot_ID, Model, Material',
        columns: NPI_COLUMNS,
    },
    // ---- 3 sheet NVL chuyên biệt (schema NVL Special) ----
    tray: {
        table: 'dbo.Staging_NVL_Tray',
        orderBy: 'Change_Date DESC, Model, Material, Bill',
        columns: NVL_COLUMNS,
    },
    cap: {
        table: 'dbo.Staging_NVL_Cap',
        orderBy: 'Change_Date DESC, Model, Material, Bill',
        columns: NVL_COLUMNS,
    },
    smt: {
        table: 'dbo.Staging_NVL_Smt',
        orderBy: 'Change_Date DESC, Model, Material, Bill',
        columns: NVL_COLUMNS,
    },
};

/**
 * GET /api/warehouse/:source  (npi | nvl)
 * Query params: page (mặc định 1), limit (mặc định 50, tối đa 500),
 *               search (tìm kiếm dạng LIKE trên mọi cột)
 * Trả về: { success, source, columns, data, pagination }
 */
const listStaging = (sourceKey) => async (req, res) => {
    const source = STAGING_SOURCES[sourceKey];
    try {
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.min(500, Math.max(1, parseInt(req.query.limit, 10) || 50));
        const search = String(req.query.search || '').trim();

        const pool = await poolPromise;

        // Điều kiện tìm kiếm trên mọi cột (tên cột là hằng số, giá trị là parameter)
        const searchFilter = search
            ? ` AND (${source.columns.map((c) => `[${c}] LIKE @Search`).join(' OR ')})`
            : '';

        // 1. Đếm tổng số dòng (theo bộ lọc) để phân trang
        const countResult = await pool.request()
            .input('Search', sql.NVarChar(255), `%${search}%`)
            .query(`
                SELECT COUNT(*) AS TotalCount
                FROM ${source.table}
                WHERE 1 = 1${searchFilter};
            `);
        const totalRows = countResult.recordset[0].TotalCount;
        const totalPages = Math.max(1, Math.ceil(totalRows / limit));
        const safePage = Math.min(page, totalPages);
        const offset = (safePage - 1) * limit;

        // 2. Lấy đúng 1 trang dữ liệu từ Database (OFFSET/FETCH)
        const colList = source.columns.map((c) => `[${c}]`).join(', ');
        const dataResult = await pool.request()
            .input('Search', sql.NVarChar(255), `%${search}%`)
            .input('Offset', sql.Int, offset)
            .input('Limit', sql.Int, limit)
            .query(`
                SELECT ${colList}
                FROM ${source.table}
                WHERE 1 = 1${searchFilter}
                ORDER BY ${source.orderBy}
                OFFSET @Offset ROWS FETCH NEXT @Limit ROWS ONLY;
            `);

        return res.json({
            success: true,
            source: sourceKey,
            columns: source.columns,
            data: dataResult.recordset,
            pagination: {
                page: safePage,
                limit,
                totalRows,
                totalPages,
                hasNextPage: safePage < totalPages,
                hasPrevPage: safePage > 1,
            },
        });
    } catch (error) {
        console.error(`Lỗi khi đọc dữ liệu staging (${sourceKey}):`, error);
        return res.status(500).json({
            success: false,
            message: source
                ? `Không truy vấn được ${source.table}. Hãy kiểm tra bảng đã tồn tại và đã BULK INSERT dữ liệu chưa.`
                : 'Nguồn dữ liệu không hợp lệ.',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
    }
};

const listStagingChs = listStaging('chs');
const listStagingPsm27 = listStaging('psm27');
const listStagingPdx27 = listStaging('pdx27');
const listStagingDuAnKhac = listStaging('khac');
const listStagingNvlTray = listStaging('tray');
const listStagingNvlCap = listStaging('cap');
const listStagingNvlSmt = listStaging('smt');

module.exports = {
    listStagingChs,
    listStagingPsm27,
    listStagingPdx27,
    listStagingDuAnKhac,
    listStagingNvlTray,
    listStagingNvlCap,
    listStagingNvlSmt,
    STAGING_SOURCES,
};