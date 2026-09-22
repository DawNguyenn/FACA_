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
 * POST /api/upload — Gán URL ảnh trực tiếp (không upload file)
 * Backend chỉ validation URL và trả về
 * Payload: { url: "https://..." }
 */
export const uploadAvatar = async (url) => {
    const token = localStorage.getItem('token');
    if (!token) throw new Error('Không tìm thấy token xác thực.');

    const { data } = await axios.post(`${API_URL}/upload`, { url }, {
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
    });
    const returnedUrl = data.url || data?.data?.url || data.avatar_url || data?.data?.avatar_url;
    if (!returnedUrl) throw new Error('Server không trả về URL ảnh.');
    return returnedUrl;
};

export default { getMyProfile, updateMyProfile, uploadAvatar };
