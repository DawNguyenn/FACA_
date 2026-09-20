import { FileSpreadsheet, Loader2, Lock, Trash2 } from 'lucide-react';
import { FALLBACK_SOURCES } from './warehouseConfig';

/**
 * DeleteSheetModal — trang quản lý / xoá sheet (tách riêng để tránh xoá nhầm).
 * Sheet hệ thống (🔒) không thể xoá; muốn xoá phải gõ đúng tên hiển thị để xác nhận.
 *
 * @param {{
 *   open: boolean, sources: Array, deleteTarget: Object|null, confirmName: string,
 *   onSelectTarget: (source: Object) => void, onConfirmNameChange: (v: string) => void,
 *   onResetTarget: () => void, onClose: () => void, onSubmit: () => void, deleting: boolean
 * }} props
 */
export default function DeleteSheetModal({
    open,
    sources = [],
    deleteTarget,
    confirmName,
    onSelectTarget,
    onConfirmNameChange,
    onResetTarget,
    onClose,
    onSubmit,
    deleting,
}) {
    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={() => !deleting && onClose()}>
            <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
                <div className="mb-4 flex items-center gap-2">
                    <Trash2 className="h-5 w-5 text-red-500" />
                    <h3 className="text-base font-bold text-slate-800">Quản lý / Xóa Sheet</h3>
                </div>
                <p className="mb-3 text-xs text-slate-500">
                    Chọn sheet cần xóa. Sheet hệ thống (🔒) không thể xóa; chỉ sheet do bạn tự tạo mới xóa được.
                </p>
                <div className="max-h-72 space-y-1.5 overflow-y-auto rounded-lg border border-slate-200 p-2">
                    {sources.map((s) => {
                        const locked = !!s.isBuiltIn || FALLBACK_SOURCES.some((f) => f.key === s.key);
                        return (
                            <div key={s.key} className="flex items-center gap-2 rounded-lg border border-slate-100 px-3 py-2">
                                <FileSpreadsheet className="h-4 w-4 shrink-0 text-emerald-600/60" />
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-medium text-slate-700">{s.label}</p>
                                    <p className="truncate text-[11px] text-slate-400">{s.key} · {s.table}</p>
                                </div>
                                {locked ? (
                                    <span className="flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-400" title="Sheet hệ thống không thể xóa">
                                        <Lock className="h-3 w-3" /> Hệ thống
                                    </span>
                                ) : (
                                    <button
                                        onClick={() => onSelectTarget(s)}
                                        disabled={deleting}
                                        className="flex items-center gap-1 rounded-lg border border-red-200 px-2 py-1 text-[11px] font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                                    >
                                        <Trash2 className="h-3 w-3" /> Xóa
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>

                {deleteTarget && (
                    <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4">
                        <p className="text-xs font-semibold text-red-700">
                            Bạn sắp xóa "{deleteTarget.label}" — sẽ DROP bảng SQL{' '}
                            <code className="rounded bg-white px-1 py-0.5">{deleteTarget.table}</code> và mất toàn bộ dữ liệu.
                            Hành động này không thể hoàn tác.
                        </p>
                        <label className="mt-3 mb-1 block text-xs font-semibold text-slate-600">
                            Nhập chính xác tên <span className="font-bold text-red-700">{deleteTarget.label}</span> để xác nhận:
                        </label>
                        <input
                            type="text"
                            value={confirmName}
                            onChange={(e) => onConfirmNameChange(e.target.value)}
                            placeholder={deleteTarget.label}
                            className="w-full rounded-lg border border-red-300 bg-white px-3 py-2 text-sm outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
                        />
                        <div className="mt-3 flex justify-end gap-2">
                            <button onClick={onResetTarget} disabled={deleting}
                                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-white disabled:opacity-50">
                                Hủy
                            </button>
                            <button onClick={onSubmit} disabled={deleting || confirmName.trim() !== String(deleteTarget.label).trim()}
                                className="flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50">
                                {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                Xoá vĩnh viễn
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
