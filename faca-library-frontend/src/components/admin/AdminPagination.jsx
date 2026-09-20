import { ChevronLeft, ChevronRight } from 'lucide-react';
import { PAGE_SIZE } from './adminConfig';

/**
 * AdminPagination — footer "Showing X–Y of Z users" + nút Previous/Next.
 */
export default function AdminPagination({ filteredCount, activePage, totalPages, onPageChange }) {
    return (
        <div className="flex flex-col items-center justify-between gap-2 border-t border-slate-200 px-4 py-3 sm:flex-row">
            <p className="text-sm text-slate-500">
                Showing <span className="font-semibold text-slate-700">
                    {filteredCount === 0 ? 0 : (activePage - 1) * PAGE_SIZE + 1}–{Math.min(activePage * PAGE_SIZE, filteredCount)}
                </span> of <span className="font-semibold text-slate-700">{filteredCount}</span> users
            </p>
            <div className="flex items-center gap-2">
                <button
                    onClick={() => onPageChange((p) => Math.max(1, p - 1))}
                    disabled={activePage <= 1}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    <ChevronLeft className="h-4 w-4" /> Previous
                </button>
                <span className="text-sm text-slate-600">Page {activePage} / {totalPages}</span>
                <button
                    onClick={() => onPageChange((p) => Math.min(totalPages, p + 1))}
                    disabled={activePage >= totalPages}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    Next <ChevronRight className="h-4 w-4" />
                </button>
            </div>
        </div>
    );
}
