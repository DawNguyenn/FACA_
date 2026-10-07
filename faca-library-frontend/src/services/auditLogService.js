import apiClient from './apiClient';

const BASE = '/warehouse/audit-logs';

/**
 * GET /warehouse/audit-logs — danh sách nhật ký (lọc + phân trang).
 * @param {Object} params { page, limit, tableName, recordId, actionType, changedBy, from, to }
 * @returns {Promise<{success, logs: Array, pagination: Object, summary: Object}>}
 */
export const fetchAuditLogs = async (params = {}) => {
    const { data } = await apiClient.get(BASE, {
        params: {
            page: params.page || 1,
            limit: params.limit || 20,
            tableName: params.tableName || undefined,
            recordId: params.recordId || undefined,
            actionType: params.actionType || undefined,
            changedBy: params.changedBy || undefined,
            from: params.from || undefined,
            to: params.to || undefined,
        },
    });
    return data;
};

/**
 * GET /warehouse/audit-logs/tables — danh sách bảng có phát sinh nhật ký (để dựng bộ lọc).
 * @returns {Promise<string[]>}
 */
export const fetchAuditTables = async () => {
    const { data } = await apiClient.get(`${BASE}/tables`);
    return data.tables || [];
};

/**
 * Lịch sử chỉnh sửa của 1 bản ghi cụ thể (mới nhất trước).
 * @returns {Promise<{success, logs: Array, pagination: Object, summary: Object}>}
 */
export const fetchRecordHistory = async (tableName, recordId, limit = 50) => {
    const { data } = await apiClient.get(BASE, {
        params: { page: 1, limit, tableName, recordId },
    });
    return data;
};

/**
 * POST /warehouse/audit-logs/:id/restore — khôi phục dữ liệu từ 1 bản ghi nhật ký.
 * Chỉ Admin; hỗ trợ log DELETE (chèn lại dòng) và UPDATE (revert old_values).
 * @param {number} auditId
 * @returns {Promise<{success, message, mode, auditId}>}
 */
export const restoreAuditLog = async (auditId, body = {}) => {
    const { data } = await apiClient.post(`${BASE}/${auditId}/restore`, body);
    return data;
};

export default { fetchAuditLogs, fetchAuditTables, fetchRecordHistory, restoreAuditLog };