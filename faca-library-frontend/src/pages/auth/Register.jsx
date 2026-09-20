import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ShieldCheck, AlertCircle, Cpu, Mail, Lock, User, Building, CheckCircle2, FileText, Database } from 'lucide-react';
import axios from 'axios';
import LanguageSwitcher from '../../components/common/LanguageSwitcher';
import i18n from '../../i18n';
import '../../Styles/Auth.css';

const Register = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [department, setDepartment] = useState('');

    // State lưu lỗi theo từng trường dữ liệu
    const [fieldErrors, setFieldErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [successMsg, setSuccessMsg] = useState(null);

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';


    // Hàm kiểm tra lỗi riêng của trang web
    const validateForm = () => {
        const errors = {};

        if (!fullName.trim()) {
            errors.fullName = t('register.fullNameRequired');
        }

        if (!email.trim()) {
            errors.email = t('register.emailRequired');
        } else if (!/\S+@\S+\.\S+/.test(email)) {
            errors.email = t('register.emailInvalid');
        }

        // Regex kiểm tra: Tối thiểu 8 ký tự, ít nhất 1 chữ hoa, 1 số và 1 ký tự đặc biệt
        const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

        if (!password) {
            errors.password = t('register.passwordRequired');
        } else if (password.length < 8) {
            errors.password = t('register.passwordMinLength');
        } else if (!passwordRegex.test(password)) {
            errors.password = t('register.passwordPattern');
        }

        setFieldErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setError(null);
        setSuccessMsg(null);

        // Chạy hàm kiểm tra trước khi gửi
        if (!validateForm()) {
            return;
        }

        setLoading(true);

        try {
            const res = await axios.post(`${API_URL}/auth/register`, {
                email,
                password,
                full_name: fullName,
                department,
                // Gửi kèm ngôn ngữ đang chọn để backend lưu vào cột language của user mới
                language: localStorage.getItem('app_language') || i18n.language || 'vi',
            });

            if (res.data.success) {
                setSuccessMsg(t('register.success'));
                setEmail('');
                setPassword('');
                setFullName('');
                setDepartment('');
                setFieldErrors({});

                setTimeout(() => {
                    navigate('/login');
                }, 2000);
            }
        } catch (err) {
            console.error("Lỗi đăng ký:", err);
            setError(err.response?.data?.message || t('register.failed'));
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
            {/* Chuyển đổi ngôn ngữ: góc trên phải */}
            <LanguageSwitcher />
            <div className="auth-hero-panel">
                <div className="hero-overlay"></div>
                <div className="hero-content">
                    <div className="hero-brand">
                        <Cpu size={44} className="hero-brand-icon" />
                        <div>
                            <h2>FACTS</h2>
                            <p>Failure Analysis & Component Tracking System </p>
                        </div>
                    </div>

                    <h1 className="hero-title">
                        FACA & Inventory <br /> Management System
                    </h1>
                    <p className="hero-description">
                        {t('register.heroDescription')}
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
                        <span className="auth-company-tag">{t('register.companyTag')}</span>
                    </div>

                    <div className="auth-tab-container">
                        <button className="auth-tab-btn" onClick={() => navigate('/login')}>
                            {t('auth.tabLogin')}
                        </button>
                        <button className="auth-tab-btn active">{t('auth.tabRegister')}</button>
                    </div>

                    {error && (
                        <div className="auth-error-message">
                            <AlertCircle size={18} style={{ marginRight: 8, flexShrink: 0 }} />
                            <span>{error}</span>
                        </div>
                    )}
                    {successMsg && (
                        <div className="auth-success-message">
                            <ShieldCheck size={18} style={{ marginRight: 8, flexShrink: 0 }} />
                            <span>{successMsg}</span>
                        </div>
                    )}

                    <div className="auth-form-container">
                        {/* Thêm noValidate để tắt tooltip mặc định của trình duyệt */}
                        <form onSubmit={handleRegister} className="auth-form" noValidate>
                            <div className="auth-field-block">
                                <div className={`auth-input-group ${fieldErrors.fullName ? 'input-has-error' : ''}`}>
                                    <User size={18} color={fieldErrors.fullName ? '#c00000' : '#777'} className="auth-input-icon" />
                                    <input
                                        type="text"
                                        placeholder={t('register.fullNamePlaceholder')}
                                        value={fullName}
                                        onChange={handleInputChange(setFullName, 'fullName')}
                                        className="auth-input"
                                    />
                                </div>
                                {fieldErrors.fullName && <span className="custom-field-error">{fieldErrors.fullName}</span>}
                            </div>

                            <div className="auth-field-block">
                                <div className={`auth-input-group ${fieldErrors.email ? 'input-has-error' : ''}`}>
                                    <Mail size={18} color={fieldErrors.email ? '#c00000' : '#777'} className="auth-input-icon" />
                                    <input
                                        type="email"
                                        placeholder={t('register.emailPlaceholder')}
                                        value={email}
                                        onChange={handleInputChange(setEmail, 'email')}
                                        className="auth-input"
                                    />
                                </div>
                                {fieldErrors.email && <span className="custom-field-error">{fieldErrors.email}</span>}
                            </div>

                            <div className="auth-field-block">
                                <div className="auth-input-group">
                                    <Building size={18} color="#777" className="auth-input-icon" />
                                    <input
                                        type="text"
                                        placeholder={t('register.departmentPlaceholder')}
                                        value={department}
                                        onChange={(e) => setDepartment(e.target.value)}
                                        className="auth-input"
                                    />
                                </div>
                            </div>

                            <div className="auth-field-block">
                                <div className={`auth-input-group ${fieldErrors.password ? 'input-has-error' : ''}`}>
                                    <Lock size={18} color={fieldErrors.password ? '#c00000' : '#777'} className="auth-input-icon" />
                                    <input
                                        type="password"
                                        placeholder={t('register.passwordPlaceholder')}
                                        value={password}
                                        onChange={handleInputChange(setPassword, 'password')}
                                        className="auth-input"
                                    />
                                </div>
                                {fieldErrors.password && <span className="custom-field-error">{fieldErrors.password}</span>}
                            </div>

                            <button type="submit" disabled={loading} className="auth-submit-btn">
                                {loading ? t('register.processing') : t('register.submit')}
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
    );
};

export default Register;