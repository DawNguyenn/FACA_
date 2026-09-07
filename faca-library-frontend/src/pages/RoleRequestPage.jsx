import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { ShieldCheck, Send, Loader, CheckCircle2, Clock, Ban } from 'lucide-react';
import '../Styles/Pages.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const ROLE_NAMES = { 1: 'Admin', 2: 'Engineer', 3: 'Leader' };

const RoleRequestPage = () => {
    const { t } = useTranslation();

    const [roles, setRoles] = useState([]);
    const [myRequests, setMyRequests] = useState([]);
    const [currentUser, setCurrentUser] = useState(null);
    const [selectedRole, setSelectedRole] = useState('');
    const [reason, setReason] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [message, setMessage] = useState(null);

    useEffect(() => {
        const load = async () => {
            try {
                const token = localStorage.getItem('token');
                const headers = { Authorization: `Bearer ${token}` };

                const rolesRes = await axios.get(`${API_URL}/role-requests/roles`, { headers });
                const requestsRes = await axios.get(`${API_URL}/role-requests/me`, { headers });
                let me = null;
                try {
                    const meRes = await axios.get(`${API_URL}/auth/me`, { headers });
                    me = meRes.data?.user || meRes.data;
                } catch { me = null; }

                setRoles(rolesRes.data.data || []);
                setMyRequests(requestsRes.data.data || []);
                setCurrentUser(me);
            } catch (err) {
                setMessage({ type: 'error', text: err.message });
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage(null);
        if (!selectedRole) {
            setMessage({ type: 'error', text: 'Vui lòng chọn vai trò mong muốn.' });
            return;
        }
        setSending(true);
        try {
            const token = localStorage.getItem('token');
            await axios.post(
                `${API_URL}/role-requests`,
                { requested_role_id: selectedRole, reason },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setMessage({ type: 'success', text: t('pages.sentOk') });
            setSelectedRole('');
            setReason('');
            const res = await axios.get(`${API_URL}/role-requests/me`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setMyRequests(res.data.data || []);
        } catch (err) {
            setMessage({ type: 'error', text: err.response?.data?.message || err.message });
        } finally {
            setSending(false);
        }
    };

    const statusLabel = (status) => {
        if (status === 'approved') return t('pages.statusApproved');
        if (status === 'rejected') return t('pages.statusRejected');
        return t('pages.statusPending');
    };

    if (loading) {
        return (
            <div className="role-page">
                <div className="issue-loading">
                    <Loader size={26} className="spin" />
                    <span>{t('common.loading')}</span>
                </div>
            </div>
        );
    }

    const currentRoleId = currentUser?.RoleId || currentUser?.RoleID || currentUser?.role_id;

    return (
        <div className="role-page">
            <h1 className="role-title">
                <ShieldCheck size={22} />
                <span>{t('pages.roleTitle')}</span>
            </h1>
            <p className="role-subtitle">{t('pages.roleSubtitle')}</p>

            {message && (
                <div className={`role-alert ${message.type === 'success' ? 'ok' : 'err'}`}>
                    {message.text}
                </div>
            )}

            {/* Form gửi yêu cầu */}
            <form className="role-form" onSubmit={handleSubmit}>
                <div className="role-field">
                    <label>{t('pages.currentRole')}</label>
                    <div className="role-current">{ROLE_NAMES[currentRoleId] || currentRoleId || '—'}</div>
                </div>

                <div className="role-field">
                    <label htmlFor="desired-role">{t('pages.desiredRole')}</label>
                    <select
                        id="desired-role"
                        value={selectedRole}
                        onChange={(e) => setSelectedRole(e.target.value)}
                        className="role-select"
                    >
                        <option value="">{t('pages.selectRole')}</option>
                        {roles
                            .filter((r) => String(r.id) !== String(currentRoleId))
                            .map((r) => (
                                <option key={r.id} value={r.id}>{r.name} (ID {r.id})</option>
                            ))}
                    </select>
                </div>

                <div className="role-field">
                    <label htmlFor="reason">{t('pages.reason')}</label>
                    <textarea
                        id="reason"
                        rows={3}
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        className="role-textarea"
                        placeholder={t('pages.reasonPlaceholder')}
                    />
                </div>

                <button type="submit" className="role-submit" disabled={sending}>
                    {sending ? <Loader size={16} className="spin" /> : <Send size={16} />}
                    <span>{sending ? t('pages.sending') : t('pages.send')}</span>
                </button>
            </form>

            {/* Yêu cầu của tôi */}
            <section className="role-requests-section">
                <h2 className="role-requests-title">
                    <CheckCircle2 size={18} />
                    <span>{t('pages.myRequests')}</span>
                </h2>

                {myRequests.length === 0 ? (
                    <p className="role-requests-empty">{t('pages.emptyRoleRequests')}</p>
                ) : (
                    <ul className="role-requests-list">
                        {myRequests.map((r) => (
                            <li key={r.request_id} className="role-request-item">
                                <div className="role-request-info">
                                    <strong>{r.requested_role}</strong>
                                    <span>{r.created_at || ''}</span>
                                </div>
                                <span className={`role-request-status ${r.status}`}>
                                    {r.status === 'pending'
                                        ? <Clock size={14} />
                                        : r.status === 'approved'
                                            ? <CheckCircle2 size={14} />
                                            : <Ban size={14} />}
                                    {statusLabel(r.status)}
                                </span>
                            </li>
                        ))}
                    </ul>
                )}
            </section>
        </div>
    );
};

export default RoleRequestPage;