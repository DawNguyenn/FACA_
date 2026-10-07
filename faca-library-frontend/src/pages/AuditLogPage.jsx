import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { History, RefreshCw, Filter, X, Plus, Pencil, Trash2, Save, RotateCcw } from 'lucide-react';
import useAuditLogs from '../hooks/useAuditLogs';
import AuditLogTable from '../components/warehouse/AuditLogTable';
import RestoreConfirmModal from '../components/warehouse/RestoreConfirmModal';
import WarehousePagination from '../components/warehouse/WarehousePagination';
import { ACTION_OPTIONS, ACTION_META, getActionMeta } from '../components/warehouse/auditConfig';
import { isAdmin } from '../services/authUtils';

const PAGE_LIMIT = 20;
const labelCls = 'block text-xs font-medium text-slate-600';
const inputCls =
    'mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500';

/**
 * AuditLogPage — trang Nhật ký & Lịch sử chỉnh sửa dữ liệu kho.
 * Cho phép lọc theo bảng / hành động / khoảng thời gian / mã bản ghi,
 * xem giá trị TRƯỚC & SAU của từng thay đổi.
 */
export default function AuditLogPage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const [page, setPage] = useState(1);
    // Bộ lọc đang ÁP DỤNG (được đồng bộ lên URL để chia sẻ được)
    const [filters, setFilters] = useState({
        tableName: searchParams.get('tableName') || '',
        actionType: searchParams.get('actionType') || '',
        recordId: searchParams.get('recordId') || '',
        from: searchParams.get('from') || '',
        to: searchParams.get('to') || '',
    });
    // Ô nhập mã bản ghi (chỉ áp dụng khi bấm Enter / nút Áp dụng)
    const [recordInput, setRecordInput] = useState(filters.recordId);
    // Modal khôi phục dữ liệu từ nhật ký (chỉ Admin)
    const [restoreTarget, setRestoreTarget] = useState(null);
    const canRestore = isAdmin();

    const params = {
        page,
        limit: PAGE_LIMIT,
        tableName: filters.tableName,
        actionType: filters.actionType,
        recordId: filters.recordId,
        from: filters.from,
        to: filters.to,
    };

    const { logs, pagination, summary, tables, isLoading, isFetching, isError, error, refetch } = useAuditLogs(params);

    /** Cập nhật bộ lọc + đồng bộ URL + về trang 1. */
    const applyFilters = (patch) => {
        const next = { ...filters, ...patch };
        setFilters(next);
        setPage(1);
        const qs = {};
        Object.entries(next).forEach(([k, v]) => { if (v) qs[k] = v; });
        setSearchParams(qs, { replace: true });
    };

    const resetFilters = () => {
        setFilters({ tableName: '', actionType: '', recordId: '', from: '', to: '' });
        setRecordInput('');
        setPage(1);
        setSearchParams({}, { replace: true });
    };

    const summaryCards = [
        { label: 'Tổng thao tác', value: summary?.total ?? 0, cls: 'bg-slate-100 text-slate-700', Icon: History },
        ...Object.keys(ACTION_META).map((action) => ({
            label: getActionMeta(action).label,
            value: summary?.byAction?.[action] ?? 0,
            cls: getActionMeta(action).cls,
            Icon: action === 'INSERT' ? Plus : action === 'UPDATE' ? Pencil
                : action === 'DELETE' ? Trash2 : action === 'RESTORE' ? RotateCcw : Save,
        })),
    ];

    return (
        <div className="mx-auto max-w-7xl px-4 py-8">
            {/* ===== Tiêu đề ===== */}
            <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                        <History size={22} />
                    </span>
                    <div>
                        <h1 className="text-xl font-bold text-slate-800">Nhật ký & Lịch sử chỉnh sửa</h1>
                        <p className="mt-0.5 text-sm text-slate-500">
                            Ghi nhận ai đã sửa gì, lúc nào, và giá trị trước / sau của dữ liệu kho.
                        </p>
                    </div>
                </div>
                <button type="button" onClick={() => refetch()} disabled={isFetching}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 disabled:opacity-50">
                    <RefreshCw size={15} className={isFetching ? 'animate-spin' : ''} />
                    Làm mới
                </button>
            </div>

            {/* ===== Thẻ thống kê theo hành động ===== */}
            <div className="mb-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
                {summaryCards.map(({ label, value, cls, Icon }) => (
                    <div key={label} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div>
                            <p className="text-xs font-medium text-slate-500">{label}</p>
                            <p className="mt-1 text-2xl font-extrabold text-slate-900">{value}</p>
                        </div>
                        <span className={`flex h-10 w-10 items-center justify-center rounded-lg ${cls}`}>
                            <Icon size={18} />
                        </span>
                    </div>
                ))}
            </div>

            {/* ===== Bộ lọc ===== */}
            <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <Filter size={15} /> Bộ lọc
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
                    <div>
                        <label className={labelCls} htmlFor="audit-table">Bảng dữ liệu</label>
                        <select id="audit-table" value={filters.tableName}
                            onChange={(e) => applyFilters({ tableName: e.target.value })} className={inputCls}>
                            <option value="">Tất cả bảng</option>
                            {tables.map((t) => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className={labelCls} htmlFor="audit-action">Hành động</label>
                        <select id="audit-action" value={filters.actionType}
                            onChange={(e) => applyFilters({ actionType: e.target.value })} className={inputCls}>
                            <option value="">Tất cả</option>
                            {ACTION_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className={labelCls} htmlFor="audit-from">Từ ngày</label>
                        <input id="audit-from" type="date" value={filters.from}
                            onChange={(e) => applyFilters({ from: e.target.value })} className={inputCls} />
                    </div>
                    <div>
                        <label className={labelCls} htmlFor="audit-to">Đến ngày</label>
                        <input id="audit-to" type="date" value={filters.to}
                            onChange={(e) => applyFilters({ to: e.target.value })} className={inputCls} />
                    </div>
                    <div>
                        <label className={labelCls} htmlFor="audit-record">Mã bản ghi</label>
                        <div className="flex gap-2">
                            <input id="audit-record" type="text" value={recordInput}
                                onChange={(e) => setRecordInput(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') applyFilters({ recordId: recordInput.trim() }); }}
                                placeholder="VD: 123" className={inputCls} />
                            <button type="button" onClick={() => applyFilters({ recordId: recordInput.trim() })}
                                className="mt-1 shrink-0 rounded-lg bg-slate-700 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-800">
                                Lọc
                            </button>
                        </div>
                    </div>
                </div>
                {(filters.tableName || filters.actionType || filters.recordId || filters.from || filters.to) && (
                    <button type="button" onClick={resetFilters}
                        className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 transition hover:text-slate-700">
                        <X size={14} /> Xóa tất cả bộ lọc
                    </button>
                )}
            </div>

            {isError ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-10 text-center text-sm text-red-600">
                    {error?.response?.data?.message || error?.message || 'Không tải được nhật ký.'}
                </div>
            ) : (
                <>
                    <AuditLogTable
                        logs={logs}
                        loading={isLoading}
                        canRestore={canRestore}
                        onRestore={(log, changeIndex) => setRestoreTarget({ log, changeIndex })}
                    />
                    <WarehousePagination
                        page={pagination.page}
                        totalPages={pagination.totalPages}
                        totalRows={pagination.total}
                        pageLimit={pagination.limit}
                        loading={isFetching}
                        onPageChange={setPage}
                    />
                </>
            )}

            {/* Modal xác nhận khôi phục dữ liệu từ nhật ký */}
            {restoreTarget && (
                <RestoreConfirmModal
                    log={restoreTarget.log}
                    changeIndex={restoreTarget.changeIndex ?? null}
                    onClose={() => setRestoreTarget(null)}
                    onRestored={() => {
                        setRestoreTarget(null);
                        refetch();
                    }}
                />
            )}
        </div>
    );
}