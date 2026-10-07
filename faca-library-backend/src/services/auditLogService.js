/**
 * auditLogService.js — Nhật ký thao tác dữ liệu (Audit Log).
 *
 * Bảng lưu trữ: dbo.data_audit_logs (tự tạo idempotent khi server khởi động).
 * Mỗi dòng ghi: ai làm, lúc nào, làm gì, dữ liệu TRƯỚC & SAU, IP.
 *
 * Nguyên tắc: ghi log KHÔNG BAO GIỜ làm hỏng thao tác nghiệp vụ —
 * mọi lỗi khi ghi đều bị nuốt + log cảnh báo (writeAuditLogSafe).
 */
const { sql } = require('../config/db');

const TABLE = 'dbo.data_audit_logs';
const VALID_ACTIONS = new Set(['INSERT', 'UPDATE', 'DELETE', 'BULK_UPDATE', 'BULK_SAVE', 'RESTORE']);
const MAX_JSON_LEN = 4000; // trần cắt an toàn cho log đơn (INSERT/DELETE/UPDATE 1 dòng)
const MAX_BULK_JSON_LEN = 200000; // trần cắt cho payload bulk granular (~100 change chi tiết)
const MAX_JSON_CHUNK = 65536; // trần tuyệt đối cho 1 payload audit (tránh phình DB)
const MAX_BULK_CHANGES = 100; // số change chi tiết tối đa lưu trong 1 log bulk
const MAX_VALUE_LEN = 500; // độ dài tối đa của 1 giá trị trong payload bulk

/**
 * Gộp số thao tác dòng (row-level ops) của 1 bản ghi audit vào bộ đếm tổng.
 * - Log đơn 1 dòng (INSERT/UPDATE/DELETE thông thường): mỗi bản ghi = 1 thao tác dòng.
 * - Log granular (payload có `summary` với inserted_count/...): cộng dồn theo
 *   summary — đúng cả khi bulk insert-only được gắn action_type = INSERT.
 * - Log bulk cũ (BULK_UPDATE / BULK_SAVE không có summary): bỏ qua ở đây để
 *   tránh đếm sai (không có số liệu đáng tin) — chỉ hiển thị ở byAction.
 * Hàm này KHÔNG throw — parse lỗi thì bỏ qua để không vỡ API thống kê.
 */
function accumulateRowOps(counters, actionType, changesJson) {
    let data = changesJson;
    if (typeof data === 'string') {
        try { data = JSON.parse(data); } catch { data = null; }
    }
    const summary = data && typeof data === 'object' && !Array.isArray(data)
        && data.summary && typeof data.summary === 'object'
        ? data.summary
        : null;
    // Payload granular mới: đếm theo summary, bất kể action_type là gì
    // (INSERT-only, UPDATE-only, DELETE-only hay BULK_SAVE hỗn hợp).
    if (summary) {
        const num = (v) => {
            const n = parseInt(v, 10);
            return Number.isFinite(n) && n > 0 ? n : 0;
        };
        counters.inserted += num(summary.inserted_count ?? summary.rowsInserted);
        counters.updated += num(summary.updated_count ?? summary.rowsUpdated);
        counters.deleted += num(summary.deleted_count ?? summary.rowsDeleted);
        return;
    }
    // Log bulk CŨ (không có `summary` nhưng có rowsInserted/... ở top-level —
    // số liệu này service cũ ghi từ kết quả DB thực tế nên cộng dồn được).
    if (data && typeof data === 'object' && !Array.isArray(data)) {
        const hasLegacy = ['rowsInserted', 'rowsUpdated', 'rowsDeleted']
            .some((k) => data[k] !== undefined && data[k] !== null);
        if (hasLegacy) {
            const num = (v) => {
                const n = parseInt(v, 10);
                return Number.isFinite(n) && n > 0 ? n : 0;
            };
            counters.inserted += num(data.rowsInserted);
            counters.updated += num(data.rowsUpdated);
            counters.deleted += num(data.rowsDeleted);
            return;
        }
    }
    const action = String(actionType || '').toUpperCase();
    if (action === 'INSERT') { counters.inserted += 1; return; }
    if (action === 'UPDATE') { counters.updated += 1; return; }
    if (action === 'DELETE') { counters.deleted += 1; return; }
    // Không nhận diện được loại: bỏ qua để tránh đếm sai.
}

/** Idempotent: tạo bảng + index nhật ký nếu chưa có. */
async function ensureAuditLogsSchema(pool) {
    await pool.request().query(`
        IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'data_audit_logs')
        BEGIN
            CREATE TABLE dbo.data_audit_logs (
                audit_id        BIGINT IDENTITY(1,1) PRIMARY KEY,
                table_name      VARCHAR(100)  NOT NULL,
                record_id       VARCHAR(100)  NOT NULL,
                action_type     VARCHAR(20)   NOT NULL,
                changed_by      INT           NULL,
                changed_by_name NVARCHAR(100) NULL,
                changed_at      DATETIME      NOT NULL CONSTRAINT DF_data_audit_logs_changed_at DEFAULT (GETDATE()),
                changes_json    NVARCHAR(MAX) NULL,
                ip_address      VARCHAR(45)   NULL,
                restored_at     DATETIME      NULL
            );
        END
        -- Cột đánh dấu bản ghi ĐÃ khôi phục (idempotent cho DB tạo trước đó)
        IF COL_LENGTH('dbo.data_audit_logs', 'restored_at') IS NULL
            ALTER TABLE dbo.data_audit_logs ADD restored_at DATETIME NULL;
        -- Cột đánh dấu TỪNG DÒNG của log bulk đã khôi phục (JSON "[0,2]", dùng cho "Khôi phục dòng này")
        IF COL_LENGTH('dbo.data_audit_logs', 'restored_indexes') IS NULL
            ALTER TABLE dbo.data_audit_logs ADD restored_indexes NVARCHAR(4000) NULL;
        IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_audit_logs_table_record'
                       AND object_id = OBJECT_ID('dbo.data_audit_logs'))
            CREATE INDEX IX_audit_logs_table_record ON dbo.data_audit_logs(table_name, record_id);
        IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_audit_logs_changed_at'
                       AND object_id = OBJECT_ID('dbo.data_audit_logs'))
            CREATE INDEX IX_audit_logs_changed_at ON dbo.data_audit_logs(changed_at DESC);
    `);
}

/**
 * Chuẩn hoá giá trị thành chuỗi JSON (object -> JSON.stringify, giới hạn độ dài).
 * Payload bulk granular ({ summary, changes[] }) được giữ gần như nguyên vẹn
 * (trần 200KB) để không chặt đứt mảng diff; log đơn vẫn cắt gọn ở 4KB.
 */
function toJsonValue(value) {
    if (value === null || value === undefined) return null;
    let raw;
    if (typeof value === 'string') raw = value;
    else {
        try { raw = JSON.stringify(value); } catch { raw = String(value); }
    }
    const limit = raw.startsWith('{"summary"') || raw.startsWith('{"action_type"')
        ? MAX_BULK_JSON_LEN
        : MAX_JSON_LEN;
    return raw.length > limit ? raw.slice(0, limit) : raw;
}

/**
 * So sánh 2 object -> mảng thay đổi [{ field, old, new }].
 * Bỏ qua các trường không đổi (so sánh dạng chuỗi, null/undefined -> '').
 */
function diffValues(oldObj = {}, newObj = {}) {
    const changes = [];
    const old = oldObj && typeof oldObj === 'object' ? oldObj : {};
    const next = newObj && typeof newObj === 'object' ? newObj : {};
    const fields = new Set([...Object.keys(old), ...Object.keys(next)]);
    for (const field of fields) {
        const o = old[field] === null || old[field] === undefined ? '' : String(old[field]);
        const n = next[field] === null || next[field] === undefined ? '' : String(next[field]);
        if (o !== n) changes.push({ field, old: o, new: n });
    }
    return changes;
}

/** Ghi nhiều dòng nhật ký trong 1 request (chia lô 500 dòng/lần). */
async function writeAuditLogs(pool, entries) {
    const list = (Array.isArray(entries) ? entries : [entries]).filter(Boolean);
    if (!list.length) return 0;

    await ensureAuditLogsSchema(pool);

    let written = 0;
    for (let i = 0; i < list.length; i += 500) {
        const chunk = list.slice(i, i + 500);
        const rows = chunk.map((e, idx) => {
            const action = VALID_ACTIONS.has(String(e.actionType).toUpperCase())
                ? String(e.actionType).toUpperCase()
                : 'UPDATE';
            const p = `a${i}_${idx}`;
            return `(@tn${p}, @ri${p}, @at${p}, @cb${p}, @cn${p}, @cj${p}, @ip${p})`;
        }).join(',');

        const req = pool.request();
        chunk.forEach((e, idx) => {
            const p = `a${i}_${idx}`;
            req.input(`tn${p}`, sql.VarChar(100), String(e.tableName || '').slice(0, 100));
            req.input(`ri${p}`, sql.VarChar(100), String(e.recordId === null || e.recordId === undefined ? '' : e.recordId).slice(0, 100));
            req.input(`at${p}`, sql.VarChar(20), String(e.actionType || 'UPDATE').toUpperCase().slice(0, 20));
            req.input(`cb${p}`, sql.Int, e.changedBy ? parseInt(e.changedBy, 10) : null);
            req.input(`cn${p}`, sql.NVarChar(100), e.changedByName ? String(e.changedByName).slice(0, 100) : null);
            req.input(`cj${p}`, sql.NVarChar(sql.MAX), toJsonValue(e.changes));
            req.input(`ip${p}`, sql.VarChar(45), e.ipAddress ? String(e.ipAddress).slice(0, 45) : null);
        });

        await req.query(`INSERT INTO ${TABLE} (table_name, record_id, action_type, changed_by, changed_by_name, changes_json, ip_address) VALUES ${rows};`);
        written += chunk.length;
    }
    return written;
}

/** Ghi 1 dòng nhật ký nhưng KHÔNG ném lỗi (không ảnh hưởng luồng nghiệp vụ). */
async function writeAuditLogSafe(pool, entry) {
    try {
        await writeAuditLogs(pool, [entry]);
        return true;
    } catch (err) {
        console.warn('[auditLog] Không ghi được nhật ký (bỏ qua):', err.message);
        return false;
    }
}
/** Lấy IP người gọi (hỗ trợ reverse proxy qua X-Forwarded-For). */
function getClientIp(req) {
    const xff = req && req.headers && req.headers['x-forwarded-for'];
    if (xff) return String(xff).split(',')[0].trim();
    return (req && (req.ip || (req.socket && req.socket.remoteAddress))) || null;
}

/** Gắn điều kiện lọc vào một request, trả về đoạn WHERE (đã có "WHERE"). */
/**
 * Chuyển giá trị filter ngày (`YYYY-MM-DD` từ <input type="date"> hoặc ISO)
 * thành mốc thời gian so sánh với `changed_at` (wall-clock của SQL Server).
 * Date-only → giữ đúng wall-clock ngày đó (driver serialize param theo UTC-fields
 * nên giá trị naive trùng múi giờ máy chủ, khớp cách GETDATE() lưu changed_at).
 * endOfDay=true → 23:59:59.999 cùng ngày để filter "Đến ngày" bao trọn cả ngày
 * (trước đây truyền midnight → loại hết bản ghi trong ngày được chọn).
 */
function parseAuditBound(value, endOfDay) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value).trim());
    if (m) {
        const y = Number(m[1]);
        const mo = Number(m[2]);
        const d = Number(m[3]);
        return endOfDay
            ? new Date(Date.UTC(y, mo - 1, d, 23, 59, 59, 999))
            : new Date(Date.UTC(y, mo - 1, d));
    }
    return new Date(value);
}

function applyFilters(req, q = {}) {
    const where = [];
    if (q.tableName) {
        where.push('table_name = @TableName');
        req.input('TableName', sql.VarChar(100), String(q.tableName).slice(0, 100));
    }
    if (q.recordId) {
        where.push('record_id = @RecordId');
        req.input('RecordId', sql.VarChar(100), String(q.recordId).slice(0, 100));
    }
    if (q.actionType) {
        where.push('action_type = @ActionType');
        req.input('ActionType', sql.VarChar(20), String(q.actionType).toUpperCase().slice(0, 20));
    }
    if (q.changedBy) {
        where.push('changed_by = @ChangedBy');
        req.input('ChangedBy', sql.Int, parseInt(q.changedBy, 10) || 0);
    }
    if (q.from) {
        const d = parseAuditBound(q.from, false);
        if (!Number.isNaN(d.getTime())) {
            where.push('changed_at >= @From');
            req.input('From', sql.DateTime, d);
        }
    }
    if (q.to) {
        const d = parseAuditBound(q.to, true); // cuối ngày để filter "Đến ngày" bao trọn
        if (!Number.isNaN(d.getTime())) {
            where.push('changed_at <= @To');
            req.input('To', sql.DateTime, d);
        }
    }
    return where.length ? `WHERE ${where.join(' AND ')}` : '';
}

/**
 * GET nhật ký có phân trang + lọc.
 * @returns {Promise<{logs: Array, pagination: Object}>}
 */
async function listAuditLogs(pool, q = {}) {
    await ensureAuditLogsSchema(pool);
    const page = Math.max(1, parseInt(q.page, 10) || 1);
    const limit = Math.min(200, Math.max(1, parseInt(q.limit, 10) || 50));

    const countReq = pool.request();
    const whereSql = applyFilters(countReq, q);
    const countRes = await countReq.query(`SELECT COUNT(*) AS Total FROM ${TABLE} ${whereSql};`);
    const total = countRes.recordset[0] ? countRes.recordset[0].Total : 0;

    const dataReq = pool.request();
    applyFilters(dataReq, q); // gắn lại cùng bộ tham số
    const offset = (page - 1) * limit;
    dataReq.input('Offset', sql.Int, offset).input('Limit', sql.Int, limit);

    // Đổi datetime wall-clock (GETDATE() = múi giờ SQL Server, ví dụ ICT +420')
    // sang ISO-8601 UTC Z TRƯỚC khi serialize: driver mssql parse naive datetime
    // bằng cách giữ nguyên wall-clock dưới dạng UTC-fields → JSON ...Z sai +7h
    // (FE hiển thị lệch ngày). FE định dạng bằng Intl.DateTimeFormat với
    // Asia/Ho_Chi_Minh nên luôn hiển thị đúng giờ ICT.
    const res = await dataReq.query(`
        SELECT audit_id, table_name, record_id, action_type, changed_by,
               changed_by_name,
               CONVERT(varchar(33), DATEADD(minute, -tz.utc_off, changed_at), 126) + 'Z' AS changed_at,
               changes_json, ip_address,
               CONVERT(varchar(33), DATEADD(minute, -tz.utc_off, restored_at), 126) + 'Z' AS restored_at,
               restored_indexes
        FROM ${TABLE}
        CROSS JOIN (SELECT DATEDIFF(minute, SYSUTCDATETIME(), GETDATE()) AS utc_off) tz
        ${whereSql}
        ORDER BY changed_at DESC, audit_id DESC
        OFFSET @Offset ROWS FETCH NEXT @Limit ROWS ONLY;
    `);

    const totalPages = Math.max(1, Math.ceil(total / limit));
    return {
        logs: res.recordset,
        pagination: { page, limit, total, totalPages: total < offset ? 1 : totalPages },
    };
}

/** Lịch sử riêng của 1 bản ghi (table + recordId), mới nhất trước. */
async function getRecordHistory(pool, tableName, recordId, limit = 50) {
    return listAuditLogs(pool, { tableName, recordId, page: 1, limit: Math.min(200, Math.max(1, parseInt(limit, 10) || 50)) });
}

/** Danh sách bảng có phát sinh nhật ký (để dựng bộ lọc). */
async function listAuditTables(pool) {
    await ensureAuditLogsSchema(pool);
    const res = await pool.request()
        .query(`SELECT DISTINCT table_name FROM ${TABLE} ORDER BY table_name;`);
    return res.recordset.map((r) => r.table_name);
}

/** Tổng hợp nhanh theo hành động (dùng cho thẻ thống kê ở trang lịch sử).
 * Ngoài `byAction` (đếm theo bản ghi log, giữ tương thích cũ), trả thêm
 * `rowOps` = số thao tác DÒNG thực tế:
 *   - log đơn INSERT/UPDATE/DELETE: mỗi bản ghi = 1 dòng;
 *   - log bulk (BULK_UPDATE/BULK_SAVE): cộng dồn summary.inserted/updated/deleted_count.
 * Nhờ đó thẻ "Thêm mới / Cập nhật / Xóa" phản ánh đúng cả thao tác bulk sync.
 */
async function getAuditSummary(pool, q = {}) {
    await ensureAuditLogsSchema(pool);
    const req = pool.request();
    const whereSql = applyFilters(req, q);
    const res = await req.query(`
        SELECT action_type, COUNT(*) AS Cnt
        FROM ${TABLE} ${whereSql}
        GROUP BY action_type;
    `);
    const byAction = {};
    let total = 0;
    for (const r of res.recordset) {
        byAction[r.action_type] = r.Cnt;
        total += r.Cnt;
    }

    // Đếm thao tác dòng: quét changes_json của log bulk trong cùng phạm vi lọc.
    const rowOps = { inserted: 0, updated: 0, deleted: 0 };
    try {
        const bulkReq = pool.request();
        const bulkWhere = applyFilters(bulkReq, q);
        const bulkRes = await bulkReq.query(`
            SELECT action_type, changes_json
            FROM ${TABLE}
            ${bulkWhere ? `${bulkWhere} AND` : 'WHERE'} action_type IN ('INSERT', 'UPDATE', 'DELETE', 'BULK_UPDATE', 'BULK_SAVE');
        `);
        for (const r of bulkRes.recordset || []) {
            accumulateRowOps(rowOps, r.action_type, r.changes_json);
        }
    } catch (scanErr) {
        // Không để lỗi quét JSON làm vỡ API — giữ rowOps = 0 và log cảnh báo.
        console.warn('[auditLogService] Bỏ qua đếm rowOps (lỗi quét bulk summary):', scanErr.message);
    }
    return { total, byAction, rowOps };
}

module.exports = {
    AUDIT_TABLE: TABLE,
    ensureAuditLogsSchema,
    toJsonValue,
    diffValues,
    writeAuditLogs,
    writeAuditLogSafe,
    listAuditLogs,
    getRecordHistory,
    listAuditTables,
    getAuditSummary,
    getClientIp,
};