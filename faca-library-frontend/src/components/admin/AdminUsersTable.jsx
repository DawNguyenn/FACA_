import {
    Pencil, Lock, Trash2, Building, CalendarDays, ShieldCheck,
    ArrowUpDown, ArrowUp, ArrowDown,
} from 'lucide-react';
import {
    STATUS_COLORS, getInitials, avatarColor, formatDate, roleColor,
    userIdOf, userNameOf, userRoleOf, userAvatarOf, userCreatedAtOf, nextStatus,
} from './adminConfig';

/** Icon sắp xếp trên tiêu đề cột (Name / Email / Joined Date). */
function SortIcon({ columnKey, sortKey, sortDir }) {
    if (sortKey !== columnKey) return <ArrowUpDown className="h-3.5 w-3.5 text-gray-400" />;
    return sortDir === 'asc'
        ? <ArrowUp className="h-3.5 w-3.5 text-indigo-600" />
        : <ArrowDown className="h-3.5 w-3.5 text-indigo-600" />;
}

/**
 * AdminUsersTable — bảng danh sách người dùng + skeleton khi loading
 * + empty state khi không khớp bộ lọc. Map field snake_case từ API
 * về dạng hiển thị qua helper trong adminConfig.
 */
export default function AdminUsersTable({
    loading, pagedUsers,
    sortKey, sortDir, onSort,
    onEdit, onStatusChange, onDelete, onResetFilters,
}) {
    return (
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                        <th className="px-4 py-3 font-semibold">ID</th>
                        <th className="px-4 py-3 font-semibold cursor-pointer select-none hover:text-indigo-600" onClick={() => onSort('name')}>
                            <span className="inline-flex items-center gap-1">Name <SortIcon columnKey="name" sortKey={sortKey} sortDir={sortDir} /></span>
                        </th>
                        <th className="px-4 py-3 font-semibold cursor-pointer select-none hover:text-indigo-600" onClick={() => onSort('email')}>
                            <span className="inline-flex items-center gap-1">Email <SortIcon columnKey="email" sortKey={sortKey} sortDir={sortDir} /></span>
                        </th>
                        <th className="px-4 py-3 font-semibold">Role</th>
                        <th className="px-4 py-3 font-semibold">Department / Division</th>
                        <th className="px-4 py-3 font-semibold">Status</th>
                        <th className="px-4 py-3 font-semibold cursor-pointer select-none hover:text-indigo-600" onClick={() => onSort('createdAt')}>
                            <span className="inline-flex items-center gap-1">Joined Date <SortIcon columnKey="createdAt" sortKey={sortKey} sortDir={sortDir} /></span>
                        </th>
                        <th className="px-4 py-3 text-right font-semibold">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                    {/* -------- Loading skeleton rows -------- */}
                    {loading && Array.from({ length: 5 }).map((_, i) => (
                        <tr key={`skeleton-${i}`} className="animate-pulse">
                            <td className="px-4 py-3"><div className="h-4 w-10 rounded bg-slate-200" /></td>
                            <td className="px-4 py-3">
                                <div className="flex items-center gap-3">
                                    <div className="h-9 w-9 rounded-full bg-slate-200" />
                                    <div className="h-4 w-28 rounded bg-slate-200" />
                                </div>
                            </td>
                            <td className="px-4 py-3"><div className="h-4 w-44 rounded bg-slate-200" /></td>
                            <td className="px-4 py-3"><div className="h-5 w-16 rounded-full bg-slate-200" /></td>
                            <td className="px-4 py-3"><div className="h-4 w-24 rounded bg-slate-200" /></td>
                            <td className="px-4 py-3"><div className="h-5 w-16 rounded-full bg-slate-200" /></td>
                            <td className="px-4 py-3"><div className="h-4 w-24 rounded bg-slate-200" /></td>
                            <td className="px-4 py-3"><div className="ml-auto h-6 w-24 rounded bg-slate-200" /></td>
                        </tr>
                    ))}

                    {!loading && pagedUsers.map((user) => {
                        const userId = userIdOf(user) ?? 'N/A';
                        const fullName = userNameOf(user);
                        const avatarUrl = userAvatarOf(user);
                        const roleName = userRoleOf(user);
                        const statusInfo = STATUS_COLORS[user.status];
                        const roleBadge = roleColor(roleName);
                        const statusAction = nextStatus(user.status);
                        return (
                            <tr key={userId} className="hover:bg-slate-50">
                                <td className="px-4 py-3 text-sm text-slate-400">#{String(userId).padStart(3, '0')}</td>
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-3">
                                        {avatarUrl ? (
                                            <img src={avatarUrl} alt={fullName} className="h-9 w-9 rounded-full object-cover" />
                                        ) : (
                                            <span className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold text-white ${avatarColor(fullName)}`}>
                                                {getInitials(fullName)}
                                            </span>
                                        )}
                                        <span className="text-sm font-medium text-slate-800">{fullName}</span>
                                    </div>
                                </td>
                                <td className="px-4 py-3 text-sm text-slate-500">{user.email}</td>
                                <td className="px-4 py-3">
                                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${roleBadge.badge}`}>
                                        <span className={`h-1.5 w-1.5 rounded-full ${roleBadge.dot}`} />
                                        {roleName}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-sm text-slate-500">
                                    <span className="inline-flex items-center gap-1.5"><Building className="h-3.5 w-3.5 text-slate-400" />{user.department}</span>
                                </td>
                                <td className="px-4 py-3">
                                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusInfo.badge}`}>
                                        <span className={`h-1.5 w-1.5 rounded-full ${statusInfo.dot}`} />
                                        {statusInfo.label}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-sm text-slate-500">
                                    <span className="inline-flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5 text-slate-400" />{formatDate(userCreatedAtOf(user))}</span>
                                </td>
                                <td className="px-4 py-3 text-right">
                                    <div className="flex items-center justify-end gap-1">
                                        <button title="Edit user" aria-label={`Edit ${fullName}`}
                                            onClick={() => onEdit(user)}
                                            className="rounded-md border border-slate-200 bg-white p-1.5 text-slate-500 transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600">
                                            <Pencil className="h-4 w-4" />
                                        </button>
                                        <button
                                            title={statusAction === 'blocked' ? 'Block user' : statusAction === 'active' ? 'Unblock user' : 'Activate user'}
                                            aria-label={`Change status for ${fullName}`}
                                            onClick={() => onStatusChange(user)}
                                            className={`rounded-md border p-1.5 transition ${user.status === 'blocked' ? 'border-emerald-300 bg-emerald-50 text-emerald-600 hover:bg-emerald-100' : 'border-amber-300 bg-amber-50 text-amber-600 hover:bg-amber-100'}`}>
                                            <Lock className="h-4 w-4" />
                                        </button>
                                        <button title="Delete user" aria-label={`Delete ${fullName}`}
                                            onClick={() => onDelete(user)}
                                            className="rounded-md border border-red-200 bg-white p-1.5 text-red-500 transition hover:border-red-300 hover:bg-red-50">
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        );
                    })}

                    {!loading && pagedUsers.length === 0 && (
                        <tr>
                            <td colSpan="8" className="px-4 py-12 text-center">
                                <ShieldCheck className="mx-auto h-10 w-10 text-slate-300" />
                                <p className="mt-2 text-sm font-medium text-slate-500">No users match your filters.</p>
                                <button onClick={onResetFilters} className="mt-3 text-sm font-semibold text-indigo-600 hover:text-indigo-700">
                                    Clear filters
                                </button>
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}


