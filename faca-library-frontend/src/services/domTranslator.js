// ================================================================
//  domTranslator.js — Dịch TOÀN BỘ DOM tự động (Hybrid catch-all)
//
//  Mục tiêu: không sót bất kỳ văn bản nào hiển thị trên màn hình
//  (text tĩnh, text load từ API, popup, text do React re-render).
//
//  Cơ chế:
//  - MutationObserver theo dõi document.body (childList + subtree +
//    attributes placeholder/title/alt). Khi DOM thay đổi -> quét &
//    dịch các text node / attribute mới xuất hiện.
//  - LUÔN dịch từ bản gốc tiếng Việt: bản gốc của mỗi text node được
//    giữ trong WeakMap, của attribute trong data-orig-* -> không bao
//    giờ xảy ra dịch chồng (en -> ko).
//  - Chống vòng lặp tự-trigger: bỏ qua mutation do chính translator tạo ra.
//  - Bỏ qua: script/style/code/pre, nội dung người dùng nhập (input value
//    không phải text node nên an toàn), và chuỗi không có dấu tiếng Việt
//    (tên riêng, mã...) để tiết kiệm request.
// ================================================================

import i18n from '../i18n';
import { translateText, getCachedTranslation } from './autoTranslate';

const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'CODE', 'PRE', 'TEXTAREA', 'IFRAME']);
const TRANSLATABLE_ATTRS = ['placeholder', 'title', 'alt'];

// Ký tự Latin mở rộng có dấu (chủ yếu là tiếng Việt) — heuristic lọc chuỗi cần dịch
const VI_CHAR_RE = /[\u00C0-\u01B0\u1EA0-\u1EFF]/;

// Bản gốc của từng text node (giữ nguyên ngay cả khi node đã bị dịch)
const originalTextMap = new WeakMap();

let observer = null;
let applying = false;          // cờ chặn vòng lặp mutation do chính mình tạo
let pendingRoots = new Set();  // các subtree chờ quét (debounce)
let debounceTimer = null;

const isViLang = () => (i18n.language || 'vi').startsWith('vi');

/** 1 text node có đủ điều kiện dịch hay không */
const shouldTranslateTextNode = (node) => {
    if (!node || node.nodeType !== Node.TEXT_NODE) return false;
    const parent = node.parentElement;
    if (!parent) return false;
    if (SKIP_TAGS.has(parent.tagName)) return false;
    if (parent.closest('[data-no-translate]')) return false;
    if (parent.closest('[contenteditable="true"]')) return false;

    // Luôn lấy văn bản GỐC tiếng Việt đã lưu
    const original = originalTextMap.get(node) ?? node.textContent;
    if (!original || !original.trim()) return false;
    if (!VI_CHAR_RE.test(original)) return false; // không phải tiếng Việt -> bỏ qua

    return true;
};

/** Quét & dịch các text node trong 1 subtree */
const translateTextNodesIn = async (root, lang) => {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
        acceptNode: (node) => (shouldTranslateTextNode(node) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT),
    });

    const nodes = [];
    let current = walker.nextNode();
    while (current) {
        nodes.push(current);
        current = walker.nextNode();
    }

    for (const node of nodes) {
        // Lưu bản gốc tiếng Việt lần đầu gặp node
        if (!originalTextMap.has(node)) {
            originalTextMap.set(node, node.textContent);
        }
        const source = originalTextMap.get(node);

        // Ưu tiên cache -> thay DOM ngay, không cần chờ mạng
        const cached = getCachedTranslation(lang, source);
        if (cached !== null) {
            if (node.textContent !== cached) {
                applying = true;
                node.textContent = cached;
                applying = false;
            }
            continue;
        }

        // Chưa có cache -> gọi API (translateText đã tự cache kết quả)
        const translated = await translateText(source, lang);
        if (translated && translated !== source && node.isConnected) {
            applying = true;
            node.textContent = translated;
            applying = false;
        }
    }
};

/** Dịch các attribute placeholder / title / alt trong 1 subtree */
export const translateAttributes = async (lang, root = document.body) => {
    if (isViLang()) return;

    const selector = TRANSLATABLE_ATTRS.map((a) => `[${a}]`).join(',');
    root.querySelectorAll(selector).forEach((el) => {
        TRANSLATABLE_ATTRS.forEach((attr) => {
            const current = el.getAttribute(attr);
            if (!current) return;

            const origKey = `data-orig-${attr}`;
            // Lưu bản gốc tiếng Việt lần đầu tiên
            if (!el.getAttribute(origKey)) {
                el.setAttribute(origKey, current);
            }
            const original = el.getAttribute(origKey);

            // Nếu bản gốc không phải tiếng Việt -> bỏ qua
            if (!VI_CHAR_RE.test(original)) return;
            // Đã đúng bản dịch cho ngôn ngữ hiện tại -> bỏ qua
            if (el.getAttribute(`data-tr-${attr}`) === lang) return;

            translateText(original, lang).then((translated) => {
                if (translated && translated !== original) {
                    applying = true;
                    el.setAttribute(attr, translated);
                    el.setAttribute(`data-tr-${attr}`, lang);
                    applying = false;
                }
            });
        });
    });
};

/** Quét toàn bộ 1 subtree: text nodes + attributes */
const runTranslationPass = async (root, lang) => {
    try {
        await translateTextNodesIn(root, lang);
        await translateAttributes(lang, root);
    } catch (err) {
        console.warn('[domTranslator] Lỗi khi quét DOM:', err);
    }
};

/** Debounce: gom các mutation rồi quét 1 lần */
const scheduleTranslation = (root) => {
    if (isViLang()) return;
    pendingRoots.add(root);
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
        const roots = [...pendingRoots];
        pendingRoots.clear();
        roots.forEach((r) => runTranslationPass(r, i18n.language));
    }, 120);
};

/**
 * Khởi động observer toàn trang.
 * Gọi 1 lần trong main.jsx sau khi import i18n.
 */
export const startDomTranslation = () => {
    if (observer) return; // đã khởi động

    observer = new MutationObserver((mutations) => {
        // Bỏ qua mutation do chính translator tạo ra (chống vòng lặp)
        if (applying || isViLang()) return;

        const rootsToScan = new Set();

        for (const mutation of mutations) {
            if (mutation.type === 'attributes') {
                rootsToScan.add(mutation.target);
                continue;
            }
            for (const node of mutation.addedNodes) {
                if (node.nodeType !== Node.ELEMENT_NODE && node.nodeType !== Node.TEXT_NODE) continue;
                // Ưu tiên quét subtree nhỏ nhất vừa được thêm vào
                rootsToScan.add(node.parentElement || node);
            }
        }

        rootsToScan.forEach((r) => scheduleTranslation(r));
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: true,
        attributeFilter: TRANSLATABLE_ATTRS,
    });

    // Đổi ngôn ngữ (từ LanguageSwitcher / Profile) -> quét lại toàn trang
    i18n.on('languageChanged', (lng) => {
        if (!lng.startsWith('vi')) {
            runTranslationPass(document.body, lng);
        }
    });

    // Lần đầu vào trang: nếu ngôn ngữ đã lưu != vi -> dịch toàn bộ màn hình
    if (!isViLang()) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => runTranslationPass(document.body, i18n.language));
        } else {
            runTranslationPass(document.body, i18n.language);
        }
    }
};

export default { startDomTranslation, translateAttributes };
