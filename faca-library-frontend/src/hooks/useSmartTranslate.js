import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { translateText, getCachedTranslation } from '../services/autoTranslate';

/**
 * useSmartTranslate — Cơ chế dịch kết hợp (Hybrid Translation)
 *
 * Luồng ưu tiên khi gọi smartT(text, key?):
 *   Bước 1: Nếu `key` tồn tại trong dictionary thủ công (vi.js/en.js/ko.js)
 *           -> trả về bản dịch THỦ CÔNG (t(key)).
 *   Bước 2: Ngôn ngữ hiện tại là 'vi' (nguồn) -> trả về văn bản gốc.
 *   Bước 3: Đã có kết quả dịch tự động trong cache (memory/localStorage)
 *           -> trả về từ cache.
 *   Bước 4: Gọi API dịch tự động NGẦM (background) và tự re-render
 *           khi có kết quả; trước đó trả về văn bản gốc tạm thời.
 *
 * File ngôn ngữ thủ công hoàn toàn KHÔNG bị ghi đè hay xóa.
 */
export const useSmartTranslate = () => {
    const { t, i18n } = useTranslation();
    const currentLang = i18n.language;

    // Bộ đếm để re-render component khi có kết quả dịch tự động về
    const [translationTick, setTranslationTick] = useState(0);

    const smartT = (text, key = null) => {
        // Bước 1: Ưu tiên bản dịch thủ công theo key
        if (key && i18n.exists(key)) {
            return t(key);
        }

        const isVi = (currentLang || 'vi').startsWith('vi');

        // Bước 2: Tiếng Việt là ngôn ngữ gốc -> trả nguyên văn
        if (isVi) return text;

        if (!text) return text;

        // Bước 3: Cache dịch tự động (memory + localStorage)
        const cached = getCachedTranslation(currentLang, text);
        if (cached !== null) return cached;

        // Bước 4: Dịch ngầm rồi re-render component đang dùng hook
        translateText(text, currentLang)
            .then((translated) => {
                if (translated && translated !== text) {
                    setTranslationTick((n) => n + 1);
                }
            })
            .catch(() => { /* đã có fallback bên trong translateText */ });

        // Trả tạm văn bản gốc trong khi chờ dịch
        return text;
    };

    return { smartT, currentLang, translationTick };
};

export default useSmartTranslate;

