import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, AlertCircle, Cpu, Mail, Lock, CheckCircle2, FileText, Database, AlertTriangle, X } from 'lucide-react';
import axios from 'axios';
import '../../Styles/Auth.css';

const Login = () => {
    const navigate = useNavigate();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fieldErrors, setFieldErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [showMsModal, setShowMsModal] = useState(false);

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

    const handleMicrosoftLogin = (e) => {
        // Ngăn chặn hành vi mặc định & không gọi API MSAL/Azure AD
        e.preventDefault();
        // Chức năng đang phát triển -> hiển thị Modal thông báo
        setShowMsModal(true);
    };

    const validateForm = () => {
        const errors = {};
        if (!email.trim()) {
            errors.email = 'Vui lòng nhập email ';
        }
        if (!password) {
            errors.password = 'Vui lòng nhập mật khẩu';
        }
        setFieldErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleEmailLogin = async (e) => {
        e.preventDefault();
        setError(null);

        if (!validateForm()) {
            return;
        }

        setLoading(true);

        try {
            const res = await axios.post(`${API_URL}/auth/login`, { email, password });
            if (res.data.success) {
                // Lưu cả token và user vào LocalStorage
                localStorage.setItem('token', res.data.token);
                localStorage.setItem('user', JSON.stringify(res.data.user));
                // Chuyển hướng về trang chủ & reload nhẹ để Header nhận dữ liệu ngay
                navigate('/');
                window.location.reload();
            }
        } catch (err) {
            console.error("Lỗi đăng nhập email:", err);
            setError(err.response?.data?.message || "Mật khẩu hoặc Email không chính xác.");
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (setter, fieldName) => (e) => {
        setter(e.target.value);
        if (fieldErrors[fieldName]) {
            setFieldErrors(prev => ({ ...prev, [fieldName]: null }));
        }
    };

    return (
        <div className="auth-split-wrapper">
            <div className="auth-hero-panel">
                <div className="hero-overlay"></div>
                <div className="hero-content">
                    <div className="hero-brand">
                        <Cpu size={44} className="hero-brand-icon" />
                        <div>
                            <h2>FACTS</h2>
                            <p>Failure Analysis & Component Tracking System</p>
                        </div>
                    </div>

                    <h1 className="hero-title">
                       FACA & Inventory <br /> Management System
                    </h1>
                    <p className="hero-description">
                        Hệ thống tra cứu, phân tích lỗi kỹ thuật Camera Module kết hợp quản lý kho và vật tư tập trung.
                    </p>

                    <div className="hero-features">
                        <div className="feature-item">
                            <Database size={20} className="feature-icon" />
                            <span>Tra cứu thông tin và lịch sử các lỗi liên quan đến Camera Module</span>
                        </div>
                        <div className="feature-item">
                            <FileText size={20} className="feature-icon" />
                            <span>Quản lý danh mục kho, linh kiện và vật tư liên quan</span>
                        </div>
                        <div className="feature-item">
                            <CheckCircle2 size={20} className="feature-icon" />
                            <span>Theo dõi tình trạng và tổng hợp báo cáo hệ thống</span>
                        </div>
                    </div>

                    <div className="hero-footer-note">
                        © 2026 LG Innotek Vietnam Hải Phòng. All Rights Reserved.
                    </div>
                </div>
            </div>

            <div className="auth-form-panel">
                <div className="auth-card">
                    <div className="auth-header">
                        <div className="auth-icon-badge">
                            <Cpu size={32} color="#c00000" />
                        </div>
                        <h1 className="auth-title">FACA Library</h1>
                        <span className="auth-company-tag">Đăng nhập hệ thống</span>
                    </div>

                    <div className="auth-tab-container">
                        <button className="auth-tab-btn active">Đăng Nhập</button>
                        <button className="auth-tab-btn" onClick={() => navigate('/register')}>
                            Đăng Ký
                        </button>
                    </div>

                    {error && (
                        <div className="auth-error-message">
                            <AlertCircle size={18} style={{ marginRight: 8, flexShrink: 0 }} />
                            <span>{error}</span>
                        </div>
                    )}

                    <div className="auth-form-container">
                        <button onClick={handleMicrosoftLogin} disabled={loading} className="auth-ms-btn">
                            <svg className="auth-ms-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 23 23">
                                <path fill="#f35325" d="M1 1h10v10H1z"/>
                                <path fill="#81bc06" d="M12 1h10v10H12z"/>
                                <path fill="#05a6f0" d="M1 12h10v10H1z"/>
                                <path fill="#ffba08" d="M12 12h10v10H12z"/>
                            </svg>
                            <span>Đăng nhập bằng Microsoft SSO</span>
                        </button>

                        <div className="auth-divider-container">
                            <span className="auth-divider-line"></span>
                            <span className="auth-divider-text">Hoặc dùng Email</span>
                            <span className="auth-divider-line"></span>
                        </div>

                        <form onSubmit={handleEmailLogin} className="auth-form" noValidate>
                            <div className="auth-field-block">
                                <div className={`auth-input-group ${fieldErrors.email ? 'input-has-error' : ''}`}>
                                    <Mail size={18} color={fieldErrors.email ? '#c00000' : '#777'} className="auth-input-icon" />
                                    <input 
                                        type="email" 
                                        placeholder="Email" 
                                        value={email}
                                        onChange={handleInputChange(setEmail, 'email')}
                                        className="auth-input"
                                    />
                                </div>
                                {fieldErrors.email && <span className="custom-field-error">{fieldErrors.email}</span>}
                            </div>

                            <div className="auth-field-block">
                                <div className={`auth-input-group ${fieldErrors.password ? 'input-has-error' : ''}`}>
                                    <Lock size={18} color={fieldErrors.password ? '#c00000' : '#777'} className="auth-input-icon" />
                                    <input 
                                        type="password" 
                                        placeholder="Mật khẩu" 
                                        value={password}
                                        onChange={handleInputChange(setPassword, 'password')}
                                        className="auth-input"
                                    />
                                </div>
                                {fieldErrors.password && <span className="custom-field-error">{fieldErrors.password}</span>}
                            </div>

                            <button type="submit" disabled={loading} className="auth-submit-btn">
                                {loading ? 'Đang xử lý...' : 'Đăng Nhập'}
                            </button>
                        </form>
                    </div>

                    <div className="auth-footer">
                        <ShieldCheck size={16} color="#28a745" style={{ marginRight: 6 }} />
                        <span>Hệ thống bảo mật nội bộ LG Innotek</span>
                    </div>
                </div>
            </div>

            {/* Modal thông báo Microsoft SSO đang phát triển */}
            {showMsModal && (
                <div className="auth-modal-overlay" onClick={() => setShowMsModal(false)}>
                    <div className="auth-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
                        <button
                            type="button"
                            className="auth-modal-close"
                            aria-label="Đóng"
                            onClick={() => setShowMsModal(false)}
                        >
                            <X size={20} />
                        </button>

                        <div className="auth-modal-icon">
                            <AlertTriangle size={32} />
                        </div>

                        <h3 className="auth-modal-title">Chức năng đang được phát triển</h3>
                        <p className="auth-modal-desc">
                            Đăng nhập Microsoft SSO nội bộ hiện đang trong quá trình tích hợp phân quyền
                            Azure AD với quản trị mạng công ty. Vui lòng sử dụng tài khoản Email &amp; Mật khẩu
                            để đăng nhập.
                        </p>

                        <button
                            type="button"
                            className="auth-modal-btn"
                            onClick={() => setShowMsModal(false)}
                        >
                            Đã hiểu
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Login;