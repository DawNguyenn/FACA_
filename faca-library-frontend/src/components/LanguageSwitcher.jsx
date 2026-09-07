import { useTranslation } from 'react-i18next';
import { LANGUAGES } from '../i18n';
import '../Styles/LanguageSwitcher.css';

/**
 * LanguageSwitcher — Nhóm nút chọn ngôn ngữ nhỏ gọn (🇻🇳 VN | 🇬🇧 EN | 🇰🇷 KO)
 * Dùng ở góc trên phải các trang Đăng nhập / Đăng ký.
 * Đổi ngôn ngữ lập tức cho toàn bộ ứng dụng + ghi nhớ vào localStorage ('app_language').
 */
const LanguageSwitcher = ({ className = '' }) => {
    const { i18n } = useTranslation();

    const handleLanguageChange = (lang) => {
        i18n.changeLanguage(lang);
        localStorage.setItem('app_language', lang);
        // Key 'language' giữ tương thích với dữ liệu cũ
        localStorage.setItem('language', lang);
    };

    return (
        <div className={`lang-switcher ${className}`} role="group" aria-label="Language / Ngôn ngữ / 언어">
            {LANGUAGES.map((lang) => (
                <button
                    key={lang.code}
                    type="button"
                    className={`lang-switcher-btn ${i18n.language === lang.code ? 'active' : ''}`}
                    onClick={() => handleLanguageChange(lang.code)}
                    title={lang.label}
                >
                    <span className="lang-switcher-flag">{lang.flag}</span>
                    <span className="lang-switcher-code">{lang.code.toUpperCase()}</span>
                </button>
            ))}
        </div>
    );
};

export default LanguageSwitcher;
