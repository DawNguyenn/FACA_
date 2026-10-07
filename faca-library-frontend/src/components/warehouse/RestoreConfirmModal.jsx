import { useState } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import ModalShell from '../admin/ModalShell';
import { useToast } from '../common/ToastProvider';
import { restoreAuditLog } from '../../services/auditLogService';
import { ChangeDetail } from './AuditLogTable';
import { formatAuditDate, getActionMeta, isRestorableLog, parseChangeDetail, parseRestoredIndexes } from './auditConfig';

/**
 * RestoreConfirmModal — modal xác nhận KHÔI PHỤC dữ liệu từ 1 bản ghi nhật ký.
 * Hiển thị preview thay đổi (bảng Before/After hoặc snapshot dòng) trước khi gọi API.
 *
 * @param {{log: Object, onClose: Function, onRestored: Function}} props
 *   onRestored(message) — gọi sau khi khôi phục thành công (để refetch danh sách).
 */
export default function RestoreConfirmModal({ log, changeIndex = null, onClose, onRestored }) {
    const toast = useToast();
    const [busy, setBusy] = useState(false);
    const meta = getActionMeta(log.action_type);
    const isDelete = log.action_type === 'DELETE';
    const detail = parseChangeDetail(log.changes_json);
    const isBulk = detail.kind === 'bulk';
    // Khôi phục 1 dòng của log bulk (nút "Khôi phục dòng này" trên card Row #)
    const isScoped = changeIndex !== null && changeIndex !== undefined;
    const scopedChange = isScoped && isBulk ? detail.changes[changeIndex] : null;
    const bulkRowCount = isScoped ? (scopedChange ? 1 : 0) : (isBulk ? detail.changes.length : 0);
    // Preview chỉ hiển thị DÒNG được chọn khi khôi phục theo dòng
    const previewLog = isScoped && scopedChange
        ? { ...log, changes_json: { summary: detail.summary, changes: [scopedChange], truncated: false } }
        : log;

    const handleConfirm = async () => {
        if (!isRestorableLog(log)) {
            toast.error('Bản ghi này không hỗ trợ khôi phục.');
            return;
        }
        if (isScoped) {
            if (!isBulk || !scopedChange) {
                toast.error(`Không tìm thấy dòng #${changeIndex} trong nhật ký.`);
                return;
            }
            if (parseRestoredIndexes(log.restored_indexes).includes(changeIndex)) {
                toast.error('Dòng này đã được khôi phục trước đó.');
                return;
            }
        }
        setBusy(true);
        try {
            const data = await restoreAuditLog(log.audit_id, isScoped && scopedChange ? { changeIndex } : {});
            toast.success(data?.message || 'Đã khôi phục dữ liệu thành công.');
            if (onRestored) onRestored(data?.message);
        } catch (err) {
            toast.error(err?.response?.data?.message || err?.message || 'Không khôi phục được dữ liệu.');
        } finally {
            setBusy(false);
        }
    };

    return (
        <ModalShell onClose={() => { if (!busy) onClose(); }}>
            <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-100 text-teal-700">
                    <RotateCcw size={20} />
                </span>
                <div className="min-w-0 flex-1">
                    <h2 className="text-lg font-bold text-slate-900">Xác nhận khôi phục dữ liệu</h2>
                    <p className="mt-0.5 truncate font-mono text-xs text-slate-500">
                        {log.table_name} · {isScoped ? `Khôi phục dòng #${changeIndex}` : `ID: ${log.record_id}`} · {formatAuditDate(log.changed_at)}
                    </p>
                </div>
            </div>

            {/* Cảnh báo trước khi khôi phục */}
            <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                <AlertTriangle size={15} className="mt-0.5 shrink-0" />
                <p>
                    {isScoped
                        ? (isDelete
                            ? `Dòng dữ liệu được chọn (${scopedChange?.row_identifier || `#${changeIndex}`}) sẽ được chèn lại vào bảng với giá trị tại thời điểm xóa. Lưu ý: nhật ký không giữ StagingID cũ nên dòng sẽ được cấp StagingID mới, và các trường rỗng/trống sẽ trở về NULL.`
                            : `Các trường của dòng được chọn (${scopedChange?.row_identifier || `#${changeIndex}`}) sẽ được đưa về giá trị TRƯỚC thao tác này. Dữ liệu hiện tại của các trường đó sẽ bị ghi đè.`)
                        : (isDelete
                            ? (isBulk
                                ? `Các dòng trong danh sách (${bulkRowCount} dòng) sẽ được chèn lại vào bảng với giá trị tại thời điểm xóa. Lưu ý: nhật ký không giữ StagingID cũ nên dòng sẽ được cấp StagingID mới, và các trường rỗng/trống sẽ trở về NULL.`
                                : 'Dòng dữ liệu sẽ được chèn lại vào bảng với giá trị tại thời điểm xóa. Nếu dòng đã tồn tại, thao tác sẽ bị từ chối.')
                            : (isBulk
                                ? `Các trường trong danh sách (${bulkRowCount} dòng) sẽ được đưa về giá trị TRƯỚC thao tác này. Dữ liệu hiện tại của các trường đó sẽ bị ghi đè.`
                                : 'Các trường bên dưới sẽ được đưa về giá trị TRƯỚC thao tác này. Dữ liệu hiện tại của các trường đó sẽ bị ghi đè.'))}
                    {' '}Hành động này chỉ dành cho Admin và được ghi vào nhật ký.
                </p>
            </div>

            {/* Preview dữ liệu sẽ khôi phục */}
            <div className="mt-4">
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Dữ liệu {isDelete ? 'sẽ được chèn lại' : 'sẽ được khôi phục'}
                </p>
                <div className="max-h-64 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50/70 p-2">
                    <span className={`mb-2 inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${meta.cls}`}>
                        {meta.label}
                    </span>
                    <ChangeDetail log={previewLog} />
                </div>
            </div>

            <div className="mt-5 flex items-center justify-end gap-3 border-t border-slate-200 pt-4">
                <button
                    type="button"
                    onClick={onClose}
                    disabled={busy}
                    className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    Hủy
                </button>
                <button
                    type="button"
                    onClick={handleConfirm}
                    disabled={busy}
                    className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {busy ? (
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    ) : (
                        <RotateCcw className="h-4 w-4" />
                    )}
                    {busy ? 'Đang khôi phục…' : 'Khôi phục'}
                </button>
            </div>
        </ModalShell>
    );
}
