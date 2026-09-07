import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { ShieldCheck, CheckCircle2, X, Loader, AlertCircle } from 'lucide-react';
import '../../Styles/Pages.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const AdminRoleRequestsPage = () => {
    const { t } = useTranslation();

    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filter, setFilter] = useState('pending');

    useEffect(() => {
        const token = localStorage.getItem('token');
        const params = filter === 'all' ? '' : `?status=${filter}`;
        axios
            .get(`${API_URL}/role-requests/all${params}`, {
                headers: { Authorization: `Bearer ${token}` },
            })
            .then((res) => setRequests(res.data.data || []))
            .catch(() => setError(t('pages.loadFail')))
            .finally(() => setLoading(false));
    }, [filter, t]);

    const handleDecision = async (id, action) => {
        const token = localStorage.getItem('token');
        try {
            await axios.put(`${API_URL}/role-requests/${id}/${action}`, null, {
                headers: { Authorization: `Bearer ${token}` },
            });
            // Refresh + badge Header
            setRequests((prev) => prev.filter((r) => r.request_id !== id));
            window.dispatchEvent(new Event('user:updated'));
        } catch (err) {
            setError(err.response?.data?.message || t('pages.loadFail'));
        }
    };

    const statusLabel = (s) => {
        if (s === 'approved') return t('pages.statusApproved');
        if (s === 'rejected') return t('pages.statusRejected');
        return t('pages.statusPending');
    };

    return (
        <div className="role-page">
            <h1 className="role-title">
                <ShieldCheck size={22} />
                <span>{t('header.adminRoleRequests')}</span>
            </h1>

            {error && <div className="role-alert err">{error}</div>}

            {/* Bộ lọc trạng thái */}
            <div className="issues-filters">
                {['pending', 'approved', 'rejected', 'all'].map((f) => (
                    <button
                        key={f}
                        className={`issues-filter-chip ${filter === f ? 'active' : ''}`}
                        onClick={() => setFilter(f)}
                    >
                        {f === 'all' ? t('pages.allCategories') : statusLabel(f)}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="issue-loading">
                    <Loader size={26} className="spin" />
                    <span>{t('common.loading')}</span>
                </div>
            ) : requests.length === 0 ? (
                <div className="issues-empty">
                    <AlertCircle size={20} />
                    <span>{t('pages.emptyRoleRequests')}</span>
                </div>
            ) : (
                <div className="admin-rr-list">
                    {requests.map((r) => (
                        <div key={r.request_id} className="admin-rr-item">
                            <div className="admin-rr-main">
                                <div className="role-request-info">
                                    <strong>{r.full_name}</strong>
                                    <span>{r.email}{r.department ? ` · ${r.department}` : ''}</span>
                                </div>
                                <div className="admin-rr-role">
                                    <span className="admin-rr-label">{t('pages.desiredRole')}</span>
                                    <span className="admin-rr-value">{r.requested_role}</span>
                                    {r.reason && <p className="admin-rr-reason">"{r.reason}"</p>}
                                </div>
                            </div>
                            <div className="admin-rr-meta">
                                <span className="role-request-status ${r.status} status-${r.status}">
                                    {statusLabel(r.status)}
                                </span>
                                <span className="admin-rr-date">{r.created_at || ''}</span>
                            </div>
                            {r.status === 'pending' && (
                                <div className="admin-rr-actions">
                                    <button className="admin-rr-approve" onClick={() => handleDecision(r.request_id, 'approve')}>
                                        <CheckCircle2 size={15} />
                                        <span>{t('pages.statusApproved')}</span>
                                    </button>
                                    <button className="admin-rr-reject" onClick={() => handleDecision(r.request_id, 'reject')}>
                                        <X size={15} />
                                        <span>{t('pages.statusRejected')}</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default AdminRoleRequestsPage;