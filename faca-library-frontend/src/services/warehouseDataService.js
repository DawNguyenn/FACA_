import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
};

const handleAuthError = (error) => {
    if (error?.response?.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
    }
    throw error;
};

/**
 * Fetch paginated materials from SQL Server.
 * @param {Object} params - { page, limit, search }
 * @returns {Promise<{success, data, pagination}>}
 */
export const getMaterials = async (params = {}) => {
    try {
        const response = await axios.get(`${API_URL}/warehouse/materials`, {
            headers: getAuthHeaders(),
            params,
        });
        return response.data;
    } catch (error) {
        handleAuthError(error);
    }
};

/**
 * Fetch paginated inventory lots from SQL Server.
 * @param {Object} params - { page, limit, search, project, material }
 * @returns {Promise<{success, data, pagination}>}
 */
export const getInventoryLots = async (params = {}) => {
    try {
        const response = await axios.get(`${API_URL}/warehouse/inventory`, {
            headers: getAuthHeaders(),
            params,
        });
        return response.data;
    } catch (error) {
        handleAuthError(error);
    }
};

/**
 * Fetch single inventory lot by ID.
 * @param {number|string} lotId
 * @returns {Promise<{success, data}>}
 */
export const getLotById = async (lotId) => {
    try {
        const response = await axios.get(`${API_URL}/warehouse/lots/${lotId}`, {
            headers: getAuthHeaders(),
        });
        return response.data;
    } catch (error) {
        handleAuthError(error);
    }
};

export default {
    getMaterials,
    getInventoryLots,
    getLotById,
};
