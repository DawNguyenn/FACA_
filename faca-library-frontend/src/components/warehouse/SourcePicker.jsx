import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, FileSpreadsheet } from 'lucide-react';

/**
 * SourcePicker — dropdown chọn sheet đang xem (đặt trên thanh công cụ).
 * Tự quản lý trạng thái mở/đóng và tự đóng khi click ra ngoài.
 *
 * @param {{sources: Array, source: string, onSelect: (key: string) => void, disabled?: boolean}} props
 */
export default function SourcePicker({ sources = [], source, onSelect, disabled = false }) {
    const [open, setOpen] = useState(false);
    const containerRef = useRef(null);

    const activeSource = sources.find((s) => s.key === source) || sources[0];

    // Đóng dropdown khi click ra ngoài
    useEffect(() => {
        if (!open) return;
        const handleClickOutside = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [open]);

    return (
        <div className="relative" ref={containerRef}>
            <button
                onClick={() => setOpen((o) => !o)}
                disabled={disabled}
                className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-semibold shadow-sm transition disabled:cursor-not-allowed disabled:opacity-50 ${open ? 'border-[#217346] bg-[#217346] text-white' : 'border-slate-300 bg-white text-[#217346] hover:border-[#217346]/60 hover:bg-emerald-50'}`}
                title="Chọn sheet đang xem"
            >
                <FileSpreadsheet className="h-3.5 w-3.5" />
                <span className="max-w-[10rem] truncate">{activeSource ? activeSource.label : '—'}</span>
                <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
            </button>

            {open && (
                <div className="absolute right-0 top-full z-30 mt-2 w-64 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
                    <p className="border-b border-slate-100 bg-slate-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Chọn Sheet
                    </p>
                    <div className="max-h-80 overflow-y-auto py-1">
                        {sources.map((s) => {
                            const active = source === s.key;
                            return (
                                <button
                                    key={s.key}
                                    onClick={() => {
                                        onSelect(s.key);
                                        setOpen(false);
                                    }}
                                    className={`flex w-full items-center gap-2.5 px-4 py-2 text-left text-sm transition ${active ? 'bg-emerald-50 font-semibold text-[#217346]' : 'text-slate-600 hover:bg-slate-50'}`}
                                >
                                    <FileSpreadsheet className={`h-4 w-4 shrink-0 ${active ? 'text-[#217346]' : 'text-emerald-600/50'}`} />
                                    <span className="flex-1 truncate">{s.label}</span>
                                    {active && <Check className="h-4 w-4 text-[#217346]" />}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
