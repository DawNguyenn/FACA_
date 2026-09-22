import { useCallback, useEffect, useRef, useState } from 'react';
import { PAGE_LIMIT, fetchWarehouseRows } from '../services/warehouseService';
import { isDateColumn } from '../components/warehouse/warehouseConfig';

/**
 * useWarehouseRows — nạp dữ liệu 1 sheet kho theo trang từ SQL Server
 * (server-side pagination + tìm kiếm LIKE + sắp xếp theo cột) và quản lý các state
 * liên quan: dữ liệu, danh sách cột, cột mở rộng, phân trang, tìm kiếm, sắp xếp.
 *
 * @param {{source: string, onLoaded?: (res: Object) => void}} opts
 *        onLoaded được gọi sau mỗi lần tải THÀNH CÔNG (để trang cha reset trạng thái đang sửa).
 * @returns {{
 *   tableData: Array, columns: Array, customColumns: Array,
 *   loading: boolean, error: string|null,
 *   page: number, setPage: Function, totalPages: number, totalRows: number,
 *   search: string, setSearch: Function, debouncedSearch: string,
 *   sort: {by: string, dir: 'asc'|'desc'}, handleSort: (col: string) => void,
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
    // Sắp xếp server-side: by = tên cột SQL, dir = 'asc' | 'desc'
    const [sort, setSort] = useState({ by: '', dir: 'asc' });
    // Tăng số này để buộc bảng xem (phân trang) tải lại sau khi Data Grid lưu
    const [refreshTick, setRefreshTick] = useState(0);

    // Giữ callback mới nhất trong ref để effect tải dữ liệu không chạy lại mỗi lần render
    const onLoadedRef = useRef(onLoaded);
    useEffect(() => { onLoadedRef.current = onLoaded; });

    // Nhớ nguồn dữ liệu của lần tải trước: chỉ khi ĐỔI SHEET mới xoá bảng để hiện spinner.
    // Khi sort / phân trang / tìm kiếm thì giữ nguyên bảng cũ -> hết giật layout.
    const sourceRef = useRef(source);

    const refresh = useCallback(() => setRefreshTick((t) => t + 1), []);

    /**
     * Click header cột: đổi cột -> sắp xếp mặc định; click lại cùng cột -> đảo chiều.
     * Mặc định của CỘT NGÀY là GIẢM DẦN (ngày mới nhất lên đầu — đúng thói quen xem dữ liệu kho);
     * các cột khác mặc định TĂNG DẦN.
     * @param {string} col — tên cột SQL
     */
    const handleSort = useCallback((col) => {
        // Đặt lại trang 1 NGAY trong cùng 1 batch với setSort:
        // React gộp 2 lần setState -> 1 lần render -> chỉ 1 request.
        // (Nếu reset page bằng useEffect riêng sẽ phát 2 request, bảng load 2 lần -> cảm giác giật.)
        setPage(1);
        setSort((prev) => (
            prev.by === col
                ? { by: col, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
                : { by: col, dir: isDateColumn(col) ? 'desc' : 'asc' }
        ));
    }, []);

    // Debounce từ khóa tìm kiếm 400ms
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(search.trim()), 400);
        return () => clearTimeout(timer);
    }, [search]);

    // Reset về trang 1 khi đổi nguồn dữ liệu hoặc từ khóa tìm kiếm.
    // (Khi sort, việc reset trang đã được làm ngay trong handleSort để tránh phát 2 request.)
    useEffect(() => {
        setPage(1);
    }, [source, debouncedSearch]);

    // Load dữ liệu của trang hiện tại từ SQL Server
    useEffect(() => {
        // Huỷ request đang chờ khi tham số thay đổi (bấm sort / đổi trang / gõ tìm kiếm liên tục)
        // -> không nhận dữ liệu cũ về muộn làm bảng "nhảy" 2 lần.
        const controller = new AbortController();

        // Đổi sheet = đổi ngữ cảnh -> xoá dữ liệu cũ và hiện spinner.
        // Sort / phân trang / tìm kiếm -> GIỮ NGUYÊN bảng cũ (làm mờ) để layout không giật.
        const sourceChanged = sourceRef.current !== source;
        sourceRef.current = source;
        if (sourceChanged) {
            setTableData([]);
            setColumns([]);
            setCustomColumns([]);
        }

        setLoading(true);
        setError(null);

        fetchWarehouseRows(source, {
            page,
            limit: PAGE_LIMIT,
            search: debouncedSearch,
            sortBy: sort.by,
            sortDir: sort.dir,
            signal: controller.signal,
        })
            .then((res) => {
                if (controller.signal.aborted) return;
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
                    // Giữ nguyên dữ liệu đang xem để bảng không biến mất (gây giật) khi lỗi tạm thời.
                    // Bảng sẽ tự hiện băng cảnh báo lỗi phía trên.
                    setError(res.message || 'Không tải được dữ liệu.');
                }
            })
            .catch((err) => {
                if (controller.signal.aborted) return;
                setError(err.response?.data?.message || err.message || 'Không thể kết nối tới backend.');
            })
            .finally(() => { if (!controller.signal.aborted) setLoading(false); });

        return () => controller.abort();
    }, [source, page, debouncedSearch, sort.by, sort.dir, refreshTick]);

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
        sort,
        handleSort,
        refresh,
    };
}
