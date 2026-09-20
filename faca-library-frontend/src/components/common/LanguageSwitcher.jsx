import { useTranslation } from 'react-i18next';
import { LANGUAGES } from '../../i18n';
import '../../styles/LanguageSwitcher.css';

const LanguageSwitcher = ({ className = '' }) => {
    const { i18n } = useTranslation();

    const handleLanguageChange = (lang) => {
        i18n.changeLanguage(lang);
        localStorage.setItem('app_language', lang);
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
