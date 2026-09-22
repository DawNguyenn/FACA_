import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff, Lock } from 'lucide-react';

/**
 * PasswordInput — ô nhập mật khẩu có nút HIỆN/ẨN nội dung (con mắt).
 *
 * Dùng chung cho tất cả trang auth (Đăng nhập, Đăng ký, Quên mật khẩu, Đặt lại mật khẩu)
 * nên giữ nguyên cấu trúc CSS `.auth-input-group / .auth-input-icon / .auth-input`
 * để giao diện và trạng thái lỗi (`input-has-error`) không thay đổi.
 *
 * @param {{
 *   value: string,
 *   onChange: (e: React.ChangeEvent<HTMLInputElement>) => void,
 *   placeholder?: string,
 *   hasError?: boolean,          — tô viền đỏ + icon đỏ khi trường bị lỗi
 *   icon?: React.ComponentType,  — icon bên trái (mặc định Lock)
 *   autoComplete?: string,       — 'current-password' khi đăng nhập, 'new-password' khi tạo mới
 *   name?: string, id?: string,
 *   disabled?: boolean, className?: string
 * }} props
 */
export default function PasswordInput({
    value,
    onChange,
    placeholder,
    hasError = false,
    icon: Icon = Lock,
    autoComplete = 'current-password',
    name,
    id,
    disabled = false,
    className = '',
}) {
    const { t } = useTranslation();
    // false = đang ẩn (hiện dấu ●), true = đang hiện mật khẩu dạng chữ thường
    const [visible, setVisible] = useState(false);

    const toggleLabel = visible ? t('auth.hidePassword') : t('auth.showPassword');

    return (
        <div className={`auth-input-group ${hasError ? 'input-has-error' : ''}`}>
            <Icon size={18} color={hasError ? '#c00000' : '#777'} className="auth-input-icon" />
            <input
                // Đổi qua lại password <-> text để người dùng kiểm tra lại ký tự đã gõ
                type={visible ? 'text' : 'password'}
                className={`auth-input auth-input-password ${className}`.trim()}
                placeholder={placeholder}
                value={value}
                onChange={onChange}
                autoComplete={autoComplete}
                name={name}
                id={id}
                disabled={disabled}
            />
            <button
                // type="button" để nút này KHÔNG kích hoạt submit form
                type="button"
                className="auth-password-toggle"
                onClick={() => setVisible((v) => !v)}
                title={toggleLabel}
                aria-label={toggleLabel}
                aria-pressed={visible}
                disabled={disabled}
            >
                {visible ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
        </div>
    );
}