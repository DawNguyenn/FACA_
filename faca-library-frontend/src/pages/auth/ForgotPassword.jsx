import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ShieldCheck, AlertCircle, Mail, ArrowLeft, KeyRound, Lock, CheckCircle2, Clock, RefreshCw } from 'lucide-react';
import axios from 'axios';
import LanguageSwitcher from '../../components/common/LanguageSwitcher';
import '../../styles/Auth.css';

// Hiệu lực của mã OTP (khớp backend: 5 phút) và thời gian chờ trước khi được gửi lại mã
const OTP_TTL_SECONDS = 5 * 60;
const RESEND_COOLDOWN_SECONDS = 60;
const OTP_LENGTH = 6;

// Trang "Quên mật khẩu" — 2 bước:
//   Bước 1: nhập email → POST /api/auth/forgot-password (backend gửi mã OTP 6 số qua email)
//   Bước 2: nhập mã OTP + mật khẩu mới → POST /api/auth/reset-password
const ForgotPassword = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();

    const [step, setStep] = useState(1); // 1 = nhập email, 2 = nhập OTP + mật khẩu mới
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [fieldErrors, setFieldErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [notice, setNotice] = useState(null);
    const [done, setDone] = useState(false);
    const [secondsLeft, setSecondsLeft] = useState(0); // đếm ngược hiệu lực OTP
    const [resendLeft, setResendLeft] = useState(0);   // đếm ngược nút "Gửi lại mã"

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

    // Đồng hồ đếm ngược cho OTP và nút gửi lại mã
    useEffect(() => {
        if (step !== 2 || done) return undefined;
        const timer = setInterval(() => {
            setSecondsLeft((s) => (s > 0 ? s - 1 : 0));
            setResendLeft((s) => (s > 0 ? s - 1 : 0));
        }, 1000);
        return () => clearInterval(timer);
    }, [step, done]);

    const formatTime = (totalSeconds) => {
        const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
        const s = (totalSeconds % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    // Gọi API gửi OTP (dùng chung cho lần đầu và gửi lại)
    const requestOtp = async (targetEmail) => {
        setLoading(true);
        setError(null);
        setNotice(null);

        try {
            await axios.post(`${API_URL}/auth/forgot-password`, { email: targetEmail });
            // Backend luôn trả message chung (không tiết lộ email có tồn tại hay không)
            setStep(2);
            setSecondsLeft(OTP_TTL_SECONDS);
            setResendLeft(RESEND_COOLDOWN_SECONDS);
            setOtp('');
            setNotice(t('auth.forgotSentDesc'));
        } catch (err) {
            console.error('Lỗi gửi mã OTP đặt lại mật khẩu:', err);
            setError(err.response?.data?.message || t('auth.forgotSendError'));
        } finally {
            setLoading(false);
        }
    };

    // Bước 1: gửi email để nhận mã OTP
    const handleSendOtp = async (e) => {
        e.preventDefault();
        setFieldErrors({});

        if (!email.trim()) {
            setFieldErrors({ email: t('auth.emailRequired') });
            return;
        }

        await requestOtp(email.trim());
    };

    // Gửi lại mã OTP
    const handleResendOtp = async () => {
        if (resendLeft > 0 || loading) return;
        await requestOtp(email.trim());
    };

    // Quay lại bước 1 để dùng email khác
    const handleChangeEmail = () => {
        setStep(1);
        setOtp('');
        setPassword('');
        setConfirmPassword('');
        setFieldErrors({});
        setError(null);
        setNotice(null);
        setSecondsLeft(0);
        setResendLeft(0);
    };

    // Bước 2: xác nhận OTP + đặt mật khẩu mới
    const handleReset = async (e) => {
        e.preventDefault();
        setError(null);

        const errors = {};
        if (!otp.trim()) {
            errors.otp = t('auth.otpRequired');
        } else if (!/^\d{6}$/.test(otp.trim())) {
            errors.otp = t('auth.otpInvalidFormat');
        }
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
        if (Object.keys(errors).length > 0) return;

        setLoading(true);

        try {
            await axios.post(`${API_URL}/auth/reset-password`, {
                email: email.trim(),
                otp: otp.trim(),
                password
            });
            setDone(true);
            setNotice(t('auth.resetSuccess'));
            // Tự chuyển về trang đăng nhập sau 3 giây
            setTimeout(() => navigate('/login'), 3000);
        } catch (err) {
            console.error('Lỗi đặt lại mật khẩu:', err);
            setError(err.response?.data?.message || t('auth.resetError'));
        } finally {
            setLoading(false);
        }
    };

    const handleOtpChange = (e) => {
        // Chỉ cho nhập chữ số, tối đa 6 ký tự
        const value = e.target.value.replace(/\D/g, '').slice(0, OTP_LENGTH);
        setOtp(value);
        if (fieldErrors.otp) setFieldErrors((prev) => ({ ...prev, otp: null }));
    };

    const handleFieldChange = (setter, fieldName) => (e) => {
        setter(e.target.value);
        if (fieldErrors[fieldName]) {
            setFieldErrors((prev) => ({ ...prev, [fieldName]: null }));
        }
    };

    const otpExpired = secondsLeft === 0;

    return (
        <>
            <LanguageSwitcher />
            <div className="auth-container">
                <div className="auth-card">
                    <div className="auth-header">
                        <div className="auth-icon-badge">
                            <KeyRound size={32} color="#c00000" />
                        </div>
                        <h1 className="auth-title">{t('auth.forgotTitle')}</h1>
                        <span className="auth-company-tag">
                            {step === 1 ? t('auth.forgotCompanyTag') : t('auth.forgotStep2Tag')}
                        </span>
                    </div>

                    {error && (
                        <div className="auth-error-message">
                            <AlertCircle size={18} style={{ marginRight: 8, flexShrink: 0 }} />
                            <span>{error}</span>
                        </div>
                    )}

                    {done ? (
                        <div className="auth-success-message">
                            <CheckCircle2 size={18} style={{ marginRight: 8, flexShrink: 0 }} />
                            <span>{notice || t('auth.resetSuccess')}</span>
                        </div>
                    ) : (
                        <div className="auth-form-container">
                            {/* ============ BƯỚC 1: NHẬP EMAIL ============ */}
                            {step === 1 && (
                                <>
                                    <p className="auth-hint-text">{t('auth.forgotHint')}</p>

                                    <form onSubmit={handleSendOtp} className="auth-form" noValidate>
                                        <div className="auth-field-block">
                                            <div className={`auth-input-group ${fieldErrors.email ? 'input-has-error' : ''}`}>
                                                <Mail size={18} color={fieldErrors.email ? '#c00000' : '#777'} className="auth-input-icon" />
                                                <input
                                                    type="email"
                                                    placeholder={t('auth.emailField')}
                                                    value={email}
                                                    onChange={handleFieldChange(setEmail, 'email')}
                                                    className="auth-input"
                                                />
                                            </div>
                                            {fieldErrors.email && <span className="custom-field-error">{fieldErrors.email}</span>}
                                        </div>

                                        <button type="submit" disabled={loading} className="auth-submit-btn">
                                            {loading ? t('auth.processing') : t('auth.forgotSendBtn')}
                                        </button>
                                    </form>
                                </>
                            )}

                            {/* ============ BƯỚC 2: NHẬP OTP + MẬT KHẨU MỚI ============ */}
                            {step === 2 && (
                                <>
                                    <p className="auth-hint-text">{t('auth.otpSentTo')}</p>
                                    <p className="auth-hint-text auth-hint-email">{email}</p>

                                    {notice && (
                                        <div className="auth-success-message">
                                            <CheckCircle2 size={18} style={{ marginRight: 8, flexShrink: 0 }} />
                                            <span>{notice}</span>
                                        </div>
                                    )}

                                    <form onSubmit={handleReset} className="auth-form" noValidate>
                                        <div className="auth-field-block">
                                            <div className={`auth-input-group ${fieldErrors.otp ? 'input-has-error' : ''}`}>
                                                <KeyRound size={18} color={fieldErrors.otp ? '#c00000' : '#777'} className="auth-input-icon" />
                                                <input
                                                    type="text"
                                                    inputMode="numeric"
                                                    autoComplete="one-time-code"
                                                    maxLength={OTP_LENGTH}
                                                    placeholder={t('auth.otpField')}
                                                    value={otp}
                                                    onChange={handleOtpChange}
                                                    className="auth-input auth-otp-input"
                                                />
                                            </div>
                                            {fieldErrors.otp && <span className="custom-field-error">{fieldErrors.otp}</span>}
                                        </div>

                                        <div className="auth-field-block">
                                            <div className={`auth-input-group ${fieldErrors.password ? 'input-has-error' : ''}`}>
                                                <Lock size={18} color={fieldErrors.password ? '#c00000' : '#777'} className="auth-input-icon" />
                                                <input
                                                    type="password"
                                                    placeholder={t('auth.newPasswordPlaceholder')}
                                                    value={password}
                                                    onChange={handleFieldChange(setPassword, 'password')}
                                                    className="auth-input"
                                                />
                                            </div>
                                            {fieldErrors.password && <span className="custom-field-error">{fieldErrors.password}</span>}
                                        </div>

                                        <div className="auth-field-block">
                                            <div className={`auth-input-group ${fieldErrors.confirmPassword ? 'input-has-error' : ''}`}>
                                                <Lock size={18} color={fieldErrors.confirmPassword ? '#c00000' : '#777'} className="auth-input-icon" />
                                                <input
                                                    type="password"
                                                    placeholder={t('auth.confirmPasswordPlaceholder')}
                                                    value={confirmPassword}
                                                    onChange={handleFieldChange(setConfirmPassword, 'confirmPassword')}
                                                    className="auth-input"
                                                />
                                            </div>
                                            {fieldErrors.confirmPassword && <span className="custom-field-error">{fieldErrors.confirmPassword}</span>}
                                        </div>

                                        <div className={`auth-otp-timer ${otpExpired ? 'is-expired' : ''}`}>
                                            <Clock size={14} style={{ marginRight: 6, verticalAlign: '-2px' }} />
                                            {otpExpired
                                                ? t('auth.otpExpired')
                                                : `${t('auth.otpValidFor')} ${formatTime(secondsLeft)}`}
                                        </div>

                                        <button type="submit" disabled={loading || otpExpired} className="auth-submit-btn">
                                            {loading ? t('auth.processing') : t('auth.resetBtn')}
                                        </button>

                                        <div className="auth-otp-actions">
                                            <button
                                                type="button"
                                                className="auth-link-btn"
                                                onClick={handleResendOtp}
                                                disabled={resendLeft > 0 || loading}
                                            >
                                                <RefreshCw size={14} style={{ marginRight: 6, verticalAlign: '-2px' }} />
                                                {resendLeft > 0
                                                    ? `${t('auth.otpResend')} (${formatTime(resendLeft)})`
                                                    : t('auth.otpResend')}
                                            </button>
                                            <button type="button" className="auth-link-btn" onClick={handleChangeEmail}>
                                                {t('auth.otpChangeEmail')}
                                            </button>
                                        </div>
                                    </form>
                                </>
                            )}
                        </div>
                    )}

                    <div className="auth-back-row">
                        <button
                            type="button"
                            className="auth-link-btn"
                            onClick={() => navigate('/login')}
                            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                        >
                            <ArrowLeft size={16} />
                            <span>{t('auth.backToLogin')}</span>
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

export default ForgotPassword;
