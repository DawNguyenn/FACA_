import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import {
    Zap, Eye, Wrench, Layers, Loader, AlertCircle, RefreshCw, ExternalLink, Presentation, MonitorPlay, Search
} from 'lucide-react';
import '../styles/Pages.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Danh mục lỗi — tương ứng category_code trong dbo.PresentationReports (do scannerService phân loại)
const CATEGORIES = [
    { code: 'LOI_DIEN', labelKey: 'header.catElectrical', icon: Zap },
    { code: 'LOI_QUANG', labelKey: 'header.catOptical', icon: Eye },
    { code: 'LOI_CO', labelKey: 'header.catMechanical', icon: Wrench },
];

// Nhãn hiển thị trên từng thẻ báo cáo
const CATEGORY_LABEL_KEYS = {
    LOI_DIEN: 'header.catElectrical',
    LOI_QUANG: 'header.catOptical',
    LOI_CO: 'header.catMechanical',
    KHAC: 'pages.catOther',
};

/**
 * Thư viện báo cáo lỗi PowerPoint (EE / OE / ME).
 * Dữ liệu lấy từ GET /api/reports (cache bảng PresentationReports).
 * Click thẻ → mở THẲNG file .pptx trên trình duyệt (sharepoint_web_url = PowerPoint Online, ?web=1);
 * nút "Mở bằng PowerPoint" → mở bằng ứng dụng PowerPoint Desktop (powerpoint_app_url = ms-powerpoint:...).
 */
const ErrorReportsPage = () => {
    const { t } = useTranslation();
    const [searchParams, setSearchParams] = useSearchParams();
    const category = searchParams.get('category') || 'ALL';
    const search = searchParams.get('search') || '';

    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [syncing, setSyncing] = useState(false);
    const [notice, setNotice] = useState(null);
    const [searchInput, setSearchInput] = useState(search);
    const [reloadKey, setReloadKey] = useState(0);

    // Nạp danh sách báo cáo mỗi khi đổi tab danh mục hoặc từ khóa tìm kiếm
    useEffect(() => {
        const controller = new AbortController();

        const loadReports = async () => {
            setLoading(true);
            setError(null);
            try {
                const token = localStorage.getItem('token');
                const res = await axios.get(`${API_URL}/reports`, {
                    params: { category, search: search || undefined },
                    headers: { Authorization: `Bearer ${token}` },
                    signal: controller.signal,
                });
                setReports(res.data?.data || []);
            } catch (err) {
                if (axios.isCancel(err)) return;
                console.error('Không thể tải danh sách báo cáo PowerPoint:', err);
                setError(t('pages.loadFailReports'));
            } finally {
                setLoading(false);
            }
        };

        loadReports();
        return () => controller.abort();
    }, [category, search, reloadKey, t]);

    // Debounce ô tìm kiếm 400ms rồi ghi vào query string để URL luôn phản ánh bộ lọc
    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchInput.trim() === search) return;
            const next = {};
            if (category !== 'ALL') next.category = category;
            if (searchInput.trim()) next.search = searchInput.trim();
            setSearchParams(next, { replace: true });
        }, 400);

        return () => clearTimeout(timer);
    }, [searchInput, search, category, setSearchParams]);

    // Chuyển tab danh mục (giữ nguyên từ khóa tìm kiếm hiện tại)
    const changeCategory = (code) => {
        const next = {};
        if (code !== 'ALL') next.category = code;
        if (search) next.search = search;
        setSearchParams(next);
    };

    // POST /api/reports/sync — quét lại thư mục OneDrive local rồi tải lại danh sách
    const handleSync = async () => {
        setSyncing(true);
        setNotice(null);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.post(`${API_URL}/reports/sync`, {}, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const summary = res.data?.data || {};
            const total = summary.totalFiles ?? 0;
            const warnings = summary.warnings || [];

            // Cảnh báo từ scanner (thư mục không tồn tại, prefix SharePoint chưa đúng...) hiện kèm kết quả
            setNotice({
                type: warnings.length ? 'error' : 'ok',
                text: warnings.length
                    ? `${t('pages.syncDone', { count: total })} ${warnings[0]}`
                    : t('pages.syncDone', { count: total }),
            });
            setReloadKey((key) => key + 1);
        } catch (err) {
            console.error('Quét thư mục báo cáo thất bại:', err);
            setNotice({ type: 'error', text: err.response?.data?.message || t('pages.syncFail') });
        } finally {
            setSyncing(false);
        }
    };

    // Click thẻ báo cáo → mở THẲNG file PowerPoint Online trên trình duyệt (?web=1)
    const openReport = (report) => {
        if (!report.sharepoint_web_url) return;
        window.open(report.sharepoint_web_url, '_blank', 'noopener,noreferrer');
    };

    // Mở file bằng ứng dụng PowerPoint Desktop trên máy (protocol handler ms-powerpoint:ofe|u|...)
    const openInPowerPointApp = (report) => {
        if (!report.powerpoint_app_url) return;
        // Dùng location.assign(...) thay vì gán location.href để không vi phạm rule react-hooks/immutability
        window.location.assign(report.powerpoint_app_url);
    };

    const currentCat = CATEGORIES.find((cat) => cat.code === category);

    return (
        <div className="issues-page">
            <h1 className="issues-title">
                {currentCat ? <currentCat.icon size={22} /> : <Presentation size={22} />}
                <span>{t('pages.reportsTitle')}{currentCat ? ` - ${t(currentCat.labelKey)}` : ''}</span>
            </h1>
            <p className="reports-subtitle">{t('pages.reportsSubtitle')}</p>

            <div className="reports-toolbar">
                {/* Tab lọc theo danh mục lỗi: Tất cả / Lỗi điện / Lỗi quang / Lỗi cơ */}
                <div className="issues-filters">
                    <button
                        className={`issues-filter-chip ${category === 'ALL' ? 'active' : ''}`}
                        onClick={() => changeCategory('ALL')}
                    >
                        <Layers size={14} />
                        <span>{t('pages.allCategories')}</span>
                    </button>
                    {CATEGORIES.map((cat) => (
                        <button
                            key={cat.code}
                            className={`issues-filter-chip ${category === cat.code ? 'active' : ''}`}
                            onClick={() => changeCategory(cat.code)}
                        >
                            <cat.icon size={14} />
                            <span>{t(cat.labelKey)}</span>
                        </button>
                    ))}
                </div>

                <div className="reports-actions">
                    <div className="reports-search">
                        <Search size={15} />
                        <input
                            type="text"
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            placeholder={t('pages.searchReports')}
                        />
                    </div>
                    <button className="reports-sync-btn" onClick={handleSync} disabled={syncing}>
                        <RefreshCw size={15} className={syncing ? 'spin' : ''} />
                        <span>{syncing ? t('pages.syncing') : t('pages.syncNow')}</span>
                    </button>
                </div>
            </div>

            {notice && (
                <div className={`reports-notice ${notice.type === 'error' ? 'error' : 'ok'}`}>{notice.text}</div>
            )}

            {!loading && !error && reports.length > 0 && (
                <div className="reports-count">{t('pages.reportsCount', { count: reports.length })}</div>
            )}

            {loading ? (
                <div className="issues-loading">
                    <Loader size={26} className="spin" />
                    <span>{t('common.loading')}</span>
                </div>
            ) : error ? (
                <div className="issues-empty">
                    <AlertCircle size={22} />
                    <span>{error}</span>
                </div>
            ) : reports.length === 0 ? (
                <div className="issues-empty">
                    <span>{t('pages.emptyReports')}</span>
                </div>
            ) : (
                <div className="issues-grid">
                    {reports.map((report) => (
                        <div
                            key={report.report_id}
                            className="issue-card report-card"
                            role="button"
                            tabIndex={0}
                            title={t('pages.openReport')}
                            onClick={() => openReport(report)}
                            onKeyDown={(event) => {
                                if (event.key === 'Enter' || event.key === ' ') {
                                    event.preventDefault();
                                    openReport(report);
                                }
                            }}
                        >
                            <div className="issue-card-head">
                                <span className="issue-card-title">{report.file_name}</span>
                                <ExternalLink size={15} className="report-card-icon" />
                            </div>
                            <div className="issue-card-meta">
                                <span className="issue-chip">{t(CATEGORY_LABEL_KEYS[report.category_code] || 'pages.catOther')}</span>
                                {report.project_name && <span className="issue-chip">{report.project_name}</span>}
                                {report.file_size_mb != null && (
                                    <span className="issue-chip">{report.file_size_mb} MB</span>
                                )}
                            </div>
                            <div className="issue-card-foot">
                                <span>{report.last_modified ? String(report.last_modified).slice(0, 10) : ''}</span>
                                <div className="report-card-actions">
                                    <span className="report-open-hint">{t('pages.openReport')}</span>
                                    {report.powerpoint_app_url && (
                                        <button
                                            type="button"
                                            className="report-app-btn"
                                            title={t('pages.openInAppHint')}
                                            onClick={(event) => {
                                                // Không để click nút làm mở luôn link web của cả thẻ
                                                event.stopPropagation();
                                                openInPowerPointApp(report);
                                            }}
                                        >
                                            <MonitorPlay size={14} />
                                            <span>{t('pages.openInApp')}</span>
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );

};

export default ErrorReportsPage;
