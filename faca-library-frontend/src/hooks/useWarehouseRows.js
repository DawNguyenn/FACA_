import { useCallback, useEffect, useRef, useState } from 'react';
import { PAGE_LIMIT, fetchWarehouseRows } from '../services/warehouseService';

/**
 * useWarehouseRows — nạp dữ liệu 1 sheet kho theo trang từ SQL Server
 * (server-side pagination + tìm kiếm LIKE) và quản lý các state liên quan:
 * dữ liệu, danh sách cột, cột mở rộng, phân trang, từ khóa tìm kiếm.
 *
 * @param {{source: string, onLoaded?: (res: Object) => void}} opts
 *        onLoaded được gọi sau mỗi lần tải THÀNH CÔNG (để trang cha reset trạng thái đang sửa).
 * @returns {{
 *   tableData: Array, columns: Array, customColumns: Array,
 *   loading: boolean, error: string|null,
 *   page: number, setPage: Function, totalPages: number, totalRows: number,
 *   search: string, setSearch: Function, debouncedSearch: string,
 *   refresh: () => void
 * }}
 */
export default function useWarehouseRows({ source, onLoaded }) {
    const [tableData, setTableData] = useState([]);
    const [columns, setColumns] = useState([]);
    const [customColumns, setCustomColumns] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    // Phân trang + tìm kiếm (server-side: OFFSET/FETCH + WHERE LIKE)
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalRows, setTotalRows] = useState(0);
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    // Tăng số này để buộc bảng xem (phân trang) tải lại sau khi Data Grid lưu
    const [refreshTick, setRefreshTick] = useState(0);

    // Giữ callback mới nhất trong ref để effect tải dữ liệu không chạy lại mỗi lần render
    const onLoadedRef = useRef(onLoaded);
    useEffect(() => { onLoadedRef.current = onLoaded; });

    const refresh = useCallback(() => setRefreshTick((t) => t + 1), []);

    // Debounce từ khóa tìm kiếm 400ms
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(search.trim()), 400);
        return () => clearTimeout(timer);
    }, [search]);

    // Reset về trang 1 khi đổi nguồn dữ liệu hoặc từ khóa
    useEffect(() => {
        setPage(1);
    }, [source, debouncedSearch]);

    // Load dữ liệu của trang hiện tại từ SQL Server
    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setError(null);

        fetchWarehouseRows(source, { page, limit: PAGE_LIMIT, search: debouncedSearch })
            .then((res) => {
                if (cancelled) return;
                if (res.success) {
                    setColumns(res.columns || []);
                    setCustomColumns(res.customColumns || []);
                    setTableData(res.data || []);
                    const pg = res.pagination || {};
                    setTotalPages(pg.totalPages || 1);
                    setTotalRows(pg.totalRows || 0);
                    setPage(pg.page || page);
                    if (onLoadedRef.current) onLoadedRef.current(res);
                } else {
                    setColumns([]);
                    setCustomColumns([]);
                    setTableData([]);
                    setTotalRows(0);
                    setTotalPages(1);
                    setError(res.message || 'Không tải được dữ liệu.');
                }
            })
            .catch((err) => {
                if (cancelled) return;
                setColumns([]);
                setTableData([]);
                setTotalRows(0);
                setTotalPages(1);
                setError(err.response?.data?.message || err.message || 'Không thể kết nối tới backend.');
            })
            .finally(() => { if (!cancelled) setLoading(false); });

        return () => { cancelled = true; };
    }, [source, page, debouncedSearch, refreshTick]);

    return {
        tableData,
        columns,
        customColumns,
        loading,
        error,
        page,
        setPage,
        totalPages,
        totalRows,
        search,
        setSearch,
        debouncedSearch,
        refresh,
    };
}
