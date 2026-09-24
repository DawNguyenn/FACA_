import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Save, Loader, User, Pencil, Languages, Link, ShieldCheck } from 'lucide-react';
import { getMyProfile, updateMyProfile } from '../services/profileService';
import { LANGUAGES } from '../i18n';
import i18n from '../i18n';
import '../styles/Profile.css';

// Áp dụng ngôn ngữ cho toàn ứng dụng + lưu vào localStorage
const applyLanguage = (code) => {
    if (code && code !== i18n.language && LANGUAGES.some((l) => l.code === code)) {
        i18n.changeLanguage(code);
    }
    if (code) {
        localStorage.setItem('app_language', code);
        localStorage.setItem('language', code);
    }
};

const languageLabel = (code) => {
    const lang = LANGUAGES.find((l) => l.code === code);
    return lang ? `${lang.flag} ${lang.label}` : code;
};

// Tên vai trò dự phòng khi API/cache không trả về role_name.
// Khớp bảng dbo.roles trong FACA_DB: 1=Admin, 2=Staff, 3=Engineer, 4=WareHouse, 5=QA, 6=User
// Kiểm tra URL hợp lệ (dùng cho preview ảnh khi nhập URL)
const isValidUrl = (str) => {
    try {
        new URL(str);
        return true;
    } catch {
        return false;
    }
};
const FALLBACK_ROLE_NAMES = {
    1: 'Admin',
    2: 'Staff',
    3: 'Engineer',
    4: 'WareHouse',
    5: 'QA',
    6: 'User',
};

/**
 * Chuẩn hoá vai trò của user từ nhiều nguồn (API /auth/me, PUT /users/me, localStorage):
 *   - snake_case: role_id, role_name
 *   - PascalCase: RoleId, RoleName
 * @param {object} u — đối tượng user
 * @returns {{id: number|null, name: string, description: string}} name rỗng nếu chưa xác định được
 */
const pickRole = (u = {}) => {
    const rawId = u.role_id ?? u.RoleId ?? u.roleId ?? u.RoleID ?? null;
    const id = rawId === null || rawId === undefined || rawId === '' ? null : Number(rawId);
    const roleId = Number.isNaN(id) ? null : id;
    const name = u.role_name || u.RoleName || u.roleName || FALLBACK_ROLE_NAMES[roleId] || '';
    return {
        id: roleId,
        name,
        description: u.role_description || u.RoleDescription || '',
    };
};

const ProfilePage = () => {
    const { t } = useTranslation();
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({ full_name: '', department: '', avatar_url: '', language: 'vi' });
    const [original, setOriginal] = useState({ full_name: '', department: '', avatar_url: '', language: 'vi' });
    // Vai trò của người dùng — CHỈ XEM, không sửa trực tiếp ở đây
    // (muốn đổi vai trò phải gửi "Yêu cầu cấp quyền" để Admin duyệt)
    const [userRole, setUserRole] = useState({ id: null, name: '', description: '' });
    const [previewUrl, setPreviewUrl] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState(null);

    // Tải dữ liệu profile ban đầu
    useEffect(() => {
        const loadProfile = async () => {
            try {
                const user = await getMyProfile();
                const data = {
                    full_name: user.full_name || user.fullName || '',
                    department: user.department || user.Department || '',
                    avatar_url: user.avatar_url || user.AvatarUrl || user.avatarUrl || '',
                    language: user.language || user.Language || 'vi',
                };
                setFormData(data);
                setOriginal(data);
                setUserRole(pickRole(user));
                applyLanguage(data.language);
            } catch {
                const cached = localStorage.getItem('user');
                if (cached) {
                    try {
                        const u = JSON.parse(cached);
                        setFormData({
                            full_name: u.full_name || u.fullName || '',
                            department: u.department || u.Department || '',
                            avatar_url: u.avatar_url || u.AvatarUrl || u.avatarUrl || '',
                            language: u.language || u.Language || 'vi',
                        });
                        setOriginal({ full_name: '', department: '', avatar_url: '', language: 'vi' });
                        // Vai trò vẫn lấy được từ cache (login lưu RoleId / role_name)
                        setUserRole(pickRole(u));
                        applyLanguage(u.language || u.Language || 'vi');
                    } catch {}
                }
                setMessage({ type: 'error', text: 'Không thể tải thông tin.' });
            } finally {
                setLoading(false);
            }
        };
        loadProfile();
    }, []);

    // Cập nhật preview ảnh khi avatar_url thay đổi
    useEffect(() => {
        if (formData.avatar_url && isValidUrl(formData.avatar_url)) {
            setPreviewUrl(formData.avatar_url);
        } else {
            setPreviewUrl(null);
        }
    }, [formData.avatar_url]);

    const handleEdit = () => setIsEditing(true);

    const handleCancel = () => {
        setFormData({ ...original });
        applyLanguage(original.language);
        setMessage(null);
        setIsEditing(false);
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleLanguageChange = (e) => {
        const value = e.target.value;
        setFormData((prev) => ({ ...prev, language: value }));
        applyLanguage(value);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.full_name.trim()) {
            setMessage({ type: 'error', text: 'Họ và tên không được để trống.' });
            return;
        }
        setSaving(true);
        setMessage(null);
        try {
            const updated = await updateMyProfile({
                full_name: formData.full_name.trim(),
                department: formData.department.trim(),
                avatar_url: formData.avatar_url.trim() || null,
                language: formData.language,
            });
            const data = {
                full_name: updated.full_name || formData.full_name,
                department: updated.department || formData.department,
                avatar_url: updated.avatar_url || formData.avatar_url,
                language: updated.language || formData.language,
            };
            setFormData(data);
            setOriginal(data);
            // Đồng bộ lại vai trò từ response (PUT /users/me trả kèm role_id + role_name).
            // Nếu response không có thì giữ nguyên giá trị đang hiển thị.
            const nextRole = pickRole(updated);
            setUserRole((prev) => (nextRole.name ? nextRole : prev));
            setIsEditing(false);
            setMessage({ type: 'success', text: 'Lưu thành công!' });
        } catch (err) {
            setMessage({ type: 'error', text: err?.response?.data?.message || 'Lỗi khi lưu.' });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="profile-loading">
                <Loader size={32} className="profile-spinner" />
                <p>{t('common.loading') || 'Đang tải...'}</p>
            </div>
        );
    }

    const displayedAvatar = previewUrl && isValidUrl(previewUrl) ? previewUrl : null;

    return (
        <div className="profile-container">
            {message && (
                <div className={`profile-message profile-message-${message.type}`}>
                    {message.text}
                </div>
            )}
            <div className="profile-card">
                <h2 className="profile-title">{t('profile.title') || 'Hồ sơ cá nhân'}</h2>
                {isEditing ? (
                    <form onSubmit={handleSubmit} className="profile-form">
                        <div className="profile-avatar-section">
                            <div className="profile-avatar-input-group">
                                <label htmlFor="avatar_url" className="profile-avatar-label">
                                    <Link size={14} />
                                    {t('profile.avatarUrl') || 'URL ảnh đại diện'}
                                </label>
                                <input
                                    type="url"
                                    id="avatar_url"
                                    name="avatar_url"
                                    value={formData.avatar_url}
                                    onChange={handleChange}
                                    placeholder="https://example.com/avatar.jpg"
                                    className="profile-input profile-avatar-input"
                                    disabled={saving}
                                />
                                <small className="profile-input-hint">
                                    {t('profile.avatarUrlHint') || 'Nhập URL ảnh trực tiếp'}
                                </small>
                            </div>
                        </div>
                        <div className="profile-form-fields">
                            <div className="profile-form-group">
                                <label htmlFor="full_name" className="profile-label">{t('profile.fullName')}</label>
                                <input type="text" id="full_name" name="full_name" value={formData.full_name} onChange={handleChange} className="profile-input" placeholder="Nguyễn Văn A" disabled={saving} required />
                            </div>
                            <div className="profile-form-group">
                                <label htmlFor="department" className="profile-label">{t('profile.department')}</label>
                                <input type="text" id="department" name="department" value={formData.department} onChange={handleChange} className="profile-input" placeholder="Phòng ban" disabled={saving} />
                            </div>
                            {/* Vai trò: chỉ xem — không cho sửa ở trang cá nhân */}
                            <div className="profile-form-group">
                                <span className="profile-label">{t('profile.role') || 'Vai trò'}</span>
                                <div className="profile-role-readonly">
                                    <span className="profile-role-badge">
                                        <ShieldCheck size={14} />
                                        {userRole.name || '—'}
                                    </span>
                                    {userRole.description && (
                                        <span className="profile-role-desc">{userRole.description}</span>
                                    )}
                                </div>
                                <small className="profile-input-hint">
                                    {t('profile.roleHint') || 'Vai trò do Admin cấp. Gửi yêu cầu cấp quyền nếu cần thay đổi.'}
                                </small>
                            </div>
                            <div className="profile-form-group">
                                <label htmlFor="language" className="profile-label">{t('profile.language')}</label>
                                <div className="profile-language-select">
                                    <select id="language" name="language" value={formData.language} onChange={handleLanguageChange} className="profile-select" disabled={saving}>
                                        {LANGUAGES.map((lang) => (
                                            <option key={lang.code} value={lang.code}>{lang.flag} {lang.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>
                        <div className="profile-actions">
                            <button type="button" className="profile-cancel-btn" onClick={handleCancel} disabled={saving}>
                                {t('common.cancel') || 'Hủy'}
                            </button>
                            <button type="submit" className="profile-save-btn" disabled={saving || (formData.full_name === original.full_name && formData.department === original.department && formData.language === original.language && formData.avatar_url === original.avatar_url)}>
                                {saving ? <Loader size={16} className="profile-spinner" /> : <Save size={16} />}
                                <span>{saving ? t('common.saving') : t('common.save')}</span>
                            </button>
                        </div>
                    </form>
                ) : (
                    <div className="profile-view">
                        <div className="profile-view-avatar">
                            {displayedAvatar ? (
                                <img src={displayedAvatar} alt="Ảnh đại diện" className="profile-avatar-img" />
                            ) : (
                                <div className="profile-avatar-placeholder">
                                    <User size={48} color="#c00000" />
                                </div>
                            )}
                        </div>
                        <div className="profile-view-fields">
                            <div className="profile-view-row">
                                <span className="profile-view-label">{t('profile.fullName')}</span>
                                <p className="profile-view-value">{formData.full_name || '—'}</p>
                            </div>
                            {/* Vai trò — hiển thị dạng badge */}
                            <div className="profile-view-row">
                                <span className="profile-view-label">{t('profile.role') || 'Vai trò'}</span>
                                <p className="profile-view-value">
                                    <span className="profile-role-badge">
                                        <ShieldCheck size={14} />
                                        {userRole.name || '—'}
                                    </span>
                                </p>
                            </div>
                            <div className="profile-view-row">
                                <span className="profile-view-label">{t('profile.department')}</span>
                                <p className="profile-view-value">{formData.department || '—'}</p>
                            </div>
                            <div className="profile-view-row">
                                <span className="profile-view-label">{t('profile.language')}</span>
                                <p className="profile-view-value">
                                    <Languages size={14} style={{ verticalAlign: '-2px', marginRight: 6 }} />
                                    {languageLabel(formData.language)}
                                </p>
                            </div>
                        </div>
                        <div className="profile-actions profile-actions-center">
                            <button type="button" className="profile-edit-btn" onClick={handleEdit}>
                                <Pencil size={16} />
                                <span>{t('common.edit')}</span>
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProfilePage;