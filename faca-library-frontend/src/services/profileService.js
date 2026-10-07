import apiClient, { getToken } from './apiClient';

/**
 * GET /api/auth/me — Lấy thông tin user hiện tại từ token
 */
export const getMyProfile = async () => {
    const { data } = await apiClient.get('/auth/me');
    return data.user || data;
};

export const updateMyProfile = async (payload) => {
    const { data } = await apiClient.put('/users/me', payload);
    return data.user || data.data || data;
};

/**
 * POST /api/upload — Gán URL ảnh trực tiếp (không upload file)
 * Backend chỉ validation URL và trả về
 * Payload: { url: "https://..." }
 */
export const uploadAvatar = async (url) => {
    if (!getToken()) throw new Error('Không tìm thấy token xác thực.');

    const { data } = await apiClient.post('/upload', { url });
    const returnedUrl = data.url || data?.data?.url || data.avatar_url || data?.data?.avatar_url;
    if (!returnedUrl) throw new Error('Server không trả về URL ảnh.');
    return returnedUrl;
};

export default { getMyProfile, updateMyProfile, uploadAvatar };
