// ================================================================
//  autoTranslate.js — Dịch tự động cho các chuỗi CHƯA có trong
//  dictionary i18n thủ công (vi.js / en.js / ko.js).
//  - Endpoint: Google Translate (gtx, không cần API key)
//  - Cache 2 lớp: bộ nhớ (Map) + localStorage (tồn tại qua reload)
//  - Fallback: trả về văn bản gốc nếu API lỗi
// ================================================================

const CACHE_STORAGE_KEY = 'auto_translations_v1';
const CACHE_MAX_ENTRIES = 500;

// Cache trong bộ nhớ của phiên hiện tại: { [lang]: { [sourceText]: translated } }
const memoryCache = {};

function loadPersistedCache() {
    try {
        const raw = localStorage.getItem(CACHE_STORAGE_KEY);
        if (!raw) return {};
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
        return {};
    }
}

function savePersistedCache(cache) {
    try {
        // Giới hạn số lượng entry để localStorage không phình to
        for (const lang of Object.keys(cache)) {
            const entries = Object.entries(cache[lang]);
            if (entries.length > CACHE_MAX_ENTRIES) {
                cache[lang] = Object.fromEntries(entries.slice(-CACHE_MAX_ENTRIES));
            }
        }
        localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(cache));
    } catch {
        // localStorage đầy / không khả dụng -> bỏ qua
    }
}

/** Lấy bản dịch tự động đã cache cho 1 chuỗi (hoặc null nếu chưa có) */
export const getCachedTranslation = (lang, text) => {
    if (!memoryCache[lang]) {
        const persisted = loadPersistedCache();
        memoryCache[lang] = persisted[lang] || {};
    }
    return Object.prototype.hasOwnProperty.call(memoryCache[lang], text)
        ? memoryCache[lang][text]
        : null;
};

/** Lưu kết quả dịch vào cache (memory + localStorage) */
export const setCachedTranslation = (lang, text, translated) => {
    if (!memoryCache[lang]) {
        const persisted = loadPersistedCache();
        memoryCache[lang] = persisted[lang] || {};
    }
    memoryCache[lang][text] = translated;
    savePersistedCache(memoryCache);
};

/**
 * Gọi API dịch tự động (Google Translate gtx) từ tiếng Việt -> targetLang.
 * Trả về chuỗi đã dịch, hoặc văn bản gốc nếu có lỗi.
 */
export const translateText = async (text, targetLang) => {
    if (!text || !targetLang || targetLang === 'vi') return text;

    // Kiểm tra cache trước khi gọi mạng
    const cached = getCachedTranslation(targetLang, text);
    if (cached !== null) return cached;

    try {
        const url = 'https://translate.googleapis.com/translate_a/single'
            + `?client=gtx&sl=vi&tl=${encodeURIComponent(targetLang)}&dt=t`
            + `&q=${encodeURIComponent(text)}`;

        const res = await fetch(url);
        if (!res.ok) throw new Error(`Translate API HTTP ${res.status}`);

        const data = await res.json();
        // Format gtx: [ [ [translated, source, ...], ... ], ... ]
        const translated = (data?.[0] || [])
            .map((seg) => seg?.[0])
            .filter(Boolean)
            .join('');

        if (!translated) throw new Error('Translate API trả về rỗng.');

        setCachedTranslation(targetLang, text, translated);
        return translated;
    } catch (err) {
        console.warn('[autoTranslate] Lỗi dịch tự động, dùng văn bản gốc:', err.message);
        return text;
    }
};

/** Xóa toàn bộ cache dịch tự động (dùng khi cần refresh) */
export const clearAutoTranslateCache = () => {
    Object.keys(memoryCache).forEach((k) => delete memoryCache[k]);
    localStorage.removeItem(CACHE_STORAGE_KEY);
};

export default { translateText, getCachedTranslation, setCachedTranslation, clearAutoTranslateCache };
