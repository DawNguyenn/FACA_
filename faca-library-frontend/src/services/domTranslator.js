import i18n from '../i18n';
import { translateText, getCachedTranslation } from './autoTranslate';

const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'CODE', 'PRE', 'TEXTAREA', 'IFRAME']);
const TRANSLATABLE_ATTRS = ['placeholder', 'title', 'alt'];
const VI_CHAR_RE = /[\u00C0-\u01B0\u1EA0-\u1EFF]/;
const originalTextMap = new WeakMap();

let observer = null;
let applying = false;          
let pendingRoots = new Set();  
let debounceTimer = null;

const isViLang = () => (i18n.language || 'vi').startsWith('vi');

const shouldTranslateTextNode = (node) => {
    if (!node || node.nodeType !== Node.TEXT_NODE) return false;
    const parent = node.parentElement;
    if (!parent) return false;
    if (SKIP_TAGS.has(parent.tagName)) return false;
    if (parent.closest('[data-no-translate]')) return false;
    if (parent.closest('[contenteditable="true"]')) return false;

    const original = originalTextMap.get(node) ?? node.textContent;
    if (!original || !original.trim()) return false;
    if (!VI_CHAR_RE.test(original)) return false;

    return true;
};

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
        if (!originalTextMap.has(node)) {
            originalTextMap.set(node, node.textContent);
        }
        const source = originalTextMap.get(node);
        const cached = getCachedTranslation(lang, source);
        if (cached !== null) {
            if (node.textContent !== cached) {
                applying = true;
                node.textContent = cached;
                applying = false;
            }
            continue;
        }

        const translated = await translateText(source, lang);
        if (translated && translated !== source && node.isConnected) {
            applying = true;
            node.textContent = translated;
            applying = false;
        }
    }
};

export const translateAttributes = async (lang, root = document.body) => {
    if (isViLang()) return;

    const selector = TRANSLATABLE_ATTRS.map((a) => `[${a}]`).join(',');
    root.querySelectorAll(selector).forEach((el) => {
        TRANSLATABLE_ATTRS.forEach((attr) => {
            const current = el.getAttribute(attr);
            if (!current) return;

            const origKey = `data-orig-${attr}`;
            if (!el.getAttribute(origKey)) {
                el.setAttribute(origKey, current);
            }
            const original = el.getAttribute(origKey);

            if (!VI_CHAR_RE.test(original)) return;
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

const runTranslationPass = async (root, lang) => {
    try {
        await translateTextNodesIn(root, lang);
        await translateAttributes(lang, root);
    } catch (err) {
        console.warn('[domTranslator] Lỗi khi quét DOM:', err);
    }
};

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

export const startDomTranslation = () => {
    if (observer) return; 

    observer = new MutationObserver((mutations) => {
        if (applying || isViLang()) return;

        const rootsToScan = new Set();

        for (const mutation of mutations) {
            if (mutation.type === 'attributes') {
                rootsToScan.add(mutation.target);
                continue;
            }
            for (const node of mutation.addedNodes) {
                if (node.nodeType !== Node.ELEMENT_NODE && node.nodeType !== Node.TEXT_NODE) continue;
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

    // Đổi ngôn ngữ (từ LanguageSwitcher / Profile) 
    i18n.on('languageChanged', (lng) => {
        if (!lng.startsWith('vi')) {
            runTranslationPass(document.body, lng);
        }
    });

    if (!isViLang()) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => runTranslationPass(document.body, i18n.language));
        } else {
            runTranslationPass(document.body, i18n.language);
        }
    }
};

export default { startDomTranslation, translateAttributes };
