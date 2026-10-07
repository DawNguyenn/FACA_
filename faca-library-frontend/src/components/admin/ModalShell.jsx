import { useEffect, useRef } from 'react';

// Chuỗi selector các phần tử có thể nhận focus
const FOCUSABLE_SELECTOR =
    'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * ModalShell — overlay + panel trắng căn giữa cho mọi modal khu vực Admin.
 *
 * A11y & Polish:
 *  - ESC đóng modal (gọi onClose nếu có).
 *  - Click ra vùng nền (backdrop) đóng modal.
 *  - Tự động focus phần tử đầu tiên khi mở, trả focus về nơi cũ khi đóng.
 *  - Khoá scroll body khi modal đang mở.
 *  - role="dialog", aria-modal="true".
 */
export default function ModalShell({ children, onClose }) {
    const panelRef = useRef(null);
    const previousActiveRef = useRef(null);

    // ESC để đóng
    useEffect(() => {
        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                event.stopPropagation();
                if (typeof onClose === 'function') onClose();
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    // Focus phần tử đầu tiên khi mở + khoá scroll body + trả focus khi đóng
    useEffect(() => {
        previousActiveRef.current = document.activeElement;
        const panel = panelRef.current;
        if (panel) {
            const first = panel.querySelector(FOCUSABLE_SELECTOR);
            (first || panel).focus();
        }
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = prevOverflow;
            const prev = previousActiveRef.current;
            if (prev && typeof prev.focus === 'function') prev.focus();
        };
    }, []);

    return (
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
            onMouseDown={(event) => {
                // Chỉ đóng khi click trực tiếp lên backdrop (không phải panel)
                if (event.target === event.currentTarget && typeof onClose === 'function') {
                    onClose();
                }
            }}
        >
            <div
                ref={panelRef}
                tabIndex={-1}
                role="dialog"
                aria-modal="true"
                className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl outline-none sm:max-w-md"
            >
                {children}
            </div>
        </div>
    );
}
