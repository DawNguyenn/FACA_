import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Zap, Eye, Wrench, Layers, AlertCircle } from 'lucide-react';
import Skeleton from '../components/common/Skeleton';
import { useToast } from '../components/common/ToastProvider';
import '../styles/Pages.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Map danh mục lỗi (đồng bộ dbo.issue_categories trong SQL Server)
const CATEGORIES = [
    { id: 1, key: 'catElectrical', icon: Zap },
    { id: 2, key: 'catOptical', icon: Eye },
    { id: 3, key: 'catMechanical', icon: Wrench },
];

const IssuesPage = () => {
    const { t } = useTranslation();
    const toast = useToast();
    const [searchParams, setSearchParams] = useSearchParams();
    const categoryId = searchParams.get('category_id');

    const [issues, setIssues] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadIssues = async () => {
            setLoading(true);
            try {
                const token = localStorage.getItem('token');
                const query = categoryId ? `?category_id=${categoryId}` : '';
                const res = await fetch(`${API_URL}/issues${query}`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                const data = await res.json();
                if (!res.ok || !data.success) throw new Error(data.message || 'Load failed');
                setIssues(data.data || []);
            } catch (err) {
                setIssues([]);
                toast.error(err.message || t('pages.loadFail'));
            } finally {
                setLoading(false);
            }
        };
        loadIssues();
        // `toast` không đưa vào deps: useToast trả object mới mỗi render -> tránh refetch lặp
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [categoryId, t]);

    const currentCat = CATEGORIES.find((c) => String(c.id) === categoryId);

    return (
        <div className="issues-page">
            <h1 className="issues-title">
                {currentCat ? <currentCat.icon size={22} /> : <Layers size={22} />}
                <span>{t('pages.issuesTitle')}{currentCat ? ` - ${t(`header.${currentCat.key}`)}` : ''}</span>
            </h1>

            {/* Bộ lọc danh mục */}
            <div className="issues-filters">
                <button
                    className={`issues-filter-chip ${!categoryId ? 'active' : ''}`}
                    onClick={() => setSearchParams({})}
                >
                    <Layers size={14} />
                    <span>{t('pages.allCategories')}</span>
                </button>
                {CATEGORIES.map((cat) => (
                    <button
                        key={cat.id}
                        className={`issues-filter-chip ${categoryId === String(cat.id) ? 'active' : ''}`}
                        onClick={() => setSearchParams({ category_id: String(cat.id) })}
                    >
                        <cat.icon size={14} />
                        <span>{t(`header.${cat.key}`)}</span>
                    </button>
                ))}
            </div>

            {loading ? (
                /* Skeleton grid khi đang tải (thay cho spinner) */
                <div className="issues-grid">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <Skeleton key={`issue-skeleton-${i}`} variant="card" />
                    ))}
                </div>
            ) : issues.length === 0 ? (
                <div className="issues-empty">
                    <AlertCircle size={22} />
                    <span>{t('pages.emptyIssues')}</span>
                </div>
            ) : (
                <div className="issues-grid">
                    {issues.map((issue) => (
                        <div key={issue.issue_id} className="issue-card">
                            <div className="issue-card-head">
                                <span className="issue-card-title">{issue.title}</span>
                                <span className={`issue-status status-${issue.status}`}>{issue.status}</span>
                            </div>
                            <div className="issue-card-meta">
                                <span className="issue-chip">{issue.category_name}</span>
                                {issue.config_name && <span className="issue-chip">{issue.config_name}</span>}
                                {issue.process_step && <span className="issue-chip">{issue.process_step}</span>}
                            </div>
                            {issue.symptom && <p className="issue-card-symptom">{issue.symptom}</p>}
                            <div className="issue-card-foot">
                                <span>{issue.created_by_name}</span>
                                <span>{issue.created_at ? String(issue.created_at).slice(0, 10) : ''}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default IssuesPage;
