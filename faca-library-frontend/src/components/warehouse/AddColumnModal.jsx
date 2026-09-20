import { Columns3, Loader2, Plus } from 'lucide-react';

/**
 * AddColumnModal — modal thêm cột mới cho sheet đang xem (ALTER TABLE + metadata).
 *
 * @param {{
 *   open: boolean, activeSource: {label: string, table: string},
 *   value: {columnName: string, label: string, dataType: string},
 *   onChange: (updater: (prev: Object) => Object) => void,
 *   onClose: () => void, onSubmit: () => void, saving: boolean
 * }} props
 */
export default function AddColumnModal({ open, activeSource, value, onChange, onClose, onSubmit, saving }) {
    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={() => !saving && onClose()}>
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
                <div className="mb-4 flex items-center gap-2">
                    <Columns3 className="h-5 w-5 text-emerald-600" />
                    <h3 className="text-base font-bold text-slate-800">Thêm cột mới — {activeSource.label}</h3>
                </div>
                <p className="mb-4 text-xs text-slate-500">
                    Cột mới sẽ được thêm vào bảng <code className="rounded bg-slate-100 px-1">{activeSource.table}</code> (ALTER TABLE) và lưu metadata để hiển thị.
                </p>
                <div className="space-y-3">
                    <div>
                        <label className="mb-1 block text-xs font-semibold text-slate-600">Tên cột (không dấu, không khoảng trắng) *</label>
                        <input
                            type="text"
                            value={value.columnName}
                            onChange={(e) => onChange((c) => ({ ...c, columnName: e.target.value }))}
                            placeholder="VD: Ghi_Chu_QC"
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                        />
                    </div>
                    <div>
                        <label className="mb-1 block text-xs font-semibold text-slate-600">Nhãn hiển thị (tùy chọn)</label>
                        <input
                            type="text"
                            value={value.label}
                            onChange={(e) => onChange((c) => ({ ...c, label: e.target.value }))}
                            placeholder="VD: Ghi chú QC"
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                        />
                    </div>
                    <div>
                        <label className="mb-1 block text-xs font-semibold text-slate-600">Kiểu dữ liệu</label>
                        <select
                            value={value.dataType}
                            onChange={(e) => onChange((c) => ({ ...c, dataType: e.target.value }))}
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                        >
                            <option value="NVARCHAR(255)">Text (NVARCHAR 255)</option>
                            <option value="NVARCHAR(100)">Text ngắn (NVARCHAR 100)</option>
                            <option value="NVARCHAR(500)">Text dài (NVARCHAR 500)</option>
                            <option value="NVARCHAR(MAX)">Text không giới hạn</option>
                            <option value="INT">Số nguyên (INT)</option>
                            <option value="DECIMAL(18,2)">Số thập phân (DECIMAL)</option>
                            <option value="DATE">Ngày (DATE)</option>
                        </select>
                    </div>
                </div>
                <div className="mt-5 flex justify-end gap-2">
                    <button
                        onClick={onClose}
                        className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                    >
                        Hủy
                    </button>
                    <button
                        onClick={onSubmit}
                        disabled={saving}
                        className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                    >
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                        Thêm cột
                    </button>
                </div>
            </div>
        </div>
    );
}
