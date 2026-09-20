import { Loader2, Plus } from 'lucide-react';
import { FALLBACK_TEMPLATES } from './warehouseConfig';

/**
 * NewSheetModal — modal tạo sheet mới (tự tạo bảng SQL + đăng ký danh mục).
 *
 * @param {{
 *   open: boolean, templates: Object,
 *   value: {key: string, label: string, templateKey: string},
 *   onChange: (updater: (prev: Object) => Object) => void,
 *   onClose: () => void, onSubmit: () => void, saving: boolean
 * }} props
 */
export default function NewSheetModal({ open, templates = {}, value, onChange, onClose, onSubmit, saving }) {
    if (!open) return null;

    const hasTemplates = Object.keys(templates).length > 0;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={() => !saving && onClose()}>
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
                <div className="mb-4 flex items-center gap-2">
                    <Plus className="h-5 w-5 text-[#217346]" />
                    <h3 className="text-base font-bold text-slate-800">Tạo sheet mới</h3>
                </div>
                <p className="mb-4 text-xs text-slate-500">
                    Tự tạo bảng SQL + đăng ký vào danh mục. Xong là bulk insert + xem ngay, lần sau không cần tìm code nữa.
                </p>
                <div className="space-y-3">
                    <div>
                        <label className="mb-1 block text-xs font-semibold text-slate-600">Key (a-z, 0-9, _) *</label>
                        <input
                            type="text"
                            value={value.key}
                            onChange={(e) => onChange((s) => ({ ...s, key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') }))}
                            placeholder="VD: pkd28"
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                        />
                    </div>
                    <div>
                        <label className="mb-1 block text-xs font-semibold text-slate-600">Tên hiển thị *</label>
                        <input
                            type="text"
                            value={value.label}
                            onChange={(e) => onChange((s) => ({ ...s, label: e.target.value }))}
                            placeholder="VD: PKD28"
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                        />
                    </div>
                    <div>
                        <label className="mb-1 block text-xs font-semibold text-slate-600">Clone cấu trúc từ</label>
                        <select
                            value={value.templateKey}
                            onChange={(e) => onChange((s) => ({ ...s, templateKey: e.target.value }))}
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                        >
                            {hasTemplates ? (
                                Object.entries(templates).map(([k, t]) => (
                                    <option key={k} value={k}>{k} — {t.description} ({t.columnCount} cột)</option>
                                ))
                            ) : (
                                FALLBACK_TEMPLATES.map((t) => (
                                    <option key={t.value} value={t.value}>{t.label}</option>
                                ))
                            )}
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
                        className="flex items-center gap-1.5 rounded-lg bg-[#217346] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1a5c38] disabled:opacity-50"
                    >
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                        Tạo sheet
                    </button>
                </div>
            </div>
        </div>
    );
}
