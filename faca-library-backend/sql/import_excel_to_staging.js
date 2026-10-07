/**
 * import_excel_to_staging.js
 * Đọc trực tiếp file Excel gốc (Quan_Ly_Nguyen_Vat_Lieu_NPI.xlsx) và
 * chèn đúng từng cột vào 7 bảng staging — thay thế cho BULK INSERT CSV
 * (CSV bị lỗi lệch cột + ký tự quote ").
 *
 * Cách chạy:  node sql/import_excel_to_staging.js [đường_dẫn_file_excel]
 * Mặc định:   d:/Quan_Ly_Nguyen_Vat_Lieu_NPI.xlsx
 * Lưu ý: script TRUNCATE (xoá sạch) 7 bảng trước khi nạp.
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const path = require('path');
const XLSX = require(path.join(__dirname, '..', 'node_modules', 'xlsx'));
const sql = require(path.join(__dirname, '..', 'node_modules', 'mssql'));

const EXCEL_PATH = process.argv[2] || 'd:/Quan_Ly_Nguyen_Vat_Lieu_NPI.xlsx';
const HEADER_ROW = 3; // header nằm ở dòng 4 (index 3)

// Sheet → bảng đích + schema cột
const NPI_MAP = {
    'Change Date': 'Change_Date', Model: 'Model', Build: 'Build',
    'Received (Date)': 'Received_Date', Material: 'Material', Vendor: 'Vendor',
    Description: 'Description', Config: 'Config', 'Lot ID': 'Lot_ID',
    'Shipment Qty': 'Shipment_Qty', RnD: 'RnD', 'Qty Tồn Kho': 'Qty_Ton_Kho',
    'Output Date': 'Output_Date', Receiver: 'Receiver', 'Mã NV': 'Ma_NV',
    'Ghi Chú': 'Ghi_Chu', 'Tổng Qty Tồn Cả Đơn': 'Tong_Qty_Ton',
    Bill: 'Bill', 'I/V': 'IV',
};
const NVL_MAP = {
    'Change Date': 'Change_Date', Model: 'Model', Build: 'Build',
    'Received (Date)': 'Received_Date', Material: 'Material', Vendor: 'Vendor',
    Description: 'Description', Bill: 'Bill', 'I/V': 'IV',
    'Qty Xuất Hàng': 'Qty_Xuat_Hang', 'Tồn Kho': 'Ton_Kho',
    'IQA Result': 'IQA_Result', 'Special Note': 'Special_Note',
};
const SHEETS = [
    { sheet: 'CHS', table: 'dbo.Staging_CHS', map: NPI_MAP },
    { sheet: 'PSM27', table: 'dbo.Staging_PSM27', map: NPI_MAP },
    { sheet: 'PDX27', table: 'dbo.Staging_PDX27', map: NPI_MAP },
    { sheet: 'Dự Án Khác', table: 'dbo.Staging_DuAnKhac', map: NPI_MAP },
    { sheet: 'NVL - TRAY', table: 'dbo.Staging_NVL_Tray', map: NVL_MAP },
    { sheet: 'NVL - CAP', table: 'dbo.Staging_NVL_Cap', map: NVL_MAP },
    { sheet: 'NVL - SMT', table: 'dbo.Staging_NVL_Smt', map: NVL_MAP },
];

// Làm sạch 1 ô dữ liệu: bỏ quote ", trim, rỗng → null
const clean = (v) => {
    if (v === null || v === undefined) return null;
    const s = String(v).replace(/"/g, '').trim();
    return s === '' ? null : s;
};

/** DÒNG 1 (index 0) của sheet thường chứa TIÊU ĐỀ, vd: "Bảng chi tiết tồn kho ATW". */
const TITLE_ROW = 0;

/**
 * Lấy ô đầu tiên có nội dung trên DÒNG 1 làm tiêu đề sheet.
 * Trả null nếu dòng 1 trống (sheet không có title).
 */
function extractSheetTitle(row) {
    if (!Array.isArray(row)) return null;
    for (let i = 0; i < Math.min(row.length, 8); i++) {
        const s = String(row[i] === null || row[i] === undefined ? '' : row[i]).trim();
        if (s) return s.slice(0, 255);
    }
    return null;
}

/** Tạo bảng metadata nếu chưa có (idempotent) + bổ sung cột SheetTitle. */
async function ensureSheetMetaTable(pool) {
    await pool.request().query(`
        IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'Staging_SheetMeta')
        BEGIN
            CREATE TABLE dbo.Staging_SheetMeta (
                SourceKey    NVARCHAR(30)   NOT NULL PRIMARY KEY,
                SheetTitle   NVARCHAR(255)  NULL,
                FileName     NVARCHAR(400)  NULL,
                ImportedBy   NVARCHAR(200)  NULL,
                ImportedAt   DATETIME2(0)   NULL,
                ProjectCode  NVARCHAR(100)  NULL,
                BuildVersion NVARCHAR(100)  NULL,
                Status       NVARCHAR(30)   NOT NULL CONSTRAINT DF_SheetMeta_Status DEFAULT (N'ACTIVE'),
                Description  NVARCHAR(1000) NULL,
                UpdatedAt    DATETIME2(0)   NOT NULL CONSTRAINT DF_SheetMeta_UpdatedAt DEFAULT (SYSDATETIME())
            );
        END
        IF NOT EXISTS (SELECT 1 FROM sys.columns
                       WHERE object_id = OBJECT_ID('dbo.Staging_SheetMeta') AND name = 'SheetTitle')
            ALTER TABLE dbo.Staging_SheetMeta ADD SheetTitle NVARCHAR(255) NULL;
    `);
}

/** Tìm SourceKey của sheet từ registry (theo TableName). */
async function resolveSourceKey(pool, table) {
    try {
        const r = await pool.request()
            .input('TableName', sql.NVarChar(128), String(table).replace(/^dbo\./i, ''))
            .query('SELECT SourceKey FROM dbo.Staging_Sources WHERE TableName = @TableName;');
        return r.recordset[0] ? r.recordset[0].SourceKey : null;
    } catch {
        return null; // chưa chạy migration registry -> bỏ qua
    }
}

/** Lưu tiêu đề sheet + tên file vào dbo.Staging_SheetMeta (không ghi đè trường khác). */
async function saveSheetTitle(pool, sourceKey, sheetTitle, fileName, importedAt) {
    if (!sourceKey || !sheetTitle) return false;
    try {
        await ensureSheetMetaTable(pool);
        await pool.request()
            .input('SourceKey', sql.NVarChar(30), sourceKey)
            .input('SheetTitle', sql.NVarChar(255), sheetTitle)
            .input('FileName', sql.NVarChar(400), fileName || null)
            .input('ImportedAt', sql.DateTime2, importedAt || new Date())
            .query(`
                MERGE dbo.Staging_SheetMeta AS T
                USING (SELECT @SourceKey AS SourceKey) AS S
                ON T.SourceKey = S.SourceKey
                WHEN MATCHED THEN UPDATE SET
                    SheetTitle = @SheetTitle,
                    FileName = COALESCE(@FileName, T.FileName),
                    ImportedAt = @ImportedAt,
                    UpdatedAt = SYSDATETIME()
                WHEN NOT MATCHED THEN INSERT
                    (SourceKey, SheetTitle, FileName, ImportedAt, Status, UpdatedAt)
                    VALUES (@SourceKey, @SheetTitle, @FileName, @ImportedAt, N'ACTIVE', SYSDATETIME());
            `);
        return true;
    } catch (e) {
        console.warn(`  ! Không lưu được tiêu đề sheet vào metadata: ${e.message}`);
        return false;
    }
}

/**
 * Xây mapping: index cột Excel → tên cột DB.
 * Với NVL: 3 nhóm "XUẤT HÀNG LẦN n" chiếm 3 cột (Date, DRI, Qty) mỗi nhóm.
 */
function buildColumnIndices(header, map) {
    const idxMap = []; // { excelIdx, dbCol }
    header.forEach((h, i) => {
        const label = String(h || '').trim();
        if (map[label]) idxMap.push({ excelIdx: i, dbCol: map[label] });
        if (label === 'XUẤT HÀNG LẦN 1') {
            idxMap.push({ excelIdx: i, dbCol: 'Xuat_1_Date' }, { excelIdx: i + 1, dbCol: 'Xuat_1_DRI' }, { excelIdx: i + 2, dbCol: 'Xuat_1_Qty' });
        }
        if (label === 'XUẤT HÀNG LẦN 2') {
            idxMap.push({ excelIdx: i, dbCol: 'Xuat_2_Date' }, { excelIdx: i + 1, dbCol: 'Xuat_2_DRI' }, { excelIdx: i + 2, dbCol: 'Xuat_2_Qty' });
        }
        if (label === 'XUẤT HÀNG LẦN 3') {
            idxMap.push({ excelIdx: i, dbCol: 'Xuat_3_Date' }, { excelIdx: i + 1, dbCol: 'Xuat_3_DRI' }, { excelIdx: i + 2, dbCol: 'Xuat_3_Qty' });
        }
    });
    return idxMap;
}

(async () => {
    const wb = XLSX.readFile(EXCEL_PATH, { cellDates: false });
    const pool = await sql.connect({
        server: process.env.DB_SERVER,
        database: process.env.DB_DATABASE,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        options: { encrypt: false, trustServerCertificate: true },
    });

    for (const { sheet, table, map } of SHEETS) {
        if (!wb.Sheets[sheet]) {
            console.warn(`! Bỏ qua: không tìm thấy sheet "${sheet}"`);
            continue;
        }
        const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheet], { header: 1, defval: '' });
        // DÒNG 1 (index 0) là TIÊU ĐỀ sheet gốc, vd: "Bảng chi tiết tồn kho ATW".
        // Dòng này KHÔNG thuộc phần dữ liệu nên trước đây bị bỏ qua.
        const sheetTitle = extractSheetTitle(rows[TITLE_ROW]);
        const header = rows[HEADER_ROW].map((c) => String(c).trim());
        const idxMap = buildColumnIndices(header, map);
        const dbCols = idxMap.map((m) => `[${m.dbCol}]`).join(', ');

        // Xoá dữ liệu cũ của bảng đích
        await pool.request().query(`TRUNCATE TABLE ${table};`);

        // Thu thập + chèn dữ liệu (batch 100 dòng)
        let inserted = 0;
        let batch = [];
        const flush = async () => {
            if (!batch.length) return;
            const values = batch
                .map((cells) => `(${cells.map((v) => (v === null ? 'NULL' : `N'${v.replace(/'/g, "''")}'`)).join(', ')})`)
                .join(',\n');
            await pool.request().query(`INSERT INTO ${table} (${dbCols}) VALUES ${values};`);
            inserted += batch.length;
            batch = [];
        };

        for (const raw of rows.slice(HEADER_ROW + 1)) {
            // Bỏ qua dòng sub-header của sheet NVL (Date | DRI | Qty)
            const x1 = idxMap.find((m) => m.dbCol === 'Xuat_1_Date');
            if (x1 && clean(raw[x1.excelIdx]) === 'Date') continue;
            const cells = idxMap.map((m) => clean(raw[m.excelIdx]));
            if (cells.every((c) => c === null)) continue; // bỏ dòng trống
            batch.push(cells);
            if (batch.length >= 100) await flush();
        }
        await flush();

        // Lưu tiêu đề dòng 1 vào metadata để Frontend hiển thị trên đầu bảng
        const sourceKey = await resolveSourceKey(pool, table);
        const saved = await saveSheetTitle(pool, sourceKey, sheetTitle, path.basename(EXCEL_PATH), new Date());
        const titleInfo = sheetTitle
            ? ` — tiêu đề: "${sheetTitle}"${saved ? '' : ' (chưa lưu được metadata)'}`
            : ' — dòng 1 không có tiêu đề';
        console.log(`✓ ${table}: nạp ${inserted} dòng${titleInfo}`);
    }

    await pool.close();
    console.log('DONE — dữ liệu đã được nạp lại đúng cột từ file Excel gốc.');
})().catch((e) => {
    console.error('ERR:', e.message);
    process.exit(1);
});
