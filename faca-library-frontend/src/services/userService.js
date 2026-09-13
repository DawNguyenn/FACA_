import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const http = axios.create({
    baseURL: `${API_URL}/users`,
    timeout: 10000,
    headers: { 'Content-Type': 'application/json' },
});

const toErrorMessage = (error) => {
    if (error.response && error.response.data && error.response.data.message) {
        return error.response.data.message;
    }
    if (error.code === 'ECONNABORTED') return 'Kết nối bị quá thời gian chờ.';
    if (!error.response) return 'Không thể kết nối tới máy chủ. Vui lòng kiểm tra lại.';
    return error.message || 'Có lỗi xảy ra.';
};

/**
 * GET /api/users
 * @param {Object} params { search?, role?, status? }
 * @returns {Promise<Array>} danh sách người dùng
 */
export const getUsers = async (params = {}) => {
    try {
        const { data } = await http.get('/', { params });
        return data.data || [];
    } catch (error) {
        throw new Error(toErrorMessage(error), { cause: error });
    }
};

/**
 * GET /api/users/:id
 */
export const getUserById = async (id) => {
    try {
        const { data } = await http.get(`/${id}`);
        return data.data;
    } catch (error) {
        throw new Error(toErrorMessage(error), { cause: error });
    }
};

/**
 * POST /api/users
 * @param {Object} payload { name, email, role, department, status, avatarUrl }
 * @returns {Promise<Object>} người dùng vừa tạo
 */
export const createUser = async (payload) => {
    try {
        const { data } = await http.post('/', payload);
        return data.data;
    } catch (error) {
        throw new Error(toErrorMessage(error), { cause: error });
    }
};

/**
 * PUT /api/users/:id  (hỗ trợ cập nhật từng phần)
 */
export const updateUser = async (id, payload) => {
    try {
        const { data } = await http.put(`/${id}`, payload);
        return data.data;
    } catch (error) {
        throw new Error(toErrorMessage(error), { cause: error });
    }
};

/**
 * DELETE /api/users/:id
 */
export const deleteUser = async (id) => {
    try {
        await http.delete(`/${id}`);
    } catch (error) {
        throw new Error(toErrorMessage(error), { cause: error });
    }
};

export default { getUsers, getUserById, createUser, updateUser, deleteUser };