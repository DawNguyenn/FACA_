import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Cpu, FileText, Package, LayoutDashboard, LogOut, LogIn, UserCircle, User, Menu, X, ShieldCheck, Search, Loader, ChevronDown, Zap, Eye, Wrench, KeyRound } from 'lucide-react';
import axios from 'axios';
import '../../Styles/Header.css';

const Header = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [openDropdown, setOpenDropdown] = useState(null); 
    const [searchQuery, setSearchQuery] = useState('');
    const [pendingRequests, setPendingRequests] = useState(0);

    // Thông tin người dùng lấy từ Backend API
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

    // Gọi API lấy thông tin cá nhân khi mount
    useEffect(() => {
        const fetchUser = async () => {
            const token = localStorage.getItem('token');
            if (!token) {
                setUser(null);
                setLoading(false);
                return;
            }

            try {
                const res = await axios.get(`${API_URL}/auth/me`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                // Nếu API thành công -> dùng dữ liệu user từ Backend
                const data = res.data?.user || res.data;
                setUser(data);
                // Đồng bộ lại bản ghi user trong LocalStorage
                if (data) {
                    localStorage.setItem('user', JSON.stringify(data));
                }
            } catch (err) {
                console.error('Không thể xác thực token qua API:', err);
                // Fallback: nếu API chưa có/lỗi -> lấy dữ liệu tạm từ localStorage
                // (KHÔNG đặt user = null vì sẽ làm hiện nút "Sign In" nhấp nháy)
                const cachedUser = localStorage.getItem('user');
                if (cachedUser) {
                    try {
                        setUser(JSON.parse(cachedUser));
                    } catch (parseErr) {
                        setUser(null);
                    }
                } else {
                    setUser(null);
                }
            } finally {
                setLoading(false);
            }
        };

        fetchUser();

        // Lắng nghe sự kiện cập nhật user (từ trang Profile) để refresh ngay lập tức
        const handleUserUpdated = () => fetchUser();
        window.addEventListener('user:updated', handleUserUpdated);
        return () => window.removeEventListener('user:updated', handleUserUpdated);
    }, [API_URL]);

    // Quản trị: lấy numărul yêu cau ângă chờ duyệt (că badge în Admin dropdown)
    useEffect(() => {
        const loadPendingCount = async () => {
            const token = localStorage.getItem('token');
            if (!token) return;
            try {
                const res = await axios.get(`${API_URL}/role-requests/pending-count`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                setPendingRequests(res.data?.pending || 0);
            } catch {
                setPendingRequests(0);
            }
        };
        loadPendingCount();
        const onUserUpdated = () => loadPendingCount();
        window.addEventListener('user:updated', onUserUpdated);
        return () => window.removeEventListener('user:updated', onUserUpdated);
    }, [API_URL]);

    // Kiểm tra quyền Admin (hỗ trợ mọi kiểu đặt tên cột RoleId từ SQL Server)
    const isAdmin =
        user &&
        (user.RoleId === 1 ||
            user.role_id === 1 ||
            user.roleid === 1 ||
            String(user.RoleId || user.role_id || user.roleid || '') === '1' ||
            user.role === 'admin');

    const avatarUrl = user ? (user.avatar_url || user.AvatarUrl || user.avatarUrl) : null;

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
        navigate('/login');
    };

    const handleSearch = (e) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
        }
    };

    const isActive = (path) => location.pathname === path;

    // Danh mục con menu sổ xuống
    const dropdownItems = {
        home: [
            { label: t('header.requestRole'), to: '/request-role', icon: KeyRound },
        ],
        issues: [
            { label: t('header.catElectrical'), to: '/issues?category_id=1', icon: Zap },
            { label: t('header.catOptical'), to: '/issues?category_id=2', icon: Eye },
            { label: t('header.catMechanical'), to: '/issues?category_id=3', icon: Wrench },
        ],
        admin: [
            { label: t('header.adminUsers'), to: '/admin/users', icon: ShieldCheck },
            {
                label: t('header.adminRoleRequests'),
                to: '/admin/role-requests',
                icon: KeyRound,
                badge: pendingRequests > 0 ? pendingRequests : null,
            },
        ],
    };

    const toggleDropdown = (name) => {
        setOpenDropdown(openDropdown === name ? null : name);
    };

    const closeDropdowns = () => {
        setOpenDropdown(null);
        setIsMenuOpen(false);
    };

    return (
        <header className="main-header">
            <div className="header-container">
                {/* Brand Logo */}
                <Link to="/" className="header-brand">
                    <div className="brand-icon">
                        <Cpu size={24} color="#ffffff" />
                    </div>
                    <div className="brand-text">
                        <span className="brand-title">FACTS</span>
                        <span className="brand-subtitle">LG Innotek Vietnam</span>
                    </div>
                </Link>

                {/* Mobile Menu Toggle Button */}
                <button className="mobile-toggle-btn" onClick={() => setIsMenuOpen(!isMenuOpen)}>
                    {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
                </button>

                {/* Navigation Links */}
                <nav className={`header-nav ${isMenuOpen ? 'nav-open' : ''}`}>
                    {/* Trang chủ + dropdown (Xin cấp quyền) */}
                    <div
                        className="nav-item nav-dropdown"
                        onClick={() => toggleDropdown('home')}
                        aria-expanded={openDropdown === 'home'}
                    >
                        <LayoutDashboard size={18} />
                        <span>{t('header.home')}</span>
                        <ChevronDown size={14} className="nav-chevron" />
                        {openDropdown === 'home' && (
                            <div className="nav-dropdown-menu" onClick={closeDropdowns}>
                                {dropdownItems.home.map((item) => (
                                    <Link key={item.to} to={item.to} className="nav-dropdown-item" onClick={closeDropdowns}>
                                        <item.icon size={16} />
                                        <span className="nav-dropdown-label">{item.label}</span>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Quản lý Lỗi + dropdown (Lỗi điện / quang / cơ) */}
                    <div
                        className="nav-item nav-dropdown"
                        onClick={() => toggleDropdown('issues')}
                        aria-expanded={openDropdown === 'issues'}
                    >
                        <FileText size={18} />
                        <span>{t('header.issues')}</span>
                        <ChevronDown size={14} className="nav-chevron" />
                        {openDropdown === 'issues' && (
                            <div className="nav-dropdown-menu" onClick={closeDropdowns}>
                                {dropdownItems.issues.map((item) => (
                                    <Link key={item.to} to={item.to} className="nav-dropdown-item" onClick={closeDropdowns}>
                                        <item.icon size={16} />
                                        <span className="nav-dropdown-label">{item.label}</span>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>

                    <Link 
                        to="/warehouse" 
                        className={`nav-item ${isActive('/warehouse') || location.pathname.startsWith('/warehouse') ? 'active' : ''}`}
                        onClick={() => setIsMenuOpen(false)}
                    >
                        <Package size={18} />
                        <span>{t('header.inventory')}</span>
                    </Link>

                    {/* Chỉ hiển thị Admin khi người dùng có quyền admin */}
                    {isAdmin && (
                        <div
                            className="nav-item nav-dropdown"
                            onClick={() => toggleDropdown('admin')}
                            aria-expanded={openDropdown === 'admin'}
                        >
                            <ShieldCheck size={18} />
                            <span>{t('header.admin')}</span>
                            <ChevronDown size={14} className="nav-chevron" />
                            {openDropdown === 'admin' && (
                                <div className="nav-dropdown-menu" onClick={closeDropdowns}>
                                    {dropdownItems.admin.map((item) => (
                                        <Link key={item.to} to={item.to} className="nav-dropdown-item" onClick={closeDropdowns}>
                                            <item.icon size={16} />
                                            <span className="nav-dropdown-label">{item.label}</span>
                                            {item.badge && <span className="nav-dropdown-badge">{item.badge}</span>}
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </nav>

                {/* Search Bar */}
                <form className="header-search-form" onSubmit={handleSearch}>
                    <Search size={16} className="search-icon" />
                    <input
                        type="text"
                        className="search-input"
                        placeholder={t('header.searchPlaceholder')}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </form>

                {/* User Profile Area */}
                <div className="header-user-area">
                    {loading ? (
                        /* Đang tải dữ liệu người dùng */
                        <div className="user-profile-dropdown header-loading">
                            <div className="avatar-circle">
                                <Loader size={18} color="#c00000" className="loading-spinner" />
                            </div>
                            <div className="user-info-text">
                                <span className="user-name">{t('common.loading')}</span>
                            </div>
                        </div>
                    ) : user ? (
                        <>
                            <div className="user-profile-dropdown" onClick={() => setIsProfileOpen(!isProfileOpen)}>
                                <div className="avatar-circle">
                                    {avatarUrl ? (
                                        <img src={avatarUrl} alt="avatar" className="avatar-img" />
                                    ) : (
                                        <User size={18} color="#c00000" />
                                    )}
                                </div>
                                <div className="user-info-text">
                                    <span className="user-name">{user.fullName || user.full_name || user.Username || user.username || user.email}</span>
                                    <span className="user-dept">{user.department || user.Department || t('header.defaultDept')}</span>
                                </div>
                            </div>

                            {isProfileOpen && (
                                <div className="profile-popover" onMouseLeave={() => setIsProfileOpen(false)}>
                                    <div className="popover-header">
                                        <strong>{user.fullName || user.full_name || user.Username || user.username}</strong>
                                        <span>{user.email || user.Email}</span>
                                    </div>
                                    <hr />
                                    <button
                                        className="popover-logout-btn popover-profile-btn"
                                        onClick={() => {
                                            setIsProfileOpen(false);
                                            navigate('/profile');
                                        }}
                                    >
                                        <UserCircle size={16} />
                                        <span>{t('common.profile')}</span>
                                    </button>
                                    <button className="popover-logout-btn" onClick={handleLogout}>
                                        <LogOut size={16} />
                                        <span>{t('common.signOut')}</span>
                                    </button>
                                </div>
                            )}
                        </>
                    ) : (
                        /* Chưa đăng nhập */
                        <Link to="/login" className="signin-link">
                            <LogIn size={16} />
                            <span>{t('common.signIn')}</span>
                        </Link>
                    )}
                </div>
            </div>
        </header>
    );
};

export default Header;