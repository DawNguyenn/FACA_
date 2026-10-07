import { useState } from 'react';
import { Save, Loader2 } from 'lucide-react';
import ModalShell from '../admin/ModalShell';
import { useToast } from '../common/ToastProvider';
import { updateSheetMeta } from '../../services/warehouseService';

const STATUS_OPTIONS = [
    { value: 'ACTIVE', label: 'Đang sử dụng' },
    { value: 'VALIDATED', label: 'Đã kiểm tra' },
    { value: 'DRAFT', label: 'Bản nháp' },
    { value: 'ARCHIVED', label: 'Lưu trữ' },
];

const labelCls = 'block text-sm font-medium text-slate-600';
const inputCls =
    'mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500';

/** Chuyển ISO -> giá trị cho <input type="datetime-local"> (yyyy-MM-ddTHH:mm). */
function toLocalInput(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * SheetMetaModal — sửa khối metadata header của sheet (chỉ Admin & Warehouse).
 * Gọi PUT /warehouse/sources/:source/meta.
 *
 * @param {{source: string, header: Object|null, onClose: Function, onSaved?: Function}} props
 */
export default function SheetMetaModal({ source, header, onClose, onSaved }) {
    const toast = useToast();
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({
        sheetTitle: header?.sheetTitle || '',
        fileName: header?.fileName || '',
        importedBy: header?.importedBy || '',
        importedAt: toLocalInput(header?.importedAt),
        projectCode: header?.projectCode || '',
        buildVersion: header?.buildVersion || '',
        status: header?.status || 'ACTIVE',
        description: header?.description || '',
    });

    const setField = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const payload = {
                sheetTitle: form.sheetTitle.trim(),
                fileName: form.fileName.trim(),
                importedBy: form.importedBy.trim(),
                projectCode: form.projectCode.trim(),
                buildVersion: form.buildVersion.trim(),
                status: form.status,
                description: form.description.trim(),
            };
            // Chỉ gửi khi người dùng thực sự chọn thời gian (trường optional)
            if (form.importedAt) payload.importedAt = new Date(form.importedAt).toISOString();

            const res = await updateSheetMeta(source, payload);
            toast.success(res?.message || 'Đã lưu thông tin header của sheet.');
            if (onSaved) onSaved(res?.sheetHeader || null);
            onClose();
        } catch (err) {
            toast.error(err.response?.data?.message || err.message || 'Không lưu được thông tin header.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <ModalShell onClose={saving ? undefined : onClose}>
            <div>
                <h2 className="text-lg font-bold text-slate-900">Thông tin Sheet (Header)</h2>
                <p className="mt-1 text-sm text-slate-500">
                    Cập nhật metadata của sheet <b>{header?.label || source}</b> — hiển thị trên đầu bảng dữ liệu.
                </p>
            </div>

            <form onSubmit={handleSubmit} className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                    <label className={labelCls} htmlFor="meta-sheettitle">Tiêu đề sheet (dòng 1 file gốc)</label>
                    <input id="meta-sheettitle" type="text" value={form.sheetTitle} onChange={setField('sheetTitle')}
                        placeholder="VD: Bảng chi tiết tồn kho ATW" className={inputCls} />
                    <p className="mt-1 text-xs text-slate-500">
                        Tiêu đề được trích tự động từ dòng 1 khi import Excel. Có thể chỉnh lại tại đây.
                    </p>
                </div>

                <div className="sm:col-span-2">
                    <label className={labelCls} htmlFor="meta-filename">Tên file gốc</label>
                    <input id="meta-filename" type="text" value={form.fileName} onChange={setField('fileName')}
                        placeholder="VD: SBN27_Inventory_Report_2026.xlsx" className={inputCls} />
                </div>

                <div>
                    <label className={labelCls} htmlFor="meta-importedby">Người nhập</label>
                    <input id="meta-importedby" type="text" value={form.importedBy} onChange={setField('importedBy')}
                        placeholder="VD: Nguyen Van A" className={inputCls} />
                </div>

                <div>
                    <label className={labelCls} htmlFor="meta-importedat">Thời gian nhập</label>
                    <input id="meta-importedat" type="datetime-local" value={form.importedAt}
                        onChange={setField('importedAt')} className={inputCls} />
                </div>

                <div>
                    <label className={labelCls} htmlFor="meta-project">Mã dự án</label>
                    <input id="meta-project" type="text" value={form.projectCode} onChange={setField('projectCode')}
                        placeholder="VD: SBN27" className={inputCls} />
                </div>

                <div>
                    <label className={labelCls} htmlFor="meta-build">Build / Phiên bản</label>
                    <input id="meta-build" type="text" value={form.buildVersion} onChange={setField('buildVersion')}
                        placeholder="VD: DVT1 / EVT1" className={inputCls} />
                </div>
                <div className="sm:col-span-2">
                    <label className={labelCls} htmlFor="meta-status">Trạng thái</label>
                    <select id="meta-status" value={form.status} onChange={setField('status')} className={inputCls}>
                        {STATUS_OPTIONS.map((s) => (
                            <option key={s.value} value={s.value}>{s.label}</option>
                        ))}
                    </select>
                </div>

                <div className="sm:col-span-2">
                    <label className={labelCls} htmlFor="meta-desc">Mô tả / Ghi chú</label>
                    <textarea id="meta-desc" rows={3} value={form.description} onChange={setField('description')}
                        placeholder="VD: Dữ liệu tồn kho chính thức đợt Build DVT1/EVT1" className={inputCls} />
                </div>

                <div className="sm:col-span-2 flex items-center justify-end gap-3 border-t border-slate-200 pt-4">
                    <button type="button" onClick={onClose} disabled={saving}
                        className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 disabled:opacity-50">
                        Hủy
                    </button>
                    <button type="submit" disabled={saving}
                        className="inline-flex items-center gap-2 rounded-lg bg-[#217346] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1a5c38] disabled:opacity-60">
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        {saving ? 'Đang lưu...' : 'Lưu thông tin'}
                    </button>
                </div>
            </form>
        </ModalShell>
    );
}