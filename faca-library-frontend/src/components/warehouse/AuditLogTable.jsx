import { Fragment, useState } from 'react';
import { Check, ChevronDown, ChevronRight, History, Maximize2, RotateCcw, User } from 'lucide-react';
import Skeleton from '../common/Skeleton';
import ModalShell from '../admin/ModalShell';
import {
    formatAuditDate, getActionMeta, isRestorableLog, parseChangeDetail,
    parseRestoredIndexes, toEntries, truncateValue,
} from './auditConfig';

/** Bảng Trước / Sau (2 cột màu) cho log UPDATE. */
function DiffTable({ entries }) {
    return (
        <table className="w-full overflow-hidden rounded-lg border border-slate-200 text-xs">
            <thead className="bg-slate-100 text-[11px] uppercase tracking-wide text-slate-500">
                <tr>
                    <th className="w-1/4 px-3 py-2 text-left font-semibold">Trường</th>
                    <th className="w-[38%] px-3 py-2 text-left font-semibold text-red-600">Trước</th>
                    <th className="px-3 py-2 text-left font-semibold text-emerald-600">Sau</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
                {entries.map((e, i) => (
                    <tr key={`${e.field}-${i}`}>
                        <td className="px-3 py-1.5 font-mono font-semibold text-slate-700">{e.field}</td>
                        <td className="px-3 py-1.5">
                            <span className="block truncate rounded bg-red-50 px-1.5 py-0.5 font-mono text-red-700" title={e.old}>
                                {truncateValue(e.old, 80) || '(trống)'}
                            </span>
                        </td>
                        <td className="px-3 py-1.5">
                            <span className="block truncate rounded bg-emerald-50 px-1.5 py-0.5 font-mono text-emerald-700" title={e.new}>
                                {truncateValue(e.new, 80) || '(trống)'}
                            </span>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}

/** Số cột tối đa hiển thị trực tiếp trước khi buộc mở Modal "Xem đầy đủ". */
const FULL_VIEW_MIN_COLUMNS = 10;

/**
 * Bảng key-value 2 cột: Tên trường (đậm) | Giá trị — hiển thị TRỌN vẹn
 * (break-all / pre-wrap, không truncate) để dữ liệu dòng bị xóa không bị cắt xén.
 */
function KeyValueTable({ entries }) {
    return (
        <table className="w-full overflow-hidden rounded-lg border border-slate-200 text-xs">
            <thead className="bg-slate-100 text-[11px] uppercase tracking-wide text-slate-500">
                <tr>
                    <th className="w-[38%] px-3 py-2 text-left font-semibold">Trường</th>
                    <th className="px-3 py-2 text-left font-semibold">Giá trị</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
                {entries.map((e, i) => (
                    <tr key={`${e.field}-${i}`}>
                        <td className="bg-slate-50 px-3 py-1.5 align-top font-mono font-bold break-words text-slate-700">{e.field}</td>
                        <td className="px-3 py-1.5 align-top font-mono text-slate-800">
                            {e.value ? (
                                <span className="whitespace-pre-wrap break-all">{e.value}</span>
                            ) : (
                                <span className="italic text-slate-400">(trống)</span>
                            )}
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}

/**
 * DataView — khung xem key-value: bảng bên trong vùng cuộn (max-h),
 * quá FULL_VIEW_MIN_COLUMNS cột thì có nút "Xem đầy đủ (N cột)" mở Modal
 * chứa toàn bộ dữ liệu (dùng cho snapshot dòng trong BulkDetail / log đơn).
 */
function DataView({ entries, columnLabel = 'cột' }) {
    const [showFull, setShowFull] = useState(false);
    const total = entries.length;
    return (
        <div>
            <div className="max-h-44 overflow-y-auto rounded-lg border border-slate-200">
                <KeyValueTable entries={entries} />
            </div>
            {total > FULL_VIEW_MIN_COLUMNS && (
                <div className="mt-1 flex justify-end">
                    <button
                        type="button"
                        onClick={() => setShowFull(true)}
                        className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-50"
                    >
                        <Maximize2 size={11} /> Xem đầy đủ ({total} {columnLabel})
                    </button>
                </div>
            )}
            {showFull && (
                <ModalShell onClose={() => setShowFull(false)}>
                    <p className="text-sm font-bold text-slate-900">
                        Xem đầy đủ — {total} {columnLabel}
                    </p>
                    <div className="mt-3 max-h-[60vh] overflow-y-auto rounded-xl border border-slate-200">
                        <KeyValueTable entries={entries} />
                    </div>
                    <div className="mt-4 flex justify-end">
                        <button
                            type="button"
                            onClick={() => setShowFull(false)}
                            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
                        >
                            Đóng
                        </button>
                    </div>
                </ModalShell>
            )}
        </div>
    );
}

/** Badge loại thay đổi trong payload bulk. */
const BULK_TYPE_META = {
    INSERT: { label: 'Thêm', cls: 'bg-emerald-100 text-emerald-700 ring-emerald-200' },
    UPDATE: { label: 'Sửa', cls: 'bg-sky-100 text-sky-700 ring-sky-200' },
    DELETE: { label: 'Xóa', cls: 'bg-red-100 text-red-700 ring-red-200' },
};

/** Chi tiết payload bulk: chip thống kê + danh sách từng dòng thay đổi. */
function BulkDetail({ detail, restoredIdx = [], onRestoreRow = null }) {
    const { summary, changes, truncated } = detail;
    const chips = [
        { label: 'Thêm mới', value: summary.inserted_count ?? summary.rowsInserted, cls: 'bg-emerald-50 text-emerald-700' },
        { label: 'Cập nhật', value: summary.updated_count ?? summary.rowsUpdated, cls: 'bg-sky-50 text-sky-700' },
        { label: 'Xóa', value: summary.deleted_count ?? summary.rowsDeleted, cls: 'bg-red-50 text-red-700' },
    ].filter((c) => Number(c.value) > 0);

    return (
        <div className="space-y-2">
            {chips.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                    {chips.map((c) => (
                        <span key={c.label} className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${c.cls}`}>
                            {c.label}: {c.value} dòng
                        </span>
                    ))}
                    {summary.mode && (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
                            chế độ: {summary.mode}
                        </span>
                    )}
                </div>
            )}
            <ul className="space-y-1.5">
                {changes.slice(0, 6).map((ch, i) => {
                    const meta = BULK_TYPE_META[ch.type] || { label: ch.type, cls: 'bg-slate-100 text-slate-600 ring-slate-200' };
                    return (
                        <li key={`${ch.row_identifier}-${i}`} className="rounded-lg border border-slate-200 bg-white p-2">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${meta.cls}`}>
                                        {meta.label}
                                    </span>
                                    <span className="font-mono text-[11px] text-slate-500">{ch.row_identifier}</span>
                                    {restoredIdx.includes(i) && (
                                        <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2 py-0.5 text-[10px] font-semibold text-teal-700 ring-1 ring-inset ring-teal-200">
                                            <Check size={10} /> Đã khôi phục
                                        </span>
                                    )}
                                </div>
                                {onRestoreRow && !restoredIdx.includes(i) && (
                                    <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); onRestoreRow(i); }}
                                        className="inline-flex items-center gap-1 rounded-md border border-teal-300 bg-white px-2 py-1 text-[11px] font-semibold text-teal-700 transition hover:bg-teal-50"
                                    >
                                        <RotateCcw size={11} /> Khôi phục dòng này
                                    </button>
                                )}
                            </div>
                            {Array.isArray(ch.fields) && ch.fields.length > 0 && (
                                <ul className="mt-1 max-h-36 space-y-0.5 overflow-y-auto pr-1">
                                    {ch.fields.map((f, j) => (
                                        <li key={`${f.field}-${j}`} className="flex flex-wrap items-center gap-1.5 text-[11px]">
                                            <span className="font-mono font-semibold text-slate-700">{f.field}</span>
                                            <span className="max-w-[160px] truncate rounded bg-red-50 px-1 font-mono text-red-700 line-through">
                                                {truncateValue(f.old_value, 40) || '(trống)'}
                                            </span>
                                            <span className="text-slate-400">→</span>
                                            <span className="max-w-[160px] truncate rounded bg-emerald-50 px-1 font-mono text-emerald-700">
                                                {truncateValue(f.new_value, 40) || '(trống)'}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                            {ch.data && typeof ch.data === 'object' && (
                                <div className="mt-1.5">
                                    <DataView entries={toEntries(ch.data)} />
                                </div>
                            )}
                        </li>
                    );
                })}
            </ul>
            {(truncated || changes.length > 6) && (
                <p className="text-[11px] text-slate-400">
                    +{Math.max(0, changes.length - 6)} thay đổi khác{truncated ? ' (log đã bị cắt bớt)' : ''}…
                </p>
            )}
        </div>
    );
}

/**
 * ChangeDetail — render chi tiết thay đổi theo kind từ parseChangeDetail():
 * diff → bảng Trước/Sau · row → key-value · bulk → chip + list ·
 * restore → badge "từ log #id" + bảng · raw → pre · empty → "—".
 */
export function ChangeDetail({ log, maxEntries = 40, onRestoreRow = null }) {
    const detail = parseChangeDetail(log.changes_json);
    switch (detail.kind) {
        case 'empty':
            return <span className="text-xs text-slate-400">—</span>;
        case 'raw':
            return (
                <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-all rounded-lg bg-slate-100 p-2 font-mono text-[11px] text-slate-600">
                    {detail.text}
                </pre>
            );
        case 'diff':
            return detail.entries.length ? (
                <DiffTable entries={detail.entries.slice(0, maxEntries)} />
            ) : <span className="text-xs text-slate-400">—</span>;
        case 'row':
            return <DataView entries={detail.entries.slice(0, maxEntries)} />;
        case 'bulk':
            return (
                <BulkDetail
                    detail={detail}
                    restoredIdx={parseRestoredIndexes(log.restored_indexes)}
                    onRestoreRow={onRestoreRow}
                />
            );
        case 'restore':
            if (detail.bulk) {
                return (
                    <div className="space-y-1.5">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-50 px-2 py-0.5 text-[11px] font-semibold text-teal-700 ring-1 ring-inset ring-teal-200">
                            <RotateCcw size={11} /> Khôi phục từ #{detail.sourceId}
                        </span>
                        <BulkDetail detail={detail.bulk} />
                    </div>
                );
            }
            return (
                <div className="space-y-1.5">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-50 px-2 py-0.5 text-[11px] font-semibold text-teal-700 ring-1 ring-inset ring-teal-200">
                        <RotateCcw size={11} /> Khôi phục từ #{detail.sourceId}
                    </span>
                    {detail.mode === 'DELETE'
                        ? <DataView entries={(detail.row || []).slice(0, maxEntries)} />
                        : <DiffTable entries={(detail.entries || []).slice(0, maxEntries)} />}
                </div>
            );
        default:
            return <span className="text-xs text-slate-400">—</span>;
    }
}

/**
 * AuditLogTable — bảng nhật ký chỉnh sửa dữ liệu.
 * Mỗi dòng có thể mở rộng để xem chi tiết Before/After (bảng key-value).
 *
 * @param {{logs: Array, loading?: boolean, canRestore?: boolean,
 *          onRestore?: Function}} props
 */
export default function AuditLogTable({ logs = [], loading = false, canRestore = false, onRestore = null }) {
    const [expandedId, setExpandedId] = useState(null);

    if (loading) {
        return (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="space-y-3 p-4">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <div key={`audit-skeleton-${i}`} className="flex items-center gap-3">
                            <Skeleton height={12} width={120} />
                            <Skeleton height={20} width={90} />
                            <Skeleton height={12} width={140} />
                            <Skeleton height={12} width={110} />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (!logs.length) {
        return (
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-14 text-center shadow-sm">
                <History className="mx-auto h-10 w-10 text-slate-300" />
                <p className="mt-2 text-sm font-medium text-slate-500">Chưa có nhật ký chỉnh sửa nào.</p>
                <p className="mt-1 text-xs text-slate-400">Thử đổi bộ lọc hoặc quay lại sau khi có thao tác nhập liệu.</p>
            </div>
        );
    }

    return (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                        <tr>
                            <th className="w-10 px-3 py-3" />
                            <th className="px-4 py-3 font-semibold">Thời gian</th>
                            <th className="px-4 py-3 font-semibold">Hành động</th>
                            <th className="px-4 py-3 font-semibold">Bảng / Bản ghi</th>
                            <th className="px-4 py-3 font-semibold">Người thực hiện</th>
                            <th className="px-4 py-3 font-semibold">IP</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {logs.map((log) => {
                            const meta = getActionMeta(log.action_type);
                            const open = expandedId === log.audit_id;
                            const restorable = canRestore && isRestorableLog(log);
                            const restoredIdx = parseRestoredIndexes(log.restored_indexes);
                            return (
                                <Fragment key={log.audit_id}>
                                    <tr
                                        onClick={() => setExpandedId(open ? null : log.audit_id)}
                                        className="cursor-pointer transition hover:bg-slate-50"
                                    >
                                        <td className="px-3 py-3 text-slate-400">
                                            {open ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                                        </td>
                                        <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                                            {formatAuditDate(log.changed_at)}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${meta.cls}`}>
                                                {meta.label}
                                            </span>
                                            {log.restored_at && (
                                                <span className="ml-1.5 inline-flex items-center gap-1 rounded-full bg-teal-50 px-2 py-0.5 text-[11px] font-semibold text-teal-700 ring-1 ring-inset ring-teal-200">
                                                    <RotateCcw size={10} /> Đã khôi phục
                                                </span>
                                            )}
                                            {!log.restored_at && restoredIdx.length > 0 && (
                                                <span className="ml-1.5 inline-flex items-center gap-1 rounded-full bg-teal-50/70 px-2 py-0.5 text-[10px] font-semibold text-teal-600 ring-1 ring-inset ring-teal-200">
                                                    <RotateCcw size={10} /> Đã khôi phục {restoredIdx.length} dòng
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="font-mono text-[13px] font-semibold text-slate-700">
                                                {log.table_name}
                                            </div>
                                            <div className="text-xs text-slate-400">
                                                {log.record_id === '*' ? 'toàn bộ sheet' : `ID: ${log.record_id}`}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="inline-flex items-center gap-1.5 text-slate-700">
                                                <User size={13} className="text-slate-400" />
                                                {log.changed_by_name || log.changed_by || '—'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 font-mono text-xs text-slate-500">{log.ip_address || '—'}</td>
                                    </tr>
                                    {open && (
                                        <tr className="bg-slate-50/70">
                                            <td colSpan={6} className="px-4 py-3">
                                                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                                                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                                        Chi tiết thay đổi
                                                    </p>
                                                    {restorable && onRestore && (
                                                        <button
                                                            type="button"
                                                            onClick={(e) => { e.stopPropagation(); onRestore(log); }}
                                                            className="inline-flex items-center gap-1.5 rounded-lg border border-teal-300 bg-white px-3 py-1.5 text-xs font-semibold text-teal-700 transition hover:bg-teal-50"
                                                        >
                                                            <RotateCcw size={13} />
                                                            {restoredIdx.length > 0 ? 'Khôi phục phần còn lại' : 'Khôi phục'}
                                                        </button>
                                                    )}
                                                </div>
                                                <ChangeDetail
                                                    log={log}
                                                    onRestoreRow={restorable && onRestore ? (idx) => onRestore(log, idx) : null}
                                                />
                                            </td>
                                        </tr>
                                    )}
                                </Fragment>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}