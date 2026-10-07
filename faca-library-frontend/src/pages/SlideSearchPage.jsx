/**
 * SlideSearchPage — Tra cuu NOI DUNG trong tung slide PowerPoint.
 * Layout Dashboard 2 cot (LG Innotek theme):
 *  - Hero Card: input (max-width 800px) + nut Tim kiem / Quet lai + Quick chips
 *  - Trai (38%): ket qua dang Card (thumbnail + ten file + so slide + snippet highlight)
 *  - Phai (62%): Preview Viewer + Toolbar (tieu de / Download / Fullscreen)
 *  - Empty: trai = Recent + HOT, phai = placeholder. Loading: skeleton 2 cot.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import {
    Search, AlertCircle, RefreshCw, FileText,
    Image as ImageIcon, Presentation, FileSearch, Download,
    Maximize, Clock, Flame, Trash2, MonitorPlay, ChevronRight, Layers,
} from 'lucide-react';
import { PdfViewer, PdfSearchBar } from '../components/slides/PdfViewer';
import '../styles/Pages.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const CATEGORY_LABEL_KEYS = {
    LOI_DIEN: 'header.catElectrical',
    LOI_QUANG: 'header.catOptical',
    LOI_CO: 'header.catMechanical',
};

const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });
const EMPTY_PDF_MATCHES = { total: 0, pages: [] };
const QUICK_KEYWORDS = ['short circuit', 'lens blur', 'sensor test', 'Bao cao loi Q3'];
const RECENT_KEY = 'slide-recent-searches';
const MAX_RECENT = 8;

function folderOf(fullPath) {
    const s = String(fullPath || '').replace(/[\\/]+$/, '');
    const last = Math.max(s.lastIndexOf('\\'), s.lastIndexOf('/'));
    if (last <= 0) return '';
    const parent = s.slice(0, last).replace(/[\\/]+$/, '');
    const prev = Math.max(parent.lastIndexOf('\\'), parent.lastIndexOf('/'));
    return prev >= 0 ? parent.slice(prev + 1) : parent;
}

function pdfUrlOf(selected) {
    if (!selected || !selected.fileId) return '';
    const qs = new URLSearchParams({ fileId: selected.fileId });
    const token = localStorage.getItem('token') || '';
    if (token) qs.set('token', token);
    return `${API_URL}/slides/pdf?${qs.toString()}`;
}

function thumbUrlOf(item) {
    if (!item || !item.fileId) return '';
    const idx = Math.max(1, Number(item.slideIndex) || 1);
    const qs = new URLSearchParams({ fileId: item.fileId, slideIndex: String(idx) });
    const token = localStorage.getItem('token') || '';
    if (token) qs.set('token', token);
    return `${API_URL}/slides/image?${qs.toString()}`;
}

function loadRecent() {
    try {
        const raw = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
        return Array.isArray(raw) ? raw.filter(Boolean).slice(0, MAX_RECENT) : [];
    } catch { return []; }
}

/** Highlight tu khoa trong snippet (case-insensitive). */
function HighlightedSnippet({ text, keyword }) {
    const str = String(text || '');
    const kw = String(keyword || '').trim();
    if (!str) return null;
    if (!kw) return <>{str}</>;
    let parts;
    try {
        const esc = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        parts = str.split(new RegExp(`(${esc})`, 'gi'));
    } catch { return <>{str}</>; }
    const low = kw.toLowerCase();
    return (
        <>
            {parts.map((p, i) => (
                p.toLowerCase() === low
                    ? <mark key={i} className="slide-hl">{p}</mark>
                    : <span key={i}>{p}</span>
            ))}
        </>
    );
}

/** Thumbnail slide thu nho (lazy + fallback icon). */
function SlideThumb({ item }) {
    const [failed, setFailed] = useState(false);
    const url = useMemo(() => thumbUrlOf(item), [item]);
    if (!url || failed) {
        return (
            <div className="slide-thumb slide-thumb-fallback" aria-hidden="true">
                <Presentation size={22} />
                <span>S{Math.max(1, Number(item?.slideIndex) || 1)}</span>
            </div>
        );
    }
    return (
        <div className="slide-thumb">
            <img src={url} alt="" loading="lazy" onError={() => setFailed(true)} />
            <span className="slide-thumb-badge">S{Math.max(1, Number(item?.slideIndex) || 1)}</span>
        </div>
    );
}

/** Skeleton 1 card ket qua (cot trai). */
function ResultSkeleton() {
    return (
        <div className="slide-card-skel animate-pulse" aria-hidden="true">
            <div className="slide-thumb-skel" />
            <div className="slide-card-skel-body">
                <div className="h-3.5 w-3/4 rounded bg-slate-200" />
                <div className="mt-2 h-3 w-full rounded bg-slate-100" />
                <div className="mt-1.5 h-3 w-2/3 rounded bg-slate-100" />
            </div>
        </div>
    );
}
/** Khung xem PDF / anh (tach rieng cho gon). */
function ViewerBody(props) {
    const {
        t, viewMode, setViewMode, pdfQuery, setPdfQuery, setPdfActive,
        pdfMatches, pdfActive, pdfStep, pdfUrl, selectedSlideNo,
        pdfQueryDebounced, setPdfMatchState, pdfApiRef,
        imageUrl, imageLoading, imageError, selected,
        setLoadedUrl, setFailedUrl,
    } = props;
    return (
        <>
            <div className="slide-mode-switch" role="group" aria-label={t('pages.slideViewMode')}>
                <button type="button" className={viewMode === 'pdf' ? 'active' : ''} onClick={() => setViewMode('pdf')}>
                    <FileSearch size={13} />
                    <span>{t('pages.slideViewPdf')}</span>
                </button>
                <button type="button" className={viewMode === 'image' ? 'active' : ''} onClick={() => setViewMode('image')}>
                    <ImageIcon size={13} />
                    <span>{t('pages.slideViewImage')}</span>
                </button>
            </div>
            <div className="px-4 pb-4 sm:px-5 sm:pb-5">
                {viewMode === 'pdf' ? (
                    <div className="pdf-mode-wrap rounded-xl">
                        <PdfSearchBar
                            query={pdfQuery}
                            onQueryChange={(v) => { setPdfQuery(v); setPdfActive(0); }}
                            total={pdfMatches.total}
                            activeIndex={pdfActive}
                            onPrev={() => pdfStep(-1)}
                            onNext={() => pdfStep(1)}
                            onClear={() => { setPdfQuery(''); setPdfActive(0); }}
                            t={t}
                        />
                        <PdfViewer
                            pdfUrl={pdfUrl}
                            initialPage={selectedSlideNo}
                            searchQuery={pdfQueryDebounced}
                            onMatchesChange={(m) => { setPdfMatchState({ url: pdfUrl, data: m }); setPdfActive(0); }}
                            activeMatchIndex={pdfActive}
                            apiRef={pdfApiRef}
                            t={t}
                        />
                    </div>
                ) : imageUrl ? (
                    <div className="slide-image-wrap rounded-xl">
                        {imageLoading && (
                            <div className="slide-viewer-fallback">
                                <span className="slide-spinner" />
                                <span>{t('pages.slideRendering')}</span>
                            </div>
                        )}
                        <img
                            key={imageUrl}
                            className="slide-image"
                            src={imageUrl}
                            alt={selected.fileName}
                            onLoad={() => { setLoadedUrl(imageUrl); setFailedUrl(''); }}
                            onError={() => { setFailedUrl(imageUrl); setLoadedUrl(''); }}
                        />
                    </div>
                ) : (
                    <div className="slide-viewer-fallback rounded-xl">
                        <AlertCircle size={22} />
                        <span>{t('pages.slideImageFail')}</span>
                    </div>
                )}
            </div>
            {imageError && <p className="slide-viewer-note">{t('pages.slideImageFailHint')}</p>}
        </>
    );
}

const SlideSearchPage = () => {
    const { t } = useTranslation();
    const [searchParams, setSearchParams] = useSearchParams();
    const keyword = searchParams.get('q') || '';

    const [results, setResults] = useState([]);
    const [stats, setStats] = useState(null);
    const [note, setNote] = useState(null);
    const [tab, setTab] = useState('all');
    const [selected, setSelected] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [reindexing, setReindexing] = useState(false);
    const [notice, setNotice] = useState(null);
    const [recent, setRecent] = useState(loadRecent);

    const inputRef = useRef(null);
    const viewerBoxRef = useRef(null);

    const [viewMode, setViewMode] = useState('pdf');
    const [loadedUrl, setLoadedUrl] = useState('');
    const [failedUrl, setFailedUrl] = useState('');
    // pdfQuery khoi tao theo keyword; dong bo them trong submit/quickSearch.
    // (Khong dung effect rieng de tranh react-hooks/set-state-in-effect.)
    const [pdfQuery, setPdfQuery] = useState(keyword || '');
    const [pdfQueryDebounced, setPdfQueryDebounced] = useState('');
    useEffect(() => {
        const id = setTimeout(() => setPdfQueryDebounced(pdfQuery.trim()), 400);
        return () => clearTimeout(id);
    }, [pdfQuery]);

    const pdfUrl = useMemo(() => pdfUrlOf(selected), [selected]);
    const imageUrl = useMemo(() => {
        if (!selected || !selected.fileId) return '';
        const idx = Math.max(1, Number(selected.slideIndex) || 1);
        const qs = new URLSearchParams({ fileId: selected.fileId, slideIndex: String(idx) });
        const token = localStorage.getItem('token') || '';
        if (token) qs.set('token', token);
        return `${API_URL}/slides/image?${qs.toString()}`;
    }, [selected]);

    const [pdfMatchState, setPdfMatchState] = useState({ url: '', data: EMPTY_PDF_MATCHES });
    const pdfMatches = pdfMatchState.url === pdfUrl ? pdfMatchState.data : EMPTY_PDF_MATCHES;
    const [pdfActive, setPdfActive] = useState(0);
    const pdfApiRef = useRef(null);
    const pdfStep = (delta) => {
        const total = pdfMatches.total;
        if (!total) return;
        const next = (pdfActive + delta + total) % total;
        setPdfActive(next);
        if (pdfApiRef.current) pdfApiRef.current.goToMatch(next);
    };
    const imageLoading = Boolean(imageUrl) && loadedUrl !== imageUrl && failedUrl !== imageUrl;
    const imageError = Boolean(imageUrl) && failedUrl === imageUrl;

    useEffect(() => {
        const kw = keyword.trim();
        // Dong bo o tim trong PDF + reset match moi lan tu khoa URL doi
        // (can thiet: keyword tu URL, pdfQuery la state nhap tay trong viewer)
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setPdfQuery(keyword || '');
        setPdfActive(0);
        setPdfMatchState({ url: '', data: EMPTY_PDF_MATCHES });
        const controller = new AbortController();
        const load = async () => {
            if (!kw) {
                setResults([]); setSelected(null); setNote(null); setStats(null); setError(null);
                return;
            }
            setLoading(true); setError(null);
            try {
                const res = await axios.get(`${API_URL}/slides/search`, {
                    params: { keyword: kw },
                    headers: authHeaders(),
                    signal: controller.signal,
                });
                const data = res.data?.data || [];
                setResults(data);
                setStats(res.data?.stats || null);
                setNote(res.data?.note || null);
                setSelected(data[0] || null);
                setTab('all');
                setLoadedUrl(''); setFailedUrl('');
                setRecent((prev) => {
                    const next = [kw, ...prev.filter((k) => k !== kw)].slice(0, MAX_RECENT);
                    try { localStorage.setItem(RECENT_KEY, JSON.stringify(next)); } catch { /* noop */ }
                    return next;
                });
            } catch (err) {
                if (axios.isCancel(err)) return;
                const status = err.response?.status;
                const msg = err.response?.data?.message || err.message;
                setError(`${t('pages.slideSearchFail')} (${status || 'network'}: ${msg})`);
            } finally { setLoading(false); }
        };
        load();
        return () => controller.abort();
    }, [keyword, t]);

    const submit = (e) => {
        e.preventDefault();
        const kw = String(inputRef.current?.value || '').trim();
        setSelected(null);
        setSearchParams(kw ? { q: kw } : {});
    };

    const quickSearch = (kw) => {
        setSelected(null);
        setSearchParams({ q: kw });
        if (inputRef.current) inputRef.current.value = kw;
    };

    const reindex = async () => {
        setReindexing(true); setNotice(null);
        try {
            const res = await axios.post(`${API_URL}/slides/reindex`, {}, { headers: authHeaders() });
            const s = res.data?.data || {};
            setNotice({
                type: 'ok',
                text: t('pages.slideReindexDone', {
                    total: s.total || 0, indexed: s.indexed || 0,
                    offline: s.offline || 0, failed: s.failed || 0,
                }),
            });
            if (keyword.trim()) setSearchParams({ q: keyword.trim() });
        } catch (err) {
            setNotice({ type: 'error', text: err.response?.data?.message || t('pages.slideReindexFail') });
        } finally { setReindexing(false); }
    };

    const slideResults = useMemo(() => results.filter((r) => r.type === 'slide'), [results]);
    const fileResults = useMemo(() => results.filter((r) => r.type !== 'slide'), [results]);
    const visible = tab === 'slides' ? slideResults : tab === 'files' ? fileResults : results;
    const categoryLabel = useCallback(
        (code) => (code && CATEGORY_LABEL_KEYS[code] ? t(CATEGORY_LABEL_KEYS[code]) : code),
        [t],
    );

    const hasKeyword = Boolean(keyword.trim());
    const selectItem = (item) => {
        setSelected(item);
        setLoadedUrl(''); setFailedUrl('');
        if (pdfApiRef.current) pdfApiRef.current.goToPage(Math.max(1, Number(item.slideIndex) || 1));
    };

    const goFullscreen = () => {
        const el = viewerBoxRef.current;
        if (!el) return;
        if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
        else el.requestFullscreen?.().catch(() => {});
    };

    const clearRecent = () => {
        setRecent([]);
        try { localStorage.removeItem(RECENT_KEY); } catch { /* noop */ }
    };

    const selectedSlideNo = Math.max(1, Number(selected?.slideIndex) || 1);

    return (
        <div className="min-h-screen bg-[#F8FAFC]">
            <div className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6">
                <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <h1 className="flex items-center gap-2.5 text-xl font-extrabold text-slate-900 sm:text-2xl">
                            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#C00000] text-white shadow-sm">
                                <Presentation size={20} />
                            </span>
                            <span>{t('pages.slideTitle')}</span>
                        </h1>
                        <p className="mt-1.5 max-w-3xl text-sm text-slate-500">{t('pages.slideSubtitle')}</p>
                    </div>
                    {stats && (
                        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-slate-600 shadow-sm">
                                <Layers size={13} className="text-slate-400" />
                                {t('pages.slideStats', { indexed: stats.indexedFiles, total: stats.totalFiles })}
                            </span>
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-slate-600 shadow-sm">
                                {t('pages.slideStatsSlides', { count: stats.indexedSlides })}
                            </span>
                        </div>
                    )}
                </div>

                <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                    <form onSubmit={submit} className="flex flex-col gap-3 lg:flex-row lg:items-center">
                        <label
                            htmlFor="slide-search-input"
                            className="flex w-full max-w-[800px] flex-1 cursor-text items-center gap-2.5 rounded-xl border border-slate-200 bg-[#F8FAFC] px-4 py-3"
                        >
                            <Search size={17} className="shrink-0 text-slate-400" />
                            <input
                                id="slide-search-input"
                                key={keyword}
                                ref={inputRef}
                                type="text"
                                defaultValue={keyword}
                                placeholder={t('pages.slidePlaceholder')}
                                className="w-full min-w-0 flex-1 border-0 bg-transparent text-sm text-slate-800 outline-none"
                            />
                        </label>
                        <div className="flex shrink-0 items-center gap-2.5">
                            <button
                                type="submit"
                                disabled={loading}
                                className="inline-flex items-center gap-2 rounded-xl bg-[#C00000] px-5 py-3 text-sm font-bold text-white shadow-sm hover:bg-[#A00000] disabled:opacity-60"
                            >
                                <Search size={15} />
                                <span>{loading ? t('pages.slideSearching') : t('pages.slideSearchBtn')}</span>
                            </button>
                            <button
                                type="button"
                                onClick={reindex}
                                disabled={reindexing}
                                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600 shadow-sm hover:border-[#C00000] hover:text-[#C00000] disabled:opacity-60"
                            >
                                <RefreshCw size={15} className={reindexing ? 'animate-spin' : ''} />
                                <span className="hidden sm:inline">{reindexing ? t('pages.slideReindexing') : t('pages.slideReindex')}</span>
                            </button>
                        </div>
                    </form>
                    <div className="mt-3.5 flex flex-wrap items-center gap-2">
                        <span className="text-xs font-semibold text-slate-400">{t('pages.slideQuickHint')}</span>
                        {QUICK_KEYWORDS.map((kw) => (
                            <button
                                key={kw}
                                type="button"
                                onClick={() => quickSearch(kw)}
                                className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:border-[#C00000]/40 hover:bg-red-50 hover:text-[#C00000]"
                            >
                                {kw}
                            </button>
                        ))}
                    </div>
                </section>

                {notice && <div className={`reports-notice ${notice.type} mt-4`}>{notice.text}</div>}
                {note && !notice && <div className="reports-notice warn mt-4">{note}</div>}

                <main className="mt-5 grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,38%)_minmax(0,1fr)]">
                    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                        <div className="border-b border-slate-100 px-4 py-3.5 sm:px-5">
                            <div className="flex items-center justify-between gap-2">
                                <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                                    <FileSearch size={16} className="text-[#C00000]" />
                                    {t('pages.slideResultsTitle')}
                                </h2>
                                {hasKeyword && !loading && (
                                    <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-bold text-[#C00000]">
                                        {t('pages.slideCount', { count: visible.length })}
                                    </span>
                                )}
                            </div>
                            {hasKeyword && !loading && results.length > 0 && (
                                <div className="mt-2.5 flex flex-wrap gap-1.5">
                                    <button type="button" onClick={() => setTab('all')} className={tab === 'all' ? 'slide-tab active' : 'slide-tab'}>
                                        {t('pages.slideTabAll')} ({results.length})
                                    </button>
                                    <button type="button" onClick={() => setTab('slides')} className={tab === 'slides' ? 'slide-tab active' : 'slide-tab'}>
                                        {t('pages.slideTabSlides')} ({slideResults.length})
                                    </button>
                                    <button type="button" onClick={() => setTab('files')} className={tab === 'files' ? 'slide-tab active' : 'slide-tab'}>
                                        {t('pages.slideTabFiles')} ({fileResults.length})
                                    </button>
                                </div>
                            )}
                        </div>
                        <div className="slide-result-scroll max-h-[72vh] overflow-y-auto p-3 sm:p-4">
                            {loading ? (
                                <div className="flex flex-col gap-3">
                                    {[0, 1, 2, 3].map((i) => <ResultSkeleton key={i} />)}
                                </div>
                            ) : error ? (
                                <div className="flex flex-col items-center gap-2 rounded-xl border border-red-100 bg-red-50/50 px-4 py-10 text-center">
                                    <AlertCircle size={28} className="text-red-400" />
                                    <p className="text-sm font-medium text-red-700">{error}</p>
                                </div>
                            ) : !hasKeyword ? (
                                <div className="flex flex-col gap-5 py-1">
                                    <div>
                                        <div className="mb-2 flex items-center justify-between">
                                            <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-400">
                                                <Clock size={13} /> {t('pages.slideRecentTitle')}
                                            </h3>
                                            {recent.length > 0 && (
                                                <button type="button" onClick={clearRecent} className="inline-flex items-center gap-1 text-xs font-medium text-slate-400 hover:text-red-600">
                                                    <Trash2 size={12} /> {t('pages.slideClear')}
                                                </button>
                                            )}
                                        </div>
                                        {recent.length === 0 ? (
                                            <p className="rounded-xl bg-slate-50 px-3.5 py-3 text-xs text-slate-400">{t('pages.slideHistoryEmpty')}</p>
                                        ) : (
                                            <div className="flex flex-col gap-1.5">
                                                {recent.map((rk) => (
                                                    <button key={rk} type="button" onClick={() => quickSearch(rk)} className="slide-recent-row">
                                                        <span className="flex min-w-0 items-center gap-2">
                                                            <Clock size={14} className="shrink-0 text-slate-300" />
                                                            <span className="truncate">{rk}</span>
                                                        </span>
                                                        <ChevronRight size={14} className="shrink-0 text-slate-300" />
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    <div>
                                        <h3 className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-400">
                                            <Flame size={13} /> {t('pages.slideHotTitle')}
                                        </h3>
                                        <div className="flex flex-wrap gap-2">
                                            {QUICK_KEYWORDS.map((kw) => (
                                                <button key={kw} type="button" onClick={() => quickSearch(kw)} className="slide-chip">
                                                    {kw}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <p className="rounded-xl bg-slate-50 px-3.5 py-3 text-center text-xs leading-relaxed text-slate-400">
                                        {t('pages.slideEmptyHint')}
                                    </p>
                                </div>
                            ) : results.length === 0 ? (
                                <div className="flex flex-col items-center gap-2.5 px-4 py-12 text-center">
                                    <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                                        <FileSearch size={26} />
                                    </span>
                                    <p className="text-sm font-bold text-slate-700">{t('pages.slideNoResult')}</p>
                                    <p className="max-w-xs text-xs leading-relaxed text-slate-400">{t('pages.slideNoResultHint')}</p>
                                </div>
                            ) : (
                                <div className="flex flex-col gap-3">
                                    {visible.map((item, index) => (
                                        <button
                                            key={`${item.type}-${item.fileId}-${item.slideIndex ?? 0}-${index}`}
                                            type="button"
                                            onClick={() => selectItem(item)}
                                            className={selected === item ? 'slide-result-card active' : 'slide-result-card'}
                                        >
                                            <SlideThumb item={item} />
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-start justify-between gap-2">
                                                    <p className="min-w-0 flex-1 truncate text-[13px] font-bold text-slate-900" title={item.fileName}>
                                                        {item.fileName}
                                                    </p>
                                                    {item.type === 'slide' ? (
                                                        <span className="shrink-0 rounded-full bg-[#C00000] px-2 py-0.5 text-[11px] font-bold text-white">
                                                            Slide {item.slideIndex}
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800" title={t('pages.slideFileBadgeHint')}>
                                                            <FileText size={11} />{t('pages.slideFileBadge')}
                                                        </span>
                                                    )}
                                                </div>
                                                {item.snippet && (
                                                    <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-slate-500">
                                                        <HighlightedSnippet text={item.snippet} keyword={keyword} />
                                                    </p>
                                                )}
                                                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                                    {item.categoryCode && (
                                                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
                                                            {categoryLabel(item.categoryCode)}
                                                        </span>
                                                    )}
                                                    {item.filePath && (
                                                        <span className="inline-flex min-w-0 max-w-full items-center gap-1 text-[11px] text-slate-400">
                                                            <MonitorPlay size={11} className="shrink-0" />
                                                            <span className="truncate">{folderOf(item.filePath)}</span>
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </section>

                    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm xl:sticky xl:top-4">
                        <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-slate-100 bg-white px-4 py-3 sm:px-5">
                            <div className="flex min-w-0 flex-1 items-center gap-2.5">
                                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-white">
                                    <MonitorPlay size={17} />
                                </span>
                                <div className="min-w-0">
                                    <h2 className="text-sm font-bold text-slate-900">{t('pages.slidePreviewTitle')}</h2>
                                    <p className="truncate text-xs text-slate-400" title={selected?.fileName || ''}>
                                        {selected ? `${selected.fileName} - Slide ${selectedSlideNo}` : t('pages.slideViewerEmpty')}
                                    </p>
                                </div>
                            </div>
                            <div className="flex shrink-0 items-center gap-2">
                                {selected && pdfUrl && (
                                    <a href={pdfUrl} download className="slide-tool-btn" title={t('pages.slideDownload')}>
                                        <Download size={14} />
                                        <span className="hidden sm:inline">{t('pages.slideDownload')}</span>
                                    </a>
                                )}
                                <button type="button" onClick={goFullscreen} className="slide-tool-btn" title={t('pages.slideFullscreen')}>
                                    <Maximize size={14} />
                                    <span className="hidden sm:inline">{t('pages.slideFullscreen')}</span>
                                </button>
                            </div>
                        </div>
                        <div ref={viewerBoxRef} className="bg-[#F8FAFC]">
                            {loading ? (
                                <div className="p-4 sm:p-5">
                                    <div className="animate-pulse">
                                        <div className="flex items-center gap-2">
                                            <div className="h-8 flex-1 rounded-lg bg-slate-200" />
                                            <div className="h-8 w-8 rounded-full bg-slate-200" />
                                        </div>
                                        <div className="mt-3 h-[480px] rounded-xl bg-slate-200" />
                                    </div>
                                </div>
                            ) : !selected ? (
                                <div className="flex min-h-[520px] flex-col items-center justify-center gap-3 px-6 py-16 text-center">
                                    <span className="flex h-20 w-20 items-center justify-center rounded-3xl bg-white text-slate-300 shadow-sm ring-1 ring-slate-200">
                                        <Presentation size={40} />
                                    </span>
                                    <p className="max-w-sm text-sm font-bold text-slate-600">{t('pages.slidePreviewHint')}</p>
                                    <p className="max-w-sm text-xs leading-relaxed text-slate-400">{t('pages.slideViewerEmpty')}</p>
                                </div>
                            ) : (
                                <ViewerBody
                                    t={t}
                                    viewMode={viewMode}
                                    setViewMode={setViewMode}
                                    pdfQuery={pdfQuery}
                                    setPdfQuery={setPdfQuery}
                                    setPdfActive={setPdfActive}
                                    pdfMatches={pdfMatches}
                                    pdfActive={pdfActive}
                                    pdfStep={pdfStep}
                                    pdfUrl={pdfUrl}
                                    selectedSlideNo={selectedSlideNo}
                                    pdfQueryDebounced={pdfQueryDebounced}
                                    setPdfMatchState={setPdfMatchState}
                                    pdfApiRef={pdfApiRef}
                                    imageUrl={imageUrl}
                                    imageLoading={imageLoading}
                                    imageError={imageError}
                                    selected={selected}
                                    imageLoadingUrl={imageUrl}
                                    setLoadedUrl={setLoadedUrl}
                                    setFailedUrl={setFailedUrl}
                                />
                            )}
                        </div>
                    </section>
                </main>
            </div>
        </div>
    );
};

export default SlideSearchPage;

