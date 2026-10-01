import { useMemo } from 'react';
import WarehouseToolbar from '../components/warehouse/WarehouseToolbar';
import WarehouseRowsTable from '../components/warehouse/WarehouseRowsTable';
import WarehousePagination from '../components/warehouse/WarehousePagination';
import { FALLBACK_SOURCES, makeColumnLabel } from '../components/warehouse/warehouseConfig';
import useWarehouseSources from '../hooks/useWarehouseSources';
import useWarehouseRows from '../hooks/useWarehouseRows';
import { PAGE_LIMIT } from '../services/warehouseService';

/**
 * WarehouseExcelViewer — trang "Kho & Vật tư" (/warehouse): CHỈ XEM (read-only) dữ liệu kho.
 *
 * Phần chỉnh sửa (Bảng nhập liệu, Thêm dòng / Thêm cột / Xoá dòng / Lưu dữ liệu / Xoá sheet /
 * Sheet mới) đã được tách sang trang riêng "Edit Warehouse" (/warehouse/edit) dành cho
 * Admin & Warehouse.
 *
 * Cấu trúc:
 *  - Hiển thị   : src/components/warehouse/* (toolbar, bảng chỉ xem, phân trang)
 *  - Nạp dữ liệu: src/hooks/useWarehouseSources.js, src/hooks/useWarehouseRows.js
 *  - Gọi API    : src/services/warehouseService.js
 *  - Cấu hình   : src/components/warehouse/warehouseConfig.js
 */
export default function WarehouseExcelViewer() {
    // ===== Danh mục sheet động từ backend (GET /warehouse/sources) =====
    const { sources, source, setSource } = useWarehouseSources({ fallbackSources: FALLBACK_SOURCES });

    // ===== Dữ liệu bảng xem (phân trang + tìm kiếm + sắp xếp phía Database) =====
    const {
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
        sort,
        handleSort,
    } = useWarehouseRows({ source });

    // Toàn bộ cột hiển thị = cột gốc + cột tùy chỉnh
    const allColumns = useMemo(
        () => [...columns, ...customColumns.map((c) => c.ColumnName)],
        [columns, customColumns],
    );
    // Nhãn cột có xét metadata cột mở rộng
    const labelFor = useMemo(() => makeColumnLabel(customColumns), [customColumns]);

    const activeSource = sources.find((s) => s.key === source) || sources[0] || FALLBACK_SOURCES[0];
    const rowOffset = (page - 1) * PAGE_LIMIT;

    return (
        <div className="mx-auto max-w-7xl px-4 py-8">
            {/* Header thông tin kho + ô Tìm kiếm + badge số bản ghi + Dropdown chọn Sheet.
                Không còn nút chỉnh sửa (Xoá sheet / Sheet mới) — đã tách sang Edit Warehouse. */}
            <WarehouseToolbar
                activeSource={activeSource}
                loading={loading}
                canEdit={false}
                search={search}
                onSearchChange={setSearch}
                totalRows={totalRows}
                sources={sources}
                source={source}
                onSelectSource={setSource}
                actionMsg={null}
            />

            {/* Bảng dữ liệu CHỈ XEM (Read-only Data Table) */}
            <WarehouseRowsTable
                allColumns={allColumns}
                labelFor={labelFor}
                rows={tableData}
                loading={loading}
                error={error}
                activeSource={activeSource}
                rowOffset={rowOffset}
                canEdit={false}
                sortBy={sort.by}
                sortDir={sort.dir}
                onSort={handleSort}
            />

            {/* Footer phân trang */}
            <WarehousePagination
                page={page}
                totalPages={totalPages}
                totalRows={totalRows}
                pageLimit={PAGE_LIMIT}
                loading={loading}
                onPageChange={setPage}
            />
        </div>
    );
}
