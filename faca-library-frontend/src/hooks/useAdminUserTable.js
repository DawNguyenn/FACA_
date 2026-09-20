import { useMemo, useState } from 'react';
import { PAGE_SIZE } from '../components/admin/adminConfig';

/**
 * useAdminUserTable — toàn bộ logic bảng người dùng: số liệu KPI, lọc theo
 * role/status/từ khóa, sắp xếp theo cột và phân trang phía client.
 *
 * @param {Array} users — danh sách user thô từ API
 * @returns {{
 *   search: string, changeSearch: (v: string) => void,
 *   roleFilter: string, changeRoleFilter: (v: string) => void,
 *   statusFilter: string, changeStatusFilter: (v: string) => void,
 *   sortKey: string, sortDir: string, handleSort: (key: string) => void,
 *   resetFilters: () => void,
 *   stats: {totalUsers: number, activeUsers: number, blockedInactiveUsers: number, newThisMonth: number},
 *   filtered: Array, totalPages: number, activePage: number,
 *   setCurrentPage: Function, pagedUsers: Array
 * }}
 */
export default function useAdminUserTable(users) {
    // --- Filter / search state ---
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState('All');
    const [statusFilter, setStatusFilter] = useState('All');

    // --- Sorting state ---
    const [sortKey, setSortKey] = useState('createdAt');
    const [sortDir, setSortDir] = useState('desc');

    // --- Pagination state ---
    const [currentPage, setCurrentPage] = useState(1);

    // ------------------------------------------------------------------
    //  Derived data (memoised)
    // ------------------------------------------------------------------
    const stats = useMemo(() => {
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
    //  Handlers điều khiển bảng
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

    // Đổi bộ lọc/từ khóa thì luôn quay về trang 1
    const changeSearch = (value) => { setSearch(value); setCurrentPage(1); };
    const changeRoleFilter = (value) => { setRoleFilter(value); setCurrentPage(1); };
    const changeStatusFilter = (value) => { setStatusFilter(value); setCurrentPage(1); };

    return {
        search,
        changeSearch,
        roleFilter,
        changeRoleFilter,
        statusFilter,
        changeStatusFilter,
        sortKey,
        sortDir,
        handleSort,
        resetFilters,
        stats,
        filtered,
        totalPages,
        activePage,
        setCurrentPage,
        pagedUsers,
    };
}
