/**
 * sheetMetaService.js — Metadata HEADER của từng sheet kho.
 *
 * Lưu trữ: bảng dbo.Staging_SheetMeta (1 dòng / SourceKey).
 *  - Được tạo tự động khi server khởi động (idempotent), KHÔNG phá schema hiện có.
 *  - `buildSheetHeader()` tổng hợp metadata đã lưu + số bản ghi THỜI GIAN THỰC
 *    (COUNT(*) trên bảng staging) để trả về khối `sheetHeader` cho frontend.
 */
const { sql } = require('../config/db');

const META_TABLE = 'dbo.Staging_SheetMeta';

/** Idempotent: tạo bảng metadata nếu chưa có. */
async function ensureSheetMetaSchema(pool) {
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
                Status       NVARCHAR(30)   NOT NULL
                    CONSTRAINT DF_Staging_SheetMeta_Status DEFAULT (N'ACTIVE'),
                Description  NVARCHAR(1000) NULL,
                UpdatedAt    DATETIME2(0)   NOT NULL
                    CONSTRAINT DF_Staging_SheetMeta_UpdatedAt DEFAULT (SYSDATETIME())
            );
        END
        -- Bảng đã tồn tại từ trước -> bổ sung cột SheetTitle (idempotent)
        IF NOT EXISTS (SELECT 1 FROM sys.columns
                       WHERE object_id = OBJECT_ID('dbo.Staging_SheetMeta') AND name = 'SheetTitle')
            ALTER TABLE dbo.Staging_SheetMeta ADD SheetTitle NVARCHAR(255) NULL;
    `);
}

/** Chuẩn hoá giá trị về Date hoặc null (nhận Date / chuỗi ISO). */
function toDateOrNull(value) {
    if (!value) return null;
    const d = value instanceof Date ? value : new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
}

/** Đọc 1 dòng metadata của sheet. Trả null nếu chưa có / chưa tạo bảng. */
/** Ghi (upsert) metadata của sheet. */
async function upsertSheetMeta(pool, sourceKey, meta = {}) {
    await ensureSheetMetaSchema(pool);
    await pool.request()
        .input('SourceKey', sql.NVarChar(30), String(sourceKey))
        .input('SheetTitle', sql.NVarChar(255), meta.sheetTitle != null ? String(meta.sheetTitle).slice(0, 255) : null)
        .input('FileName', sql.NVarChar(400), meta.fileName != null ? String(meta.fileName).slice(0, 400) : null)
        .input('ImportedBy', sql.NVarChar(200), meta.importedBy != null ? String(meta.importedBy).slice(0, 200) : null)
        .input('ImportedAt', sql.DateTime2, toDateOrNull(meta.importedAt))
        .input('ProjectCode', sql.NVarChar(100), meta.projectCode != null ? String(meta.projectCode).slice(0, 100) : null)
        .input('BuildVersion', sql.NVarChar(100), meta.buildVersion != null ? String(meta.buildVersion).slice(0, 100) : null)
        .input('Status', sql.NVarChar(30), meta.status ? String(meta.status).slice(0, 30) : 'ACTIVE')
        .input('Description', sql.NVarChar(1000), meta.description != null ? String(meta.description).slice(0, 1000) : null)
        .query(`
            MERGE ${META_TABLE} AS T
            USING (SELECT @SourceKey AS SourceKey) AS S
            ON T.SourceKey = S.SourceKey
            WHEN MATCHED THEN UPDATE SET
                SheetTitle = @SheetTitle,
                FileName = @FileName, ImportedBy = @ImportedBy, ImportedAt = @ImportedAt,
                ProjectCode = @ProjectCode, BuildVersion = @BuildVersion,
                Status = @Status, Description = @Description, UpdatedAt = SYSDATETIME()
            WHEN NOT MATCHED THEN INSERT
                (SourceKey, SheetTitle, FileName, ImportedBy, ImportedAt, ProjectCode, BuildVersion, Status, Description, UpdatedAt)
                VALUES (@SourceKey, @SheetTitle, @FileName, @ImportedBy, @ImportedAt, @ProjectCode, @BuildVersion, @Status, @Description, SYSDATETIME());
        `);
}

/** Đếm tổng số dòng THỜI GIAN THỰC của bảng staging (table lấy từ registry/constant -> an toàn). */
async function getTableCount(pool, table) {
    try {
        const rs = await pool.request().query(`SELECT COUNT(*) AS Total FROM ${table};`);
        return rs.recordset[0] ? rs.recordset[0].Total : null;
    } catch {
        return null;
    }
}

/** Lấy tên hiển thị của người dùng từ JWT payload (userId/email). */
async function resolveUserName(pool, user) {
    if (!user) return null;
    if (user.userId) {
        try {
            const rs = await pool.request()
                .input('UserId', sql.Int, user.userId)
                .query('SELECT full_name FROM dbo.users WHERE user_id = @UserId;');
            const name = rs.recordset[0] && rs.recordset[0].full_name;
            if (name) return name;
        } catch { /* bỏ qua, fallback sang email */ }
    }
    return user.email || null;
}

/**
 * Tổng hợp khối `sheetHeader` cho frontend:
 * metadata đã lưu (nếu có) + số bản ghi thời gian thực + thông tin nguồn (label/table/cột).
 */
async function buildSheetHeader(pool, source) {
    const [meta, totalRecords] = await Promise.all([
        getSheetMeta(pool, source.key),
        getTableCount(pool, source.table),
    ]);
    const label = source.label || source.key;
    const importedAt = meta && meta.ImportedAt ? new Date(meta.ImportedAt) : null;
    return {
        sourceKey: source.key,
        label,
        tableName: source.table,
        sheetTitle: (meta && meta.SheetTitle) || null,
        fileName: (meta && meta.FileName) || null,
        importedBy: (meta && meta.ImportedBy) || null,
        importedAt: importedAt && !Number.isNaN(importedAt.getTime()) ? importedAt.toISOString() : null,
        totalRecords: totalRecords == null ? null : Number(totalRecords),
        columnCount: Array.isArray(source.columns) ? source.columns.length : null,
        projectCode: (meta && meta.ProjectCode) || label,
        buildVersion: (meta && meta.BuildVersion) || null,
        status: (meta && meta.Status) || 'ACTIVE',
        description: (meta && meta.Description) || null,
        isBuiltIn: !!source.isBuiltIn,
    };
}

/**
 * Trích tiêu đề sheet = ô đầu tiên CÓ NỘI DUNG trong DÒNG 1 của file Excel gốc
 * (thường là A1, ví dụ: "Bảng chi tiết tồn kho ATW").
 *
 * @param {Array} rowArray - dòng 1 dạng mảng (sheet_to_json header:1 hoặc row.values)
 * @param {number} maxScan - số ô tối đa được quét trên dòng 1
 * @returns {string|null}
 */
function extractSheetTitle(rowArray, maxScan = 8) {
    if (!Array.isArray(rowArray)) return null;
    for (let i = 0; i < Math.min(rowArray.length, maxScan); i++) {
        const v = rowArray[i];
        const s = v === null || v === undefined ? '' : String(v).trim();
        if (s) return s.slice(0, 255);
    }
    return null;
}

/**
 * Lưu tiêu đề sheet (và tên file nếu có) vào dbo.Staging_SheetMeta.
 * Dùng sau khi import Excel — các trường metadata khác được GIỮ NGUYÊN.
 *
 * @returns {Promise<string|null>} sheetTitle đã lưu
 */
async function saveSheetTitle(pool, sourceKey, sheetTitle, extra = {}) {
    if (!sheetTitle) return null;
    const existing = await getSheetMeta(pool, sourceKey);
    await upsertSheetMeta(pool, sourceKey, {
        sheetTitle,
        fileName: extra.fileName ?? existing?.FileName ?? null,
        importedBy: extra.importedBy ?? existing?.ImportedBy ?? null,
        importedAt: extra.importedAt ?? existing?.ImportedAt ?? null,
        projectCode: extra.projectCode ?? existing?.ProjectCode ?? null,
        buildVersion: extra.buildVersion ?? existing?.BuildVersion ?? null,
        status: extra.status ?? existing?.Status ?? 'ACTIVE',
        description: extra.description ?? existing?.Description ?? null,
    });
    return sheetTitle;
}

module.exports = {
    ensureSheetMetaSchema,
    getSheetMeta,
    upsertSheetMeta,
    getTableCount,
    resolveUserName,
    toDateOrNull,
    buildSheetHeader,
    extractSheetTitle,
    saveSheetTitle,
};
async function getSheetMeta(pool, sourceKey) {
    try {
        const rs = await pool.request()
            .input('SourceKey', sql.NVarChar(30), String(sourceKey || ''))
            .query(`SELECT SourceKey, SheetTitle, FileName, ImportedBy, ImportedAt,
                           ProjectCode, BuildVersion, Status, Description, UpdatedAt
                    FROM ${META_TABLE} WHERE SourceKey = @SourceKey;`);
        return rs.recordset[0] || null;
    } catch (e) {
        if (e && e.number === 208) return null; // Invalid object name -> bảng chưa tồn tại
        throw e;
    }
}