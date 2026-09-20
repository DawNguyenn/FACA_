/**
 * AdminNotice — toast góc dưới-phải báo thành công / lỗi.
 * notice: { type: 'success' | 'error', text: string }
 */
export default function AdminNotice({ notice }) {
    if (!notice) return null;
    return (
        <div
            role="status" aria-live="polite"
            className={`fixed bottom-6 right-6 z-60 flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium shadow-lg ${notice.type === 'success'
                ? 'border-emerald-200 bg-white text-emerald-700'
                : 'border-red-200 bg-white text-red-700'
                }`}
        >
            <span className={`h-2 w-2 rounded-full ${notice.type === 'success' ? 'bg-emerald-500' : 'bg-red-500'}`} />
            {notice.text}
        </div>
    );
}
