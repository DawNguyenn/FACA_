import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Cpu, FileText, Package, LayoutDashboard, LogOut, User, Menu, X, ShieldCheck, Search, LogIn, Loader } from 'lucide-react';
import axios from 'axios';
import '../../Styles/Header.css';

const Header = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

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
    }, [API_URL]);

    // Kiểm tra quyền Admin (hỗ trợ mọi kiểu đặt tên cột RoleId từ SQL Server)
    const isAdmin =
        user &&
        (user.RoleId === 1 ||
            user.role_id === 1 ||
            user.roleid === 1 ||
            String(user.RoleId || user.role_id || user.roleid || '') === '1' ||
            user.role === 'admin');

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
                    <Link 
                        to="/" 
                        className={`nav-item ${isActive('/') ? 'active' : ''}`}
                        onClick={() => setIsMenuOpen(false)}
                    >
                        <LayoutDashboard size={18} />
                        <span>Dashboard</span>
                    </Link>

                    <Link 
                        to="/issues" 
                        className={`nav-item ${isActive('/issues') || location.pathname.startsWith('/issues') ? 'active' : ''}`}
                        onClick={() => setIsMenuOpen(false)}
                    >
                        <FileText size={18} />
                        <span>FACA Reports</span>
                    </Link>

                    <Link 
                        to="/inventory" 
                        className={`nav-item ${isActive('/inventory') || location.pathname.startsWith('/inventory') ? 'active' : ''}`}
                        onClick={() => setIsMenuOpen(false)}
                    >
                        <Package size={18} />
                        <span>Inventory</span>
                    </Link>

                    {/* Chỉ hiển thị Admin khi người dùng có quyền admin */}
                    {isAdmin && (
                        <Link 
                            to="/admin" 
                            className={`nav-item ${isActive('/admin') ? 'active' : ''}`}
                            onClick={() => setIsMenuOpen(false)}
                        >
                            <ShieldCheck size={18} />
                            <span>Admin</span>
                        </Link>
                    )}
                </nav>

                {/* Search Bar */}
                <form className="header-search-form" onSubmit={handleSearch}>
                    <Search size={16} className="search-icon" />
                    <input
                        type="text"
                        className="search-input"
                        placeholder="Search reports, parts, error codes..."
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
                                <span className="user-name">Đang tải...</span>
                            </div>
                        </div>
                    ) : user ? (
                        <>
                            <div className="user-profile-dropdown" onClick={() => setIsProfileOpen(!isProfileOpen)}>
                                <div className="avatar-circle">
                                    <User size={18} color="#c00000" />
                                </div>
                                <div className="user-info-text">
                                    <span className="user-name">{user.fullName || user.full_name || user.Username || user.username || user.email}</span>
                                    <span className="user-dept">{user.department || user.Department || 'Camera PE'}</span>
                                </div>
                            </div>

                            {isProfileOpen && (
                                <div className="profile-popover" onMouseLeave={() => setIsProfileOpen(false)}>
                                    <div className="popover-header">
                                        <strong>{user.fullName || user.full_name || user.Username || user.username}</strong>
                                        <span>{user.email || user.Email}</span>
                                    </div>
                                    <hr />
                                    <button className="popover-logout-btn" onClick={handleLogout}>
                                        <LogOut size={16} />
                                        <span>Sign Out</span>
                                    </button>
                                </div>
                            )}
                        </>
                    ) : (
                        /* Chưa đăng nhập */
                        <Link to="/login" className="signin-link">
                            <LogIn size={16} />
                            <span>Sign In</span>
                        </Link>
                    )}
                </div>
            </div>
        </header>
    );
};

export default Header;