import { useCallback, useEffect, useState } from 'react';
import { fetchWarehouseSources } from '../services/warehouseService';

/**
 * useWarehouseSources — quản lý danh mục sheet động lấy từ backend
 * (GET /warehouse/sources) + danh sách template để clone khi tạo sheet mới.
 *
 * @param {{fallbackSources?: Array}} opts — danh mục mặc định khi backend chưa phản hồi
 * @returns {{
 *   sources: Array, templates: Object, source: string,
 *   setSource: Function, reloadSources: (selectKey?: string) => Promise<Object|null>
 * }}
 */
export default function useWarehouseSources({ fallbackSources = [] } = {}) {
    const [sources, setSources] = useState(fallbackSources);
    const [templates, setTemplates] = useState({});
    const [source, setSource] = useState(fallbackSources[0]?.key || '');

    /**
     * Nạp danh mục sheet động từ backend.
     * @param {string} [selectKey] — key sheet cần chọn sau khi nạp xong
     */
    const reloadSources = useCallback(async (selectKey) => {
        try {
            const res = await fetchWarehouseSources();
            if (res && res.success && Array.isArray(res.sources) && res.sources.length) {
                const list = res.sources;
                setSources(list);
                setTemplates(res.templates || {});
                // Giữ sheet đang chọn nếu vẫn còn trong danh mục; ngược lại chọn sheet đầu tiên
                setSource((current) => {
                    if (selectKey && list.some((s) => s.key === selectKey)) return selectKey;
                    if (!list.some((s) => s.key === current)) return list[0].key;
                    return current;
                });
                return res;
            }
        } catch { /* giu fallback */ }
        return null;
    }, []);

    useEffect(() => { reloadSources(); }, [reloadSources]);

    return { sources, templates, source, setSource, reloadSources };
}
