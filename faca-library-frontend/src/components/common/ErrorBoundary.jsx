import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

/**
 * ErrorBoundary — bắt lỗi render trong toàn bộ cây component con để tránh
 * "White Screen of Death". Hiển thị UI fallback thân thiện kèm 2 lựa chọn:
 * tải lại trang hoặc quay về trang chủ.
 *
 * Bọc ứng dụng tại src/App.jsx.
 */
export default class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, info) {
        // Ghi log để dev dễ chẩn đoán (console + khe cắm monitoring sau này)
        console.error('[ErrorBoundary] Đã bắt lỗi render:', error, info);
    }

    handleReload = () => {
        window.location.reload();
    };

    handleHome = () => {
        window.location.assign('/');
    };

    render() {
        if (!this.state.hasError) return this.props.children;

        return (
            <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 py-16 text-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-amber-100 text-amber-600">
                    <AlertTriangle className="h-10 w-10" />
                </div>
                <h1 className="mt-6 text-2xl font-extrabold tracking-tight text-slate-900">
                    Đã xảy ra lỗi không mong muốn
                </h1>
                <p className="mt-2 max-w-md text-sm text-slate-500">
                    Ứng dụng gặp sự cố khi hiển thị. Bạn hãy thử tải lại trang, hoặc quay về trang chủ.
                    Nếu lỗi vẫn tiếp diễn, vui lòng liên hệ bộ phận IT.
                </p>

                {this.state.error?.message && (
                    <code className="mt-4 max-w-lg overflow-x-auto rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-600">
                        {String(this.state.error.message)}
                    </code>
                )}

                <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                    <button
                        type="button"
                        onClick={this.handleReload}
                        className="inline-flex items-center gap-2 rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-900"
                    >
                        <RefreshCw className="h-4 w-4" />
                        Tải lại trang
                    </button>
                    <button
                        type="button"
                        onClick={this.handleHome}
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                    >
                        <Home className="h-4 w-4" />
                        Về trang chủ
                    </button>
                </div>
            </div>
        );
    }
}
