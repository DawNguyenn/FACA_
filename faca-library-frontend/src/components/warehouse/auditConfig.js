/**
 * auditConfig.js — Cấu hình & helper dùng chung cho phần Nhật ký chỉnh sửa.
 * (Tách file .js để component & hook cùng dùng mà không vi phạm rule react-refresh)
 */

/** Nhãn + màu badge cho từng hành động. */
export const ACTION_META = {
    INSERT: { label: 'Thêm mới', cls: 'bg-emerald-100 text-emerald-700 ring-emerald-200' },
    UPDATE: { label: 'Cập nhật', cls: 'bg-sky-100 text-sky-700 ring-sky-200' },
    DELETE: { label: 'Xóa', cls: 'bg-red-100 text-red-700 ring-red-200' },
    BULK_UPDATE: { label: 'Lưu hàng loạt', cls: 'bg-violet-100 text-violet-700 ring-violet-200' },
    RESTORE: { label: 'Khôi phục', cls: 'bg-teal-100 text-teal-700 ring-teal-200' },
};
export const DEFAULT_ACTION_META = { label: 'Khác', cls: 'bg-slate-100 text-slate-600 ring-slate-200' };

export const getActionMeta = (actionType) => ACTION_META[actionType] || DEFAULT_ACTION_META;

/** Danh sách hành động dùng cho bộ lọc. */
export const ACTION_OPTIONS = Object.keys(ACTION_META).map((k) => ({ value: k, label: ACTION_META[k].label }));

/** Múi giờ cố định cho mọi timestamp audit (backend lưu UTC, hiển thị ICT). */
const AUDIT_TZ = 'Asia/Ho_Chi_Minh';
const auditDateFmt = new Intl.DateTimeFormat('vi-VN', {
    timeZone: AUDIT_TZ,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
});

/**
 * Định dạng thời gian audit `DD/MM/YYYY HH:mm:ss` theo múi giờ CỐ ĐỊNH
 * Asia/Ho_Chi_Minh (ICT, không phụ thuộc múi giờ trình duyệt):
 * - Backend trả ISO-8601 UTC (`...Z`) → hiển thị đúng giờ ICT.
 * - String thiếu offset (log legacy, wall-clock ICT) → gắn +07:00 trước khi parse
 *   để không bị môi trường UTC dịch ngược 7h.
 */
export function formatAuditDate(value) {
    if (!value) return '—';
    let raw = value;
    if (raw instanceof Date) raw = raw.toISOString();
    if (typeof raw === 'string'
        && /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/.test(raw)) {
        raw = `${raw.replace(' ', 'T')}+07:00`;
    }
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return String(value);
    const parts = auditDateFmt.formatToParts(d);
    const g = (t) => (parts.find((p) => p.type === t) || {}).value || '';
    return `${g('day')}/${g('month')}/${g('year')} ${g('hour')}:${g('minute')}:${g('second')}`;
}

/**
 * Chuẩn hoá `changes_json` về mảng [{ field, old, new }].
 * - Mảng  : do diffValues() sinh (UPDATE)
 * - Object: do ghi nguyên giá trị dòng (INSERT / DELETE) hoặc tóm tắt (BULK_UPDATE)
 */
export function parseChanges(changesJson) {
    if (!changesJson) return [];
    let data = changesJson;
    if (typeof data === 'string') {
        try {
            data = JSON.parse(data);
        } catch {
            return [{ field: 'nội dung', old: changesJson, new: '' }];
        }
    }
    if (Array.isArray(data)) {
        return data.map((c) => ({
            field: c && c.field != null ? String(c.field) : '',
            old: c && c.old != null ? String(c.old) : '',
            new: c && c.new != null ? String(c.new) : '',
        }));
    }
    if (data && typeof data === 'object') {
        return Object.entries(data).map(([field, value]) => ({
            field,
            old: '',
            new: value !== null && typeof value === 'object' ? JSON.stringify(value) : String(value ?? ''),
        }));
    }
    return [];
}

/** Rút gọn giá trị để hiển thị ô (tránh tràn bảng). */
export const truncateValue = (v, max = 60) => {
    const s = v === null || v === undefined ? '' : String(v);
    return s.length > max ? `${s.slice(0, max)}…` : s;
};

/** Ép 1 giá trị diff về string hiển thị. */
const toDisplay = (v) => (v === null || v === undefined ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v));

/** Mảng diff [{field, old, new}] → [{field, old, new}] với giá trị đã ép string. */
const normalizeDiff = (arr) => arr
    .filter((c) => c && c.field != null)
    .map((c) => ({ field: String(c.field), old: toDisplay(c.old), new: toDisplay(c.new) }));

/** Object snapshot dòng → [{field, value}]. */
export const toEntries = (obj) => Object.entries(obj).map(([field, value]) => ({ field, value: toDisplay(value) }));

/**
 * Parse `changes_json` thành cấu trúc hiển thị trực quan theo loại log:
 *  - { kind: 'diff', entries }    — UPDATE đơn: bảng Trước / Sau.
 *  - { kind: 'row', entries }     — INSERT / DELETE: bảng key-value (snapshot dòng).
 *  - { kind: 'bulk', summary, changes, truncated } — payload bulk granular.
 *  - { kind: 'restore', mode, sourceId, entries|row } — log RESTORE mới.
 *  - { kind: 'raw', text }        — JSON hỏng / không parse được (fallback).
 *  - { kind: 'empty' }            — không có dữ liệu.
 */
export function parseChangeDetail(changesJson) {
    if (!changesJson) return { kind: 'empty' };
    let data = changesJson;
    if (typeof data === 'string') {
        try {
            data = JSON.parse(data);
        } catch {
            return { kind: 'raw', text: changesJson };
        }
    }
    if (Array.isArray(data)) return { kind: 'diff', entries: normalizeDiff(data) };
    if (data && typeof data === 'object') {
        // Log RESTORE: { restored_audit_id, mode, diff | row }
        if (data.restored_audit_id != null && (data.mode === 'DELETE' || data.mode === 'UPDATE')) {
            if (data.mode === 'DELETE' && data.row && typeof data.row === 'object') {
                return { kind: 'restore', mode: 'DELETE', sourceId: data.restored_audit_id, row: toEntries(data.row) };
            }
            if (data.mode === 'UPDATE' && Array.isArray(data.diff)) {
                return { kind: 'restore', mode: 'UPDATE', sourceId: data.restored_audit_id, entries: normalizeDiff(data.diff) };
            }
            // Log RESTORE từ bulk: { restored_audit_id, mode, summary, changes }
            if (Array.isArray(data.changes)) {
                return {
                    kind: 'restore',
                    mode: data.mode === 'UPDATE' ? 'UPDATE' : 'DELETE',
                    sourceId: data.restored_audit_id,
                    bulk: { summary: data.summary || {}, changes: data.changes, truncated: !!data.truncated },
                };
            }
        }
        // Payload bulk granular: { summary: {...}, changes: [...] }
        if (data.summary && Array.isArray(data.changes)) {
            return { kind: 'bulk', summary: data.summary, changes: data.changes, truncated: !!data.truncated };
        }
        // Snapshot dòng (INSERT / DELETE đơn)
        return { kind: 'row', entries: toEntries(data) };
    }
    return { kind: 'raw', text: String(data) };
}

/**
 * Log có thể khôi phục (rollback) được không?
 * - Chỉ DELETE / UPDATE: log đơn theo StagingID (record_id số) hoặc
 *   log bulk granular ({ summary, changes, truncated }) — không truncated,
 *   không phải mode replace, đủ số dòng chi tiết khớp summary.
 * - Payload phải parse ra diff/row/bulk hợp lệ (không phải JSON hỏng).
 * - Chưa từng được khôi phục (restored_at rỗng).
 */
export function isRestorableLog(log) {
    if (!log || log.restored_at) return false;
    if (log.action_type !== 'DELETE' && log.action_type !== 'UPDATE') return false;
    const detail = parseChangeDetail(log.changes_json);
    if (detail.kind === 'bulk') {
        if (detail.truncated || !detail.changes.length) return false;
        const s = detail.summary || {};
        if (String(s.mode || '') === 'replace') return false;
        if (log.action_type === 'DELETE') {
            // Đủ snapshot từng dòng (deleted_count phải khớp số change giữ trong log)
            const deleted = Number(s.deleted_count ?? s.rowsDeleted ?? detail.changes.length);
            return deleted === detail.changes.length
                && detail.changes.every((c) => c && c.type === 'DELETE' && c.data && Object.keys(c.data).length > 0);
        }
        // UPDATE: mỗi change có diff field + row_identifier chứa StagingID ("Row #123")
        return detail.changes.every((c) => c && c.type === 'UPDATE'
            && Array.isArray(c.fields) && c.fields.length > 0
            && /#\d+/.test(String(c.row_identifier || '')));
    }
    if (!/^\d+$/.test(String(log.record_id || ''))) return false;
    if (log.action_type === 'DELETE') return detail.kind === 'row' && detail.entries.length > 0;
    return detail.kind === 'diff' && detail.entries.length > 0;
}

/**
 * Parse cột `restored_indexes` của log bulk (JSON "[0,2]" hoặc mảng) →
 * danh sách index dòng ĐÃ được khôi phục (hiện chip "Đã khôi phục" theo dòng).
 */
export function parseRestoredIndexes(value) {
    let d = value;
    if (typeof d === 'string') {
        try { d = JSON.parse(d); } catch { return []; }
    }
    return Array.isArray(d) ? d.filter((n) => Number.isInteger(n) && n >= 0) : [];
}