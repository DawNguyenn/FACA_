import apiClient, { toErrorMessage } from './apiClient';

const BASE = '/users';

/**
 * GET /api/users
 * @param {Object} params { search?, role?, status? }
 * @returns {Promise<Array>} danh sách người dùng
 */
export const getUsers = async (params = {}) => {
    try {
        const { data } = await apiClient.get(BASE, { params });
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
        const { data } = await apiClient.get(`${BASE}/${id}`);
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
        const { data } = await apiClient.post(BASE, payload);
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
        const { data } = await apiClient.put(`${BASE}/${id}`, payload);
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
        await apiClient.delete(`${BASE}/${id}`);
    } catch (error) {
        throw new Error(toErrorMessage(error), { cause: error });
    }
};

export default { getUsers, getUserById, createUser, updateUser, deleteUser };