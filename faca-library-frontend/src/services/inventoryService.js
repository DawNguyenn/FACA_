import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
};
const handleAuthError = (error) => {
    if (error?.response?.status === 401) {
        // Clear stale credentials
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        // Redirect to login page
        window.location.href = '/login';
    }
    throw error;
};

/**
 * Upload an Excel file for background processing.
 *
 * @param {File} file  — the .xlsx file selected by the user
 * @returns {Promise<{success, importId, status}>}
 */
export const importExcelFile = async (file) => {
    const formData = new FormData();
    formData.append('file', file);

    try {
        const response = await axios.post(`${API_URL}/inventory/import`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
                ...getAuthHeaders(),
            },
        });
        return response.data;
    } catch (error) {
        handleAuthError(error);
    }
};

/**
 * Poll the import status by importId.
 *
 * @param {string|number} importId
 * @returns {Promise<{importId, fileName, status, totalRows, errorRows}>}
 */
export const getImportStatus = async (importId) => {
    try {
        const response = await axios.get(`${API_URL}/inventory/import/${importId}/status`, {
            headers: getAuthHeaders(),
        });
        return response.data;
    } catch (error) {
        handleAuthError(error);
    }
};

/**
 * Fetch failed-row diagnostics for a completed import.
 *
 * @param {string|number} importId
 * @returns {Promise<{importId, errorCount, errors}>}
 */
export const getImportErrors = async (importId) => {
    try {
        const response = await axios.get(`${API_URL}/inventory/import/${importId}/errors`, {
            headers: getAuthHeaders(),
        });
        return response.data;
    } catch (error) {
        handleAuthError(error);
    }
};

/**
 * Fetch the inventory lots list (for useQuery key ['inventoryList']).
 * This is used by the parent page to display inventory data
 * and is invalidated after a successful import.
 *
 * @param {Object} [params] — optional query params { search, project, material }
 * @returns {Promise<Array>} inventory lots
 */
export const getInventoryLots = async (params = {}) => {
    try {
        const response = await axios.get(`${API_URL}/inventory`, {
            headers: getAuthHeaders(),
            params,
        });
        return response.data.data || response.data || [];
    } catch (error) {
        handleAuthError(error);
    }
};

/**
 * Fetch paginated inventory lots list from backend SQL Server.
 * Replaces heavy client-side Excel parsing with server-side pagination.
 *
 * @param {Object} params — { page, limit, search }
 * @returns {Promise<{success, data, pagination}>}
 */
export const getPaginatedInventory = async (params = {}) => {
    try {
        const response = await axios.get(`${API_URL}/inventory/list`, {
            headers: getAuthHeaders(),
            params: {
                page: params.page || 1,
                limit: params.limit || 50,
                search: params.search || '',
            },
        });
        return response.data;
    } catch (error) {
        handleAuthError(error);
    }
};

export default {
    importExcelFile,
    getImportStatus,
    getImportErrors,
    getInventoryLots,
    getPaginatedInventory,
};
