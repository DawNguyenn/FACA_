import apiClient from './apiClient';

/**
 * Upload an Excel file for background processing.
 *
 * @param {File} file  — the .xlsx file selected by the user
 * @returns {Promise<{success, importId, status}>}
 */
export const importExcelFile = async (file) => {
    const formData = new FormData();
    formData.append('file', file);

    const { data } = await apiClient.post('/inventory/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
};

/**
 * Poll the import status by importId.
 *
 * @param {string|number} importId
 * @returns {Promise<{importId, fileName, status, totalRows, errorRows}>}
 */
export const getImportStatus = async (importId) => {
    const { data } = await apiClient.get(`/inventory/import/${importId}/status`);
    return data;
};

/**
 * Fetch failed-row diagnostics for a completed import.
 *
 * @param {string|number} importId
 * @returns {Promise<{importId, errorCount, errors}>}
 */
export const getImportErrors = async (importId) => {
    const { data } = await apiClient.get(`/inventory/import/${importId}/errors`);
    return data;
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
    const { data } = await apiClient.get('/inventory', { params });
    return data.data || data || [];
};

/**
 * Fetch paginated inventory lots list from backend SQL Server.
 * Replaces heavy client-side Excel parsing with server-side pagination.
 *
 * @param {Object} params — { page, limit, search }
 * @returns {Promise<{success, data, pagination}>}
 */
export const getPaginatedInventory = async (params = {}) => {
    const { data } = await apiClient.get('/inventory/list', {
        params: {
            page: params.page || 1,
            limit: params.limit || 50,
            search: params.search || '',
        },
    });
    return data;
};

export default {
    importExcelFile,
    getImportStatus,
    getImportErrors,
    getInventoryLots,
    getPaginatedInventory,
};
