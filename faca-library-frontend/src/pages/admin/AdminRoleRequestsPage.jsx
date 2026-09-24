import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { ShieldCheck, CheckCircle2, X, Loader, AlertCircle, Trash2, EyeOff } from 'lucide-react';
import '../../styles/Pages.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const AdminRoleRequestsPage = () => {
    const { t } = useTranslation();

    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filter, setFilter] = useState('pending');
    // Thông báo thành công (vd: đã xóa vĩnh viễn yêu cầu)
    const [notice, setNotice] = useState(null);
    // Xóa vĩnh viễn: id đang chờ xác nhận (bấm 2 bước tránh bấm nhầm) + id đang xóa
    const [confirmDeleteId, setConfirmDeleteId] = useState(null);
    const [removingId, setRemovingId] = useState(null);

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

    // ADMIN: xóa VĨNH VIỄN yêu cầu (DELETE /api/role-requests/:id)
    // NGƯỜI DÙNG THƯỜNG xóa chỉ ẩn khỏi danh sách của họ (hidden_by_user = 1) nên
    // yêu cầu vẫn hiện ở trang này; chỉ khi quản trị viên xóa thì bản ghi mới mất hẳn.
    const handleDelete = async (id) => {
        setNotice(null);
        setError(null);
        setRemovingId(id);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.delete(`${API_URL}/role-requests/${id}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setRequests((prev) => prev.filter((r) => r.request_id !== id));
            setNotice(res.data?.message || t('pages.adminDeleteOk'));
            // Cập nhật badge "yêu cầu chờ duyệt" trên Header
            window.dispatchEvent(new Event('user:updated'));
        } catch (err) {
            setError(err.response?.data?.message || t('pages.loadFail'));
        } finally {
            setRemovingId(null);
            setConfirmDeleteId(null);
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
            {notice && <div className="role-alert ok">{notice}</div>}

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
                                <span className={`role-request-status ${r.status}`}>
                                    {statusLabel(r.status)}
                                </span>
                                <div className="admin-rr-meta-right">
                                    {/* Người dùng đã xóa yêu cầu khỏi danh sách của họ (chỉ ẩn phía họ) */}
                                    {Number(r.hidden_by_user) === 1 && (
                                        <span className="admin-rr-hidden">
                                            <EyeOff size={13} />
                                            <span>{t('pages.hiddenByUser')}</span>
                                        </span>
                                    )}
                                    <span className="admin-rr-date">{r.created_at || ''}</span>
                                </div>
                            </div>

                            <div className="admin-rr-actions">
                                {r.status === 'pending' && (
                                    <>
                                        <button className="admin-rr-approve" onClick={() => handleDecision(r.request_id, 'approve')}>
                                            <CheckCircle2 size={15} />
                                            <span>{t('pages.statusApproved')}</span>
                                        </button>
                                        <button className="admin-rr-reject" onClick={() => handleDecision(r.request_id, 'reject')}>
                                            <X size={15} />
                                            <span>{t('pages.statusRejected')}</span>
                                        </button>
                                    </>
                                )}

                                {/* Xóa VĨNH VIỄN — bấm 1: hiện xác nhận, bấm 2: xóa thật */}
                                {confirmDeleteId === r.request_id ? (
                                    <span className="role-request-confirm">
                                        <button
                                            type="button"
                                            className="admin-rr-delete confirm"
                                            title={t('pages.adminDeleteConfirm')}
                                            onClick={() => handleDelete(r.request_id)}
                                            disabled={removingId === r.request_id}
                                        >
                                            {removingId === r.request_id
                                                ? <Loader size={14} className="spin" />
                                                : <Trash2 size={14} />}
                                            <span>{t('pages.adminDeleteConfirm')}</span>
                                        </button>
                                        <button
                                            type="button"
                                            className="role-request-cancel"
                                            title={t('common.cancel')}
                                            onClick={() => setConfirmDeleteId(null)}
                                            disabled={removingId === r.request_id}
                                        >
                                            <X size={14} />
                                        </button>
                                    </span>
                                ) : (
                                    <button
                                        type="button"
                                        className="admin-rr-delete"
                                        title={t('pages.adminDeleteRequest')}
                                        onClick={() => setConfirmDeleteId(r.request_id)}
                                        disabled={removingId !== null}
                                    >
                                        <Trash2 size={15} />
                                        <span>{t('pages.adminDeleteRequest')}</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default AdminRoleRequestsPage;