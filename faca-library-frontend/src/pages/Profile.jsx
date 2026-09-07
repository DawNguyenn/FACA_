import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Camera, Save, Loader, User, Pencil, Languages } from 'lucide-react';
import { getMyProfile, updateMyProfile, uploadAvatar } from '../services/profileService';
import { LANGUAGES } from '../i18n';
import i18n from '../i18n';
import '../Styles/Profile.css';

// Áp dụng ngôn ngữ cho toàn ứng dụng + lưu vào localStorage (module-level, tránh TDZ)
// Ghi key 'app_language' (chuẩn mới) + 'language' (tương thích ngược dữ liệu cũ)
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

const ProfilePage = () => {
    const { t } = useTranslation();
    const [isEditing, setIsEditing] = useState(false); // false = chế độ Xem, true = chế độ Chỉnh sửa
    const [formData, setFormData] = useState({ full_name: '', department: '', avatar_url: '', language: 'vi' });
    const [original, setOriginal] = useState({ full_name: '', department: '', avatar_url: '', language: 'vi' });
    const [previewUrl, setPreviewUrl] = useState(null); // URL xem trước cục bộ (blob)
    const [avatarFile, setAvatarFile] = useState(null); // File ảnh mới được chọn
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState(null); // { type: 'success' | 'error', text }
    const fileInputRef = useRef(null);

    // Tải dữ liệu profile ban đầu để fill vào form
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
                // Áp dụng ngôn ngữ đã lưu trong DB cho toàn ứng dụng
                applyLanguage(data.language);
            } catch {
                // Fallback dữ liệu cache trong localStorage
                const cached = localStorage.getItem('user');
                if (cached) {
                    try {
                        const u = JSON.parse(cached);
                        const data = {
                            full_name: u.full_name || u.fullName || '',
                            department: u.department || u.Department || '',
                            avatar_url: u.avatar_url || u.AvatarUrl || u.avatarUrl || '',
                            language: u.language || u.Language || 'vi',
                        };
                        setFormData(data);
                        setOriginal(data);
                        // Ngay cả khi API lỗi vẫn áp dụng ngôn ngữ đã cache để không reset về 'vi'
                        applyLanguage(data.language);
                    } catch { /* bỏ qua */ }
                }
                setMessage({ type: 'error', text: 'Không thể tải thông tin cá nhân từ máy chủ.' });
            } finally {
                setLoading(false);
            }
        };
        loadProfile();
    }, []);

    const handleChange = (field) => (e) => {
        setFormData((prev) => ({ ...prev, [field]: e.target.value }));
    };

    // Đổi ngôn ngữ ngay khi chọn trong Edit mode (cập nhật UI toàn ứng dụng tức thì)
    const handleLanguageChange = (e) => {
        const code = e.target.value;
        setFormData((prev) => ({ ...prev, language: code }));
        applyLanguage(code);
    };

    // Chọn file ảnh mới -> hiển thị preview ngay lập tức
    const handleFileChange = (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            setMessage({ type: 'error', text: 'Vui lòng chọn tệp là hình ảnh.' });
            return;
        }
        setAvatarFile(file);
        // Tạo preview cục bộ bằng URL.createObjectURL (nhẹ hơn FileReader)
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setPreviewUrl(URL.createObjectURL(file));
        setMessage(null);
    };

    // Vào chế độ chỉnh sửa: đưa dữ liệu hiện tại vào form
    const handleEdit = () => {
        setFormData({ ...original });
        setAvatarFile(null);
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
        setMessage(null);
        setIsEditing(true);
    };

    // Hủy chỉnh sửa: khôi phục dữ liệu ban đầu, không lưu thay đổi
    const handleCancel = () => {
        setFormData({ ...original });
        // Quay lại ngôn ngữ ban đầu nếu người dùng đã đổi select mà chưa lưu
        applyLanguage(original.language);
        setAvatarFile(null);
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
        setMessage(null);
        setIsEditing(false);
    };

    // Lưu thay đổi: nếu có ảnh mới -> upload lấy URL -> PUT cập nhật profile
    const handleSave = async (e) => {
        e.preventDefault();
        setMessage(null);
        setSaving(true);
        try {
            let avatarUrl = formData.avatar_url;

            // Nếu người dùng chọn ảnh mới -> upload lên server/Cloudinary để lấy URL
            if (avatarFile) {
                avatarUrl = await uploadAvatar(avatarFile);
                setFormData((prev) => ({ ...prev, avatar_url: avatarUrl }));
            }

            const payload = {
                full_name: formData.full_name.trim(),
                department: formData.department.trim(),
                avatar_url: avatarUrl,
                language: formData.language, // gửi thêm ngôn ngữ đã chọn
            };

            const updated = await updateMyProfile(payload);
            const normalized = {
                full_name: updated?.full_name || payload.full_name,
                department: updated?.department || payload.department,
                avatar_url: updated?.avatar_url || payload.avatar_url,
                language: updated?.language || payload.language,
            };

            setFormData(normalized);
            setOriginal(normalized);
            // Đảm bảo ngôn ngữ hiển thị khớp với dữ liệu đã lưu
            applyLanguage(normalized.language);
            setAvatarFile(null);
            if (previewUrl) URL.revokeObjectURL(previewUrl);
            setPreviewUrl(null);

            // Đồng bộ State toàn cục: cập nhật localStorage + phát event để Header refresh
            const cached = localStorage.getItem('user');
            if (cached) {
                try {
                    localStorage.setItem('user', JSON.stringify({ ...JSON.parse(cached), ...normalized }));
                } catch {
                    localStorage.setItem('user', JSON.stringify(normalized));
                }
            } else {
                localStorage.setItem('user', JSON.stringify(normalized));
            }
            window.dispatchEvent(new Event('user:updated'));

            setMessage({ type: 'success', text: t('profile.savedSuccess') });
            setIsEditing(false); // Quay lại chế độ Xem sau khi lưu thành công
        } catch (err) {
            setMessage({
                type: 'error',
                text: err?.response?.data?.message || t('profile.saveFailed'),
            });
        } finally {
            setSaving(false);
        }
    };

    const displayedAvatar = previewUrl || formData.avatar_url;

    return (
        <div className="profile-page">
            {loading ? (
                <div className="profile-loading">
                    <Loader size={28} className="profile-spinner" />
                    <span>{t('profile.loadingProfile')}</span>
                </div>
            ) : (
                <div className="profile-card">
                    <h1 className="profile-title">{t('profile.title')}</h1>
                    <p className="profile-subtitle">{t('profile.subtitle')}</p>

                    {message && (
                        <div className={`profile-alert ${message.type === 'success' ? 'alert-success' : 'alert-error'}`}>
                            {message.text}
                        </div>
                    )}

                    {isEditing ? (
                        /* ============ CHẾ ĐỘ CHỈNH SỬA ============ */
                        <form className="profile-form" onSubmit={handleSave}>
                        {/* Ảnh đại diện */}
                        <div className="profile-avatar-section">
                            <div className="profile-avatar-wrapper">
                                {displayedAvatar ? (
                                    <img src={displayedAvatar} alt="Ảnh đại diện" className="profile-avatar-img" />
                                ) : (
                                    <div className="profile-avatar-placeholder">
                                        <User size={40} color="#c00000" />
                                    </div>
                                )}
                                <button
                                    type="button"
                                    className="profile-avatar-edit"
                                    title="Chọn ảnh mới"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <Camera size={15} color="#ffffff" />
                                </button>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    style={{ display: 'none' }}
                                    onChange={handleFileChange}
                                />
                            </div>
                            <div className="profile-avatar-hint">
                                <button
                                    type="button"
                                    className="profile-avatar-choose-btn"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <Camera size={15} />
                                    <span>{t('profile.chooseAvatar')}</span>
                                </button>
                                <span className="profile-avatar-note">{t('profile.avatarNote')}</span>
                            </div>
                        </div>

                        {/* Họ và tên */}
                        <div className="profile-field">
                            <label htmlFor="full_name">{t('profile.fullName')}</label>
                            <input
                                id="full_name"
                                type="text"
                                value={formData.full_name}
                                onChange={handleChange('full_name')}
                                placeholder={t('profile.fullNamePlaceholder')}
                                className="profile-input"
                            />
                        </div>

                        {/* Bộ phận */}
                        <div className="profile-field">
                            <label htmlFor="department">{t('profile.department')}</label>
                            <input
                                id="department"
                                type="text"
                                value={formData.department}
                                onChange={handleChange('department')}
                                placeholder={t('profile.departmentPlaceholder')}
                                className="profile-input"
                            />
                        </div>

                        {/* Cài đặt ngôn ngữ (chế độ Chỉnh sửa: cho phép chọn) */}
                        <div className="profile-field">
                            <label htmlFor="language">{t('profile.languageSettings')}</label>
                            <select
                                id="language"
                                value={formData.language}
                                onChange={handleLanguageChange}
                                className="profile-input profile-select"
                            >
                                {LANGUAGES.map((lang) => (
                                    <option key={lang.code} value={lang.code}>
                                        {lang.flag} {lang.label} ({lang.code})
                                    </option>
                                ))}
                            </select>
                            <span className="profile-field-hint">{t('profile.languageHint')}</span>
                        </div>

                        <div className="profile-actions">
                                {/* Hủy: khôi phục dữ liệu ban đầu, không lưu */}
                                <button
                                    type="button"
                                    className="profile-cancel-btn"
                                    onClick={handleCancel}
                                    disabled={saving}
                                >
                                    <span>{t('common.cancel')}</span>
                                </button>
                                {/* Lưu thay đổi (enable khi có thay đổi ở bất kỳ trường nào, kể cả ngôn ngữ) */}
                                <button
                                    type="submit"
                                    className="profile-save-btn"
                                    disabled={saving || (formData.full_name === original.full_name
                                        && formData.department === original.department
                                        && formData.language === original.language
                                        && !avatarFile)}
                                >
                                    {saving ? <Loader size={16} className="profile-spinner" /> : <Save size={16} />}
                                    <span>{saving ? t('common.saving') : t('common.save')}</span>
                                </button>
                            </div>
                        </form>
                    ) : (
                        /* ============ CHẾ ĐỘ XEM (Mặc định) ============ */
                        <div className="profile-view">
                            {/* Ảnh đại diện lớn, không có nút upload */}
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
                                <div className="profile-view-row">
                                    <span className="profile-view-label">{t('profile.department')}</span>
                                    <p className="profile-view-value">{formData.department || '—'}</p>
                                </div>

                                {/* Cài đặt ngôn ngữ (chế độ Xem: hiển thị ngôn ngữ đang chọn) */}
                                <div className="profile-view-row">
                                    <span className="profile-view-label">{t('profile.language')}</span>
                                    <p className="profile-view-value">
                                        <Languages size={14} style={{ verticalAlign: '-2px', marginRight: 6 }} />
                                        {languageLabel(formData.language)}
                                    </p>
                                </div>
                            </div>

                            {/* Nút duy nhất ở chế độ Xem */}
                            <div className="profile-actions profile-actions-center">
                                <button type="button" className="profile-edit-btn" onClick={handleEdit}>
                                    <Pencil size={16} />
                                    <span>{t('common.edit')}</span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default ProfilePage;
