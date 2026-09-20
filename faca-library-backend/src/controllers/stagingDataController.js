const { sql, poolPromise } = require('../config/db');
const { bulkSaveData } = require('../services/bulkSaveService');

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
                ORDER BY ${source.orderBy}
                OFFSET @Offset ROWS FETCH NEXT @Limit ROWS ONLY;
            `);

        return res.json({
            success: true,
            source: sourceKey,
            columns: source.columns,
            customColumns: customCols,
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
};