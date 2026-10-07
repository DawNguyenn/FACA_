import apiClient from './apiClient';

// Số dòng mỗi trang — phân trang phía Database
export const PAGE_LIMIT = 50;

/**
 * GET trả về JSON body (apiClient tự gắn Authorization).
 * @param {string} url
 * @param {Object} [config] — cấu hình axios bổ sung, vd { signal } để huỷ request cũ khi bấm sort liên tục
 */
const getJSON = async (url, config = {}) => {
    const { data } = await apiClient.get(url, config);
    return data;
};

/** POST/PUT và trả về JSON body (dùng cho inline editing) */
const sendJSON = async (method, url, body) => {
    const { data } = await apiClient({ method, url, data: body });
    return data;
};

/**
 * GET /warehouse/sources — danh mục sheet động + các template để clone khi tạo sheet mới.
 * @returns {Promise<{success, sources, templates}>}
 */
export const fetchWarehouseSources = () => getJSON('/warehouse/sources');

/**
 * GET /warehouse/:source?page&limit&search&sortBy&sortDir — dữ liệu 1 trang của sheet (SQL Server).
 * @param {string} source — key sheet (vd 'sbn27')
 * @param {{page?: number, limit?: number, search?: string, sortBy?: string, sortDir?: 'asc'|'desc', signal?: AbortSignal}} opts
 * @returns {Promise<{success, columns, customColumns, data, pagination, message}>}
 */
export const fetchWarehouseRows = (
    source,
    { page = 1, limit = PAGE_LIMIT, search = '', sortBy = '', sortDir = '', signal } = {},
) => {
    const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
    });
    if (search) params.set('search', search);
    // Chỉ gửi tham số sắp xếp khi người dùng đã click 1 cột (backend whitelist lại lần nữa)
    if (sortBy) {
        params.set('sortBy', sortBy);
        params.set('sortDir', sortDir === 'desc' ? 'desc' : 'asc');
    }
    // `signal` cho phép huỷ request đang chờ khi người dùng bấm sort / đổi trang / gõ tìm kiếm liên tục
    return getJSON(`/warehouse/${source}?${params.toString()}`, { signal });
};

/**
 * PUT /warehouse/:source/rows/:rowId — cập nhật 1 dòng.
 * @param {string} source — key sheet
 * @param {number|string} rowId — StagingID
 * @param {Object} values — map columnName -> value
 */
export const updateWarehouseRow = (source, rowId, values) =>
    sendJSON('put', `/warehouse/${source}/rows/${rowId}`, { values });

/**
 * POST /warehouse/:source/rows — thêm dòng mới.
 */
export const createWarehouseRow = (source, values) =>
    sendJSON('post', `/warehouse/${source}/rows`, { values });

/**
 * POST /warehouse/:source/columns — thêm cột mới (ALTER TABLE + lưu metadata).
 */
export const createWarehouseColumn = (source, column) =>
    sendJSON('post', `/warehouse/${source}/columns`, column);

/**
 * POST /warehouse/sources — tạo sheet mới (tự tạo bảng SQL theo template).
 * @param {{key: string, label: string, templateKey: string}} payload
 */
export const createWarehouseSource = ({ key, label, templateKey }) =>
    sendJSON('post', '/warehouse/sources', { key, label, templateKey });

/**
 * DELETE /warehouse/sources/:key — xoá sheet (DROP TABLE) — chỉ Admin & Warehouse.
 */
export const deleteWarehouseSource = async (key) => {
    const { data } = await apiClient.delete(`/warehouse/sources/${encodeURIComponent(key)}`);
    return data;
};

/**
 * GET /warehouse/sources/:source/meta — khối metadata HEADER của sheet
 * (tên file gốc, người nhập, thời gian import, tổng bản ghi, dự án/build, trạng thái).
 * @returns {Promise<{success, sourceKey, tableName, sheetHeader}>}
 */
export const fetchSheetMeta = (source) =>
    getJSON(`/warehouse/sources/${encodeURIComponent(source)}/meta`);

/**
 * PUT /warehouse/sources/:source/meta — cập nhật metadata header (Admin & Warehouse).
 * @param {Object} meta { fileName, importedBy, importedAt, projectCode, buildVersion, status, description }
 */
export const updateSheetMeta = (source, meta) =>
    sendJSON('put', `/warehouse/sources/${encodeURIComponent(source)}/meta`, meta);

export default {
    fetchWarehouseSources,
    fetchWarehouseRows,
    updateWarehouseRow,
    createWarehouseRow,
    createWarehouseColumn,
    createWarehouseSource,
    deleteWarehouseSource,
    fetchSheetMeta,
    updateSheetMeta,
};
