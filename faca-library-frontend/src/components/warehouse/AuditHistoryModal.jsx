import { useQuery } from '@tanstack/react-query';
import { History, X } from 'lucide-react';
import ModalShell from '../admin/ModalShell';
import Skeleton from '../common/Skeleton';
import { fetchRecordHistory } from '../../services/auditLogService';
import { formatAuditDate, getActionMeta, parseChanges, truncateValue } from './auditConfig';

/**
 * AuditHistoryModal — lịch sử chỉnh sửa của MỘT bản ghi cụ thể.
 *
 * @param {{tableName: string, recordId: string|number, onClose: Function}} props
 */
export default function AuditHistoryModal({ tableName, recordId, onClose }) {
    const { data, isLoading, isError } = useQuery({
        queryKey: ['auditRecord', tableName, String(recordId)],
        queryFn: () => fetchRecordHistory(tableName, String(recordId)),
        enabled: Boolean(tableName) && recordId != null && recordId !== '',
        staleTime: 30_000,
    });

    const logs = data?.logs || [];

    return (
        <ModalShell onClose={onClose}>
            <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                    <History size={20} />
                </span>
                <div className="min-w-0 flex-1">
                    <h2 className="text-lg font-bold text-slate-900">Lịch sử chỉnh sửa</h2>
                    <p className="mt-0.5 truncate font-mono text-xs text-slate-500">
                        {tableName} · ID: {recordId}
                    </p>
                </div>
                <button type="button" onClick={onClose} aria-label="Đóng"
                    className="rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600">
                    <X size={18} />
                </button>
            </div>

            <div className="mt-4 max-h-[60vh] overflow-y-auto pr-1">
                {isLoading ? (
                    <div className="space-y-3">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <Skeleton key={`hist-skeleton-${i}`} height={56} />
                        ))}
                    </div>
                ) : isError ? (
                    <p className="py-6 text-center text-sm text-red-600">Không tải được lịch sử chỉnh sửa.</p>
                ) : !logs.length ? (
                    <p className="py-6 text-center text-sm text-slate-400">
                        Bản ghi này chưa có thao tác chỉnh sửa nào được ghi nhận.
                    </p>
                ) : (
                    <ol className="space-y-3">
                        {logs.map((log) => {
                            const meta = getActionMeta(log.action_type);
                            const changes = parseChanges(log.changes_json);
                            return (
                                <li key={log.audit_id} className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${meta.cls}`}>
                                            {meta.label}
                                        </span>
                                        <span className="text-xs font-medium text-slate-700">
                                            {log.changed_by_name || log.changed_by || '—'}
                                        </span>
                                        <span className="text-xs text-slate-400">{formatAuditDate(log.changed_at)}</span>
                                    </div>
                                    {changes.length > 0 && (
                                        <ul className="mt-2 space-y-1">
                                            {changes.slice(0, 10).map((c, i) => (
                                                <li key={`${log.audit_id}-${i}`} className="flex flex-wrap items-center gap-1.5 text-xs">
                                                    <span className="font-mono font-semibold text-slate-700">{c.field}</span>
                                                    <span className="max-w-[180px] truncate rounded bg-red-50 px-1.5 py-0.5 font-mono text-red-700 line-through">
                                                        {truncateValue(c.old, 40) || '(trống)'}
                                                    </span>
                                                    <span className="text-slate-400">→</span>
                                                    <span className="max-w-[180px] truncate rounded bg-emerald-50 px-1.5 py-0.5 font-mono text-emerald-700">
                                                        {truncateValue(c.new, 40) || '(trống)'}
                                                    </span>
                                                </li>
                                            ))}
                                            {changes.length > 10 && (
                                                <li className="text-[11px] text-slate-400">+{changes.length - 10} thay đổi khác…</li>
                                            )}
                                        </ul>
                                    )}
                                </li>
                            );
                        })}
                    </ol>
                )}
            </div>
        </ModalShell>
    );
}