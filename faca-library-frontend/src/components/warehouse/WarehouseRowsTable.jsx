import { AlertTriangle, Loader2, Pencil, Plus, Save, X } from 'lucide-react';
import { displayValue } from './warehouseConfig';

/**
 * WarehouseRowsTable — bảng xem dữ liệu của 1 sheet (phân trang phía server).
 * Hỗ trợ sửa trực tiếp từng dòng (inline edit) và dòng nhập dữ liệu mới.
 *
 * @param {{
 *   allColumns: string[], labelFor: (col: string) => string, rows: Array,
 *   loading: boolean, error: string|null, activeSource: {label: string, table: string},
 *   rowOffset: number, canEdit: boolean,
 *   editingId: number|string|null, editValues: Object, onEditValueChange: (col: string, v: string) => void,
 *   savingRow: boolean,
 *   showAddRow: boolean, newRowValues: Object, onNewRowValueChange: (col: string, v: string) => void,
 *   onSaveNewRow: () => void, onCancelAddRow: () => void,
 *   onStartEdit: (row: Object) => void, onCancelEdit: () => void, onSaveEdit: (rowId: number|string) => void
 * }} props
 */
export default function WarehouseRowsTable({
    allColumns,
    labelFor,
    rows,
    loading,
    error,
    activeSource,
    rowOffset,
    canEdit,
    editingId,
    editValues,
    onEditValueChange,
    savingRow,
    showAddRow,
    newRowValues,
    onNewRowValueChange,
    onSaveNewRow,
    onCancelAddRow,
    onStartEdit,
    onCancelEdit,
    onSaveEdit,
}) {
    return (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex min-h- [420px] flex-col">
            {loading ? (
                <div className="flex flex-1 items-center justify-center gap-2 py-16 text-slate-500">
                    <Loader2 className="h-5 w-5 animate-spin text-emerald-600" />
                    Đang tải dữ liệu...
                </div>
            ) : error ? (
                <div className="flex flex-1 flex-col items-center justify-center py-12 text-center text-sm text-red-600">
                    <AlertTriangle className="mb-2 h-6 w-6" />
                    {error}
                </div>
            ) : rows.length === 0 ? (
                <div className="flex flex-1 items-center justify-center py-16 text-center text-sm text-slate-400">
                    Không có dữ liệu. Hãy BULK INSERT dữ liệu vào bảng{' '}
                    <code className="rounded bg-slate-100 px-1 py-0.5">{activeSource.table}</code> trong SQL Server.
                </div>
            ) : (
                <div className="flex-1 overflow-x-auto">
                    <table className="min-w-max w-full border-collapse text-left text-sm">
                        <thead>
                            <tr>
                                {/* Cột số thứ tự */}
                                <th className="sticky left-0 z-10 w-10 border border-slate-300 bg-[#17375E] px-2 py-2.5 text-center text-xs font-semibold text-white">
                                    #
                                </th>
                                {allColumns.map((col) => (
                                    <th key={col} className="border border-slate-300 bg-[#17375E] px-4 py-2.5 text-center text-xs font-bold whitespace-nowrap text-white">
                                        {labelFor(col)}
                                    </th>
                                ))}
                                <th className="border border-slate-300 bg-[#17375E] px-3 py-2.5 text-center text-xs font-bold whitespace-nowrap text-white">
                                    Thao tác
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {/* Dòng nhập dữ liệu mới */}
                            {showAddRow && (
                                <tr className="bg-emerald-50/60">
                                    <td className="sticky left-0 z-10 border border-slate-300 bg-emerald-50 px-2 py-2 text-center text-emerald-700">
                                        <Plus className="mx-auto h-4 w-4" />
                                    </td>
                                    {allColumns.map((col) => (
                                        <td key={col} className="border border-slate-300 px-2 py-1.5">
                                            <input
                                                type="text"
                                                value={newRowValues[col] || ''}
                                                onChange={(e) => onNewRowValueChange(col, e.target.value)}
                                                placeholder={labelFor(col)}
                                                className="w-28 rounded border border-emerald-400 bg-white px-2 py-1 text-xs outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                                            />
                                        </td>
                                    ))}
                                    <td className="border border-slate-300 px-2 py-1.5">
                                        <div className="flex items-center justify-center gap-1">
                                            <button onClick={onSaveNewRow} disabled={savingRow} title="Lưu dòng mới"
                                                className="flex h-7 w-7 items-center justify-center rounded bg-emerald-600 text-white transition hover:bg-emerald-700 disabled:opacity-50">
                                                {savingRow ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                                            </button>
                                            <button onClick={onCancelAddRow} title="Hủy"
                                                className="flex h-7 w-7 items-center justify-center rounded border border-slate-300 text-slate-500 transition hover:bg-slate-100">
                                                <X className="h-3.5 w-3.5" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            )}
                            {rows.map((row, rIdx) => {
                                const isEditing = editingId === row.StagingID;
                                return (
                                <tr
                                    key={row.StagingID ?? rIdx}
                                    onDoubleClick={() => canEdit && !isEditing && !showAddRow && onStartEdit(row)}
                                    className={`transition ${isEditing ? 'bg-emerald-50' : 'hover:bg-blue-50'}`}
                                    title={isEditing ? undefined : 'Nhấp đúp để sửa dòng này'}
                                >
                                    <td className="sticky left-0 z-10 border border-slate-300 bg-slate-100 px-2 py-2 text-center text-xs font-medium text-slate-500">
                                        {rowOffset + rIdx + 1}
                                    </td>
                                    {allColumns.map((col) => (
                                        <td key={col} className="border border-slate-300 px-4 py-2 whitespace-nowrap text-slate-700">
                                            {isEditing ? (
                                                <input
                                                    type="text"
                                                    value={editValues[col] ?? ''}
                                                    onChange={(e) => onEditValueChange(col, e.target.value)}
                                                    className="w-28 rounded border border-emerald-400 bg-white px-2 py-1 text-xs outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                                                />
                                            ) : (
                                                displayValue(col, row[col])
                                            )}
                                        </td>
                                    ))}

                                    <td className="border border-slate-300 px-2 py-1.5">
                                        <div className="flex items-center justify-center gap-1">
                                            {isEditing ? (
                                                <>
                                                    <button onClick={() => onSaveEdit(row.StagingID)} disabled={savingRow} title="Lưu (cập nhật SQL Server)"
                                                        className="flex h-7 w-7 items-center justify-center rounded bg-emerald-600 text-white transition hover:bg-emerald-700 disabled:opacity-50">
                                                        {savingRow ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                                                    </button>
                                                    <button onClick={onCancelEdit} title="Hủy bỏ"
                                                        className="flex h-7 w-7 items-center justify-center rounded border border-slate-300 text-slate-500 transition hover:bg-slate-100">
                                                        <X className="h-3.5 w-3.5" />
                                                    </button>
                                                </>
                                            ) : (canEdit ? (
                                                <button onClick={() => onStartEdit(row)} disabled={showAddRow} title="Sửa dòng này"
                                                    className="flex h-7 w-7 items-center justify-center rounded border border-slate-300 text-slate-500 transition hover:border-emerald-500 hover:text-emerald-600 disabled:opacity-50">
                                                    <Pencil className="h-3.5 w-3.5" />
                                                </button>
                                            ) : null)}
                                        </div>
                                    </td>
                                </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
            </div>
        </div>
    );
}

