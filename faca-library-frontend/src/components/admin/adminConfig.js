/**
 * Cấu hình hiển thị + helper thuần dùng chung cho khu vực Admin (trang Quản Lý Người Dùng).
 * Đặt ở file .js (không phải .jsx) để page, hook và các component con dùng chung
 * mà không vi phạm rule react-refresh (file component chỉ export component).
 */

// ------------------------------------------------------------------
//  PRESENTATION CONFIG — colour maps for badges & avatars
// ------------------------------------------------------------------
// Màu badge theo tên vai trò — khớp đúng role_name trong dbo.roles (FACA_DB).
// DB lưu: 1=Admin, 2=Staff, 3=Engineer, 4=WareHouse, 5=QA, 6=User
export const ROLE_COLORS = {
    Admin: { badge: 'bg-blue-100 text-blue-700', dot: 'bg-blue-500' },
    Staff: { badge: 'bg-indigo-100 text-indigo-700', dot: 'bg-indigo-500' },
    Engineer: { badge: 'bg-purple-100 text-purple-700', dot: 'bg-purple-500' },
    WareHouse: { badge: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500' },
    QA: { badge: 'bg-teal-100 text-teal-700', dot: 'bg-teal-500' },
    User: { badge: 'bg-slate-100 text-slate-700', dot: 'bg-slate-500' },
};

export const STATUS_COLORS = {
    active: { label: 'Active', badge: 'bg-green-100 text-green-700', dot: 'bg-green-500' },
    inactive: { label: 'Inactive', badge: 'bg-gray-100 text-gray-600', dot: 'bg-gray-400' },
    blocked: { label: 'Blocked', badge: 'bg-red-100 text-red-700', dot: 'bg-red-500' },
};

export const AVATAR_PALETTE = [
    'bg-indigo-500', 'bg-sky-500', 'bg-rose-500', 'bg-emerald-500',
    'bg-violet-500', 'bg-amber-500', 'bg-cyan-600', 'bg-fuchsia-500',
];

// Tên vai trò để lọc (query ?role=...) và chọn khi tạo/sửa user.
// Phải khớp role_name trong dbo.roles vì backend so khớp theo tên.
export const ROLE_OPTIONS = ['All', 'Admin', 'Staff', 'Engineer', 'WareHouse', 'QA', 'User'];
export const STATUS_OPTIONS = ['All', 'active', 'inactive', 'blocked'];
export const DEPARTMENT_OPTIONS = ['IT', 'Manufacturing', 'Quality', 'Logistics', 'R&D', 'Sales', 'Support'];
export const PAGE_SIZE = 8;

// Map role_id -> role_name (khớp dbo.roles trong FACA_DB)
export const ROLE_NAMES = { 1: 'Admin', 2: 'Staff', 3: 'Engineer', 4: 'WareHouse', 5: 'QA', 6: 'User' };

// ------------------------------------------------------------------
//  Small pure helpers
// ------------------------------------------------------------------
export const getInitials = (name) => {
    if (!name || typeof name !== 'string') return 'U';
    return name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
};

export const avatarColor = (name) => {
    if (!name || typeof name !== 'string') return '#6B7280';
    const hash = [...name].reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
    return AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
};

export const formatDate = (iso) => {
    const d = new Date(iso + 'T00:00:00');
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

// 'active' -> 'blocked', 'blocked' -> 'active', 'inactive' -> 'active'
export const nextStatus = (status) => (status === 'blocked' ? 'active'
    : status === 'active' ? 'blocked' : 'active');

// Fallback badge màu cho role không có trong ROLE_COLORS (do API trả về).
// Tra không phân biệt hoa/thường vì DB lưu 'WareHouse' còn nơi khác có thể ghi 'warehouse'.
const ROLE_COLORS_LC = Object.fromEntries(
    Object.entries(ROLE_COLORS).map(([k, v]) => [k.toLowerCase(), v]),
);

export const roleColor = (role) => ROLE_COLORS[role]
    || ROLE_COLORS_LC[String(role || '').toLowerCase()]
    || { badge: 'bg-slate-100 text-slate-700', dot: 'bg-slate-400' };

// ------------------------------------------------------------------
//  Chuẩn hoá dữ liệu user từ API (backend trả snake_case, có fallback)
// ------------------------------------------------------------------
/** Backend trả key "user_id"; vẫn có fallback userid/userId/id để an toàn */
export const userIdOf = (user) => user?.user_id ?? user?.userid ?? user?.userId ?? user?.id;

export const userNameOf = (user) => user?.full_name || user?.name || user?.fullName || 'Unknown';

export const userRoleOf = (user) => user?.role_name || user?.role
    || ROLE_NAMES[user?.role_id] || user?.role_id || 'User';

export const userAvatarOf = (user) => user?.avatar_url || user?.avatarUrl || user?.AvatarUrl;

export const userCreatedAtOf = (user) => user?.created_at || user?.createdAt;
