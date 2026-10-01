/**
 * SlideSearchPage.jsx — Tra cứu NỘI DUNG bên trong từng slide PowerPoint.
 *
 * Dữ liệu lấy từ GET /api/slides/search (2 tầng):
 *   - type='slide': khớp nội dung slide (đã trích xuất, index được đúng số slide)
 *   - type='file' : khớp TÊN FILE (file OneDrive chưa tải về máy vẫn tìm được)
 * Kết quả chọn được xem ngay trong trang: PDF convert (.pptx -> .pdf) render bằng
 * pdf.js nên tìm được text (chính) hoặc ẢNH slide do server render (dự phòng).
 * Không còn mở tab mới / Office Online Viewer / PowerPoint Online.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import {
    Search, Loader, AlertCircle, RefreshCw,
    FileText, Info, Image as ImageIcon, Presentation, FileSearch,
} from 'lucide-react';
import DocumentViewerHeader from '../components/common/DocumentViewerHeader';
import {
    PdfViewer,
    PdfSearchBar,
} from '../components/slides/PdfViewer';
import '../styles/Pages.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Mã danh mục -> khóa dịch (dùng chung với trang Quản lý Lỗi)
const CATEGORY_LABEL_KEYS = {
    LOI_DIEN: 'header.catElectrical',
    LOI_QUANG: 'header.catOptical',
    LOI_CO: 'header.catMechanical',
};

const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });

/** Ket qua quet text PDF rong — dung chung de giu nguyen identity giua cac render. */
const EMPTY_PDF_MATCHES = { total: 0, pages: [] };

/**
 * Lấy TÊN THƯ MỤC CHA chứa file từ đường dẫn đầy đủ (dùng cho header khung xem).
 *   "C:\\Users\\...\\Thu muc cha\\file.pptx" -> "Thu muc cha"
 * Trả về chuỗi rỗng nếu không tách được.
 */
function folderOf(fullPath) {
    const s = String(fullPath || '').replace(/[\\/]+$/, '');
    const last = Math.max(s.lastIndexOf('\\'), s.lastIndexOf('/'));
    if (last <= 0) return '';
    const parent = s.slice(0, last).replace(/[\\/]+$/, '');
    const prev = Math.max(parent.lastIndexOf('\\'), parent.lastIndexOf('/'));
    return prev >= 0 ? parent.slice(prev + 1) : parent;
}

/**
 * URL PDF INLINE do backend convert (.pptx -> .pdf) roi serve (GET /api/slides/pdf).
 * Token di kem query vi pdfjs-dist fetch truc tiep khong gui duoc header Auth.
 */
function pdfUrlOf(selected) {
    if (!selected || !selected.fileId) return '';
    const qs = new URLSearchParams({ fileId: selected.fileId });
    const token = localStorage.getItem('token') || '';
    if (token) qs.set('token', token);
    return `${API_URL}/slides/pdf?${qs.toString()}`;
}

/**
 * Danh sách kết quả (trái) + khung nhúng slide (phải).
 * Tách riêng để phần state ở trên gọn hơn, không ảnh hưởng logic tìm kiếm.
 */
function ResultsArea({ results, slideResults, fileResults, visible, tab, setTab, selected, setSelected, categoryLabel, t, defaultPdfQuery = '' }) {
    // Che do xem: 'pdf'   = PDF convert trong trinh duyet (mac dinh, tim text duoc)
    //             'image' = anh render tu may chu (du phong khi convert loi)
    const [viewMode, setViewMode] = useState('pdf');
    const [loadedUrl, setLoadedUrl] = useState('');
    const [failedUrl, setFailedUrl] = useState('');

    /**
     * URL anh suy ra truc tiep tu `selected` (khong dung effect/State):
     * - fileId   : duong dan local cua .pptx do backend tra ve
     * - slideIndex: 1-based; file hang "file" chua co slide -> mac dinh slide 1
     * - token    : trong query vi <img src> khong gui duoc header Authorization
     */
    const imageUrl = useMemo(() => {
        if (!selected || !selected.fileId) return '';
        const idx = Math.max(1, Number(selected.slideIndex) || 1);
        const qs = new URLSearchParams({ fileId: selected.fileId, slideIndex: String(idx) });
        const token = localStorage.getItem('token') || '';
        if (token) qs.set('token', token);
        return `${API_URL}/slides/image?${qs.toString()}`;
    }, [selected]);

    // Tim text trong PDF (trong trinh duyet): khoi tao bang chinh tu khoa dang
    // tim slide (ResultsArea mount lai moi lan tim), debounce 400ms truoc khi quet.
    const [pdfQuery, setPdfQuery] = useState(defaultPdfQuery || '');
    const [pdfQueryDebounced, setPdfQueryDebounced] = useState('');
    useEffect(() => {
        const id = setTimeout(() => setPdfQueryDebounced(pdfQuery.trim()), 400);
        return () => clearTimeout(id);
    }, [pdfQuery]);
    // URL PDF convert (kem token) — doi khi doi file chon.
    const pdfUrl = useMemo(() => pdfUrlOf(selected), [selected]);
    // Ket qua quet text duoc GAN voi dung pdfUrl da quet: doi file -> pdfMatches
    // tu dong tro ve rong (khong can effect reset state trong component).
    const [pdfMatchState, setPdfMatchState] = useState({ url: '', data: EMPTY_PDF_MATCHES });
    const pdfMatches = pdfMatchState.url === pdfUrl ? pdfMatchState.data : EMPTY_PDF_MATCHES;
    const [pdfActive, setPdfActive] = useState(0);
    const pdfApiRef = useRef(null);
    // Prev/Next match: doi match dang chon roi bao viewer nhay toi slide chua match
    // do. Goi trong event handler nen khong can effect dong bo giua 2 component.
    const pdfStep = (delta) => {
        const total = pdfMatches.total;
        if (!total) return;
        const next = (pdfActive + delta + total) % total;
        setPdfActive(next);
        if (pdfApiRef.current) pdfApiRef.current.goToMatch(next);
    };
    const pdfPrev = () => pdfStep(-1);
    const pdfNext = () => pdfStep(1);
    // Suy ra trang thai tu URL hien tai (khong setState trong effect):
    const imageLoading = Boolean(imageUrl) && loadedUrl !== imageUrl && failedUrl !== imageUrl;
    const imageError = Boolean(imageUrl) && failedUrl === imageUrl;

    return (
        <>
            <div className="issues-filters slide-tabs">
                <button type="button" className={`issues-filter-chip ${tab === 'all' ? 'active' : ''}`} onClick={() => setTab('all')}>
                    {t('pages.slideTabAll')} ({results.length})
                </button>
                <button type="button" className={`issues-filter-chip ${tab === 'slides' ? 'active' : ''}`} onClick={() => setTab('slides')}>
                    {t('pages.slideTabSlides')} ({slideResults.length})
                </button>
                <button type="button" className={`issues-filter-chip ${tab === 'files' ? 'active' : ''}`} onClick={() => setTab('files')}>
                    {t('pages.slideTabFiles')} ({fileResults.length})
                </button>
            </div>

            <div className="slide-layout">
                <div className="slide-list">
                    {visible.map((item, index) => (
                        <button
                            type="button"
                            key={`${item.type}-${item.fileId}-${item.slideIndex ?? 0}-${index}`}
                            className={`slide-card ${selected === item ? 'active' : ''}`}
                            onClick={() => {
                                setSelected(item);
                                // Cung 1 file: PDF da tai -> nhay thang toi slide cua ket qua
                                // (khac file: viewer tu load lai va dung initialPage).
                                if (pdfApiRef.current) {
                                    pdfApiRef.current.goToPage(Math.max(1, Number(item.slideIndex) || 1));
                                }
                            }}
                        >
                            <div className="slide-card-head">
                                <span className="slide-card-title">{item.fileName}</span>
                                {item.type === 'slide' ? (
                                    <span className="issue-chip">
                                        {t('pages.slideColumnIndex')} {item.slideIndex}
                                    </span>
                                ) : (
                                    <span className="slide-badge pending" title={t('pages.slideFileBadgeHint')}>
                                        <FileText size={12} />{t('pages.slideFileBadge')}
                                    </span>
                                )}
                            </div>
                            {item.snippet && <p className="slide-card-snippet">{item.snippet}</p>}
                            {(item.categoryCode || (item.type === 'file' && item.contentIndexed)) && (
                                <div className="slide-card-meta">
                                    {item.categoryCode && <span className="issue-chip">{categoryLabel(item.categoryCode)}</span>}
                                    {item.type === 'file' && item.contentIndexed && (
                                        <span className="issue-chip">{t('pages.slideTabSlides')}</span>
                                    )}
                                </div>
                            )}
                        </button>
                    ))}
                </div>

                <div className="slide-viewer">
                    {selected ? (
                        <>
                            {/* Header viewer: DocumentViewerHeader */}
                            <DocumentViewerHeader
                                fileName={selected.fileName}
                                folderName={selected.filePath ? folderOf(selected.filePath) : t('pages.slideSourceFolder')}
                                slideTitle={t('pages.slideColumnIndex') + ' ' + Math.max(1, Number(selected.slideIndex) || 1)}
                            />
                            {/* Khung xem slide: PDF trong trinh duyet (chinh) hoac ANH render tu may chu */}
                            <div className="slide-viewer-frame">
                                <div className="slide-mode-switch" role="group" aria-label={t('pages.slideViewMode')}>
                                    <button
                                        type="button"
                                        className={viewMode === 'pdf' ? 'active' : ''}
                                        onClick={() => setViewMode('pdf')}
                                    >
                                        <FileSearch size={13} />
                                        <span>{t('pages.slideViewPdf')}</span>
                                    </button>
                                    <button
                                        type="button"
                                        className={viewMode === 'image' ? 'active' : ''}
                                        onClick={() => setViewMode('image')}
                                    >
                                        <ImageIcon size={13} />
                                        <span>{t('pages.slideViewImage')}</span>
                                    </button>
                                </div>

                                {viewMode === 'pdf' ? (
                                    <div className="pdf-mode-wrap">
                                        <PdfSearchBar
                                            query={pdfQuery}
                                            onQueryChange={(v) => { setPdfQuery(v); setPdfActive(0); }}
                                            total={pdfMatches.total}
                                            activeIndex={pdfActive}
                                            onPrev={pdfPrev}
                                            onNext={pdfNext}
                                            onClear={() => { setPdfQuery(''); setPdfActive(0); }}
                                            t={t}
                                        />
                                        <PdfViewer
                                            pdfUrl={pdfUrl}
                                            initialPage={Math.max(1, Number(selected.slideIndex) || 1)}
                                            searchQuery={pdfQueryDebounced}
                                            onMatchesChange={(m) => { setPdfMatchState({ url: pdfUrl, data: m }); setPdfActive(0); }}
                                            activeMatchIndex={pdfActive}
                                            apiRef={pdfApiRef}
                                            t={t}
                                        />
                                    </div>
                                ) : imageUrl ? (
                                    <div className="slide-image-wrap">
                                        {imageLoading && (
                                            <div className="slide-viewer-fallback">
                                                <Loader size={22} className="spin" />
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
                                    <div className="slide-viewer-fallback">
                                        <AlertCircle size={22} />
                                        <span>{t('pages.slideImageFail')}</span>
                                    </div>
                                )}
                            </div>
                            {imageError && <p className="slide-viewer-note">{t('pages.slideImageFailHint')}</p>}
                        </>
                    ) : (
                        <div className="slide-viewer-fallback">{t('pages.slideViewerEmpty')}</div>
                    )}
                </div>
            </div>
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

    // Ô nhập dùng dạng uncontrolled + key={keyword}: khi từ khóa trên URL đổi (từ ô search
    // ở Header hoặc từ chính trang này) React remount input và tự nạp lại giá trị mới,
    // không cần setState trong useEffect (tránh render dây chuyền).
    const inputRef = useRef(null);

    useEffect(() => {
        const kw = keyword.trim();
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
            } catch (err) {
                if (axios.isCancel(err)) return;
                const status = err.response?.status;
                const msg = err.response?.data?.message || err.message;
                setError(status === 401
                    ? 'Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.'
                    : `${t('pages.slideSearchFail')} (${status || 'network'}: ${msg})`);
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

    // Quét lại chỉ mục: backend tự thử tải file OneDrive cloud-only về máy rồi index
    const reindex = async () => {
        setReindexing(true); setNotice(null);
        try {
            const res = await axios.post(`${API_URL}/slides/reindex`, {}, { headers: authHeaders() });
            const s = res.data?.data || {};
            setNotice({
                type: 'ok',
                text: t('pages.slideReindexDone', {
                    total: s.total || 0,
                    indexed: s.indexed || 0,
                    offline: s.offline || 0,
                    failed: s.failed || 0,
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

    return (
        <div className="issues-page slide-page">
            <h1 className="issues-title">
                <Presentation size={22} />
                <span>{t('pages.slideTitle')}</span>
            </h1>
            <p className="reports-subtitle">{t('pages.slideSubtitle')}</p>

            {stats && (
                <div className="slide-stats">
                    <span className="slide-stats-item">
                        {t('pages.slideStats', { indexed: stats.indexedFiles, total: stats.totalFiles })}
                    </span>
                    <span className="slide-stats-item">
                        {t('pages.slideStatsSlides', { count: stats.indexedSlides })}
                    </span>
                    {stats.pendingFiles > 0 && (
                        <span className="slide-stats-item warn">
                            <Info size={14} />
                            {t('pages.slidePending', { count: stats.pendingFiles })}
                        </span>
                    )}
                </div>
            )}

            <form onSubmit={submit} className="reports-toolbar">
                {/* Label boc toan bo o tim kiem: click bat ky dau trong khung tron
                    (icon, khoang trang, vung phai) deu focus vao input */}
                <label htmlFor="slide-search-input" className="reports-search" style={{ flex: 1 }}>
                    <Search size={15} style={{ flexShrink: 0 }} />
                    <input
                        id="slide-search-input"
                        key={keyword}
                        ref={inputRef}
                        type="text"
                        defaultValue={keyword}
                        placeholder={t('pages.slidePlaceholder')}
                    />
                </label>
                <button type="submit" className="reports-sync-btn" disabled={loading}>
                    <Search size={15} />
                    <span>{loading ? t('pages.slideSearching') : t('pages.slideSearchBtn')}</span>
                </button>
                <button type="button" className="reports-sync-btn" onClick={reindex} disabled={reindexing}>
                    <RefreshCw size={15} className={reindexing ? 'spin' : ''} />
                    <span>{reindexing ? t('pages.slideReindexing') : t('pages.slideReindex')}</span>
                </button>
            </form>

            {notice && <div className={`reports-notice ${notice.type}`}>{notice.text}</div>}
            {note && !notice && <div className="reports-notice warn">{note}</div>}

            {loading ? (
                <div className="issues-loading"><Loader size={26} className="spin" /><span>{t('common.loading')}</span></div>
            ) : error ? (
                <div className="issues-empty"><AlertCircle size={22} /><span>{error}</span></div>
            ) : !keyword.trim() ? (
                <div className="issues-empty"><span>{t('pages.slideEmptyHint')}</span></div>
            ) : results.length === 0 ? (
                <div className="issues-empty"><span>{t('pages.slideNoResult')}</span></div>
            ) : (
                <ResultsArea
                    results={results}
                    slideResults={slideResults}
                    fileResults={fileResults}
                    visible={visible}
                    tab={tab}
                    setTab={setTab}
                    selected={selected}
                    setSelected={setSelected}
                    categoryLabel={categoryLabel}
                    t={t}
                    defaultPdfQuery={keyword}
                />
            )}
        </div>
    );
};

export default SlideSearchPage;

