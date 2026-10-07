const { sql, poolPromise } = require('../config/db');
const { bulkSaveData, getTableColumnMeta, coerceValue, bulkColumnType } = require('../services/bulkSaveService');
const {
    getSheetMeta, upsertSheetMeta, buildSheetHeader, resolveUserName, toDateOrNull,
} = require('../services/sheetMetaService');
const {
    writeAuditLogSafe, diffValues, listAuditLogs,
    listAuditTables, getAuditSummary, getClientIp,
    AUDIT_TABLE, ensureAuditLogsSchema,
} = require('../services/auditLogService');

// Số dòng tối đa nạp 1 lần cho Data Grid nhập liệu (?all=1)
const GRID_MAX_ROWS = 5000;

// 8 bảng dự án NPI dùng chung bộ cột (SBN27, CLO27, SC_A_27, PDX27,
// PSM27, ATW, RENO27, CHS)
const NPI_COLUMNS = [
    'Change_Date', 'Model', 'Build', 'Received_Date', 'Material',
    'Vendor', 'Description', 'Config', 'Shipment_Qty', 'STT_pack',
    'Lot_ID', 'Pack_Qty', 'IQA_Scrap', 'DRI', 'Qty_Ton_Kho',
    'Output_Date', 'Receiver', 'Ma_NV', 'Ghi_Chu', 'Tong_Qty_Ton',
    'Dem_SL', 'Bill', 'IV',
];

const NVL_TRAY_CAP_BASE = [
    'Change_Date', 'Model', 'Build', 'Received_Date', 'Material',
    'Vendor', 'Description', 'Bill', 'IV', 'Shipment_Qty',
    'Qty_Xuat_Hang', 'Ton_Kho', 'IQA_Result',
    'Special_Note', 'Ma_NV', 'Ghi_Chu', 'Tong_Qty_Ton',
    'Xuat_1_Date', 'Xuat_1_DRI', 'Xuat_1_Qty',
    'Xuat_2_Date', 'Xuat_2_DRI', 'Xuat_2_Qty',
    'Xuat_3_Date', 'Xuat_3_DRI', 'Xuat_3_Qty',
    'Xuat_4_Date', 'Xuat_4_DRI', 'Xuat_4_Qty',
    'Xuat_5_Date', 'Xuat_5_DRI', 'Xuat_5_Qty',
    'Xuat_6_Date', 'Xuat_6_DRI', 'Xuat_6_Qty',
    'Xuat_7_Date', 'Xuat_7_DRI', 'Xuat_7_Qty',
    'Xuat_8_Date', 'Xuat_8_DRI', 'Xuat_8_Qty',
];

const NVL_TRAY_COLUMNS = NVL_TRAY_CAP_BASE

const NVL_CAP_COLUMNS = [
    'Change_Date', 'Model', 'Build', 'Received_Date', 'Material',
    'Vendor', 'Description', 'Bill', 'IV', 'Shipment_Qty',
    'Qty_Xuat_Hang', 'Ton_Kho', 'IQA_Result', 'Location',
    'Special_Note', 'Ma_NV', 'Ghi_Chu', 'Tong_Qty_Ton',
    'Xuat_1_Date', 'Xuat_1_DRI', 'Xuat_1_Qty',
    'Xuat_2_Date', 'Xuat_2_DRI', 'Xuat_2_Qty',
    'Xuat_3_Date', 'Xuat_3_DRI', 'Xuat_3_Qty',
    'Xuat_4_Date', 'Xuat_4_DRI', 'Xuat_4_Qty',
    'Xuat_5_Date', 'Xuat_5_DRI', 'Xuat_5_Qty',
    'Xuat_6_Date', 'Xuat_6_DRI', 'Xuat_6_Qty',
    'Xuat_7_Date', 'Xuat_7_DRI', 'Xuat_7_Qty',
    'Xuat_8_Date', 'Xuat_8_DRI', 'Xuat_8_Qty',
];

const NVL_SMT27_COLUMNS = [
    'Change_Date', 'Model', 'Build', 'Received_Date', 'Material',
    'Vendor', 'Description', 'Bill', 'IV', 'NO_ID', 'Shipment_Qty',
    'Qty_Xuat_Hang', 'Ton_Kho', 'IQA_Result',
    'Special_Note', 'Ma_NV', 'Ghi_Chu', 'Tong_Qty_Ton',
    'Xuat_1_Date', 'Xuat_1_DRI', 'Xuat_1_Qty',
    'Xuat_2_Date', 'Xuat_2_DRI', 'Xuat_2_Qty',
    'Xuat_3_Date', 'Xuat_3_DRI', 'Xuat_3_Qty',
    'Xuat_4_Date', 'Xuat_4_DRI', 'Xuat_4_Qty',
    'Xuat_5_Date', 'Xuat_5_DRI', 'Xuat_5_Qty',
    'Xuat_6_Date', 'Xuat_6_DRI', 'Xuat_6_Qty',
    'Xuat_7_Date', 'Xuat_7_DRI', 'Xuat_7_Qty',
    'Xuat_8_Date', 'Xuat_8_DRI', 'Xuat_8_Qty',
];

const HTCC_COLUMNS = [
    'Change_Date', 'Model', 'Build', 'Received_Date', 'Material',
    'Vendor', 'Description', 'Config', 'Lot_ID', 'Shipment_Qty',
    'RnD', 'Qty_Ton_Kho', 'Output_Date', 'Receiver', 'Ma_NV',
    'Ghi_Chu', 'Tong_Qty_Ton',
];

const SPARE_PART_COLUMNS = [
    'Invoice', 'BL', 'Po_No', 'Part_No', 'Description',
    'Fabrication_Name', 'UOM', 'Qty', 'Vendor', 'DRI',
    'Receiving_Date', 'Ton_Kho', 'Output_date',
    'Xuat_1_Qty', 'Xuat_1_DRI', 'Xuat_1_Note',
];

const TONG_TON_COLUMNS = [
    'Model', 'Build', 'Received_Date', 'Material',
    'Vendor', 'Description', 'Config', 'Shipment_Qty', 'So_pack',
    'Tong_ton', 'Bill', 'IV',
];

const NPI_ORDER = 'Change_Date DESC, Lot_ID, Model, Material';

const STAGING_SOURCES = {
    // ---- 8 sheet dự án NPI (8 bảng staging) ----
    sbn27:  { table: 'dbo.Staging_SBN27',     orderBy: NPI_ORDER, columns: NPI_COLUMNS },
    clo27:  { table: 'dbo.Staging_CLO27',     orderBy: NPI_ORDER, columns: NPI_COLUMNS },
    sca27:  { table: 'dbo.Staging_SC_A_27',   orderBy: NPI_ORDER, columns: NPI_COLUMNS },
    pdx27:  { table: 'dbo.Staging_PDX27',     orderBy: NPI_ORDER, columns: NPI_COLUMNS },
    psm27:  { table: 'dbo.Staging_PSM27',     orderBy: NPI_ORDER, columns: NPI_COLUMNS },
    atw:    { table: 'dbo.Staging_ATW',       orderBy: NPI_ORDER, columns: NPI_COLUMNS },
    reno27: { table: 'dbo.Staging_RENO27',    orderBy: NPI_ORDER, columns: NPI_COLUMNS },
    chs:    { table: 'dbo.Staging_CHS',       orderBy: NPI_ORDER, columns: NPI_COLUMNS },
    // ---- 3 sheet NVL chuyên dụng (tray, cap, smt) ----
    tray:   { table: 'dbo.Staging_NVL_Tray',  orderBy: 'Change_Date DESC, Model, Material, Bill', columns: NVL_TRAY_COLUMNS },
    cap:    { table: 'dbo.Staging_NVL_Cap',   orderBy: 'Change_Date DESC, Model, Material, Bill', columns: NVL_CAP_COLUMNS },
    smt:    { table: 'dbo.Staging_NVL_SMT27', orderBy: 'Change_Date DESC, Model, Material, Bill', columns: NVL_SMT27_COLUMNS },
    // ---- 1 sheet NVL HTCC-SMT ----
    htcc:   { table: 'dbo.Staging_NVL_HTCC_SMT', orderBy: 'Change_Date DESC, Lot_ID, Model, Material', columns: HTCC_COLUMNS },
    // ---- 1 sheet SparePart ----
    sparepart: { table: 'dbo.Staging_SparePart', orderBy: 'Receiving_Date DESC, Part_No, Po_No', columns: SPARE_PART_COLUMNS },
    // ---- 1 sheet Tổng tồn ----
    tongton: { table: 'dbo.Staging_TongTon', orderBy: 'Model, Material, Bill', columns: TONG_TON_COLUMNS },
};

// ---- Template clone khi tạo sheet mới qua API (POST /sources) ----
// key = templateKey client gửi lên; columns = bộ cột clone sang bảng mới.
const SHEET_TEMPLATES = {
    npi:       { description: 'Du an NPI (23 cot: Lot_ID, Pack_Qty, DRI...)', orderBy: NPI_ORDER, columns: NPI_COLUMNS },
    tray:      { description: 'NVL Tray (40 cot, Xuat_1..8)', orderBy: 'Change_Date DESC, Model, Material, Bill', columns: NVL_TRAY_COLUMNS },
    cap:       { description: 'NVL Cap (41 cot + Location)', orderBy: 'Change_Date DESC, Model, Material, Bill', columns: NVL_CAP_COLUMNS },
    smt:       { description: 'NVL SMT27 (42 cot + NO_ID)', orderBy: 'Change_Date DESC, Model, Material, Bill', columns: NVL_SMT27_COLUMNS },
    htcc:      { description: 'NVL HTCC-SMT (17 cot: RnD...)', orderBy: NPI_ORDER, columns: HTCC_COLUMNS },
    sparepart: { description: 'SparePart (16 cot: Invoice, PO...)', orderBy: 'Receiving_Date DESC, Part_No, Po_No', columns: SPARE_PART_COLUMNS },
    tongton:   { description: 'Tong ton (12 cot)', orderBy: 'Model, Material, Bill', columns: TONG_TON_COLUMNS },
    blank:     { description: 'Trang (chi StagingID — tu them cot sau)', orderBy: 'StagingID DESC', columns: [] },
};

const SOURCE_KEY_RE = /^[a-z][a-z0-9_]{0,29}$/;
const TABLE_NAME_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;

/**
 * Doc 1 source tu registry DB (dbo.Staging_Sources).
 * Tra ve null neu bang registry chua ton tai hoac key chua co.
 */
async function getRegistrySource(pool, sourceKey) {
    try {
        const rs = await pool.request()
            .input('SourceKey', sql.NVarChar(30), sourceKey)
            .query(`SELECT SourceKey, Label, TableName, OrderBy, IsBuiltIn
                    FROM dbo.Staging_Sources WHERE SourceKey = @SourceKey;`);
        if (!rs.recordset.length) return null;
        const row = rs.recordset[0];
        const cols = await pool.request()
            .input('TableName', sql.NVarChar(128), String(row.TableName).replace(/^dbo\./i, ''))
            .query(`SELECT c.name AS ColumnName FROM sys.columns c
                    JOIN sys.tables t ON t.object_id = c.object_id
                    WHERE t.name = @TableName AND c.name <> 'StagingID'
                    ORDER BY c.column_id;`);
        const table = String(row.TableName).startsWith('dbo.') ? String(row.TableName) : `dbo.${row.TableName}`;
        return {
            key: row.SourceKey, label: row.Label, table,
            orderBy: row.OrderBy || 'StagingID DESC',
            columns: cols.recordset.map((c) => c.ColumnName),
            isBuiltIn: !!row.IsBuiltIn,
        };
    } catch (e) {
        if (e && e.number === 208) return null; // Invalid object name = chua chay migration
        throw e;
    }
}

/**
 * Resolve source: uu tien registry DB (sheet dong), fallback STAGING_SOURCES hard-code.
 * Nho vay sheet moi tao qua API chay duoc ngay ma khong can restart/sua code.
 */
async function resolveSource(pool, sourceKey) {
    const fromDb = await getRegistrySource(pool, sourceKey);
    if (fromDb) return fromDb;
    const builtin = STAGING_SOURCES[sourceKey];
    if (!builtin) return null;
    return { key: sourceKey, label: sourceKey, table: builtin.table, orderBy: builtin.orderBy, columns: builtin.columns, isBuiltIn: true };
}

/**
 * Liet ke toan bo sources: registry DB (dong) merge voi hard-code (fallback).
 * Dung cho GET /api/warehouse/sources de frontend render dropdown dong.
 */
async function listAllSources(pool) {
    const merged = new Map();
    for (const [key, s] of Object.entries(STAGING_SOURCES)) {
        merged.set(key, { key, label: key, table: s.table, orderBy: s.orderBy, columnCount: s.columns.length, isBuiltIn: true });
    }
    try {
        const rs = await pool.request().query(
            `SELECT SourceKey, Label, TableName, OrderBy, IsBuiltIn FROM dbo.Staging_Sources ORDER BY Label;`
        );
        for (const r of rs.recordset) {
            merged.set(r.SourceKey, {
                key: r.SourceKey, label: r.Label, table: r.TableName,
                orderBy: r.OrderBy, columnCount: null, isBuiltIn: !!r.IsBuiltIn,
            });
        }
        for (const s of merged.values()) {
            if (s.columnCount !== null) continue;
            try {
                const c = await pool.request()
                    .input('TableName', sql.NVarChar(128), String(s.table).replace(/^dbo\./i, ''))
                    .query(`SELECT COUNT(*) AS Cnt FROM sys.columns c JOIN sys.tables t ON t.object_id = c.object_id
                            WHERE t.name = @TableName AND c.name <> 'StagingID';`);
                s.columnCount = c.recordset[0].Cnt;
            } catch { s.columnCount = 0; }
        }
    } catch (e) {
        if (!(e && e.number === 208)) throw e; // chua co bang registry -> dung hard-code
    }
    return [...merged.values()].sort((a, b) => String(a.label).localeCompare(String(b.label)));
}

// ---- Sắp xếp theo cột NGÀY -------------------------------------------------
// Cột ngày trong các bảng staging lưu dạng chuỗi (nvarchar, do BULK INSERT từ Excel)
// nên nếu ORDER BY so sánh CHUỖI sẽ sai thứ tự:
//   - '10/5/2026' (tháng 10) bị xếp trước '2/1/2026' (tháng 2)
//   - dòng rác ('Change date', 'Data-999') nhảy lên đầu khi sắp xếp giảm dần
// Vì vậy phải quy đổi về kiểu `date` rồi mới so sánh.
// Cột NGÀY: 'Change_Date', 'Received_Date', 'Output_date', 'Xuat_1_Date' (có _date / _Date)
// hoặc dạng camelCase 'ChangeDate', 'ReceivedDate'. Cố ý KHÔNG khớp các từ thường
// kết thúc bằng 'date' như 'Candidate'/'Update' -> tránh sắp xếp nhầm.
const DATE_COL_RE = /(?:^|[_ ])date$|Date$/;

/** Cột có phải cột ngày không */
const isDateCol = (col) => DATE_COL_RE.test(String(col));

/**
 * Biểu thức SQL quy đổi 1 cột ngày dạng chuỗi về kiểu `date`.
 * Thử lần lượt các định dạng thường gặp trong dữ liệu kho:
 * ISO yyyy-mm-dd (style 23) -> Mỹ M/D/YYYY (101) -> Anh D/M/YYYY (103) -> theo ngôn ngữ server.
 * Giá trị trống / không đọc được thành ngày -> NULL (không làm lỗi query).
 */
const sqlDateValue = (col) => {
    const v = `NULLIF(LTRIM(RTRIM([${col}])), '')`;
    return `COALESCE(TRY_CONVERT(date, ${v}, 23), TRY_CONVERT(date, ${v}, 101), TRY_CONVERT(date, ${v}, 103), TRY_CONVERT(date, ${v}))`;
};

/**
 * Mệnh đề ORDER BY của 1 cột (tên cột đã qua whitelist).
 * - Cột ngày: dòng trống/không phải ngày luôn xếp CUỐI; phần còn lại so sánh theo GIÁ TRỊ NGÀY
 *   -> DESC = ngày mới nhất lên đầu đúng như mong đợi.
 * - Cột khác: so sánh chuỗi như cũ.
 */
const orderTermsFor = (col, dir) => {
    if (!isDateCol(col)) return `[${col}] ${dir}`;
    const dv = sqlDateValue(col);
    return `CASE WHEN ${dv} IS NULL THEN 1 ELSE 0 END, ${dv} ${dir}, [${col}] ${dir}`;
};

/**
 * Chuẩn hoá mệnh đề ORDER BY mặc định của source (vd 'Change_Date DESC, Lot_ID, Model')
 * để cột ngày cũng được so sánh theo giá trị ngày, đồng thời thêm StagingID làm
 * tie-breaker giúp phân trang OFFSET/FETCH không bị trùng/thiếu dòng giữa các trang.
 * Mệnh đề không nhận dạng được thì giữ nguyên (không đổi hành vi cũ).
 */
const buildOrderBy = (raw) => {
    const rawText = String(raw || '').trim() || 'StagingID DESC';
    const terms = rawText.split(',').map((term) => {
        const m = term.trim().match(/^\[?([A-Za-z_][A-Za-z0-9_]*)\]?(?:\s+(ASC|DESC))?$/i);
        if (!m) return term.trim();
        return orderTermsFor(m[1], (m[2] || 'ASC').toUpperCase());
    });
    if (!/stagingid/i.test(rawText)) terms.push('[StagingID] DESC');
    return terms.join(', ');
};

const listStaging = (sourceKey) => async (req, res) => {
    let source = null;
    try {
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        // Data Grid nhập liệu gọi ?all=1 để nạp nhiều dòng trong 1 request (tối đa GRID_MAX_ROWS)
        const maxLimit = req.query.all === '1' ? GRID_MAX_ROWS : 500;
        const limit = Math.min(maxLimit, Math.max(1, parseInt(req.query.limit, 10) || 50));
        const search = String(req.query.search || '').trim();

        const pool = await poolPromise;
        source = await resolveSource(pool, sourceKey);
        if (!source) return res.status(400).json({ success: false, message: 'Nguon du lieu khong hop le.' });

        // Cột mở rộng do người dùng thêm động (từ bảng metadata)
        const customCols = await getCustomColumns(pool, sourceKey);
        // source.columns (registry đọc từ sys.columns) có thể ĐÃ bao gồm cột động
        // -> loại trùng để cột không bị SELECT 2 lần (làm giá trị trả về thành mảng)
        const seenCols = new Set();
        const allColumns = [...source.columns, ...customCols.map((c) => c.ColumnName)].filter((c) => {
            const key = String(c).toLowerCase();
            if (seenCols.has(key)) return false;
            seenCols.add(key);
            return true;
        });

        // Điều kiện tìm kiếm trên mọi cột (tên cột là hằng số, giá trị là parameter)
        const searchFilter = search
            ? ` AND (${allColumns.map((c) => `[${c}] LIKE @Search`).join(' OR ')})`
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

        // Sắp xếp động theo cột người dùng click trên header bảng.
        // Whitelist: chỉ chấp nhận tên cột nằm trong allColumns (hoặc StagingID) -> tránh SQL injection.
        const sortableCols = ['StagingID', ...allColumns];
        const rawSortBy = String(req.query.sortBy || '').trim();
        const matchedSortCol = rawSortBy
            ? sortableCols.find((c) => String(c).toLowerCase() === rawSortBy.toLowerCase())
            : null;
        const sortDir = String(req.query.sortDir || '').trim().toLowerCase() === 'desc' ? 'DESC' : 'ASC';
        // Cột ngày -> so sánh theo giá trị ngày nên DESC luôn cho "ngày mới nhất lên đầu".
        // StagingID làm tie-breaker để phân trang ổn định khi nhiều dòng cùng giá trị.
        const orderBy = matchedSortCol
            ? `${orderTermsFor(matchedSortCol, sortDir)}, [StagingID] ${sortDir}`
            : buildOrderBy(source.orderBy);

        // 2. Lấy đúng 1 trang dữ liệu từ Database (OFFSET/FETCH)
        const colList = ['[StagingID]', ...allColumns.map((c) => `[${c}]`)].join(', ');
        const dataResult = await pool.request()
            .input('Search', sql.NVarChar(255), `%${search}%`)
            .input('Offset', sql.Int, offset)
            .input('Limit', sql.Int, limit)
            .query(`
                SELECT ${colList}
                FROM ${source.table}
                WHERE 1 = 1${searchFilter}
                ORDER BY ${orderBy}
                OFFSET @Offset ROWS FETCH NEXT @Limit ROWS ONLY;
            `);

        // Thông tin header/metadata của sheet (tên file gốc, người nhập, thời gian, tổng bản ghi...)
        const sheetHeader = await buildSheetHeader(pool, source);

        return res.json({
            success: true,
            source: sourceKey,
            sourceKey: source.key,
            tableName: source.table,
            columns: source.columns,
            customColumns: customCols,
            sheetHeader,
            // Tiêu đề dòng 1 của file Excel gốc (alias top-level cho tiện tích hợp)
            sheetTitle: sheetHeader ? sheetHeader.sheetTitle : null,
            data: dataResult.recordset,
            pagination: {
                page: safePage,
                limit,
                totalRows,
                totalPages,
                hasNextPage: safePage < totalPages,
                totalColumns: allColumns.length,
                all: req.query.all === '1' ? 1 : 0,
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

// ================================================================
//  Helpers cho Inline Editing / Dynamic Columns
// ================================================================
const IDENT_RE = /^[A-Za-z_][A-Za-z0-9_]*$/; // chống SQL Injection qua tên cột

/** Parse cột restored_indexes (JSON "[0,2]") của log bulk → mảng index dòng đã khôi phục. */
const parseRestoredIdx = (v) => {
    let d = v;
    if (typeof d === 'string') {
        try { d = JSON.parse(d); } catch { d = null; }
    }
    return Array.isArray(d) ? d.filter((n) => Number.isInteger(n) && n >= 0) : [];
};

// Lấy danh sách cột tùy chỉnh của 1 nguồn (từ bảng metadata)
const getCustomColumns = async (pool, sourceKey) => {
    try {
        const result = await pool.request()
            .input('SourceKey', sql.NVarChar(30), sourceKey)
            .query(`SELECT CustomColumnId, SourceKey, ColumnName, Label, DataType, CreatedAt
                    FROM dbo.Staging_CustomColumns WHERE SourceKey = @SourceKey ORDER BY CustomColumnId;`);
        return result.recordset;
    } catch (err) {
        // Bảng metadata chưa tồn tại -> coi như không có cột tùy chỉnh
        return [];
    }
};

/** Thông tin người thực hiện cho nhật ký (id + tên hiển thị). */
const auditActor = async (pool, user) => ({
    changedBy: user && user.userId ? parseInt(user.userId, 10) : null,
    changedByName: await resolveUserName(pool, user),
});

/** Tên bảng ghi vào nhật ký (bỏ tiền tố dbo. cho gọn & khớp với filter). */
const auditTableName = (table) => String(table || '').replace(/^dbo\./i, '');

/**
 * PUT /api/warehouse/:source/rows/:id
 * Body: { values: { ColName: value, ... } }
 * Cập nhật các cột cho phép của 1 dòng staging theo StagingID.
 */
const updateStagingRowHandler = async (req, res) => {
    try {
        const pool = await poolPromise;
        const source = await resolveSource(pool, req.params.source);
        if (!source) return res.status(400).json({ success: false, message: 'Nguồn dữ liệu không hợp lệ.' });

        const rowId = parseInt(req.params.id, 10);
        if (!Number.isInteger(rowId) || rowId <= 0) {
            return res.status(400).json({ success: false, message: 'StagingID không hợp lệ.' });
        }

        const values = req.body && req.body.values;
        if (!values || typeof values !== 'object' || Array.isArray(values)) {
            return res.status(400).json({ success: false, message: 'Body phải có dạng { values: { ... } }.' });
        }

        const custom = await getCustomColumns(pool, req.params.source);
        const allowed = new Set([...source.columns, ...custom.map((c) => c.ColumnName)]);

        const req_ = pool.request().input('RowId', sql.BigInt, rowId);
        const setParts = [];
        for (const [col, val] of Object.entries(values)) {
            if (!IDENT_RE.test(col)) {
                return res.status(400).json({ success: false, message: `Tên cột không hợp lệ: ${col}` });
            }
            if (!allowed.has(col)) {
                return res.status(400).json({ success: false, message: `Cột không được phép sửa: ${col}` });
            }
            req_.input(`C_${col}`, sql.NVarChar(sql.MAX), val === null || val === undefined ? null : String(val));
            setParts.push(`[${col}] = @C_${col}`);
        }
        if (setParts.length === 0) {
            return res.status(400).json({ success: false, message: 'Không có cột nào cần cập nhật.' });
        }

        // Đọc giá trị CŨ của các cột sắp sửa (để lưu old/new vào nhật ký)
        const oldCols = Object.keys(values).map((c) => `[${c}]`).join(', ');
        const oldRes = await pool.request()
            .input('RowId', sql.BigInt, rowId)
            .query(`SELECT TOP 1 ${oldCols} FROM ${source.table} WHERE StagingID = @RowId;`);
        const oldRow = oldRes.recordset[0] || null;

        const result = await req_.query(`
            UPDATE ${source.table}
            SET ${setParts.join(', ')}
            WHERE StagingID = @RowId;
            SELECT @@ROWCOUNT AS Affected;
        `);
        const affected = result.recordset[0].Affected;
        if (!affected) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy dòng cần cập nhật.' });
        }

        // ===== Nhật ký: lưu lại giá trị TRƯỚC & SAU khi sửa =====
        await writeAuditLogSafe(pool, {
            tableName: auditTableName(source.table),
            recordId: String(rowId),
            actionType: 'UPDATE',
            ...(await auditActor(pool, req.user)),
            changes: diffValues(oldRow || {}, values),
            ipAddress: getClientIp(req),
        });

        return res.json({ success: true, message: 'Đã cập nhật dòng dữ liệu.', updatedColumns: Object.keys(values) });
    } catch (error) {
        console.error(`Lỗi cập nhật dòng staging (${req.params.source} #${rowId}):`, error);
        return res.status(500).json({ success: false, message: 'Không cập nhật được dòng: ' + error.message });
    }
};

/**
 * POST /api/warehouse/:source/rows
 * Body: { values: { ColName: value, ... } }
 * Thêm 1 dòng mới vào bảng staging (các cột không gửi sẽ là NULL).
 */
const insertStagingRowHandler = async (req, res) => {
    try {
        const pool = await poolPromise;
        const source = await resolveSource(pool, req.params.source);
        if (!source) return res.status(400).json({ success: false, message: 'Nguồn dữ liệu không hợp lệ.' });

        const values = req.body && req.body.values;
        if (!values || typeof values !== 'object' || Array.isArray(values)) {
            return res.status(400).json({ success: false, message: 'Body phải có dạng { values: { ... } }.' });
        }

        const custom = await getCustomColumns(pool, req.params.source);
        const allowed = new Set([...source.columns, ...custom.map((c) => c.ColumnName)]);

        const req_ = pool.request();
        const colNames = [];
        const paramRefs = [];
        for (const [col, val] of Object.entries(values)) {
            if (!IDENT_RE.test(col)) {
                return res.status(400).json({ success: false, message: `Tên cột không hợp lệ: ${col}` });
            }
            if (!allowed.has(col)) {
                return res.status(400).json({ success: false, message: `Cột không được phép ghi: ${col}` });
            }
            req_.input(`C_${col}`, sql.NVarChar(sql.MAX), val === null || val === undefined ? null : String(val));
            colNames.push(`[${col}]`);
            paramRefs.push(`@C_${col}`);
        }

        const result = await req_.query(`
            INSERT INTO ${source.table} (${colNames.join(', ')})
            VALUES (${paramRefs.join(', ')});
            SELECT CAST(SCOPE_IDENTITY() AS BIGINT) AS NewStagingID;
        `);
        const newId = result.recordset[0].NewStagingID;

        // ===== Nhật ký: ghi lại toàn bộ giá trị dòng mới =====
        await writeAuditLogSafe(pool, {
            tableName: auditTableName(source.table),
            recordId: String(newId),
            actionType: 'INSERT',
            ...(await auditActor(pool, req.user)),
            changes: values,
            ipAddress: getClientIp(req),
        });

        return res.status(201).json({ success: true, message: 'Đã thêm dòng mới.', StagingID: newId });
    } catch (error) {
        console.error(`Lỗi thêm dòng staging (${req.params.source}):`, error);
        return res.status(500).json({ success: false, message: 'Không thêm được dòng mới: ' + error.message });
    }
};

/**
 * POST /api/warehouse/:source/columns
 * Body: { columnName, label?, dataType? }
 * Thêm cột mới động vào bảng staging (ALTER TABLE) + lưu metadata.
 */
const ALLOWED_TYPES = new Set(['NVARCHAR(255)', 'NVARCHAR(MAX)', 'NVARCHAR(100)', 'NVARCHAR(500)', 'INT', 'DECIMAL(18,2)', 'DATE']);

const addStagingColumnHandler = async (req, res) => {
    try {
        const pool = await poolPromise;
        const source = await resolveSource(pool, req.params.source);
        if (!source) return res.status(400).json({ success: false, message: 'Nguồn dữ liệu không hợp lệ.' });

        const columnName = String((req.body && req.body.columnName) || '').trim();
        const label = String((req.body && req.body.label) || '').trim() || null;
        const dataType = String((req.body && req.body.dataType) || 'NVARCHAR(255)').trim().toUpperCase();

        if (!IDENT_RE.test(columnName)) {
            return res.status(400).json({ success: false, message: 'Tên cột chỉ được chứa chữ, số và dấu gạch dưới, bắt đầu bằng chữ hoặc _.' });
        }
        if (source.columns.includes(columnName)) {
            return res.status(400).json({ success: false, message: `Cột "${columnName}" đã tồn tại trong bảng gốc.` });
        }
        if (!ALLOWED_TYPES.has(dataType)) {
            return res.status(400).json({ success: false, message: `Kiểu dữ liệu không hỗ trợ. Chỉ chấp nhận: ${[...ALLOWED_TYPES].join(', ')}` });
        }

        // Cột đã tồn tại vật lý?
        const exists = await pool.request()
            .input('TableName', sql.NVarChar(128), source.table.replace('dbo.', ''))
            .input('ColumnName', sql.NVarChar(128), columnName)
            .query(`SELECT COUNT(*) AS Cnt FROM sys.columns WHERE object_id = OBJECT_ID(@TableName) AND name = @ColumnName;`);
        if (exists.recordset[0].Cnt > 0) {
            return res.status(409).json({ success: false, message: `Cột "${columnName}" đã tồn tại trong bảng.` });
        }

        // Thêm cột vật lý (dataType thuộc whitelist -> an toàn)
        await pool.request().query(`ALTER TABLE ${source.table} ADD [${columnName}] ${dataType} NULL;`);

        // Lưu metadata (upsert)
        const custom = await getCustomColumns(pool, req.params.source);
        if (custom.find((c) => c.ColumnName === columnName)) {
            await pool.request()
                .input('SourceKey', sql.NVarChar(30), req.params.source)
                .input('ColumnName', sql.NVarChar(100), columnName)
                .input('Label', sql.NVarChar(200), label)
                .input('DataType', sql.NVarChar(20), dataType)
                .query(`UPDATE dbo.Staging_CustomColumns SET Label = @Label, DataType = @DataType
                        WHERE SourceKey = @SourceKey AND ColumnName = @ColumnName;`);
        } else {
            await pool.request()
                .input('SourceKey', sql.NVarChar(30), req.params.source)
                .input('ColumnName', sql.NVarChar(100), columnName)
                .input('Label', sql.NVarChar(200), label)
                .input('DataType', sql.NVarChar(20), dataType)
                .query(`INSERT INTO dbo.Staging_CustomColumns (SourceKey, ColumnName, Label, DataType)
                        VALUES (@SourceKey, @ColumnName, @Label, @DataType);`);
        }

        return res.status(201).json({ success: true, message: `Đã thêm cột "${columnName}" (${dataType}).` });
    } catch (error) {
        console.error(`Lỗi thêm cột staging (${req.params.source}):`, error);
        return res.status(500).json({ success: false, message: 'Không thêm được cột mới: ' + error.message });
    }
};

/**
 * DELETE /api/warehouse/:source/rows/:id
 * Xóa 1 dòng staging theo StagingID.
 */
const deleteStagingRowHandler = async (req, res) => {
    try {
        const pool = await poolPromise;
        const source = await resolveSource(pool, req.params.source);
        if (!source) return res.status(400).json({ success: false, message: 'Nguồn dữ liệu không hợp lệ.' });

        const rowId = parseInt(req.params.id, 10);
        if (!Number.isInteger(rowId) || rowId <= 0) {
            return res.status(400).json({ success: false, message: 'StagingID không hợp lệ.' });
        }

        // Đọc dòng sắp xoá để lưu vào nhật ký (lấy trước khi DELETE)
        const oldRes = await pool.request()
            .input('RowId', sql.BigInt, rowId)
            .query(`SELECT TOP 1 * FROM ${source.table} WHERE StagingID = @RowId;`);
        const oldRow = oldRes.recordset[0] || null;

        const result = await pool.request()
            .input('RowId', sql.BigInt, rowId)
            .query(`
                DELETE FROM ${source.table}
                WHERE StagingID = @RowId;
                SELECT @@ROWCOUNT AS Affected;
            `);
        const affected = result.recordset[0].Affected;
        if (affected === 0) {
            return res.status(404).json({ success: false, message: `Không tìm thấy dòng có StagingID = ${rowId}.` });
        }
        // ===== Nhật ký: lưu nguyên trạng dòng bị xóa =====
        await writeAuditLogSafe(pool, {
            tableName: auditTableName(source.table),
            recordId: String(rowId),
            actionType: 'DELETE',
            ...(await auditActor(pool, req.user)),
            changes: oldRow || {},
            ipAddress: getClientIp(req),
        });

        return res.json({ success: true, message: `Đã xóa dòng (StagingID = ${rowId}).` });
    } catch (error) {
        console.error(`Lỗi xóa dòng staging (${req.params.source}):`, error);
        return res.status(500).json({ success: false, message: 'Không xóa được dòng: ' + error.message });
    }
};

/**
 * DELETE /api/warehouse/:source/columns/:columnName
 * Xóa 1 cột động khỏi bảng staging (ALTER TABLE DROP COLUMN) + xóa metadata.
 * CHỈ cho phép xóa cột tùy chỉnh (có trong Staging_CustomColumns) —
 * các cột gốc của schema Excel không bao giờ bị xóa qua API.
 */
const deleteStagingColumnHandler = async (req, res) => {
    try {
        const pool = await poolPromise;
        const source = await resolveSource(pool, req.params.source);
        if (!source) return res.status(400).json({ success: false, message: 'Nguồn dữ liệu không hợp lệ.' });

        const columnName = String(req.params.columnName || '').trim();
        if (!IDENT_RE.test(columnName)) {
            return res.status(400).json({ success: false, message: 'Tên cột không hợp lệ.' });
        }
        // Không cho xóa cột hệ thống
        if (columnName === 'StagingID') {
            return res.status(400).json({ success: false, message: 'Không được xóa cột hệ thống StagingID.' });
        }

        const custom = await getCustomColumns(pool, req.params.source);
        const meta = custom.find((c) => c.ColumnName === columnName);
        if (!meta) {
            return res.status(400).json({
                success: false,
                message: `Chỉ được xóa cột do người dùng thêm vào. Cột "${columnName}" là cột gốc của dữ liệu Excel.`,
            });
        }

        // Cột vật lý còn tồn tại? (idempotent)
        const exists = await pool.request()
            .input('TableName', sql.NVarChar(128), source.table.replace('dbo.', ''))
            .input('ColumnName', sql.NVarChar(128), columnName)
            .query(`SELECT COUNT(*) AS Cnt FROM sys.columns WHERE object_id = OBJECT_ID(@TableName) AND name = @ColumnName;`);
        if (exists.recordset[0].Cnt > 0) {
            await pool.request().query(`ALTER TABLE ${source.table} DROP COLUMN [${columnName}];`);
        }

        // Xóa metadata
        await pool.request()
            .input('SourceKey', sql.NVarChar(30), req.params.source)
            .input('ColumnName', sql.NVarChar(100), columnName)
            .query(`DELETE FROM dbo.Staging_CustomColumns WHERE SourceKey = @SourceKey AND ColumnName = @ColumnName;`);

        return res.json({ success: true, message: `Đã xóa cột "${columnName}".` });
    } catch (error) {
        console.error(`Lỗi xóa cột staging (${req.params.source}):`, error);
        return res.status(500).json({ success: false, message: 'Không xóa được cột: ' + error.message });
    }
};

// Generic: sheet moi (tao qua POST /sources) dung chung handler nay,
// khong can them listStagingXxx moi trong code.
const listStagingGeneric = async (req, res) => listStaging(req.params.source)(req, res);

/**
 * GET /api/warehouse/sources
 * Tra ve danh muc sheet (built-in + dong tu dbo.Staging_Sources)
 * + danh sach template dung duoc khi tao sheet moi.
 */
const listSourcesHandler = async (req, res) => {
    try {
        const pool = await poolPromise;
        const sources = await listAllSources(pool);
        const templates = Object.fromEntries(
            Object.entries(SHEET_TEMPLATES).map(([k, t]) => [k, { description: t.description, columnCount: t.columns.length, orderBy: t.orderBy }])
        );
        return res.json({ success: true, sources, templates });
    } catch (error) {
        console.error('Loi liet ke sources:', error);
        return res.status(500).json({ success: false, message: 'Khong liet ke duoc danh sach sheet: ' + error.message });
    }
};
/**
 * POST /api/warehouse/sources  (Admin/Warehouse)
 * Body: { key, label, templateKey?, tableName? }
 * Tu dong: CREATE TABLE (StagingID + bo cot template) + INSERT registry.
 */
const createSourceHandler = async (req, res) => {
    try {
        const rawKey = String((req.body && req.body.key) || '').trim().toLowerCase();
        const label = String((req.body && req.body.label) || '').trim();
        const templateKey = String((req.body && req.body.templateKey) || 'npi').trim().toLowerCase();
        let tableName = String((req.body && req.body.tableName) || '').trim();

        if (!SOURCE_KEY_RE.test(rawKey)) {
            return res.status(400).json({ success: false, message: 'Key khong hop le: chi a-z, 0-9, _, bat dau bang chu (vd "pkd28").' });
        }
        if (!label) return res.status(400).json({ success: false, message: 'Thieu label hien thi (vd "PKD28").' });
        const template = SHEET_TEMPLATES[templateKey];
        if (!template) {
            return res.status(400).json({ success: false, message: `templateKey khong hop le. Chon 1 trong: ${Object.keys(SHEET_TEMPLATES).join(', ')}` });
        }
        if (!tableName) {
            tableName = 'Staging_' + rawKey.toUpperCase();
        }
        tableName = tableName.replace(/^dbo\./i, '');
        if (!TABLE_NAME_RE.test(tableName)) {
            return res.status(400).json({ success: false, message: 'tableName khong hop le (chi chu, so, _).' });
        }
        const fullTable = `dbo.${tableName}`;
        const pool = await poolPromise;

        if (STAGING_SOURCES[rawKey] || await getRegistrySource(pool, rawKey)) {
            return res.status(409).json({ success: false, message: `Sheet "${rawKey}" da ton tai.` });
        }
        const tblExists = await pool.request()
            .input('TableName', sql.NVarChar(128), tableName)
            .query(`SELECT COUNT(*) AS Cnt FROM sys.tables WHERE name = @TableName;`);
        if (tblExists.recordset[0].Cnt > 0) {
            return res.status(409).json({ success: false, message: `Bang ${fullTable} da ton tai. Chon tableName khac.` });
        }

        const colDefs = template.columns.map((c) => `[${c}] NVARCHAR(255) NULL`).join(',\n    ');
        await pool.request().query(
            `CREATE TABLE ${fullTable} (\n    StagingID BIGINT IDENTITY(1,1) PRIMARY KEY${colDefs ? ',\n    ' + colDefs : ''}\n);`
        );

        await pool.request()
            .input('SourceKey', sql.NVarChar(30), rawKey)
            .input('Label', sql.NVarChar(100), label)
            .input('TableName', sql.NVarChar(128), fullTable)
            .input('OrderBy', sql.NVarChar(255), template.orderBy)
            .query(`IF NOT EXISTS (SELECT 1 FROM dbo.Staging_Sources WHERE SourceKey = @SourceKey)
                    INSERT INTO dbo.Staging_Sources (SourceKey, Label, TableName, OrderBy, IsBuiltIn)
                    VALUES (@SourceKey, @Label, @TableName, @OrderBy, 0);
                    ELSE UPDATE dbo.Staging_Sources SET Label = @Label, TableName = @TableName, OrderBy = @OrderBy
                    WHERE SourceKey = @SourceKey;`);

        return res.status(201).json({
            success: true,
            message: `Da tao sheet "${label}" (${template.columns.length} cot theo mau "${templateKey}").`,
            source: { key: rawKey, label, table: fullTable, orderBy: template.orderBy, columnCount: template.columns.length, isBuiltIn: false },
        });
    } catch (error) {
        console.error('Loi tao sheet moi:', error);
        if (error && error.number === 208) {
            return res.status(500).json({ success: false, message: 'Chua co bang dbo.Staging_Sources. Hay chay file sql/add_staging_sources_registry.sql truoc.' });
        }
        return res.status(500).json({ success: false, message: 'Khong tao duoc sheet moi: ' + error.message });
    }
};
/**
 * DELETE /api/warehouse/sources/:source (Admin/Warehouse)
 * Chi xoa sheet DONG (IsBuiltIn = 0): DROP TABLE + xoa registry + metadata.
 */
const deleteSourceHandler = async (req, res) => {
    try {
        const pool = await poolPromise;
        const reg = await getRegistrySource(pool, req.params.source);
        if (!reg) {
            if (STAGING_SOURCES[req.params.source]) {
                return res.status(400).json({ success: false, message: 'Sheet goc (built-in) khong duoc xoa qua API.' });
            }
            return res.status(404).json({ success: false, message: 'Khong tim thay sheet.' });
        }
        if (reg.isBuiltIn) {
            return res.status(400).json({ success: false, message: 'Sheet goc (built-in) khong duoc xoa qua API.' });
        }
        await pool.request().query(`DROP TABLE ${reg.table};`);
        await pool.request()
            .input('SourceKey', sql.NVarChar(30), req.params.source)
            .query(`DELETE FROM dbo.Staging_CustomColumns WHERE SourceKey = @SourceKey;
                    DELETE FROM dbo.Staging_Sources WHERE SourceKey = @SourceKey;`);
        return res.json({ success: true, message: `Da xoa sheet "${reg.label}".` });
    } catch (error) {
        console.error('Loi xoa sheet:', error);
        return res.status(500).json({ success: false, message: 'Khong xoa duoc sheet: ' + error.message });
    }
};

/**
 * POST /api/warehouse/:source/bulk-save  (Admin/Warehouse)
  * Body: { columns: [{ name, label }], rows: [{...}], added: [{...}], updated: [{StagingID,...}], deleted: [id,...], mode?: 'replace' | 'append' | 'sync' }
 *
 * Lưu toàn bộ dữ liệu của Data Grid (nhập liệu trực tiếp trên web, không cần file Excel):
 *   1. Validate tên cột + dữ liệu (chặn SQL injection qua tên cột).
 *   2. Cột mới chưa có trong bảng -> ALTER TABLE ADD [col] NVARCHAR(255) + ghi metadata.
  *   3. mode 'replace' (mặc định): xóa dữ liệu cũ rồi nạp lại toàn bộ rows.
 *      mode 'append': chỉ thêm rows mới vào cuối bảng.
 *      mode 'sync':    INSERT `added`, UPDATE `updated` (theo StagingID), DELETE `deleted`.
 *                    KHÔNG dùng TRUNCATE/DELETE ALL — chỉ ghi nhận thay đổi thực sự.
 */
const bulkSaveHandler = async (req, res) => {
    try {
        const pool = await poolPromise;
        const source = await resolveSource(pool, req.params.source);
        if (!source) {
            return res.status(400).json({ success: false, message: 'Nguồn dữ liệu không hợp lệ.' });
        }

        const body = req.body || {};
        const mode = body.mode === 'sync' ? 'sync'
            : (body.mode === 'append' ? 'append' : 'replace');
        const result = await bulkSaveData(pool, source, {
            columns: body.columns,
            rows: body.rows,
            added: body.added,
            updated: body.updated,
            deleted: body.deleted,
            mode,
        });

        // Cập nhật metadata header: ai vừa nhập + lúc nào (giữ nguyên các trường khác đã có)
        try {
            const existing = await getSheetMeta(pool, source.key);
            await upsertSheetMeta(pool, source.key, {
                sheetTitle: existing?.SheetTitle ?? null,
                fileName: existing?.FileName ?? null,
                importedBy: await resolveUserName(pool, req.user),
                importedAt: new Date(),
                projectCode: existing?.ProjectCode ?? source.label,
                buildVersion: existing?.BuildVersion ?? null,
                status: existing?.Status || 'ACTIVE',
                description: existing?.Description ?? null,
            });
        } catch (metaErr) {
            console.warn('Cap nhat metadata header that bai (bo qua):', metaErr.message);
        }

        // ===== Nhật ký lưu hàng loạt: diff chi tiết từng dòng (row-level) =====
        // bulkSaveData() đã snapshot DB TRƯỚC transaction và dựng sẵn auditDetail:
        // { action_type, summary: { inserted_count, updated_count, deleted_count },
        //   changes: [{ type: 'INSERT'|'UPDATE'|'DELETE', row_identifier, data|fields }] }.
        // action_type tự phân loại: chỉ 1 loại -> INSERT/UPDATE/DELETE, hỗn hợp -> BULK_SAVE.
        const auditDetail = result.auditDetail || {
            action_type: 'BULK_UPDATE',
            summary: {
                mode,
                inserted_count: result.rowsInserted,
                updated_count: result.rowsUpdated,
                deleted_count: result.rowsDeleted,
                rowsInserted: result.rowsInserted,
                rowsUpdated: result.rowsUpdated,
                rowsDeleted: result.rowsDeleted,
            },
            changes: [],
            truncated: false,
        };
        await writeAuditLogSafe(pool, {
            tableName: auditTableName(source.table),
            recordId: '*',
            // Hon hop -> luu 'BULK_UPDATE' de hien badge 'Luu hang loat' + giu filter cu;
            // summary trong changes_json van dem rowOps chinh xac cho tung loai dong.
            actionType: (auditDetail.action_type || 'BULK_SAVE') === 'BULK_SAVE'
                ? 'BULK_UPDATE'
                : auditDetail.action_type,
            ...(await auditActor(pool, req.user)),
            changes: auditDetail,
            ipAddress: getClientIp(req),
        });

        let message;
        if (mode === 'replace') {
            message = `Đã cập nhật sheet "${source.label}": thay thế toàn bộ dữ liệu bằng ${result.rowsInserted} dòng.`;
        } else if (mode === 'sync') {
            message = `Đã đồng bộ sheet "${source.label}": ` +
                `thêm ${result.rowsInserted} dòng, ` +
                `cập nhật ${result.rowsUpdated} dòng, ` +
                `xoá ${result.rowsDeleted} dòng.`;
        } else {
            message = `Đã thêm ${result.rowsInserted} dòng vào sheet "${source.label}".`;
        }

        return res.json({
            success: true,
            message,
            source: source.key,
            ...result,
        });
    } catch (error) {
        console.error(`Lỗi lưu Data Grid staging (${req.params.source}):`, error);
        const status = error && error.status ? error.status : 500;
        return res.status(status).json({
            success: false,
            message: (status === 400 ? '' : 'Lưu dữ liệu thất bại: ') + error.message,
        });
    }
};

// ================================================================
//  Sheet Header / Metadata (thông tin file gốc hiển thị TRÊN ĐẦU bảng)
// ================================================================

/**
 * GET /api/warehouse/sources/:source/meta
 * Trả khối metadata header của sheet (dùng cho component SheetHeaderCard).
 */
const getSheetMetaHandler = async (req, res) => {
    try {
        const pool = await poolPromise;
        const source = await resolveSource(pool, req.params.source);
        if (!source) return res.status(400).json({ success: false, message: 'Nguồn dữ liệu không hợp lệ.' });
        const sheetHeader = await buildSheetHeader(pool, source);
        return res.json({ success: true, sourceKey: source.key, tableName: source.table, sheetHeader, sheetTitle: sheetHeader.sheetTitle });
    } catch (error) {
        console.error(`Lỗi lấy metadata header (${req.params.source}):`, error);
        return res.status(500).json({ success: false, message: 'Không lấy được thông tin header: ' + error.message });
    }
};

/**
 * PUT /api/warehouse/sources/:source/meta  (Admin/Warehouse)
 * Cập nhật metadata header. Trường KHÔNG gửi lên sẽ giữ nguyên giá trị cũ.
 */
const updateSheetMetaHandler = async (req, res) => {
    try {
        const pool = await poolPromise;
        const source = await resolveSource(pool, req.params.source);
        if (!source) return res.status(400).json({ success: false, message: 'Nguồn dữ liệu không hợp lệ.' });

        const b = req.body || {};
        const existing = await getSheetMeta(pool, source.key);
        const pick = (v, fallback) => (v === undefined ? fallback : v);

        await upsertSheetMeta(pool, source.key, {
            sheetTitle: pick(b.sheetTitle, existing?.SheetTitle ?? null),
            fileName: pick(b.fileName, existing?.FileName ?? null),
            importedBy: pick(b.importedBy, await resolveUserName(pool, req.user)),
            importedAt: b.importedAt !== undefined
                ? toDateOrNull(b.importedAt)
                : (existing?.ImportedAt ?? new Date()),
            projectCode: pick(b.projectCode, existing?.ProjectCode ?? source.label),
            buildVersion: pick(b.buildVersion, existing?.BuildVersion ?? null),
            status: pick(b.status, existing?.Status || 'ACTIVE'),
            description: pick(b.description, existing?.Description ?? null),
        });

        // ===== Nhật ký: thay đổi metadata header của sheet =====
        const before = existing ? {
            sheetTitle: existing.SheetTitle,
            fileName: existing.FileName, importedBy: existing.ImportedBy,
            projectCode: existing.ProjectCode, buildVersion: existing.BuildVersion,
            status: existing.Status, description: existing.Description,
        } : {};
        const after = { ...before };
        for (const key of ['sheetTitle', 'fileName', 'importedBy', 'projectCode', 'buildVersion', 'status', 'description']) {
            if (b[key] !== undefined) after[key] = b[key];
        }
        await writeAuditLogSafe(pool, {
            tableName: 'Staging_SheetMeta',
            recordId: source.key,
            actionType: 'UPDATE',
            ...(await auditActor(pool, req.user)),
            changes: diffValues(before, after),
            ipAddress: getClientIp(req),
        });

        const sheetHeader = await buildSheetHeader(pool, source);
        return res.json({
            success: true,
            message: `Đã lưu thông tin header cho sheet "${source.label}".`,
            sheetHeader,
        });
    } catch (error) {
        console.error(`Lỗi cập nhật metadata header (${req.params.source}):`, error);
        return res.status(500).json({ success: false, message: 'Không lưu được thông tin header: ' + error.message });
    }
};

// ================================================================
//  Nhật ký & Lịch sử chỉnh sửa (Audit Log)
// ================================================================

/** Đọc bộ lọc từ query string. */
const auditQueryFrom = (query = {}) => ({
    tableName: query.tableName,
    recordId: query.recordId,
    actionType: query.actionType,
    changedBy: query.changedBy,
    from: query.from,
    to: query.to,
    page: query.page,
    limit: query.limit,
});

/**
 * GET /api/warehouse/audit-logs
 * Danh sách nhật ký (lọc + phân trang) kèm thống kê nhanh theo hành động.
 */
const listAuditLogsHandler = async (req, res) => {
    try {
        const pool = await poolPromise;
        const q = auditQueryFrom(req.query);
        const result = await listAuditLogs(pool, q);
        const summary = await getAuditSummary(pool, q);
        return res.json({ success: true, ...result, summary });
    } catch (error) {
        console.error('Lỗi lấy nhật ký dữ liệu:', error);
        return res.status(500).json({ success: false, message: 'Không lấy được nhật ký: ' + error.message });
    }
};

/** GET /api/warehouse/audit-logs/tables — danh sách bảng có phát sinh nhật ký. */
const listAuditTablesHandler = async (req, res) => {
    try {
        const pool = await poolPromise;
        const tables = await listAuditTables(pool);
        return res.json({ success: true, tables });
    } catch (error) {
        console.error('Lỗi lấy danh sách bảng audit:', error);
        return res.status(500).json({ success: false, message: 'Không lấy được danh sách bảng: ' + error.message });
    }
};

/**
 * POST /api/warehouse/audit-logs/:id/restore
 * Khôi phục dữ liệu từ 1 bản ghi nhật ký — CHỈ Admin (role_id=1):
 *   - DELETE → chèn lại dòng đã xóa từ snapshot old_values (giữ nguyên StagingID).
 *   - UPDATE → đưa các trường đã sửa về giá trị TRƯỚC đó (đọc lại giá trị hiện tại
 *              để ghi vào log RESTORE đúng before/after).
 * Sau khi thành công: ghi 1 log action RESTORE mới + đánh dấu log gốc restored_at
 * (chống khôi phục 2 lần). Hỗ trợ 2 dạng: log ĐƠN theo StagingID (record_id số)
 * và log BULK granular ({ summary, changes, truncated } — record_id dạng "*").
 */
const restoreAuditLogHandler = async (req, res) => {
    try {
        const pool = await poolPromise;
        const auditId = parseInt(req.params.id, 10);
        if (!Number.isInteger(auditId) || auditId <= 0) {
            return res.status(400).json({ success: false, message: 'Mã nhật ký không hợp lệ.' });
        }

        await ensureAuditLogsSchema(pool);
        const logRes = await pool.request()
            .input('AuditId', sql.BigInt, auditId)
            .query(`SELECT audit_id, table_name, record_id, action_type, changes_json, restored_at, restored_indexes
                    FROM ${AUDIT_TABLE} WHERE audit_id = @AuditId;`);
        const log = logRes.recordset[0];
        if (!log) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy bản ghi nhật ký.' });
        }
        if (log.restored_at) {
            return res.status(409).json({ success: false, message: 'Bản ghi này đã được khôi phục trước đó.' });
        }
        if (log.action_type !== 'DELETE' && log.action_type !== 'UPDATE') {
            return res.status(400).json({ success: false, message: 'Chỉ có thể khôi phục thao tác Xóa hoặc Cập nhật.' });
        }
        // Parse payload gốc (diff UPDATE = mảng; snapshot DELETE = object;
        //  bulk granular = { summary, changes, truncated })
        let payload = log.changes_json;
        if (typeof payload === 'string') {
            try { payload = JSON.parse(payload); } catch { payload = null; }
        }
        if (!payload || typeof payload !== 'object') {
            return res.status(400).json({ success: false, message: 'Dữ liệu nhật ký không đầy đủ hoặc đã bị cắt, không thể khôi phục tự động.' });
        }
        const isBulk = !Array.isArray(payload) && !!payload.summary && Array.isArray(payload.changes);

        // Khôi phục theo TỪNG DÒNG (log bulk): body { changeIndex } — index trong changes[].
        // Cho phép khôi phục dở dang: restored_indexes đánh dấu dòng đã xong,
        // restored_at chỉ set khi đủ mọi dòng được khôi phục.
        const rawIdx = req.body ? req.body.changeIndex : null;
        const changeIndex = rawIdx === undefined || rawIdx === null || rawIdx === '' ? null : Number(rawIdx);
        if (changeIndex !== null && !Number.isInteger(changeIndex)) {
            return res.status(400).json({ success: false, message: 'changeIndex không hợp lệ.' });
        }
        if (changeIndex !== null && !isBulk) {
            return res.status(400).json({ success: false, message: 'Chỉ nhật ký bulk hỗ trợ khôi phục theo dòng (changeIndex).' });
        }

        // Log đơn cần StagingID số; log bulk ({summary, changes}) không có record_id riêng
        const recordId = parseInt(log.record_id, 10);
        if (!isBulk && (!Number.isInteger(recordId) || recordId <= 0)) {
            return res.status(400).json({ success: false, message: 'Log này không đủ dữ liệu để khôi phục (cần log đơn theo StagingID hoặc log bulk chi tiết).' });
        }

        // Tên bảng lấy từ nhật ký — chỉ chấp nhận identifier thuần + phải còn tồn tại
        const tableName = String(log.table_name || '');
        if (!IDENT_RE.test(tableName)) {
            return res.status(400).json({ success: false, message: 'Tên bảng trong nhật ký không hợp lệ.' });
        }
        const tblRes = await pool.request()
            .input('T', sql.NVarChar(128), tableName)
            .query(`SELECT COUNT(*) AS Cnt FROM sys.tables
                    WHERE name = @T AND SCHEMA_NAME(schema_id) = 'dbo';`);
        if (tblRes.recordset[0].Cnt === 0) {
            return res.status(404).json({ success: false, message: `Bảng "${tableName}" không còn tồn tại, không thể khôi phục.` });
        }
        const metaMap = await getTableColumnMeta(pool, tableName);
        if (!metaMap.get('stagingid')) {
            return res.status(400).json({ success: false, message: 'Bảng không có cột StagingID, không hỗ trợ khôi phục.' });
        }

        let restoreChanges; // payload ghi vào log RESTORE mới
        let restoreMessage = null; // message riêng cho nhánh bulk
        let bulkRestoredIdx = new Set(); // index dòng ĐÃ khôi phục trước đó (bulk)
        let bulkTargetIdxs = []; // index dòng sẽ khôi phục trong LẦN này (bulk)

        if (isBulk) {
            // ===== NHÁNH BULK: payload { summary, changes, truncated } =====
            const summary = payload.summary || {};
            const changes = payload.changes;
            if (payload.truncated) {
                return res.status(409).json({ success: false, message: 'Nhật ký này đã bị cắt (quá 50 dòng/lần), dữ liệu không đủ để khôi phục toàn bộ.' });
            }
            if (String(summary.mode || '') === 'replace') {
                return res.status(400).json({ success: false, message: 'Thao tác thay thế toàn bảng (replace/truncate) không thể khôi phục theo dòng.' });
            }
            const types = [...new Set(changes.map((c) => (c && c.type) || null).filter(Boolean))];
            if (types.length !== 1 || types[0] !== log.action_type) {
                return res.status(400).json({ success: false, message: 'Nhật ký thao tác hỗn hợp hoặc không khớp hành động, không thể khôi phục tự động.' });
            }

            // Các dòng ĐÃ khôi phục trước đó (restored_indexes) → không chèn/revert lần 2
            bulkRestoredIdx = new Set(parseRestoredIdx(log.restored_indexes));
            if (changeIndex !== null) {
                if (changeIndex >= changes.length) {
                    return res.status(400).json({ success: false, message: `changeIndex ${changeIndex} vượt quá số dòng trong nhật ký (${changes.length}).` });
                }
                if (bulkRestoredIdx.has(changeIndex)) {
                    return res.status(409).json({ success: false, message: 'Dòng này đã được khôi phục trước đó.' });
                }
                bulkTargetIdxs = [changeIndex];
            } else {
                bulkTargetIdxs = changes.map((_, i) => i).filter((i) => !bulkRestoredIdx.has(i));
                if (!bulkTargetIdxs.length) {
                    return res.status(409).json({ success: false, message: 'Tất cả dòng trong bản ghi này đã được khôi phục trước đó.' });
                }
            }

            if (log.action_type === 'DELETE') {
                const deletedCount = Number(summary.deleted_count ?? summary.rowsDeleted ?? changes.length);
                if (deletedCount !== changes.length) {
                    return res.status(409).json({ success: false, message: `Nhật ký ghi ${deletedCount} dòng bị xóa nhưng chỉ còn ${changes.length} dòng chi tiết.` });
                }
                let restoredRows = 0;
                const detailChanges = [];
                for (const idx of bulkTargetIdxs) {
                    const ch = changes[idx];
                    const data = ch.data && typeof ch.data === 'object' ? ch.data : null;
                    if (!data || !Object.keys(data).length) continue;
                    const req_ = pool.request();
                    const colList = [];
                    const paramList = [];
                    let hasIdentity = false;
                    let i = 0;
                    for (const [col, raw] of Object.entries(data)) {
                        if (col === '…') continue; // placeholder "…(+N trường khác)" của audit
                        if (!IDENT_RE.test(col)) continue;
                        const meta = metaMap.get(col.toLowerCase());
                        if (!meta) continue;
                        req_.input(`v${i}`, bulkColumnType(meta), coerceValue(raw, meta));
                        colList.push(`[${col}]`);
                        paramList.push(`@v${i}`);
                        if (meta.IsIdentity) hasIdentity = true;
                        i += 1;
                    }
                    if (!i) continue;
                    const insertSql = `INSERT INTO dbo.${tableName} (${colList.join(', ')}) VALUES (${paramList.join(', ')});`;
                    if (hasIdentity) {
                        await req_.query(`
SET IDENTITY_INSERT dbo.${tableName} ON;
BEGIN TRY
    ${insertSql}
END TRY
BEGIN CATCH
    SET IDENTITY_INSERT dbo.${tableName} OFF;
    THROW;
END CATCH;
SET IDENTITY_INSERT dbo.${tableName} OFF;`);
                    } else {
                        await req_.query(insertSql);
                    }
                    restoredRows += 1;
                    detailChanges.push({ type: 'DELETE', row_identifier: ch.row_identifier, data });
                }
                if (!restoredRows) {
                    return res.status(400).json({ success: false, message: 'Không có cột nào trong snapshot bulk khớp với bảng hiện tại.' });
                }
                restoreChanges = {
                    restored_audit_id: log.audit_id,
                    mode: 'DELETE',
                    summary: { mode: 'restore', inserted_count: restoredRows, rowsInserted: restoredRows },
                    changes: detailChanges,
                };
                restoreMessage = `Đã khôi phục (chèn lại) ${restoredRows} dòng vào bảng ${tableName}. Dòng được tạo với dữ liệu tại thời điểm xóa (StagingID mới nếu nhật ký không giữ ID cũ).`;
            } else {
                // UPDATE bulk: revert từng field, StagingID lấy từ row_identifier dạng "Row #123 (...)"
                let restoredRows = 0;
                let restoredFields = 0;
                const detailChanges = [];
                for (const idx of bulkTargetIdxs) {
                    const ch = changes[idx];
                    const mm = String(ch.row_identifier || '').match(/#(\d+)/);
                    const sid = mm ? parseInt(mm[1], 10) : NaN;
                    if (!Number.isInteger(sid) || sid <= 0) {
                        return res.status(400).json({ success: false, message: `Không xác định được StagingID từ dòng "${ch.row_identifier}" trong nhật ký.` });
                    }
                    const fields = [];
                    for (const c of (Array.isArray(ch.fields) ? ch.fields : [])) {
                        const f = c && c.field != null ? String(c.field) : '';
                        if (!f || !IDENT_RE.test(f)) continue;
                        const meta = metaMap.get(f.toLowerCase());
                        if (!meta || meta.IsIdentity) continue;
                        fields.push({ meta, field: f, old: c.old_value });
                    }
                    if (!fields.length) continue;
                    const exist = await pool.request()
                        .input('RowId', sql.BigInt, sid)
                        .query(`SELECT COUNT(*) AS Cnt FROM dbo.${tableName} WHERE StagingID = @RowId;`);
                    if (exist.recordset[0].Cnt === 0) {
                        return res.status(404).json({ success: false, message: `Dòng StagingID = ${sid} không còn tồn tại (có thể đã bị xóa sau thao tác này).` });
                    }
                    // Đọc giá trị HIỆN TẠI trước khi revert (để ghi log RESTORE đúng before/after)
                    const curRes = await pool.request()
                        .input('RowId', sql.BigInt, sid)
                        .query(`SELECT ${fields.map((f) => `[${f.field}]`).join(', ')} FROM dbo.${tableName} WHERE StagingID = @RowId;`);
                    const currentRow = curRes.recordset[0] || {};
                    const updReq = pool.request().input('RowId', sql.BigInt, sid);
                    const setParts = fields.map((f, idx) => {
                        updReq.input(`v${idx}`, bulkColumnType(f.meta), coerceValue(f.old, f.meta));
                        return `[${f.field}] = @v${idx}`;
                    });
                    const upd = await updReq.query(`UPDATE dbo.${tableName} SET ${setParts.join(', ')} WHERE StagingID = @RowId;`);
                    if (!upd.rowsAffected || upd.rowsAffected[0] === 0) continue;
                    restoredRows += 1;
                    restoredFields += fields.length;
                    detailChanges.push({
                        type: 'UPDATE',
                        row_identifier: ch.row_identifier,
                        fields: fields.map((f) => ({
                            field: f.field,
                            old_value: currentRow[f.field] === null || currentRow[f.field] === undefined ? '' : String(currentRow[f.field]),
                            new_value: f.old === null || f.old === undefined ? '' : String(f.old),
                        })),
                    });
                }
                if (!restoredRows) {
                    return res.status(400).json({ success: false, message: 'Không có trường nào trong nhật ký bulk khớp với bảng để khôi phục.' });
                }
                restoreChanges = {
                    restored_audit_id: log.audit_id,
                    mode: 'UPDATE',
                    summary: { mode: 'restore', updated_count: restoredRows, rowsUpdated: restoredRows },
                    changes: detailChanges,
                };
                restoreMessage = `Đã khôi phục ${restoredFields} trường của ${restoredRows} dòng trong bảng ${tableName}.`;
            }
            const skippedRows = changes.length - bulkTargetIdxs.length;
            if (skippedRows > 0) {
                restoreMessage += ` (Lần này chỉ xử lý ${bulkTargetIdxs.length}/${changes.length} dòng — ${skippedRows} dòng bỏ qua vì đã được khôi phục trước đó hoặc không được chọn.)`;
            }
        } else if (log.action_type === 'DELETE') {
            if (Array.isArray(payload) || payload.summary || Object.keys(payload).length === 0) {
                return res.status(400).json({ success: false, message: 'Snapshot dòng đã xóa không đúng định dạng, không thể khôi phục.' });
            }
            // Dòng đã tồn tại (được khôi phục/lập lại) thì không chèn lần 2
            const dup = await pool.request()
                .input('RowId', sql.BigInt, recordId)
                .query(`SELECT COUNT(*) AS Cnt FROM dbo.${tableName} WHERE StagingID = @RowId;`);
            if (dup.recordset[0].Cnt > 0) {
                return res.status(409).json({ success: false, message: 'Dòng dữ liệu đã tồn tại trong bảng (có thể đã được khôi phục trước đó).' });
            }

            // Chỉ chèn các cột còn tồn tại (cột tùy chỉnh có thể đã bị xóa)
            const req_ = pool.request();
            const colList = [];
            const paramList = [];
            let hasIdentity = false;
            let i = 0;
            for (const [col, raw] of Object.entries(payload)) {
                if (!IDENT_RE.test(col)) continue;
                const meta = metaMap.get(col.toLowerCase());
                if (!meta) continue;
                req_.input(`v${i}`, bulkColumnType(meta), coerceValue(raw, meta));
                colList.push(`[${col}]`);
                paramList.push(`@v${i}`);
                if (meta.IsIdentity) hasIdentity = true;
                i += 1;
            }
            if (!i) {
                return res.status(400).json({ success: false, message: 'Không còn cột nào trong snapshot khớp với bảng hiện tại.' });
            }

            const insertSql = `INSERT INTO dbo.${tableName} (${colList.join(', ')}) VALUES (${paramList.join(', ')});`;
            if (hasIdentity) {
                // Giữ nguyên StagingID → cần IDENTITY_INSERT; bọc TRY/CATCH để luôn OFF khi lỗi
                await req_.query(`
SET IDENTITY_INSERT dbo.${tableName} ON;
BEGIN TRY
    ${insertSql}
END TRY
BEGIN CATCH
    SET IDENTITY_INSERT dbo.${tableName} OFF;
    THROW;
END CATCH;
SET IDENTITY_INSERT dbo.${tableName} OFF;`);
            } else {
                await req_.query(insertSql);
            }

            restoreChanges = { restored_audit_id: log.audit_id, mode: 'DELETE', row: payload };
        } else {
            // UPDATE → đưa các trường về giá trị `old`
            if (!Array.isArray(payload) || payload.length === 0) {
                return res.status(400).json({ success: false, message: 'Log cập nhật không có danh sách diff để khôi phục.' });
            }
            const exist = await pool.request()
                .input('RowId', sql.BigInt, recordId)
                .query(`SELECT COUNT(*) AS Cnt FROM dbo.${tableName} WHERE StagingID = @RowId;`);
            if (exist.recordset[0].Cnt === 0) {
                return res.status(404).json({ success: false, message: 'Dòng dữ liệu không còn tồn tại (có thể đã bị xóa sau thao tác này).' });
            }

            // Lọc field hợp lệ + còn tồn tại (bỏ cột đã bị xóa / cột identity)
            const fields = [];
            for (const c of payload) {
                const f = c && c.field != null ? String(c.field) : '';
                if (!f || !IDENT_RE.test(f)) continue;
                const meta = metaMap.get(f.toLowerCase());
                if (!meta || meta.IsIdentity) continue;
                fields.push({ meta, field: f, old: c.old });
            }
            if (!fields.length) {
                return res.status(400).json({ success: false, message: 'Không còn trường nào trong log khớp với bảng để khôi phục.' });
            }

            // Đọc giá trị HIỆN TẠI trước khi revert (để ghi log RESTORE đúng before/after)
            const curReq = pool.request().input('RowId', sql.BigInt, recordId);
            const curSelect = fields.map((f) => `[${f.field}]`).join(', ');
            const curRes = await curReq.query(`SELECT ${curSelect} FROM dbo.${tableName} WHERE StagingID = @RowId;`);
            const currentRow = curRes.recordset[0] || {};

            const updReq = pool.request().input('RowId', sql.BigInt, recordId);
            const setParts = fields.map((f, idx) => {
                updReq.input(`v${idx}`, bulkColumnType(f.meta), coerceValue(f.old, f.meta));
                return `[${f.field}] = @v${idx}`;
            });
            const upd = await updReq.query(`UPDATE dbo.${tableName} SET ${setParts.join(', ')} WHERE StagingID = @RowId;`);
            if (!upd.rowsAffected || upd.rowsAffected[0] === 0) {
                return res.status(404).json({ success: false, message: 'Không tìm thấy dòng cần khôi phục.' });
            }

            restoreChanges = {
                restored_audit_id: log.audit_id,
                mode: 'UPDATE',
                diff: fields.map((f) => ({
                    field: f.field,
                    old: currentRow[f.field] === null || currentRow[f.field] === undefined ? '' : String(currentRow[f.field]),
                    new: f.old === null || f.old === undefined ? '' : String(f.old),
                })),
            };
        }

        // Ghi log RESTORE mới (không ném lỗi) + đánh dấu log gốc đã khôi phục
        await writeAuditLogSafe(pool, {
            tableName: log.table_name,
            recordId: log.record_id,
            actionType: 'RESTORE',
            ...(await auditActor(pool, req.user)),
            changes: restoreChanges,
            ipAddress: getClientIp(req),
        });
        if (isBulk) {
            // Bulk: đánh dấu TỪNG DÒNG đã khôi phục (restored_indexes) — restored_at
            // chỉ set khi ĐỦ mọi dòng đã được khôi phục (hỗ trợ khôi phục dở dang).
            const nextIdxs = [...new Set([...bulkRestoredIdx, ...bulkTargetIdxs])].sort((a, b) => a - b);
            const allDone = nextIdxs.length >= payload.changes.length;
            await pool.request()
                .input('AuditId', sql.BigInt, auditId)
                .input('RestIdx', sql.NVarChar(4000), JSON.stringify(nextIdxs))
                .input('AllDone', sql.Bit, allDone)
                .query(`UPDATE ${AUDIT_TABLE}
                        SET restored_indexes = @RestIdx,
                            restored_at = CASE WHEN @AllDone = 1 AND restored_at IS NULL THEN GETDATE() ELSE restored_at END
                        WHERE audit_id = @AuditId;`);
        } else {
            await pool.request()
                .input('AuditId', sql.BigInt, auditId)
                .query(`UPDATE ${AUDIT_TABLE} SET restored_at = GETDATE() WHERE audit_id = @AuditId AND restored_at IS NULL;`);
        }

        const message = restoreMessage || (log.action_type === 'DELETE'
            ? `Đã khôi phục (chèn lại) dòng StagingID = ${recordId} trong bảng ${tableName}.`
            : `Đã khôi phục ${restoreChanges.diff.length} trường của dòng StagingID = ${recordId} trong bảng ${tableName}.`);
        return res.json({ success: true, message, mode: log.action_type, auditId: log.audit_id });
    } catch (error) {
        console.error(`Lỗi khôi phục dữ liệu từ nhật ký #${req.params.id}:`, error);
        return res.status(500).json({ success: false, message: 'Không khôi phục được dữ liệu: ' + error.message });
    }
};

const listStagingPsm27 = listStaging('psm27');
const listStagingAtw = listStaging('atw');
const listStagingReno27 = listStaging('reno27');
const listStagingChs = listStaging('chs');
const listStagingNvlTray = listStaging('tray');
const listStagingNvlCap = listStaging('cap');
const listStagingSbn27 = listStaging('sbn27');
const listStagingClo27 = listStaging('clo27');
const listStagingSca27 = listStaging('sca27');
const listStagingPdx27 = listStaging('pdx27');
const listStagingNvlSmt = listStaging('smt');
const listStagingNvlHtcc = listStaging('htcc');
const listStagingSparePart = listStaging('sparepart');
const listStagingTongTon = listStaging('tongton');

module.exports = {
    listStagingSbn27,
    listStagingClo27,
    listStagingSca27,
    listStagingPdx27,
    listStagingPsm27,
    listStagingAtw,
    listStagingReno27,
    listStagingChs,
    listStagingNvlTray,
    listStagingNvlCap,
    listStagingNvlSmt,
    listStagingNvlHtcc,
    listStagingSparePart,
    listStagingTongTon,
    STAGING_SOURCES,
    SHEET_TEMPLATES,
    listStagingGeneric,
    listSourcesHandler,
    createSourceHandler,
    deleteSourceHandler,
    resolveSource,
    listAllSources,
    updateStagingRowHandler,
    insertStagingRowHandler,
    addStagingColumnHandler,
    deleteStagingRowHandler,
    deleteStagingColumnHandler,
    bulkSaveHandler,
    getSheetMetaHandler,
    updateSheetMetaHandler,
    listAuditLogsHandler,
    listAuditTablesHandler,
    restoreAuditLogHandler,
};