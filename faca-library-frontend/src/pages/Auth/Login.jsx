import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ShieldCheck, AlertCircle, Cpu, Mail, Lock, CheckCircle2, FileText, Database, AlertTriangle } from 'lucide-react';
import axios from 'axios';
import LanguageSwitcher from '../../components/LanguageSwitcher';
import i18n from '../../i18n';
import '../../Styles/Auth.css';

const Login = () => {
    const { t } = useTranslation();
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
            errors.email = t('auth.emailRequired');
        }
        if (!password) {
            errors.password = t('auth.passwordRequired');
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
            const res = await axios.post(`${API_URL}/auth/login`, {
                email,
                password,
                // Gửi kèm ngôn ngữ đang chọn để backend đồng bộ cột language của user
                language: localStorage.getItem('app_language') || i18n.language || 'vi',
            });
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
            setError(err.response?.data?.message || t('auth.invalidCredentials'));
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
        <>
        <div className="auth-split-wrapper">
            {/* Chuyển đổi ngôn ngữ: góc trên phải */}
            <LanguageSwitcher />
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
                        {t('auth.heroDescription')}
                    </p>

                    <div className="hero-features">
                        <div className="feature-item">
                            <Database size={20} className="feature-icon" />
                            <span>{t('auth.feature1')}</span>
                        </div>
                        <div className="feature-item">
                            <FileText size={20} className="feature-icon" />
                            <span>{t('auth.feature2')}</span>
                        </div>
                        <div className="feature-item">
                            <CheckCircle2 size={20} className="feature-icon" />
                            <span>{t('auth.feature3')}</span>
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
                        <h1 className="auth-title">FACTS</h1>
                        <span className="auth-company-tag">{t('auth.companyTag')}</span>
                    </div>

                    <div className="auth-tab-container">
                        <button className="auth-tab-btn active">{t('auth.tabLogin')}</button>
                        <button className="auth-tab-btn" onClick={() => navigate('/register')}>
                            {t('auth.tabRegister')}
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
                            <span>{t('auth.msSso')}</span>
                        </button>

                        <div className="auth-divider-container">
                            <span className="auth-divider-line"></span>
                            <span className="auth-divider-text">{t('auth.orEmail')}</span>
                            <span className="auth-divider-line"></span>
                        </div>

                        <form onSubmit={handleEmailLogin} className="auth-form" noValidate>
                            <div className="auth-field-block">
                                <div className={`auth-input-group ${fieldErrors.email ? 'input-has-error' : ''}`}>
                                    <Mail size={18} color={fieldErrors.email ? '#c00000' : '#777'} className="auth-input-icon" />
                                    <input 
                                        type="email" 
                                        placeholder={t('auth.emailField')} 
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
                                        placeholder={t('auth.passwordPlaceholder')} 
                                        value={password}
                                        onChange={handleInputChange(setPassword, 'password')}
                                        className="auth-input"
                                    />
                                </div>
                                {fieldErrors.password && <span className="custom-field-error">{fieldErrors.password}</span>}
                            </div>

                            <button type="submit" disabled={loading} className="auth-submit-btn">
                                {loading ? t('auth.processing') : t('auth.login')}
                            </button>
                        </form>
                    </div>

                    <div className="auth-footer">
                        <ShieldCheck size={16} color="#28a745" style={{ marginRight: 6 }} />
                        <span>{t('auth.internalSecurity')}</span>
                    </div>
                </div>
            </div>

        </div>

        {/* Modal thông báo Microsoft SSO đang phát triển
            (Render ngoài .auth-split-wrapper để không bị ảnh hưởng
             bởi position/transform của các container cha) */}
        {showMsModal && (
            <div className="sso-modal-overlay auth-modal-overlay" onClick={() => setShowMsModal(false)}>
                <div className="sso-modal-content auth-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
                    <button
                        type="button"
                        className="sso-modal-close auth-modal-close"
                        aria-label="Đóng"
                        onClick={() => setShowMsModal(false)}
                    >
                        ✕
                    </button>

                    <div className="auth-modal-icon">
                        <AlertTriangle size={32} />
                    </div>

                    <h3 className="auth-modal-title">{t('auth.featureInProgress')}</h3>
                    <p className="auth-modal-desc">
                        {t('auth.ssoDesc')}
                    </p>

                    <button
                        type="button"
                        className="sso-modal-btn auth-modal-btn"
                        onClick={() => setShowMsModal(false)}
                    >
                        {t('auth.understood')}
                    </button>
                </div>
            </div>
        )}
        </>
    );
};

export default Login;