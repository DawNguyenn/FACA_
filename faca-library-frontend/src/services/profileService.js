import axios from 'axios';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

/**
 * GET /api/auth/me — Lấy thông tin user hiện tại từ token
 */
export const getMyProfile = async () => {
    const token = localStorage.getItem('token');
    const { data } = await axios.get(`${API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    return data.user || data;
};

export const updateMyProfile = async (payload) => {
    const token = localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };

    const { data } = await axios.put(`${API_URL}/users/me`, payload, { headers });
    return data.user || data.data || data;
};

/**
 * POST /api/upload — Upload file ảnh (multipart/form-data), trả về URL ảnh
 * Backend nên trả về: { url: "https://..." } hoặc { data: { url } }
 */
export const uploadAvatar = async (file) => {
    const token = localStorage.getItem('token');
    const formData = new FormData();
    formData.append('file', file);

    const { data } = await axios.post(`${API_URL}/upload`, formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
    });
    const url = data.url || data?.data?.url || data.avatar_url || data?.data?.avatar_url;
    if (!url) throw new Error('Server không trả về URL ảnh sau khi upload.');
    return url;
};

export default { getMyProfile, updateMyProfile, uploadAvatar };
