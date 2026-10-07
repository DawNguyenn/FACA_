import { Link } from 'react-router-dom';
import { Compass, Home, ArrowLeft } from 'lucide-react';

/**
 * NotFoundPage — trang 404 cho các đường dẫn không tồn tại.
 * Được khai báo ở route `*` trong src/App.jsx (bọc trong MainLayout).
 */
export default function NotFoundPage() {
    return (
        <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-16 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-red-50 text-red-500">
                <Compass className="h-10 w-10" />
            </div>
            <p className="mt-6 text-6xl font-extrabold tracking-tight text-slate-900">404</p>
            <h1 className="mt-2 text-xl font-bold text-slate-800">Không tìm thấy trang</h1>
            <p className="mt-2 max-w-md text-sm text-slate-500">
                Đường dẫn bạn truy cập không tồn tại hoặc đã bị di chuyển.
                Hãy kiểm tra lại địa chỉ hoặc quay về trang chủ.
            </p>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <Link
                    to="/"
                    className="inline-flex items-center gap-2 rounded-lg bg-[#c00000] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#a00000]"
                >
                    <Home className="h-4 w-4" />
                    Về trang chủ
                </Link>
                <button
                    type="button"
                    onClick={() => window.history.back()}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Quay lại
                </button>
            </div>
        </div>
    );
}
