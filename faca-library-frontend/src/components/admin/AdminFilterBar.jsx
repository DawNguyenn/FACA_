import { Search, UserCheck, Plus } from 'lucide-react';
import { ROLE_OPTIONS, STATUS_OPTIONS, STATUS_COLORS } from './adminConfig';

/**
 * AdminFilterBar — ô tìm kiếm + 2 select lọc (role/status) + nút Reset.
 */
export default function AdminFilterBar({
    search, onSearchChange,
    roleFilter, onRoleChange,
    statusFilter, onStatusChange,
    onReset,
}) {
    return (
        <section className="mt-6 flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:flex-row md:items-center">
            <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                    type="text"
                    value={search}
                    onChange={(e) => onSearchChange(e.target.value)}
                    placeholder="Search by name or email…"
                    className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
            </div>

            <div className="relative w-40">
                <span className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"><UserCheck className="h-4 w-4" /></span>
                <select
                    value={roleFilter}
                    onChange={(e) => onRoleChange(e.target.value)}
                    aria-label="Filter by role"
                    className="w-full appearance-none rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-8 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                    {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
            </div>

            <div className="relative w-40">
                <select
                    value={statusFilter}
                    onChange={(e) => onStatusChange(e.target.value)}
                    aria-label="Filter by status"
                    className="w-full appearance-none rounded-lg border border-slate-300 bg-white py-2 pl-3 pr-8 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                    <option value="All">All</option>
                    {STATUS_OPTIONS.filter((s) => s !== 'All').map((s) => (
                        <option key={s} value={s}>{STATUS_COLORS[s].label}</option>
                    ))}
                </select>
            </div>

            <button
                onClick={onReset}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
            >
                <Plus className="h-4 w-4 rotate-45" /> Reset
            </button>
        </section>
    );
}
