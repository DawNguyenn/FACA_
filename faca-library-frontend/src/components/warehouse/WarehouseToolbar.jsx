import { AlertTriangle, Check, FileSpreadsheet, Lock, Plus, Search, Trash2 } from 'lucide-react';
import SourcePicker from './SourcePicker';

/**
 * WarehouseToolbar — thẻ tiêu đề "Kho Dữ Liệu": tên sheet/bảng, ô tìm kiếm,
 * tổng số bản ghi, chọn sheet, nút Xoá/Tạo sheet (Admin & Warehouse) và thông báo thao tác.
 *
 * @param {{
 *   activeSource: {label: string, table: string},
 *   loading: boolean, canEdit: boolean,
 *   search: string, onSearchChange: (v: string) => void, totalRows: number,
 *   sources: Array, source: string, onSelectSource: (key: string) => void,
 *   onOpenDeleteSheet: () => void, onOpenAddSheet: () => void,
 *   actionMsg: {ok: boolean, msg: string} | null
 * }} props
 */
export default function WarehouseToolbar({
    activeSource,
    loading,
    canEdit,
    search,
    onSearchChange,
    totalRows,
    sources,
    source,
    onSelectSource,
    onOpenDeleteSheet,
    onOpenAddSheet,
    actionMsg,
}) {
    return (
        <div className="mb-6 rounded-2xl border border-emerald-200 bg-white p-6 shadow-sm">
            <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
                    <FileSpreadsheet className="h-6 w-6" />
                </span>
                <div>
                    <h2 className="text-xl font-bold text-slate-800">Kho Dữ Liệu</h2>
                    <p className="mt-0.5 text-sm text-slate-500">
                        Dữ liệu kho đọc trực tiếp từ SQL Server (bảng{' '}
                        <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">{activeSource.table}</code>)
                    </p>
                </div>
            </div>

            {/* Tìm kiếm + tổng số bản ghi */}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <div className="relative">
                    <Search className="pointer-events-none absolute left-2.5 top-2 h-4 w-4 text-slate-400" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => onSearchChange(e.target.value)}
                        placeholder="Tìm kiếm ..."
                        className="w-72 rounded-lg border border-slate-300 bg-white py-1.5 pl-8 pr-3 text-sm text-slate-700 shadow-sm transition placeholder:text-slate-400 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                    />
                </div>
                <span className="mr-auto rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                    {totalRows} bản ghi
                </span>
                {/* Hành động: chọn sheet (đưa lên thanh công cụ) + xoá sheet + tạo sheet mới (Admin & Warehouse) */}
                <div className="flex flex-wrap items-center gap-2">
                    {/* Dropdown chọn sheet — gom lên thanh công cụ cho gọn gàng, mọi người dùng dùng */}
                    <SourcePicker
                        sources={sources}
                        source={source}
                        onSelect={onSelectSource}
                        disabled={loading}
                    />

                    {canEdit ? (
                        <>
                            <button
                                onClick={onOpenDeleteSheet}
                                disabled={loading}
                                className="flex items-center gap-1.5 rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-600 shadow-sm transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                                title="Mở trang quản lý / xoá sheet (tránh xoá nhầm)"
                            >
                                <Trash2 className="h-3.5 w-3.5" /> Xoá sheet
                            </button>
                            <button
                                onClick={onOpenAddSheet}
                                disabled={loading}
                                className="flex items-center gap-1.5 rounded-lg bg-[#217346] px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-[#1a5c38] disabled:cursor-not-allowed disabled:opacity-50"
                                title="Tạo sheet mới (tự tạo bảng SQL, không cần sửa code)"
                            >
                                <Plus className="h-3.5 w-3.5" /> Sheet mới
                            </button>
                        </>
                    ) : (
                        <span className="flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
                            <Lock className="h-3.5 w-3.5" /> Chế độ xem (chỉ đọc)
                        </span>
                    )}
                </div>
            </div>

            {/* Thông báo trạng thái thao tác */}
            {actionMsg && (
                <div className={`mt-3 flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${actionMsg.ok ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-red-300 bg-red-50 text-red-700'}`}>
                    {actionMsg.ok ? <Check className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                    {actionMsg.msg}
                </div>
            )}
        </div>
    );
}
