import { useMemo, useState } from 'react';
import { PAGE_SIZE, userNameOf, userRoleOf, userCreatedAtOf } from '../components/admin/adminConfig';

/**
 * Bỏ dấu tiếng Việt/không ASCII để search không phân biệt hoa/thường + có/không dấu:
 * 'nguyen' khớp 'Nguyễn', 'NGUYEN' khớp 'Nguyễn'. (NFD rồi gom combining marks,
 * đ/Đ không tách được khi NFD nên thay tay).
 */
const stripDiacritics = (s) => String(s)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, (ch) => (ch === 'đ' ? 'd' : 'D'))
    .toLowerCase();

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
        // API luôn trả status (fallback 'active'), createdAt lưu ở created_at (snake_case)
        const statusOf = (u) => u.status || 'active';
        return {
            totalUsers: users.length,
            activeUsers: users.filter((u) => statusOf(u) === 'active').length,
            blockedInactiveUsers: users.filter((u) =>
                statusOf(u) === 'blocked' || statusOf(u) === 'inactive').length,
            newThisMonth: users.filter((u) =>
                String(userCreatedAtOf(u) || '').startsWith(currentKey)).length,
        };
    }, [users]);

    const filtered = useMemo(() => {
        const q = stripDiacritics(search.trim());
        return users
            // API trả snake_case (full_name / role_name / created_at) — dùng helper
            // trong adminConfig để lọc & sắp xếp khớp đúng dữ liệu bảng hiển thị.
            .filter((u) => {
                const name = String(userNameOf(u) || '');
                const email = String(u.email || '');
                const role = String(userRoleOf(u) || '').toLowerCase();
                const status = u.status || 'active';
                return (roleFilter === 'All' || role === String(roleFilter).toLowerCase()) &&
                    (statusFilter === 'All' || status === statusFilter) &&
                    (q === '' ||
                        stripDiacritics(name).includes(q) ||
                        stripDiacritics(email).includes(q));
            })
            .sort((a, b) => {
                let av; let bv;
                if (sortKey === 'name') {
                    av = userNameOf(a); bv = userNameOf(b);
                } else if (sortKey === 'createdAt') {
                    // new Date(undefined) -> Invalid Date làm sort chết; quy về timestamp (0 nếu thiếu)
                    av = new Date(userCreatedAtOf(a) || 0).getTime() || 0;
                    bv = new Date(userCreatedAtOf(b) || 0).getTime() || 0;
                } else {
                    av = a[sortKey] ?? ''; bv = b[sortKey] ?? '';
                }
                const cmp = (typeof av === 'string' && typeof bv === 'string')
                    ? av.localeCompare(bv, undefined, { sensitivity: 'base' })
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
