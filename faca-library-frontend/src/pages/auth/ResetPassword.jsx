import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ShieldCheck, AlertCircle, ArrowLeft, LockKeyhole, CheckCircle2 } from 'lucide-react';
import axios from 'axios';
import LanguageSwitcher from '../../components/common/LanguageSwitcher';
import PasswordInput from '../../components/common/PasswordInput';
import '../../styles/Auth.css';

// Trang "Đặt lại mật khẩu" — nhận token & email từ query string trong link email:
// /reset-password?token=...&email=...
const ResetPassword = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const token = searchParams.get('token') || '';
    const email = searchParams.get('email') || '';

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [fieldErrors, setFieldErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

    const validateForm = () => {
        const errors = {};
        if (!password) {
            errors.password = t('auth.passwordRequired');
        } else if (password.length < 6) {
            errors.password = t('auth.passwordTooShort');
        }
        if (!confirmPassword) {
            errors.confirmPassword = t('auth.confirmPasswordRequired');
        } else if (password !== confirmPassword) {
            errors.confirmPassword = t('auth.passwordMismatch');
        }
        setFieldErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleReset = async (e) => {
        e.preventDefault();
        setError(null);

        if (!validateForm()) {
            return;
        }

        setLoading(true);

        try {
            await axios.post(`${API_URL}/auth/reset-password`, {
                token,
                email,
                password
            });
            setSuccess(true);
            // Tự chuyển về trang đăng nhập sau 3 giây
            setTimeout(() => navigate('/login'), 3000);
        } catch (err) {
            console.error('Lỗi đặt lại mật khẩu:', err);
            setError(err.response?.data?.message || t('auth.resetError'));
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (setter, fieldName) => (e) => {
        setter(e.target.value);
        if (fieldErrors[fieldName]) {
            setFieldErrors((prev) => ({ ...prev, [fieldName]: null }));
        }
    };

    // Link không hợp lệ (thiếu token hoặc email) → không cho nhập mật khẩu
    const invalidLink = !token || !email;

    return (
        <>
            <LanguageSwitcher />
            <div className="auth-container">
                <div className="auth-card">
                    <div className="auth-header">
                        <div className="auth-icon-badge">
                            <LockKeyhole size={32} color="#c00000" />
                        </div>
                        <h1 className="auth-title">{t('auth.resetTitle')}</h1>
                        <span className="auth-company-tag">{t('auth.resetCompanyTag')}</span>
                    </div>

                    {invalidLink && (
                        <div className="auth-error-message">
                            <AlertCircle size={18} style={{ marginRight: 8, flexShrink: 0 }} />
                            <span>{t('auth.invalidResetLink')}</span>
                        </div>
                    )}

                    {error && (
                        <div className="auth-error-message">
                            <AlertCircle size={18} style={{ marginRight: 8, flexShrink: 0 }} />
                            <span>{error}</span>
                        </div>
                    )}

                    {success ? (
                        <div className="auth-success-message">
                            <CheckCircle2 size={18} style={{ marginRight: 8, flexShrink: 0 }} />
                            <span>{t('auth.resetSuccess')}</span>
                        </div>
                    ) : (
                        !invalidLink && (
                            <div className="auth-form-container">
                                <p className="auth-hint-text auth-hint-email">{email}</p>

                                <form onSubmit={handleReset} className="auth-form" noValidate>
                                    <div className="auth-field-block">
                                        {/* Ô mật khẩu mới có nút hiện/ẩn (con mắt) */}
                                        <PasswordInput
                                            value={password}
                                            onChange={handleInputChange(setPassword, 'password')}
                                            placeholder={t('auth.newPasswordPlaceholder')}
                                            hasError={!!fieldErrors.password}
                                            autoComplete="new-password"
                                        />
                                        {fieldErrors.password && <span className="custom-field-error">{fieldErrors.password}</span>}
                                    </div>

                                    <div className="auth-field-block">
                                        <PasswordInput
                                            value={confirmPassword}
                                            onChange={handleInputChange(setConfirmPassword, 'confirmPassword')}
                                            placeholder={t('auth.confirmPasswordPlaceholder')}
                                            hasError={!!fieldErrors.confirmPassword}
                                            autoComplete="new-password"
                                        />
                                        {fieldErrors.confirmPassword && <span className="custom-field-error">{fieldErrors.confirmPassword}</span>}
                                    </div>

                                    <button type="submit" disabled={loading} className="auth-submit-btn">
                                        {loading ? t('auth.processing') : t('auth.resetBtn')}
                                    </button>
                                </form>
                            </div>
                        )
                    )}

                    <div className="auth-back-row">
                        <button type="button" className="auth-link-btn" onClick={() => navigate('/login')}>
                            <ArrowLeft size={15} style={{ marginRight: 6, verticalAlign: '-2px' }} />
                            {t('auth.backToLogin')}
                        </button>
                    </div>

                    <div className="auth-footer">
                        <ShieldCheck size={16} color="#28a745" style={{ marginRight: 6 }} />
                        <span>{t('auth.internalSecurity')}</span>
                    </div>
                </div>
            </div>
        </>
    );
};

export default ResetPassword;
