import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { CheckCircle2, XCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

export function useToast() {
    const ctx = useContext(ToastContext);
    if (!ctx) throw new Error('useToast phải được dùng bên trong <ToastProvider>.');
    return ctx;
}

const TOAST_STYLES = {
    success: {
        icon: <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />,
        bar: 'bg-emerald-500',
        border: 'border-emerald-200',
    },
    error: {
        icon: <XCircle className="h-5 w-5 shrink-0 text-red-500" />,
        bar: 'bg-red-500',
        border: 'border-red-200',
    },
    info: {
        icon: <Info className="h-5 w-5 shrink-0 text-sky-500" />,
        bar: 'bg-sky-500',
        border: 'border-sky-200',
    },
};

let toastIdCounter = 0;

export default function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);
    const timersRef = useRef(new Map());

    const dismiss = useCallback((id) => {
        setToasts((list) => list.filter((t) => t.id !== id));
        const timer = timersRef.current.get(id);
        if (timer) {
            clearTimeout(timer);
            timersRef.current.delete(id);
        }
    }, []);

    const push = useCallback((type, message, options = {}) => {
        const id = ++toastIdCounter;
        const duration = options.duration ?? 4000;
        setToasts((list) => [...list, { id, type, message }]);
        if (duration > 0) {
            const timer = setTimeout(() => dismiss(id), duration);
            timersRef.current.set(id, timer);
        }
        return id;
    }, [dismiss]);

    const api = {
        success: (msg, opts) => push('success', msg, opts),
        error: (msg, opts) => push('error', msg, opts),
        info: (msg, opts) => push('info', msg, opts),
        dismiss,
    };

    return (
        <ToastContext.Provider value={api}>
            {children}
            {/* Vùng hiển thị Toast — góc phải trên, xếp chồng, luôn nổi trên mọi nội dung */}
            <div className="pointer-events-none fixed right-4 top-20 z-[100] flex w-96 max-w-[calc(100vw-2rem)] flex-col gap-2">
                {toasts.map((t) => {
                    const style = TOAST_STYLES[t.type] || TOAST_STYLES.info;
                    return (
                        <div
                            key={t.id}
                            role="status"
                            className="toast-slide-in pointer-events-auto relative flex items-start gap-2.5 overflow-hidden rounded-xl border bg-white pl-4 pr-2 py-3 shadow-lg"
                        >
                            <span className={`absolute left-0 top-0 h-full w-1 ${style.bar}`} />
                            {style.icon}
                            <p className="flex-1 text-sm leading-5 text-slate-700 break-words">{t.message}</p>
                            <button
                                onClick={() => dismiss(t.id)}
                                className="rounded p-0.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                                title="Đóng"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    );
                })}
            </div>
        </ToastContext.Provider>
    );
}
