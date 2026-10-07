import {
    FileSpreadsheet, User, Clock, Database, Tag, Pencil,
    ChevronDown, ChevronUp, Info, AlertTriangle,
} from 'lucide-react';
import Skeleton from '../common/Skeleton';

/** Nhãn + màu badge cho từng trạng thái sheet. */
const STATUS_META = {
    ACTIVE: { label: 'Đang sử dụng', cls: 'bg-emerald-100 text-emerald-700 ring-emerald-200' },
    VALIDATED: { label: 'Đã kiểm tra', cls: 'bg-emerald-100 text-emerald-700 ring-emerald-200' },
    DRAFT: { label: 'Bản nháp', cls: 'bg-amber-100 text-amber-700 ring-amber-200' },
    ARCHIVED: { label: 'Lưu trữ', cls: 'bg-slate-100 text-slate-600 ring-slate-200' },
};
const DEFAULT_STATUS = { label: 'Đang sử dụng', cls: 'bg-emerald-100 text-emerald-700 ring-emerald-200' };

const fmtDateTime = (iso) => {
    if (!iso) return null;
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
    const pad = (n) => String(n).padStart(2, '0');
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const fmtNum = (n) => (n == null || Number.isNaN(Number(n)) ? null : Number(n).toLocaleString('vi-VN'));

/** Một ô key-value trong lưới thông tin. */
function Field({ icon: Icon, label, value, mono }) {
    return (
        <div className="flex items-start gap-2.5">
            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white text-emerald-600 ring-1 ring-emerald-100">
                <Icon size={14} />
            </span>
            <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</p>
                <p
                    className={`truncate text-sm font-semibold text-slate-800 ${mono ? 'font-mono text-[13px]' : ''}`}
                    title={value || undefined}
                >
                    {value || '—'}
                </p>
            </div>
        </div>
    );
}

/**
 * SheetHeaderCard — khối "Sheet Header Info / Metadata" hiển thị TRÊN ĐẦU bảng dữ liệu kho.
 * Dùng chung cho màn Chỉ đọc (/warehouse) và Chỉnh sửa (/warehouse/edit).
 *
 * @param {{
 *   header?: Object|null,           // payload `sheetHeader` từ API
 *   loading?: boolean,              // đang tải metadata -> hiện skeleton
 *   error?: string|null,            // lỗi tải metadata
 *   collapsed?: boolean,            // trạng thái thu gọn
 *   onToggleCollapse?: Function,    // đổi trạng thái thu gọn
 *   canEdit?: boolean,              // cho phép sửa metadata (Admin/Warehouse)
 *   onEdit?: Function,              // mở modal sửa metadata
 * }} props
 */
export default function SheetHeaderCard({
    header = null,
    loading = false,
    error = null,
    collapsed = false,
    onToggleCollapse,
    canEdit = false,
    onEdit,
}) {
    const status = STATUS_META[header?.status] || DEFAULT_STATUS;
    const totalRecords = fmtNum(header?.totalRecords);
    const projectLine = header?.projectCode
        ? `${header.projectCode}${header.buildVersion ? ` (${header.buildVersion})` : ''}`
        : null;

    return (
        <section className="mb-4 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/80 shadow-sm">
            {/* ===== Thanh tiêu đề: tên sheet + trạng thái + nút Sửa / Thu gọn ===== */}
            <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 bg-white/70 px-4 py-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
                    <Info size={18} />
                </span>
                <div className="min-w-0 flex-1">
                    <h3 className="truncate text-sm font-bold text-slate-800">
                        {header?.sheetTitle || 'Thông tin Sheet (Header)'}
                        {header?.label ? (
                            <span className="ml-2 font-normal text-slate-500">— {header.label}</span>
                        ) : null}
                    </h3>
                    {!collapsed && (
                        <p className="truncate text-xs text-slate-500">
                            Metadata file gốc &amp; thông tin nguồn dữ liệu của sheet đang chọn
                        </p>
                    )}
                </div>

                <span className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${status.cls}`}>
                    {status.label}
                </span>

                {canEdit && onEdit && (
                    <button
                        type="button"
                        onClick={onEdit}
                        title="Sửa thông tin header của sheet"
                        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-emerald-400 hover:text-emerald-600"
                    >
                        <Pencil size={13} />
                        Sửa
                    </button>
                )}

                <button
                    type="button"
                    onClick={onToggleCollapse}
                    aria-expanded={!collapsed}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100"
                >
                    {collapsed ? <ChevronDown size={13} /> : <ChevronUp size={13} />}
                    {collapsed ? 'Hiện thông tin' : 'Ẩn thông tin'}
                </button>
            </div>

            {/* ===== Nội dung (chỉ render khi không thu gọn) ===== */}
            {!collapsed && (
                <div className="px-4 py-4">
                    {loading ? (
                        /* Skeleton trong lúc chờ API trả metadata */
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                            {Array.from({ length: 6 }).map((_, i) => (
                                <div key={`header-skeleton-${i}`} className="flex items-start gap-2.5">
                                    <Skeleton circle width={28} height={28} />
                                    <div className="flex-1 space-y-2">
                                        <Skeleton height={10} width="45%" />
                                        <Skeleton height={14} width="75%" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        /* Tiêu đề lấy từ DÒNG 1 của file Excel gốc (vd "Bảng chi tiết tồn kho ATW") */
                        <div className="space-y-4">
                            {header?.sheetTitle && (
                                <div className="flex flex-wrap items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/70 px-3 py-2">
                                    <FileSpreadsheet size={16} className="shrink-0 text-emerald-600" />
                                    <span className="text-[11px] font-medium uppercase tracking-wide text-emerald-700">
                                        Tiêu đề sheet gốc
                                    </span>
                                    <span className="text-sm font-bold text-emerald-900">{header.sheetTitle}</span>
                                </div>
                            )}
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                            <Field icon={FileSpreadsheet} label="Tên file gốc" value={header?.fileName} />
                            <Field icon={User} label="Người nhập" value={header?.importedBy} />
                            <Field icon={Clock} label="Thời gian nhập" value={fmtDateTime(header?.importedAt)} />
                            <Field
                                icon={Database}
                                label="Tổng số bản ghi"
                                value={totalRecords != null ? `${totalRecords} dòng` : null}
                            />
                            <Field icon={Tag} label="Dự án / Build" value={projectLine} />
                            <Field icon={FileSpreadsheet} label="Bảng dữ liệu" value={header?.tableName} mono />
                            <Field
                                icon={Database}
                                label="Số cột"
                                value={header?.columnCount != null ? `${header.columnCount} cột` : null}
                            />
                            {header?.description && (
                                <div className="sm:col-span-2 lg:col-span-3 xl:col-span-4">
                                    <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Mô tả</p>
                                    <p className="mt-1 whitespace-pre-line text-sm text-slate-700">{header.description}</p>
                                </div>
                            )}
                            </div>
                        </div>
                    )}

                    {error && (
                        <p className="mt-3 flex items-center gap-1.5 text-xs font-medium text-amber-600">
                            <AlertTriangle size={13} />
                            {error}
                        </p>
                    )}
                </div>
            )}
        </section>
    );
}