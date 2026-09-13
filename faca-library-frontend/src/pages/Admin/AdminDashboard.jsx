import { useState, useMemo, useEffect, useCallback } from 'react';
import {
    Search,
    UserPlus,
    Users,
    UserCheck,
    UserX,
    Pencil,
    Lock,
    Trash2,
    X,
    ChevronLeft,
    ChevronRight,
    AlertTriangle,
    ShieldCheck,
    CalendarDays,
    Mail,
    Building,
    Plus,
    ArrowUpDown,
    ArrowUp,
    ArrowDown,
} from 'lucide-react';

import {
    getUsers,
    createUser,
    updateUser,
    deleteUser as deleteUserApi,
} from '../../services/userService';

// ------------------------------------------------------------------
//  PRESENTATION CONFIG — colour maps for badges & avatars
// ------------------------------------------------------------------
const ROLE_COLORS = {
    Admin: { badge: 'bg-blue-100 text-blue-700', dot: 'bg-blue-500' },
    Engineer: { badge: 'bg-purple-100 text-purple-700', dot: 'bg-purple-500' },
    QC: { badge: 'bg-teal-100 text-teal-700', dot: 'bg-teal-500' },
    Warehouse: { badge: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500' },
    User: { badge: 'bg-slate-100 text-slate-700', dot: 'bg-slate-500' },
};

const STATUS_COLORS = {
    active: { label: 'Active', badge: 'bg-green-100 text-green-700', dot: 'bg-green-500' },
    inactive: { label: 'Inactive', badge: 'bg-gray-100 text-gray-600', dot: 'bg-gray-400' },
    blocked: { label: 'Blocked', badge: 'bg-red-100 text-red-700', dot: 'bg-red-500' },
};

const AVATAR_PALETTE = [
    'bg-indigo-500', 'bg-sky-500', 'bg-rose-500', 'bg-emerald-500',
    'bg-violet-500', 'bg-amber-500', 'bg-cyan-600', 'bg-fuchsia-500',
];

const ROLE_OPTIONS = ['All', 'Admin', 'Engineer', 'QC', 'Warehouse', 'User'];
const STATUS_OPTIONS = ['All', 'active', 'inactive', 'blocked'];
const PAGE_SIZE = 8;

// Map role_id to role name (matches backend database)
const ROLE_NAMES = { 1: 'Admin', 2: 'Engineer', 3: 'QC', 4: 'Warehouse', 5: 'User' };

// ------------------------------------------------------------------
//  Small pure helpers
// ------------------------------------------------------------------
const getInitials = (name) => {
    if (!name || typeof name !== 'string') return 'U';
    return name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
};

const avatarColor = (name) => {
    if (!name || typeof name !== 'string') return '#6B7280';
    const hash = [...name].reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
    return AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
};

const formatDate = (iso) => {
    const d = new Date(iso + 'T00:00:00');
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

// 'active' -> 'blocked', 'blocked' -> 'active', 'inactive' -> 'active'
const nextStatus = (status) => (status === 'blocked' ? 'active'
    : status === 'active' ? 'blocked' : 'active');

// Fallback badge màu cho role không có trong ROLE_COLORS (do API trả về)
const roleColor = (role) => ROLE_COLORS[role]
    || { badge: 'bg-slate-100 text-slate-700', dot: 'bg-slate-400' };

// ================================================================
//  MAIN COMPONENT
// ================================================================
export default function AdminDashboard() {
    // --- Raw state (data from Backend API) ---
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    // --- Toast notice state: { type: 'success' | 'error', text: string } ---
    const [notice, setNotice] = useState(null);
    useEffect(() => {
        if (!notice) return undefined;
        const t = window.setTimeout(() => setNotice(null), 3000);
        return () => window.clearTimeout(t);
    }, [notice]);

    // --- Filter / search state ---
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState('All');
    const [statusFilter, setStatusFilter] = useState('All');

    // --- Sorting state ---
    const [sortKey, setSortKey] = useState('createdAt');
    const [sortDir, setSortDir] = useState('desc');

    // --- Pagination state ---
    const [currentPage, setCurrentPage] = useState(1);

    // --- Modal / confirm state ---
    const [userModal, setUserModal] = useState(null); // { mode: 'add'|'edit', user?: object }
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [statusTarget, setStatusTarget] = useState(null);

    // ------------------------------------------------------------------
    //  Derived data (memoised)
    // ------------------------------------------------------------------
    const { totalUsers, activeUsers, blockedInactiveUsers, newThisMonth } =
        useMemo(() => {
            const now = new Date();
            const currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
            return {
                totalUsers: users.length,
                activeUsers: users.filter((u) => u.status === 'active').length,
                blockedInactiveUsers: users.filter((u) =>
                    u.status === 'blocked' || u.status === 'inactive').length,
                newThisMonth: users.filter((u) =>
                    String(u.createdAt).startsWith(currentKey)).length,
            };
        }, [users]);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return users
            .filter((u) =>
                (roleFilter === 'All' || u.role === roleFilter) &&
                (statusFilter === 'All' || u.status === statusFilter) &&
                (q === '' ||
                    u.name.toLowerCase().includes(q) ||
                    u.email.toLowerCase().includes(q)))
            .sort((a, b) => {
                let av = a[sortKey] ?? '', bv = b[sortKey] ?? '';
                if (sortKey === 'createdAt') { av = new Date(av); bv = new Date(bv); }
                const cmp = typeof av === 'string'
                    ? av.localeCompare(String(bv))
                    : (av < bv ? -1 : av > bv ? 1 : 0);
                return sortDir === 'asc' ? cmp : -cmp;
            });
    }, [users, search, roleFilter, statusFilter, sortKey, sortDir]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

    // Clamped page so we never render an out-of-range page (e.g. after a delete)
    const activePage = Math.min(currentPage, totalPages);

    const pagedUsers = useMemo(
        () => filtered.slice((activePage - 1) * PAGE_SIZE, activePage * PAGE_SIZE),
        [filtered, activePage],
    );

    // ------------------------------------------------------------------
    //  Action handlers
    // ------------------------------------------------------------------
    const handleSort = (key) => {
        if (sortKey === key) {
            setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
        } else {
            setSortKey(key);
            setSortDir(key === 'name' ? 'asc' : 'desc');
        }
    };

    const resetFilters = () => {
        setSearch('');
        setRoleFilter('All');
        setStatusFilter('All');
        setCurrentPage(1);
    };

    // ------------------------------------------------------------------
    //  API: fetch users from Backend
    // ------------------------------------------------------------------
    const refreshUsers = useCallback(async () => {
        setLoading(true);
        setLoadError(null);
        try {
            const data = await getUsers();
            setUsers(data);
        } catch (err) {
            setLoadError(err.message || 'Không thể tải danh sách người dùng.');
        } finally {
            setLoading(false);
        }
    }, []);

    // Nạp dữ liệu từ Backend khi component mount.
    // Dùng setTimeout để không gọi setState đồng bộ trong effect body.
    useEffect(() => {
        const t = window.setTimeout(refreshUsers, 0);
        return () => window.clearTimeout(t);
    }, [refreshUsers]);

    const showNotice = (type, text) => setNotice({ type, text });

    const handleSubmitUser = async (data) => {
        const isEdit = userModal?.mode === 'edit';
        setSubmitting(true);
        try {
            // Map form fields to API expected fields (snake_case)
            const apiPayload = {
                full_name: data.name,
                email: data.email,
                role_name: data.role,
                department: data.department,
                status: data.status,
                avatar_url: data.avatarUrl,
            };
            if (isEdit) {
                await updateUser(data.id, apiPayload);
                showNotice('success', 'Cập nhật người dùng thành công.');
            } else {
                await createUser(apiPayload);
                showNotice('success', 'Thêm người dùng mới thành công.');
            }
            setUserModal(null);
            await refreshUsers();
        } catch (err) {
            showNotice('error', err.message || 'Có lỗi xảy ra khi lưu người dùng.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async () => {
        setSubmitting(true);
        try {
            const userId = deleteTarget.user_id ?? deleteTarget.userid ?? deleteTarget.userId ?? deleteTarget.id;
            await deleteUserApi(userId);
            showNotice('success', 'Đã xóa người dùng.');
            setDeleteTarget(null);
            await refreshUsers();
        } catch (err) {
            showNotice('error', err.message || 'Không thể xóa người dùng.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleStatusChange = async () => {
        setSubmitting(true);
        try {
            const userId = statusTarget.user_id ?? statusTarget.userid ?? statusTarget.userId ?? statusTarget.id;
            await updateUser(userId, { status: nextStatus(statusTarget.status) });
            showNotice('success', 'Cập nhật trạng thái thành công.');
            setStatusTarget(null);
            await refreshUsers();
        } catch (err) {
            showNotice('error', err.message || 'Không thể đổi trạng thái người dùng.');
        } finally {
            setSubmitting(false);
        }
    };

    const nextStatusOf = (status) => nextStatus(status);
    const nextStatusLabel = (status) => STATUS_COLORS[nextStatus(status)].label;

    const sortIcon = (key) => {
        if (sortKey !== key) return <ArrowUpDown className="h-3.5 w-3.5 text-gray-400" />;
        return sortDir === 'asc'
            ? <ArrowUp className="h-3.5 w-3.5 text-indigo-600" />
            : <ArrowDown className="h-3.5 w-3.5 text-indigo-600" />;
    };

    // Render ---------------------------------------------------------
    return (
        <div className="min-h-screen bg-slate-50">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">

                {/* ================= HEADER ================= */}
                <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-indigo-600">
                            <ShieldCheck className="h-4 w-4" /> Administration
                        </p>
                        <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
                            Quản Lý Người Dùng
                        </h1>
                        <p className="mt-1 text-sm text-slate-500">
                            Quick overview of accounts with powerful search, filters and management actions.
                        </p>
                    </div>
                    <button
                        onClick={() => setUserModal({ mode: 'add' })}
                        className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                    >
                        <UserPlus className="h-4 w-4" /> Add New User
                    </button>
                </header>

                {/* ================= KPI METRIC CARDS ================= */}
                <section className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <p className="text-sm font-medium text-slate-500">Tổng người dùng</p>
                                <p className="mt-1 text-3xl font-extrabold text-slate-900">{totalUsers}</p>
                            </div>
                            <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                                <Users className="h-6 w-6" />
                            </span>
                        </div>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <p className="text-sm font-medium text-slate-500">Đang hoạt động</p>
                                <p className="mt-1 text-3xl font-extrabold text-emerald-600">{activeUsers}</p>
                            </div>
                            <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                                <UserCheck className="h-6 w-6" />
                            </span>
                        </div>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <p className="text-sm font-medium text-slate-500">Mới trong tháng</p>
                                <p className="mt-1 text-3xl font-extrabold text-sky-600">{newThisMonth}</p>
                            </div>
                            <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
                                <CalendarDays className="h-6 w-6" />
                            </span>
                        </div>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <p className="text-sm font-medium text-slate-500">Đã khóa / Tạm dừng</p>
                                <p className="mt-1 text-3xl font-extrabold text-rose-600">{blockedInactiveUsers}</p>
                            </div>
                            <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-rose-50 text-rose-600">
                                <UserX className="h-6 w-6" />
                            </span>
                        </div>
                    </div>
                </section>

                {/* ================= FILTER & SEARCH BAR ================= */}
                <section className="mt-6 flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:flex-row md:items-center">
                    <div className="relative flex-1">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                            placeholder="Search by name or email…"
                            className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                    </div>

                    <div className="relative w-40">
                        <span className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"><UserCheck className="h-4 w-4" /></span>
                        <select
                            value={roleFilter}
                            onChange={(e) => { setRoleFilter(e.target.value); setCurrentPage(1); }}
                            aria-label="Filter by role"
                            className="w-full appearance-none rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-8 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        >
                            {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                        </select>
                    </div>

                    <div className="relative w-40">
                        <select
                            value={statusFilter}
                            onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
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
                        onClick={resetFilters}
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
                    >
                        <Plus className="h-4 w-4 rotate-45" /> Reset
                    </button>
                </section>

                {/* ================= ERROR BANNER ================= */}
                {loadError && (
                    <div className="mt-6 flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-start gap-3">
                            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
                            <div>
                                <p className="text-sm font-semibold text-red-700">Không thể tải danh sách người dùng</p>
                                <p className="mt-0.5 text-sm text-red-600">{loadError}</p>
                            </div>
                        </div>
                        <button
                            onClick={refreshUsers}
                            className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
                        >
                            <Plus className="h-4 w-4 rotate-45" /> Thử lại
                        </button>
                    </div>
                )}

                {/* ================= DATA TABLE ================= */}
                <section className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200 text-left">
                            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                                <tr>
                                    <th className="px-4 py-3 font-semibold">ID</th>
                                    <th className="px-4 py-3 font-semibold cursor-pointer select-none hover:text-indigo-600" onClick={() => handleSort('name')}>
                                        <span className="inline-flex items-center gap-1">Name {sortIcon('name')}</span>
                                    </th>
                                    <th className="px-4 py-3 font-semibold cursor-pointer select-none hover:text-indigo-600" onClick={() => handleSort('email')}>
                                        <span className="inline-flex items-center gap-1">Email {sortIcon('email')}</span>
                                    </th>
                                    <th className="px-4 py-3 font-semibold">Role</th>
                                    <th className="px-4 py-3 font-semibold">Department / Division</th>
                                    <th className="px-4 py-3 font-semibold">Status</th>
                                    <th className="px-4 py-3 font-semibold cursor-pointer select-none hover:text-indigo-600" onClick={() => handleSort('createdAt')}>
                                        <span className="inline-flex items-center gap-1">Joined Date {sortIcon('createdAt')}</span>
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
                                    // Map API fields (snake_case) to component expectations
                                    // Backend trả key "user_id"; vẫn có fallback userid/userId/id để an toàn
                                    const userId = user.user_id ?? user.userid ?? user.userId ?? user.id ?? 'N/A';
                                    const fullName = user.full_name || user.name || user.fullName || 'Unknown';
                                    const avatarUrl = user.avatar_url || user.avatarUrl || user.AvatarUrl;
                                    const roleName = user.role_name || user.role || ROLE_NAMES[user.role_id] || user.role_id || 'User';
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
                                                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${roleColor(roleName).badge}`}>
                                                    <span className={`h-1.5 w-1.5 rounded-full ${roleColor(roleName).dot}`} />
                                                    {roleName}
                                                </span>
                                            </td>
                                        <td className="px-4 py-3 text-sm text-slate-500">
                                            <span className="inline-flex items-center gap-1.5"><Building className="h-3.5 w-3.5 text-slate-400" />{user.department}</span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLORS[user.status].badge}`}>
                                                <span className={`h-1.5 w-1.5 rounded-full ${STATUS_COLORS[user.status].dot}`} />
                                                {STATUS_COLORS[user.status].label}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-slate-500">
                                            <span className="inline-flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5 text-slate-400" />{formatDate(user.created_at || user.createdAt)}</span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <button title="Edit user" aria-label={`Edit ${fullName}`}
                                                    onClick={() => setUserModal({ mode: 'edit', user })}
                                                    className="rounded-md border border-slate-200 bg-white p-1.5 text-slate-500 transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600">
                                                    <Pencil className="h-4 w-4" />
                                                </button>
                                                <button
                                                    title={nextStatusOf(user.status) === 'blocked' ? 'Block user' : nextStatusOf(user.status) === 'active' ? 'Unblock user' : 'Activate user'}
                                                    aria-label={`Change status for ${fullName}`}
                                                    onClick={() => setStatusTarget(user)}
                                                    className={`rounded-md border p-1.5 transition ${user.status === 'blocked' ? 'border-emerald-300 bg-emerald-50 text-emerald-600 hover:bg-emerald-100' : 'border-amber-300 bg-amber-50 text-amber-600 hover:bg-amber-100'}`}>
                                                    <Lock className="h-4 w-4" />
                                                </button>
                                                <button title="Delete user" aria-label={`Delete ${fullName}`}
                                                    onClick={() => setDeleteTarget(user)}
                                                    className="rounded-md border border-red-200 bg-white p-1.5 text-red-500 transition hover:border-red-300 hover:bg-red-50">
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );})}

                                {!loading && pagedUsers.length === 0 && (
                                    <tr>
                                        <td colSpan="8" className="px-4 py-12 text-center">
                                            <ShieldCheck className="mx-auto h-10 w-10 text-slate-300" />
                                            <p className="mt-2 text-sm font-medium text-slate-500">No users match your filters.</p>
                                            <button onClick={resetFilters} className="mt-3 text-sm font-semibold text-indigo-600 hover:text-indigo-700">
                                                Clear filters
                                            </button>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* -------- Pagination footer -------- */}
                    <div className="flex flex-col items-center justify-between gap-2 border-t border-slate-200 px-4 py-3 sm:flex-row">
                        <p className="text-sm text-slate-500">
                            Showing <span className="font-semibold text-slate-700">
                                {filtered.length === 0 ? 0 : (activePage - 1) * PAGE_SIZE + 1}–{Math.min(activePage * PAGE_SIZE, filtered.length)}
                            </span> of <span className="font-semibold text-slate-700">{filtered.length}</span> users
                        </p>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                disabled={activePage <= 1}
                                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <ChevronLeft className="h-4 w-4" /> Previous
                            </button>
                            <span className="text-sm text-slate-600">Page {activePage} / {totalPages}</span>
                            <button
                                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                                disabled={activePage >= totalPages}
                                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                Next <ChevronRight className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                </section>
            </div>

            {/* ================= TOAST NOTICE ================= */}
            {notice && (
                <div
                    role="status" aria-live="polite"
                    className={`fixed bottom-6 right-6 z-60 flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium shadow-lg ${notice.type === 'success'
                            ? 'border-emerald-200 bg-white text-emerald-700'
                            : 'border-red-200 bg-white text-red-700'
                        }`}
                >
                    <span className={`h-2 w-2 rounded-full ${notice.type === 'success' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                    {notice.text}
                </div>
            )}

            {/* ================= ADD / EDIT MODAL ================= */}
            {userModal && (
                <UserFormModal
                    mode={userModal.mode}
                    initial={userModal.mode === 'edit' ? userModal.user : null}
                    onCancel={() => setUserModal(null)}
                    onSubmit={handleSubmitUser}
                />
            )}

            {/* ================= DELETE CONFIRMATION ================= */}
            {deleteTarget && (
                <ConfirmModal
                    title="Delete user"
                    tone="danger"
                    icon={<Trash2 className="h-6 w-6" />}
                    message={`Are you sure you want to permanently delete “${deleteTarget.full_name || deleteTarget.name}”? This action cannot be undone.`}
                    confirmLabel="Delete"
                    busy={submitting}
                    onCancel={() => setDeleteTarget(null)}
                    onConfirm={handleDelete}
                />
            )}

            {/* ================= STATUS CHANGE CONFIRMATION ================= */}
            {statusTarget && (
                <ConfirmModal
                    title={nextStatusOf(statusTarget.status) === 'blocked' ? 'Block user' : 'Unblock user'}
                    tone={nextStatusOf(statusTarget.status) === 'blocked' ? 'warning' : 'success'}
                    icon={<Lock className="h-6 w-6" />}
                    message={`Change status of “${statusTarget.full_name || statusTarget.name}” from “${STATUS_COLORS[statusTarget.status].label}” to “${nextStatusLabel(statusTarget.status)}”?`}
                    confirmLabel={nextStatusLabel(statusTarget.status)}
                    busy={submitting}
                    onCancel={() => setStatusTarget(null)}
                    onConfirm={handleStatusChange}
                />
            )}
        </div>
    );
}

// ================================================================
//  User Add / Edit Form Modal
// ================================================================
function UserFormModal({ mode, initial, onCancel, onSubmit }) {
    const [form, setForm] = useState({
        id: initial?.user_id ?? initial?.userid ?? initial?.userId ?? initial?.id ?? null,
        name: initial?.full_name || initial?.name || '',
        email: initial?.email ?? '',
        role: initial?.role_name || initial?.role || ROLE_NAMES[initial?.role_id] || 'User',
        department: initial?.department ?? 'IT',
        status: initial?.status ?? 'active',
        avatarUrl: initial?.avatar_url || initial?.avatarUrl || '',
        createdAt: initial?.created_at || initial?.createdAt || new Date().toISOString().slice(0, 10),
    });

    const [errors, setErrors] = useState({});
    const [showErrors, setShowErrors] = useState(false);

    const setField = (key, value) => {
        setForm((f) => ({ ...f, [key]: value }));
        if (showErrors) validate({ ...form, [key]: value });
    };

    const validate = (f) => {
        const e = {};
        if (!f.name.trim()) e.name = 'Name is required.';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) e.email = 'A valid email is required.';
        return e;
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const errs = validate(form);
        setErrors(errs);
        setShowErrors(true);
        if (Object.keys(errs).length === 0) onSubmit({ ...form });
    };

    const labelCls = 'block text-sm font-medium text-slate-600';
    const inputCls =
        'mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500';

    return (
        <ModalShell>
            <div className="flex items-start gap-4">
                <div className="flex-1">
                    <h2 className="text-lg font-bold text-slate-900">
                        {mode === 'edit' ? 'Edit User' : 'Add New User'}
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                        {mode === 'edit'
                            ? `Update the details for ${initial?.full_name || initial?.name}.`
                            : 'Create a brand new account and grant it a role.'}
                    </p>
                </div>
                <button onClick={onCancel} aria-label="Close"
                    className="rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600">
                    <X className="h-5 w-5" />
                </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                    <label className={labelCls} htmlFor="user-name">Full name</label>
                    <input id="user-name" type="text" value={form.name}
                        onChange={(e) => setField('name', e.target.value)}
                        placeholder="e.g. Anna Nowak"
                        className={`${inputCls} ${errors.name ? 'border-red-400' : ''}`} />
                    {errors.name && <p role="alert" className="mt-1 text-xs font-medium text-red-600">{errors.name}</p>}
                </div>

                <div className="sm:col-span-2">
                    <label className={labelCls} htmlFor="user-email">Email</label>
                    <div className="relative">
                        <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input id="user-email" type="email" value={form.email}
                            onChange={(e) => setField('email', e.target.value)}
                            placeholder="name@faca.io"
                            className={`${inputCls} ${errors.email ? 'border-red-400' : ''} pl-9`} />
                    </div>
                    {errors.email && <p role="alert" className="mt-1 text-xs font-medium text-red-600">{errors.email}</p>}
                </div>

                <div>
                    <label className={labelCls} htmlFor="user-role">Role</label>
                    <select id="user-role" value={form.role} onChange={(e) => setField('role', e.target.value)} className={inputCls}>
                        {ROLE_OPTIONS.filter((r) => r !== 'All').map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                </div>

                <div>
                    <label className={labelCls} htmlFor="user-department">Department / Division</label>
                    <select id="user-department" value={form.department} onChange={(e) => setField('department', e.target.value)} className={inputCls}>
                        {['IT', 'Manufacturing', 'Quality', 'Logistics', 'R&D', 'Sales', 'Support']
                            .map((d) => <option key={d} value={d}>{d}</option>)}
                    </select>
                </div>

                <div>
                    <label className={labelCls} htmlFor="user-status">Status</label>
                    <select id="user-status" value={form.status} onChange={(e) => setField('status', e.target.value)} className={inputCls}>
                        {STATUS_OPTIONS.filter((s) => s !== 'All').map((s) => (
                            <option key={s} value={s}>{STATUS_COLORS[s].label}</option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className={labelCls} htmlFor="user-created">Joined date</label>
                    <input id="user-created" type="date" value={form.createdAt}
                        onChange={(e) => setField('createdAt', e.target.value)} className={inputCls} />
                </div>

                <div className="sm:col-span-2 flex items-center justify-end gap-3 border-t border-slate-200 pt-4">
                    <button type="button" onClick={onCancel}
                        className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100">
                        Cancel
                    </button>
                    <button type="submit"
                        className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700">
                        <Plus className="h-4 w-4" />
                        {mode === 'edit' ? 'Save Changes' : 'Create User'}
                    </button>
                </div>
            </form>
        </ModalShell>
    );
}

// ================================================================
//  Reusable Confirmation Modal (delete / status change)
// ================================================================
function ConfirmModal({ title, tone, icon, message, confirmLabel, busy = false, onCancel, onConfirm }) {
    const toneCls = {
        danger: 'bg-red-100 text-red-600',
        warning: 'bg-amber-100 text-amber-600',
        success: 'bg-emerald-100 text-emerald-600',
    }[tone];

    const buttonCls = {
        danger: 'bg-red-600 hover:bg-red-700 text-white',
        warning: 'bg-amber-500 hover:bg-amber-600 text-white',
        success: 'bg-emerald-600 hover:bg-emerald-700 text-white',
    }[tone];

    return (
        <ModalShell>
            <div className="flex flex-col items-center text-center">
                <span className={`flex h-12 w-12 items-center justify-center rounded-full ${toneCls}`}>{icon}</span>
                <h2 className="mt-4 text-lg font-bold text-slate-900">{title}</h2>
                <p className="mt-1 text-sm text-slate-500">{message}</p>
            </div>
            <div className="mt-5 flex items-center justify-end gap-3 border-t border-slate-200 pt-4">
                <button onClick={onCancel} disabled={busy}
                    className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50">
                    Cancel
                </button>
                <button onClick={onConfirm} disabled={busy}
                    className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${buttonCls}`}>
                    {busy ? (
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    ) : (
                        <AlertTriangle className="h-4 w-4" />
                    )}
                    {confirmLabel}
                </button>
            </div>
        </ModalShell>
    );
}

// ================================================================
//  Modal wrapper — overlay + centred panel
// ================================================================
function ModalShell({ children }) {
    return (
        <div className="fixed inset-0 z- [9999] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl sm:max-w-md"
                role="dialog" aria-modal="true">
                {children}
            </div>
        </div>
    );
}