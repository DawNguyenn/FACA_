import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, FileSearch, Loader, AlertCircle, X } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
// Worker cua pdf.js: lay tu bundle de Vite copy vao dist -> xem PDF duoc ca khi
// may nguoi dung/may chu KHONG co internet (truoc day lay tu CDN nen se hong).
import workerAssetUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

/** Worker local (fallback CDN chi de phong khi khong lay duoc asset local). */
pdfjsLib.GlobalWorkerOptions.workerSrc = workerAssetUrl
    || `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

/**
 * Chuan hoa 1 ky tu: bo dau tieng Viet + đ -> d.
 * (NFD co the tach 1 ky tu thanh nhieu ma, nen tra ve chuoi chu khong phai ky tu.)
 */
const normChar = (ch) =>
    ch.toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd');

/**
 * Tao "haystack" da chuan hoa + bang anh xa vi tri ve CHUOI GOC:
 *  - bo dau tieng Viet        : "cáp" -> "cap"
 *  - gop nhieu khoang trang   : "cap  dien" -> "cap dien" (pdf.js hay chen
 *    khoang trang de can le; neu khong gop thi tim "cap dien" se bi truot)
 * `map[i]` = index trong chuoi goc cua ky tu chuan hoa thu i; them 1 phan tu
 * cuoi (do dai chuoi goc) de tinh duoc index ket thuc cua match.
 */
const buildHaystack = (text) => {
    const orig = String(text || '');
    const chars = [];
    const map = [];
    let prevSpace = false;
    let i = 0;
    while (i < orig.length) {
        // Doc theo CODE POINT: emoji (surrogate pair) khong bi tach doi.
        const point = orig.codePointAt(i);
        const width = point > 0xffff ? 2 : 1;
        i += width;
        const ch = normChar(orig.substr(i - width, width));
        if (!ch) continue;
        if (/\s/.test(ch)) {
            if (prevSpace) continue;
            prevSpace = true;
            chars.push(' ');
            map.push(i - width);
            continue;
        }
        prevSpace = false;
        for (let k = 0; k < ch.length; k += 1) {
            chars.push(ch[k]);
            map.push(i - width);
        }
    }
    map.push(orig.length);
    return { hay: chars.join(''), map };
};

/** Chuan hoa query theo cung quy tac: bo dau + gop/bo khoang trang thua. */
const normalizeQuery = (q) => buildHaystack(q).hay.trim();

/**
 * Tim TAT CA vi tri khop `queryNorm` (query DA chuan hoa) trong 1 chuoi.
 * Tra ve {start, length} theo index cua CHUOI GOC nen cat chuoi goc la dung.
 */
const findAllSpans = (text, queryNorm) => {
    const spans = [];
    if (!queryNorm) return spans;
    const { hay, map } = buildHaystack(text);
    let from = 0;
    for (;;) {
        const at = hay.indexOf(queryNorm, from);
        if (at < 0) break;
        const start = map[at];
        const end = map[at + queryNorm.length];
        if (end > start) spans.push({ start, length: end - start });
        from = at + Math.max(1, queryNorm.length);
    }
    return spans;
};

/**
 * Thanh tim kiem text trong PDF (dang trong trinh duyet):
 * - O nhap query + so dem "match i / N" + nut Prev/Next + nut Xoa.
 * - Khi submit/go ky tu: tinh lai matches tren toan bo pages (tu cache text
 *   pdf.js lay san), highlight truc tiep tren trang hien tai, nhay toi slide
 *   chua match dau tien; Prev/Next nhay giua cac slide co match.
 */
export function PdfSearchBar({
    query,
    onQueryChange,
    total,
    activeIndex,
    onPrev,
    onNext,
    onClear,
    t,
}) {
    const label = (t && t('pages.pdfSearchPlaceholder')) || 'Tìm text trong slide…';
    return (
        <form
            className="pdf-searchbar"
            onSubmit={(e) => { e.preventDefault(); onNext && onNext(); }}
        >
            <FileSearch size={15} className="pdf-searchbar-icon" />
            <input
                type="text"
                value={query}
                onChange={(e) => onQueryChange && onQueryChange(e.target.value)}
                placeholder={label}
                aria-label={label}
            />
            {query ? (
                <span className="pdf-searchbar-count">
                    {total > 0 ? `${Math.min(activeIndex + 1, total)}/${total}` : `0/0`}
                </span>
            ) : null}
            <button
                type="button"
                onClick={onPrev}
                disabled={!total}
                title={(t && t('pages.pdfPrevMatch')) || 'Match trước'}
                aria-label={(t && t('pages.pdfPrevMatch')) || 'Match trước'}
            >
                <ChevronUp size={15} />
            </button>
            <button
                type="button"
                onClick={onNext}
                disabled={!total}
                title={(t && t('pages.pdfNextMatch')) || 'Match tiếp'}
                aria-label={(t && t('pages.pdfNextMatch')) || 'Match tiếp'}
            >
                <ChevronDown size={15} />
            </button>
            {query ? (
                <button
                    type="button"
                    onClick={onClear}
                    title={(t && t('pages.pdfClearSearch')) || 'Xoá tìm kiếm'}
                    aria-label={(t && t('pages.pdfClearSearch')) || 'Xoá tìm kiếm'}
                >
                    <X size={15} />
                </button>
            ) : null}
        </form>
    );
}

/**
 * PdfViewer — hien thi tung trang PDF (1 trang = 1 slide) bang pdf.js + canvas,
 * kem text-layer highlight truc tiep tren slide + dieu huong Prev/Next match.
 */
export function PdfViewer({
    pdfUrl,
    initialPage = 1,
    searchQuery = '',
    onMatchesChange,
    activeMatchIndex = 0,
    t,
    // apiRef (tuy chon): nhan cac ham dieu khien tu ben ngoai
    //   apiRef.current.goToPage(soTrang)  -> nhay toi slide cu the
    //   apiRef.current.goToMatch(chiSo)   -> nhay toi match thu chiSo (0-based)
    // Parent goi trong EVENT HANDLER (click Prev/Next, chon ket qua) nen khong
    // can effect dong bo state giua 2 component.
    apiRef,
}) {
    const canvasRef = useRef(null);
    const wrapRef = useRef(null);
    const viewportRef = useRef(null);
    const docRef = useRef(null);
    const loadIdRef = useRef(0);
    const loadTaskRef = useRef(null);
    const matchesRef = useRef([]);
    // docKey = pdfUrl: doi file -> effect load lai, khong can setState dem.
    const docKey = pdfUrl || '';
    const [numPages, setNumPages] = useState(0);
    const [page, setPage] = useState(Math.max(1, Number(initialPage) || 1));
    const [loading, setLoading] = useState(true);
    const [converting, setConverting] = useState(false);
    const [error, setError] = useState('');
    const [matches, setMatches] = useState([]);
    const [pageSpans, setPageSpans] = useState([]);
    const [canvasSize, setCanvasSize] = useState({ w: 0, h: 0 });
    const [viewportTx, setViewportTx] = useState(null);
    // Kich thuoc HIEN THI cua khung canvas (px) — can de dat text-layer chinh xac.
    const [dispSize, setDispSize] = useState({ w: 0, h: 0 });

    // Theo doi kich thuoc that cua khung canvas: canvas luon rong 100% khung,
    // nen scale = dispSize.w / canvasSize.w dung cho ca left/top/font-size.
    // (ResizeObserver callback la subscription -> khong vi pham setState-in-effect.)
    useEffect(() => {
        const el = wrapRef.current;
        if (!el || typeof ResizeObserver === 'undefined') return undefined;
        const ro = new ResizeObserver((entries) => {
            const rect = entries[0] && entries[0].contentRect;
            if (!rect) return;
            setDispSize((prev) => (
                Math.abs(prev.w - rect.width) < 0.5 && Math.abs(prev.h - rect.height) < 0.5
                    ? prev
                    : { w: rect.width, h: rect.height }
            ));
        });
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    const queryNorm = useMemo(() => normalizeQuery(searchQuery), [searchQuery]);
    useEffect(() => {
        matchesRef.current = matches;
    }, [matches]);

    // Load PDF theo docKey (docKey tang moi khi doi file) + initialPage reset.
    // Khong setState dong bo trong effect: moi state chi doi trong callback async.
    useEffect(() => {
        if (!docKey) return undefined;
        const loadId = ++loadIdRef.current;
        const startPage = Math.max(1, Number(initialPage) || 1);
        if (!pdfUrl) return undefined;
        let cancelled = false;
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 240_000);
        let convTimer = null;
        (async () => {
            try {
                setLoading(true);
                setConverting(false);
                // Doi file -> bo ket qua quet text cua file truoc (tranh highlight nham).
                matchesRef.current = [];
                setMatches([]);
                setPageSpans([]);
                setNumPages(0);
                // Convert lau (>4s) thi doi thong bao sang "dang convert PowerPoint".
                convTimer = setTimeout(() => setConverting(true), 4_000);
                const res = await fetch(pdfUrl, { signal: ctrl.signal });
                if (!res.ok) {
                    let msg = `Không tải được PDF (HTTP ${res.status}).`;
                    try {
                        const data = await res.json();
                        if (data && data.message) msg = data.message;
                    } catch { /* giu msg mac dinh */ }
                    throw new Error(msg);
                }
                const buf = await res.arrayBuffer();
                if (cancelled || loadIdRef.current !== loadId) return;
                // Giu lai loadingTask de co the destroy() (giai phong worker +
                // bo nho) khi doi file hoac unmount.
                const task = pdfjsLib.getDocument({ data: buf });
                loadTaskRef.current = task;
                const doc = await task.promise;
                if (cancelled || loadIdRef.current !== loadId) {
                    try { await task.destroy(); } catch { /* bo qua */ }
                    return;
                }
                docRef.current = doc;
                setNumPages(doc.numPages);
                setPage(Math.min(startPage, doc.numPages));
                setError('');
                setConverting(false);
                setLoading(false);
            } catch (err) {
                if (cancelled || loadIdRef.current !== loadId) return;
                const msg = err && err.name === 'AbortError'
                    ? 'Convert PDF quá lâu (quá 4 phút). File nặng — hãy thử lại.'
                    : (err && err.message) || 'Không tải được PDF.';
                setError(msg);
                setLoading(false);
                setConverting(false);
            } finally {
                clearTimeout(timer);
                if (convTimer) clearTimeout(convTimer);
            }
        })();
        return () => {
            cancelled = true;
            clearTimeout(timer);
            if (convTimer) clearTimeout(convTimer);
            // Doi file / unmount: giai phong PDF doc cu (worker + bo nho).
            const task = loadTaskRef.current;
            loadTaskRef.current = null;
            docRef.current = null;
            if (task) {
                try { task.destroy(); } catch { /* bo qua */ }
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [docKey]);

    // Quet text toan bo pages (toi da 300) de dem matches cho searchbar.
    // State matches chi doi trong callback async, kem guard version.
    const scanKey = `${docKey}:${numPages}:${queryNorm}`;
    useEffect(() => {
        const doc = docRef.current;
        if (!doc || !numPages) return undefined;
        const myKey = scanKey;
        let cancelled = false;
        (async () => {
            try {
                const out = [];
                const maxScan = Math.min(numPages, 300);
                for (let p = 1; p <= maxScan; p += 1) {
                    const pg = await doc.getPage(p);
                    const tc = await pg.getTextContent();
                    const full = tc.items.map((it) => String(it.str || '')).join('\n');
                    findAllSpans(full, queryNorm).forEach((sp) => out.push({ page: p, ...sp }));
                    if (cancelled || scanKey !== myKey) return;
                }
                if (!cancelled && scanKey === myKey) {
                    setMatches(out);
                    if (onMatchesChange) {
                        onMatchesChange({ total: out.length, pages: [...new Set(out.map((m) => m.page))] });
                    }
                    if (queryNorm && out.length > 0) {
                        setPage((prev) => (prev === out[0].page ? prev : out[0].page));
                    }
                }
            } catch { /* bo qua */ }
        })();
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [scanKey]);

    // API dieu khien tu parent (chi goi trong event handler):
    //   goToPage(n)  -> nhay slide thu n
    //   goToMatch(k) -> nhay toi match thu k (0-based) va tra ve so trang
    const goToPage = useCallback((p) => {
        const doc = docRef.current;
        const max = (doc && doc.numPages) || 0;
        const want = Math.max(1, Number(p) || 1);
        const next = max ? Math.min(want, max) : want;
        setPage((prev) => (prev === next ? prev : next));
        return next;
    }, []);
    const goToMatch = useCallback((idx) => {
        const m = matchesRef.current[Number(idx) || 0];
        if (!m) return null;
        setPage((prev) => (prev === m.page ? prev : m.page));
        return m.page;
    }, []);
    useEffect(() => {
        if (!apiRef) return undefined;
        apiRef.current = { goToPage, goToMatch };
        return () => { apiRef.current = null; };
    }, [apiRef, goToPage, goToMatch]);

    // Render trang hien tai: canvas + text-layer co highlight (React render,
    // khong dung innerHTML truc tiep voi text PDF de tranh XSS).
    // Key renderKey doi khi chuyen trang/query/file/match -> effect chi doc,
    // viet state trong callback async, khong setState dong bo.
    const renderKey = `${docKey}:${page}:${numPages}:${queryNorm}:${matches.length}:${activeMatchIndex}`;
    useEffect(() => {
        const doc = docRef.current;
        const canvas = canvasRef.current;
        if (!doc || !canvas || !numPages) return undefined;
        let cancelled = false;
        const myKey = renderKey;
        const safePage = Math.min(Math.max(1, page), numPages);
        // Snapshot matches/active de tinh highlight nhat quan trong async.
        const snapMatches = matchesRef.current;
        const snapActive = activeMatchIndex;
        const snapQuery = queryNorm;
        (async () => {
            try {
                const pg = await doc.getPage(safePage);
                if (cancelled || renderKey !== myKey) return;
                const viewport = pg.getViewport({ scale: 1.6 });
                viewportRef.current = viewport;
                canvas.width = Math.floor(viewport.width);
                canvas.height = Math.floor(viewport.height);
                setCanvasSize({ w: canvas.width, h: canvas.height });
                setViewportTx(viewport.transform);
                await pg.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
                if (cancelled || renderKey !== myKey) return;
                const tc = await pg.getTextContent();
                if (cancelled || renderKey !== myKey) return;
                // Danh dau span active: span thu k trong trang, voi
                // k = activeMatchIndex - so match o cac trang truoc.
                const activeGlobal = snapMatches[snapActive];
                let activeFlat = -1;
                if (activeGlobal && activeGlobal.page === safePage && snapQuery) {
                    let before = 0;
                    for (const m of snapMatches) {
                        if (m.page < safePage) before += 1;
                        else break;
                    }
                    activeFlat = snapActive - before;
                }
                const perItem = tc.items.map((item) => {
                    const str = String(item.str || '');
                    const spans = snapQuery ? findAllSpans(str, snapQuery) : [];
                    return { str, transform: item.transform, spans };
                });
                let counter = 0;
                const boxed = perItem.map((it) => {
                    const out = it.spans.map((sp) => {
                        const isActive = counter === activeFlat;
                        counter += 1;
                        return { ...sp, active: isActive && activeFlat >= 0 };
                    });
                    return { str: it.str, transform: it.transform, spans: out };
                });
                if (!cancelled && renderKey === myKey) setPageSpans(boxed);
            } catch (err) {
                if (!cancelled && renderKey === myKey) setError((err && err.message) || 'Không hiển thị được trang PDF.');
            }
        })();
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [renderKey]);

    // Toa do tung dong text tren canvas (don vi PX): lay viewport transform da luu
    // trong state khi render xong, nhan voi ti le canvas-hien-thi / canvas-ve.
    const lineBoxes = useMemo(() => {
        if (!viewportTx || !canvasSize.w || !canvasSize.h || !dispSize.w) return [];
        const scale = dispSize.w / canvasSize.w;
        const tx = pdfjsLib.Util.transform(viewportTx, [1, 0, 0, -1, 0, 0]);
        return pageSpans.map((line) => {
            const t = line.transform || [1, 0, 0, 1, 0, 0];
            const itemTx = pdfjsLib.Util.transform(tx, t);
            const fontH = Math.max(8, Math.hypot(itemTx[2], itemTx[3]));
            return {
                left: itemTx[4] * scale,
                top: (itemTx[5] - fontH) * scale,
                fontSize: fontH * scale,
            };
        });
    }, [pageSpans, viewportTx, canvasSize, dispSize]);

    const totalMatches = matches.length;
    const pagesWithMatch = useMemo(() => [...new Set(matches.map((m) => m.page))], [matches]);

    if (!pdfUrl) return null;
    return (
        <div className="pdf-viewer">
            <div className="pdf-canvas-wrap" ref={wrapRef}>
                {(loading || converting) && (
                    <div className="slide-viewer-fallback">
                        <Loader size={22} className="spin" />
                        <span>
                            {converting
                                ? ((t && t('pages.pdfConverting')) || 'Đang convert PowerPoint sang PDF (có thể mất 1–3 phút lần đầu)…')
                                : ((t && t('pages.slideRendering')) || 'Đang tải PDF…')}
                        </span>
                    </div>
                )}
                {error && !loading ? (
                    <div className="slide-viewer-fallback">
                        <AlertCircle size={22} />
                        <span>{error}</span>
                    </div>
                ) : null}
                <canvas ref={canvasRef} className="pdf-canvas" />
                <div className="pdf-textlayer" aria-hidden="true">
                    {lineBoxes.map((box, i) => {
                        const line = pageSpans[i];
                        if (!line) return null;
                        const parts = [];
                        let cursor = 0;
                        line.spans.forEach((sp, k) => {
                            if (sp.start > cursor) {
                                parts.push(
                                    <span key={`t${k}`}>{line.str.slice(cursor, sp.start)}</span>,
                                );
                            }
                            parts.push(
                                <span key={`h${k}`} className={sp.active ? 'pdf-hl active' : 'pdf-hl'}>
                                    {line.str.slice(sp.start, sp.start + sp.length)}
                                </span>,
                            );
                            cursor = sp.start + sp.length;
                        });
                        if (cursor < line.str.length) {
                            parts.push(<span key="tail">{line.str.slice(cursor)}</span>);
                        }
                        if (parts.length === 0) parts.push(<span key="all">{line.str}</span>);
                        return (
                            <div
                                key={i}
                                className="pdf-textline"
                                style={{ left: `${box.left}px`, top: `${box.top}px`, fontSize: `${box.fontSize}px` }}
                            >
                                {parts}
                            </div>
                        );
                    })}
                </div>
            </div>
            <div className="pdf-pager">
                <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => goToPage(page - 1)}
                >
                    ‹
                </button>
                <span>{numPages ? `${page}/${numPages}` : '—'}</span>
                <button
                    type="button"
                    disabled={!numPages || page >= numPages}
                    onClick={() => goToPage(page + 1)}
                >
                    ›
                </button>
                {queryNorm ? (
                    <span className="pdf-pager-matches">
                        {totalMatches > 0
                            ? (t
                                ? t('pages.pdfMatchCount', { count: totalMatches, pages: pagesWithMatch.join(', ') })
                                : `${totalMatches} match · slide ${pagesWithMatch.join(', ')}`)
                            : (t ? t('pages.pdfNoMatch') : '0 match')}
                    </span>
                ) : null}
            </div>
        </div>
    );
}

export default PdfViewer;