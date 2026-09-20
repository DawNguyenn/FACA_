import { AlertTriangle, Plus } from 'lucide-react';

/**
 * AdminErrorBanner — banner đỏ khi không tải được danh sách user.
 */
export default function AdminErrorBanner({ message, onRetry }) {
    return (
        <div className="mt-6 flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
                <div>
                    <p className="text-sm font-semibold text-red-700">Không thể tải danh sách người dùng</p>
                    <p className="mt-0.5 text-sm text-red-600">{message}</p>
                </div>
            </div>
            <button
                onClick={onRetry}
                className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
            >
                <Plus className="h-4 w-4 rotate-45" /> Thử lại
            </button>
        </div>
    );
}
