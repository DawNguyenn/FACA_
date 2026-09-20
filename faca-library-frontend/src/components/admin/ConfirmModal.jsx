import { AlertTriangle } from 'lucide-react';
import ModalShell from './ModalShell';

/**
 * ConfirmModal — modal xác nhận dùng chung (xoá user / đổi trạng thái).
 */
export default function ConfirmModal({ title, tone, icon, message, confirmLabel, busy = false, onCancel, onConfirm }) {
    const toneCls = {
        danger: 'bg-red-100 text-red-600',
        warning: 'bg-amber-100 text-amber-600',
        success: 'bg-emerald-100 text-emerald-600',
    }[tone];

    const buttonCls = {
        danger: 'bg-red-600 hover:bg-red-700 text-white',
        warning: 'bg-amber-500 hover:bg-amber-600 text-white',
        success: 'bg-emerald-600 hover:bg-emerald-700 text-white',
    }[tone];

    return (
        <ModalShell>
            <div className="flex flex-col items-center text-center">
                <span className={`flex h-12 w-12 items-center justify-center rounded-full ${toneCls}`}>{icon}</span>
                <h2 className="mt-4 text-lg font-bold text-slate-900">{title}</h2>
                <p className="mt-1 text-sm text-slate-500">{message}</p>
            </div>
            <div className="mt-5 flex items-center justify-end gap-3 border-t border-slate-200 pt-4">
                <button onClick={onCancel} disabled={busy}
                    className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50">
                    Cancel
                </button>
                <button onClick={onConfirm} disabled={busy}
                    className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${buttonCls}`}>
                    {busy ? (
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    ) : (
                        <AlertTriangle className="h-4 w-4" />
                    )}
                    {confirmLabel}
                </button>
            </div>
        </ModalShell>
    );
}
