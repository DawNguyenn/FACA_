import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

/**
 * WarehousePagination — thanh phân trang phía dưới bảng dữ liệu.
 *
 * @param {{
 *   page: number, totalPages: number, totalRows: number,
 *   pageLimit: number, loading: boolean, onPageChange: (p: number) => void
 * }} props
 */
export default function WarehousePagination({ page, totalPages, totalRows, pageLimit, loading, onPageChange }) {
    return (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-5 py-3 shadow-sm">
            <span className="text-sm text-slate-500">
                Trang <span className="font-semibold text-slate-700">{page}</span> / {totalPages}
                <span className="mx-1.5 text-slate-300">•</span>
                Tổng số: <span className="font-semibold text-slate-700">{totalRows}</span> bản ghi
                <span className="mx-1.5 text-slate-300">•</span>
                {pageLimit} dòng/trang
            </span>
            <div className="flex items-center gap-1.5">
                <button
                    onClick={() => onPageChange(1)}
                    disabled={page <= 1 || loading}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                    title="Trang đầu"
                >
                    <ChevronsLeft className="h-4 w-4" />
                </button>
                <button
                    onClick={() => onPageChange(Math.max(1, page - 1))}
                    disabled={page <= 1 || loading}
                    className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                >
                    <ChevronLeft className="h-4 w-4" />
                    Trang trước
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const start = Math.max(1, Math.min(page - 2, totalPages - 4));
                    return start + i;
                }).filter((p) => p >= 1 && p <= totalPages).map((p) => (
                    <button
                        key={p}
                        onClick={() => onPageChange(p)}
                        disabled={loading}
                        className={`h-8 w-8 rounded-lg text-sm font-medium transition ${
                            p === page
                                ? 'bg-[#17375E] text-white shadow'
                                : 'border border-slate-300 text-slate-600 hover:bg-slate-100'
                        } disabled:cursor-not-allowed disabled:opacity-40`}
                    >
                        {p}
                    </button>
                ))}
                <button
                    onClick={() => onPageChange(Math.min(totalPages, page + 1))}
                    disabled={page >= totalPages || loading}
                    className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                >
                    Trang sau
                    <ChevronRight className="h-4 w-4" />
                </button>
                <button
                    onClick={() => onPageChange(totalPages)}
                    disabled={page >= totalPages || loading}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                    title="Trang cuối"
                >
                    <ChevronsRight className="h-4 w-4" />
                </button>
            </div>
        </div>
    );
}
