import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import vi from './vi';
import en from './en';
import ko from './ko';

// Danh sách ngôn ngữ được hỗ trợ (đồng bộ với backend & cột language trong DB)
export const LANGUAGES = [
    { code: 'vi', flag: '🇻🇳', label: 'Tiếng Việt' },
    { code: 'en', flag: '🇬🇧', label: 'English' },
    { code: 'ko', flag: '🇰🇷', label: '한국어' },
];

i18n
    // Ưu tiên ngôn ngữ đã lưu trong localStorage ('language' do trang Profile quản lý)
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources: {
            vi: vi,
            en: en,
            ko: ko,
        },
        fallbackLng: 'vi',
        supportedLngs: ['vi', 'en', 'ko'],
        detection: {
            order: ['localStorage'],
            lookupLocalStorage: 'app_language',
            caches: ['localStorage'],
        },
        interpolation: { escapeValue: false },
        // Fallback an toàn cho các phần dùng dictionary thủ công
        returnNull: false,
        returnEmptyString: false,
        // Lưu ý: key i18n là định danh (vd auth.save) chứ không phải văn bản
        // tự nhiên nên KHÔNG auto-dịch key. Các chuỗi văn bản chưa khai báo
        // sẽ được DOM Translator + useSmartTranslate tự động dịch (hybrid).
        parseMissingKeyHandler: (key) => key,
    });

export default i18n;
