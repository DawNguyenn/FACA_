// bulkSaveService.js — Lưu dữ liệu từ Data Grid (React) xuống bảng staging.
// Thay thế hoàn toàn flow bulk insert file Excel cũ.
// POST /:source/bulk-save nhận JSON:
//   { columns: [{ name, label?, dataType? }],
//     rows: [...],           // mode 'replace' (full table)
//     added: [...],          // mode 'sync'|'append' (new rows to INSERT)
//     updated: [...],        // mode 'sync' (existing rows to UPDATE, mỗi row có StagingID)
//     deleted: [id, ...],    // mode 'sync' (StagingID mảng xoá)
//     mode?: 'replace'|'append'|'sync' }
const { sql } = require('../config/db');

// Tên cột SQL Server reserved (dùng để cảnh báo, không block hoàn toàn vì có thể schema khác)
const RESERVED_SQL = new Set([
    'select','insert','update','delete','create','drop','alter','truncate',
    'table','column','index','view','procedure','function','trigger',
    'from','where','into','set','values','null','true','false','and','or',
    'not','in','like','between','exists','order','group','having','join',
    'inner','outer','left','right','full','on','cross','top','distinct',
    'count','sum','avg','min','max','as','asc','desc','cube','rollup',
    'primary','key','foreign','references','constraint','default','check',
    'identity','unique','clustered','nonclustered',
]);

function isValidColName(name) {
    const s = String(name == null ? '' : name).trim();
    if (!s) return { ok: false, reason: 'Tên cột không được để trống.' };
    if (s.length > 100) return { ok: false, reason: 'Tên cột tối đa 100 ký tự (có: ' + s.length + ').' };
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(s)) {
        return { ok: false, reason: 'Tên cột chỉ được dùng chữ cái, chữ số, gạch dưới, và phải bắt đầu bằng chữ cái hoặc gạch dưới. Cột: "' + s + '".' };
    }
    if (RESERVED_SQL.has(s.toLowerCase())) {
        return { ok: false, reason: 'Tên cột trùng từ khóa SQL Server: "' + s + '". Vui lòng đặt tên khác.' };
    }
    return { ok: true };
}

function normColName(name) {
    return String(name).trim();
}

async function ensureColumnExists(pool, tableName, columnName) {
    const check = await pool.request()
        .input('TableName', sql.NVarChar(128), tableName.replace(/^dbo\./i, ''))
        .input('ColumnName', sql.NVarChar(128), columnName)
        .query(`SELECT COUNT(*) AS Cnt FROM sys.columns WHERE object_id = OBJECT_ID(@TableName) AND name = @ColumnName;`);
    return check.recordset[0].Cnt > 0;
}

// Lỗi do dữ liệu client gửi lên -> controller trả 400 thay vì 500
function badRequest(message) {
    const err = new Error(message);
    err.status = 400;
    return err;
}

// Đọc metadata cột thật trong bảng SQL (tên + kiểu) để build bulk insert đúng kiểu.
async function getTableColumnMeta(pool, tableName) {
    const res = await pool.request()
        .input('TableName', sql.NVarChar(128), tableName.replace(/^dbo\./i, ''))
        .query(`
            SELECT c.name AS ColumnName, t.name AS TypeName, c.max_length AS MaxLength,
                   c.precision AS Precision, c.scale AS Scale, c.is_nullable AS IsNullable
            FROM sys.columns c
            JOIN sys.types t ON t.user_type_id = c.user_type_id
            WHERE c.object_id = OBJECT_ID(@TableName);
        `);
    const map = new Map();
    for (const r of res.recordset) {
        map.set(String(r.ColumnName).toLowerCase(), r);
    }
    return map;
}

// Số ký tự tối đa thực tế của cột (nvarchar -> max_length/2, varchar -> max_length; -1 = MAX)
function charLimit(meta) {
    if (!meta) return 500;
    const t = String(meta.TypeName).toLowerCase();
    if (!['nvarchar', 'nchar', 'varchar', 'char'].includes(t)) return 500;
    if (meta.MaxLength === -1) return 4000;
    return t.startsWith('n') ? Math.floor(meta.MaxLength / 2) : meta.MaxLength;
}

function isNumericType(typeName) {
    return ['int', 'bigint', 'smallint', 'tinyint', 'float', 'real', 'decimal', 'numeric', 'money', 'smallmoney'].includes(typeName);
}

function isDateType(typeName) {
    return ['date', 'datetime', 'datetime2', 'smalldatetime', 'datetimeoffset', 'time'].includes(typeName);
}

/**
 * Chuyển giá trị string từ grid sang đúng kiểu cột SQL.
 * Trả về null nếu giá trị rỗng/không parse được (để tránh bulk insert fail cả lô).
 */
function coerceValue(rawValue, meta) {
    if (rawValue === null || rawValue === undefined) return null;
    const s = String(rawValue).trim();
    if (s === '') return null;
    if (!meta) return s.slice(0, 500);

    const typeName = String(meta.TypeName).toLowerCase();
    if (isNumericType(typeName)) {
        // Giữ nguyên dạng string: driver mssql tự convert; chỉ chặn giá trị không phải số
        const cleaned = s.replace(/,/g, '');
        if (!/^-?\d+(\.\d+)?([eE][+-]?\d+)?$/.test(cleaned)) return null;
        return cleaned;
    }
    if (isDateType(typeName)) {
        const d = new Date(s);
        if (Number.isNaN(d.getTime())) return null;
        return d;
    }
    if (typeName === 'bit') {
        const low = s.toLowerCase();
        if (['1', 'true', 'yes', 'x', 'có', 'co'].includes(low)) return 1;
        if (['0', 'false', 'no', 'không', 'khong'].includes(low)) return 0;
        return null;
    }
    return s.slice(0, charLimit(meta));
}

/**
 * Kiểu tham số dùng khi bulk insert, khớp với kiểu cột thật trong bảng.
 * (Giá trị đã được coerceValue() chuẩn hoá trước đó.)
 */
function bulkColumnType(meta) {
    if (!meta) return sql.NVarChar(500);
    const typeName = String(meta.TypeName).toLowerCase();
    if (isDateType(typeName)) return sql.DateTime;
    if (typeName === 'bit') return sql.Bit;
    if (typeName === 'uniqueidentifier') return sql.UniqueIdentifier;
    const limit = meta.MaxLength === -1 ? sql.MAX : charLimit(meta);
    return sql.NVarChar(limit);
}

// Kiểu dữ liệu được phép cho cột mới do người dùng tự thêm (chống SQL injection qua DDL)
const ALLOWED_DATA_TYPES = /^(NVARCHAR\((MAX|[1-9]\d{0,3})\)|INT|BIGINT|SMALLINT|FLOAT|REAL|DECIMAL\(\d{1,2},\d{1,2}\)|NUMERIC\(\d{1,2},\d{1,2}\)|DATE|DATETIME|DATETIME2|BIT)$/i;

function normalizeDataType(dataType) {
    const raw = String(dataType == null ? '' : dataType).replace(/\s+/g, ' ').trim().toUpperCase();
    if (!raw) return 'NVARCHAR(255)';
    const compact = raw.replace(/\s*\(\s*/g, '(').replace(/\s*,\s*/g, ',').replace(/\s*\)/g, ')');
    if (!ALLOWED_DATA_TYPES.test(compact)) return 'NVARCHAR(255)';
    return compact;
}

async function addColumnIfMissing(pool, source, columnName, label, dataType, tableName) {
    const exists = await ensureColumnExists(pool, tableName, columnName);
    if (exists) return false;

    const sqlType = normalizeDataType(dataType);
    await pool.request().query(`ALTER TABLE ${tableName} ADD [${columnName}] ${sqlType} NULL;`);

    try {
        await pool.request()
            .input('SourceKey', sql.NVarChar(30), source.key)
            .input('ColumnName', sql.NVarChar(100), columnName)
            .input('Label', sql.NVarChar(200), label || columnName)
            .input('DataType', sql.NVarChar(100), sqlType)
            .query(`IF NOT EXISTS (SELECT 1 FROM dbo.Staging_CustomColumns WHERE SourceKey = @SourceKey AND ColumnName = @ColumnName)
                    INSERT INTO dbo.Staging_CustomColumns (SourceKey, ColumnName, Label, DataType) VALUES (@SourceKey, @ColumnName, @Label, @DataType);`);
    } catch (err) {
        console.warn('[bulkSaveService] Không ghi metadata cột mới (có thể bảng Staging_CustomColumns chưa tồn tại):', err.message);
    }
    return true;
}

async function bulkSaveData(pool, source, payload) {
    const { columns: payloadColumns, rows: payloadRows = [], added = [], updated = [], deleted = [], mode = 'replace' } = payload;

    if (!Array.isArray(payloadColumns) || payloadColumns.length === 0) {
        throw badRequest('Không có danh sách cột (columns) trong payload.');
    }

    // Chế độ lưu hợp lệ
    const VALID_MODES = ['replace', 'append', 'sync'];
    if (!VALID_MODES.includes(mode)) {
        throw badRequest(`Mode "${mode}" không hợp lệ. Chấp nhận: ${VALID_MODES.join(', ')}.`);
    }

    // Xac dinh mang rows de INSERT theo mode:
    //   sync:      dùng mảng `added` (các dòng mới)
    //   append:    dùng `added` nếu có, ngược lại fallback về `rows` (backward compat)
    //   replace:   dùng mảng `rows` (toàn bộ bảng, TRUNCATE)
    const rowsToInsert = mode === 'sync'
        ? (Array.isArray(added) ? added : [])
        : (mode === 'append'
            ? (Array.isArray(added) && added.length > 0 ? added : (Array.isArray(payloadRows) ? payloadRows : []))
            : (Array.isArray(payloadRows) ? payloadRows : []));

    // Validate `added` và `updated` là mảng (cho mode sync)
    if (mode === 'sync') {
        if (!Array.isArray(added)) throw badRequest('Dữ liệu added không phải là mảng.');
        if (!Array.isArray(updated)) throw badRequest('Dữ liệu updated không phải là mảng.');
        if (!Array.isArray(deleted)) throw badRequest('Dữ liệu deleted không phải là mảng.');
    }

    // Validate cấu trúc columns
    const validatedColumns = [];
    const errors = [];
    const seenNames = new Set();
    for (let i = 0; i < payloadColumns.length; i++) {
        const raw = payloadColumns[i];
        const name = normColName(raw && raw.name ? raw.name : (raw && raw.columnName ? raw.columnName : null));
        const label = raw && raw.label ? String(raw.label) : name;
        const dataType = raw && (raw.dataType || raw.type) ? String(raw.dataType || raw.type) : '';

        const valid = isValidColName(name);
        if (!valid.ok) {
            errors.push(`Cột #${i + 1}: ${valid.reason}`);
            continue;
        }
        if (seenNames.has(name.toUpperCase())) {
            errors.push(`Cột #${i + 1}: tên cột trùng lặp "${name}".`);
            continue;
        }
        seenNames.add(name.toUpperCase());
        validatedColumns.push({ name, label, dataType });
    }

    if (errors.length > 0) {
        throw badRequest('Lỗi validating cột: ' + errors.join('; '));
    }

    // Kiểm tra số dòng
    const MAX_ROWS = 5000;
    if (rowsToInsert.length > MAX_ROWS) {
        throw badRequest(`Quá nhiều dòng (>${MAX_ROWS} dòng). Vui lòng chia nhỏ hoặc xóa bớt dữ liệu trước khi lưu.`);
    }

    // Làm sạch mỗi dòng: chỉ chấp nhận object, giới hạn độ dài giá trị
    const rows = [];
    for (let i = 0; i < rowsToInsert.length; i++) {
        const r = rowsToInsert[i];
        if (!r || typeof r !== 'object' || Array.isArray(r)) {
            throw badRequest(`Dòng #${i + 1} không phải là object hợp lệ (bỏ qua hoặc sửa trước khi lưu).`);
        }
        const clean = {};
        for (const col of validatedColumns) {
            let v = r[col.name];
            if (v === null || v === undefined || v === '') {
                clean[col.name] = null;
            } else {
                // Giữ nguyên chuỗi thô, việc cắt theo độ dài cột thật do coerceValue() xử lý
                clean[col.name] = String(v);
            }
        }
        rows.push(clean);
    }

    // Đảm bảo cột tồn tại trong bảng SQL
    const tableName = source.table;
    const newColumnsAdded = [];
    for (const col of validatedColumns) {
        const colAdded = await addColumnIfMissing(pool, source, col.name, col.label, col.dataType, tableName);
        if (colAdded) newColumnsAdded.push(col.name);
    }

    // Lấy metadata cột thật (kiểu dữ liệu) để convert + bulk insert đúng kiểu
    const columnMeta = await getTableColumnMeta(pool, tableName);
    const bulkCols = validatedColumns.map((col) => {
        const meta = columnMeta.get(col.name.toLowerCase()) || null;
        return { name: col.name, meta, sqlType: bulkColumnType(meta) };
    });

    // dbTableName dùng cho cả DELETE, UPDATE và INSERT
    const dbTableName = tableName.replace(/^dbo\./i, '');
    const BATCH = 1000;
    let inserted = 0;
    let updatedCount = 0;
    let deletedCount = 0;

    // Mode sync: DELETE -> UPDATE -> INSERT (theo thứ tự tránh conflict khóa)
    // Mode replace: TRUNCATE rồi INSERT lại toàn bộ
    if (mode === 'sync') {
        // 1. DELETE — xoá các dòng đã xóa trên grid (theo StagingID)
        if (deleted.length > 0) {
            const safeIds = deleted
                .map(id => parseInt(id, 10))
                .filter(id => !isNaN(id));
            if (safeIds.length > 0) {
                const idList = safeIds.join(',');
                await pool.request().query(`DELETE FROM ${tableName} WHERE StagingID IN (${idList});`);
                deletedCount = safeIds.length;
            }
        }
        // 2. UPDATE — cập nhật các dòng đã thay đổi (theo StagingID)
        if (updated.length > 0) {
            for (const row of updated) {
                const stagingId = row.StagingID;
                if (stagingId == null) continue;
                const req = pool.request()
                    .input('StagingID', sql.Int, parseInt(stagingId, 10));
                const setClauses = [];
                for (const col of bulkCols) {
                    const v = row[col.name];
                    const cleanVal = (v === null || v === undefined || v === '') ? null : String(v);
                    const coerced = coerceValue(cleanVal, col.meta);
                    setClauses.push(`[${col.name}] = @val_${col.name}`);
                    req.input(`val_${col.name}`, col.sqlType, coerced);
                }
                if (setClauses.length > 0) {
                    await req.query(`UPDATE ${tableName} SET ${setClauses.join(', ')} WHERE StagingID = @StagingID;`);
                    updatedCount++;
                }
            }
        }
    }
    if (mode === 'replace') {
        try {
            await pool.request().query(`TRUNCATE TABLE ${tableName};`);
        } catch (truncErr) {
            // TRUNCATE bị chặn (khóa ngoại / phân vùng) -> fallback DELETE
            await pool.request().query(`DELETE FROM ${tableName};`);
        }
    }
    for (let i = 0; i < rows.length; i += BATCH) {
        const slice = rows.slice(i, i + BATCH);
        const table = new sql.Table(dbTableName);
        table.create = false;
        for (const col of bulkCols) {
            table.columns.add(col.name, col.sqlType, { nullable: true });
        }
        for (const row of slice) {
            table.rows.add(...bulkCols.map((c) => coerceValue(row[c.name], c.meta)));
        }
        await pool.request().bulk(table);
        inserted += slice.length;
    }

    return {
        mode,
        totalRowsSubmitted: rowsToInsert.length,
        rowsInserted: inserted,
        rowsUpdated: updatedCount,
        rowsDeleted: deletedCount,
        columnsReceived: validatedColumns.length,
        newColumnsAdded,
        tableName,
    };
}

module.exports = { bulkSaveData, isValidColName, badRequest, normalizeDataType, coerceValue };
