/**
 * ModalShell — overlay + panel trắng căn giữa cho mọi modal khu vực Admin.
 */
export default function ModalShell({ children }) {
    return (
        <div className="fixed inset-0 z- [9999] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl sm:max-w-md"
                role="dialog" aria-modal="true">
                {children}
            </div>
        </div>
    );
}
