import { useEffect, useMemo, useRef, useState } from 'react';
import { canEditWarehouse } from '../services/authUtils';
import WarehouseDataGrid from '../components/warehouse/WarehouseDataGrid';
import WarehouseToolbar from '../components/warehouse/WarehouseToolbar';
import WarehouseRowsTable from '../components/warehouse/WarehouseRowsTable';
import WarehousePagination from '../components/warehouse/WarehousePagination';
import AddColumnModal from '../components/warehouse/AddColumnModal';
import NewSheetModal from '../components/warehouse/NewSheetModal';
import DeleteSheetModal from '../components/warehouse/DeleteSheetModal';
import { FALLBACK_SOURCES, makeColumnLabel } from '../components/warehouse/warehouseConfig';
import useWarehouseSources from '../hooks/useWarehouseSources';
import useWarehouseRows from '../hooks/useWarehouseRows';
import {
    PAGE_LIMIT,
    createWarehouseColumn,
    createWarehouseRow,
    createWarehouseSource,
    deleteWarehouseSource,
    updateWarehouseRow,
} from '../services/warehouseService';

/**
 * WarehouseExcelViewer — trang "Kho Dữ Liệu": xem / sửa / thêm dữ liệu staging trên SQL Server.
 *
 * Cấu trúc sau khi tách:
 *  - Hiển thị  : src/components/warehouse/*  (toolbar, bảng, phân trang, các modal)
 *  - Nạp dữ liệu: src/hooks/useWarehouseSources.js, src/hooks/useWarehouseRows.js
 *  - Gọi API   : src/services/warehouseService.js
 *  - Cấu hình  : src/components/warehouse/warehouseConfig.js
 */
export default function WarehouseExcelViewer() {
    // ===== Kiểm tra quyền chỉnh sửa (chỉ Admin và Warehouse được phép) =====
    const [canEdit, setCanEdit] = useState(canEditWarehouse());
    useEffect(() => {
        const updateCanEdit = () => setCanEdit(canEditWarehouse());
        updateCanEdit();
        window.addEventListener('user:updated', updateCanEdit);
        return () => window.removeEventListener('user:updated', updateCanEdit);
    }, []);

    // ===== Inline Editing / Thêm dòng / Thêm cột =====
    const [editingId, setEditingId] = useState(null);         // StagingID đang sửa
    const [editValues, setEditValues] = useState({});         // giá trị đang chỉnh
    const [savingRow, setSavingRow] = useState(false);        // đang lưu
    const [actionMsg, setActionMsg] = useState(null);         // thông báo thành công/lỗi
    const [showAddRow, setShowAddRow] = useState(false);      // form thêm dòng mới
    const [newRowValues, setNewRowValues] = useState({});
    const [showAddColumn, setShowAddColumn] = useState(false);// modal thêm cột
    const [newColumn, setNewColumn] = useState({ columnName: '', label: '', dataType: 'NVARCHAR(255)' });
    // ===== Sheet moi dong + bang nhap lieu truc tiep (Data Grid) =====
    const [showAddSheet, setShowAddSheet] = useState(false);
    const [newSheet, setNewSheet] = useState({ key: '', label: '', templateKey: 'npi' });
    // ===== Quản lý / Xoá sheet (trang riêng, tránh xoá nhầm) =====
    const [showDeleteSheet, setShowDeleteSheet] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [confirmName, setConfirmName] = useState('');
    const [deleting, setDeleting] = useState(false);
    const gridFormRef = useRef(null);

    // ===== Danh mục sheet động từ backend (GET /warehouse/sources) =====
    const { sources, templates, source, setSource, reloadSources } = useWarehouseSources({
        fallbackSources: FALLBACK_SOURCES,
    });

    // Sau khi bảng nạp lại dữ liệu thành công thì bỏ trạng thái đang sửa
    const handleRowsLoaded = () => {
        setEditingId(null);
        setEditValues({});
        setShowAddRow(false);
    };

    // ===== Dữ liệu bảng xem (phân trang + tìm kiếm phía Database) =====
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
        refresh,
    } = useWarehouseRows({ source, onLoaded: handleRowsLoaded });

    // Toàn bộ cột hiển thị = cột gốc + cột tùy chỉnh
    const allColumns = useMemo(
        () => [...columns, ...customColumns.map((c) => c.ColumnName)],
        [columns, customColumns],
    );
    // Nhãn cột có xét metadata cột mở rộng (dùng cho bảng xem + Data Grid)
    const labelFor = useMemo(() => makeColumnLabel(customColumns), [customColumns]);

    const activeSource = sources.find((s) => s.key === source) || sources[0] || FALLBACK_SOURCES[0];
    const rowOffset = (page - 1) * PAGE_LIMIT;

    const notify = (msg, ok = true) => {
        setActionMsg({ ok, msg });
        setTimeout(() => setActionMsg(null), 4000);
    };
    // ===== Tao sheet moi + Bulk insert (khong can sua code khi mo rong) =====
    const submitNewSheet = async () => {
        if (!canEdit) { notify('Bạn không có quyền tạo sheet mới.', false); return; }
        if (!newSheet.key.trim() || !newSheet.label.trim()) { notify('Nhập key + tên hiển thị (vd key=pkd28, tên=PKD28).', false); return; }
        setSavingRow(true);
        try {
            const res = await createWarehouseSource({
                key: newSheet.key.trim().toLowerCase(),
                label: newSheet.label.trim(),
                templateKey: newSheet.templateKey,
            });
            if (res.success) {
                notify(res.message || 'Đã tạo sheet mới.');
                setShowAddSheet(false);
                setNewSheet({ key: '', label: '', templateKey: 'npi' });
                const key = res.source && res.source.key;
                if (key) {
                    // Tự đồng bộ danh mục sheet + chọn sheet mới vừa tạo luôn
                    await reloadSources(key);
                    // Trễ một chút để React render xong bảng nhập liệu rồi mới cuộn xuống
                    setTimeout(() => {
                        gridFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }, 350);
                } else {
                    await reloadSources();
                }
            } else notify(res.message || 'Tạo sheet thất bại.', false);
        } catch (err) {
            notify(err.response?.data?.message || err.message || 'Không thể kết nối backend.', false);
        } finally { setSavingRow(false); }
    };

    // Sau khi Data Grid luu xong: tai lai bang xem (phan trang) tu SQL Server
    const handleGridSaved = () => {
        refresh();
    };

    // ===== Xoá sheet (chỉ Admin & Warehouse, có xác nhận) =====
    const submitDeleteSheet = async () => {
        if (!canEdit) { notify('Bạn không có quyền xoá sheet.', false); return; }
        if (!deleteTarget) return;
        if (confirmName.trim() !== String(deleteTarget.label).trim()) {
            notify('Tên xác nhận không khớp. Hãy gõ đúng tên hiển thị của sheet.', false);
            return;
        }
        setDeleting(true);
        try {
            const res = await deleteWarehouseSource(deleteTarget.key);
            if (res.success) {
                notify(res.message || 'Đã xoá sheet.');
                setShowDeleteSheet(false);
                setDeleteTarget(null);
                setConfirmName('');
                setPage(1);
                await reloadSources();
            } else {
                notify(res.message || 'Xoá sheet thất bại.', false);
            }
        } catch (err) {
            notify(err.response?.data?.message || err.message || 'Không thể kết nối backend.', false);
        } finally {
            setDeleting(false);
        }
    };

    // ===== Handlers Inline Editing =====
    const startEdit = (row) => {
        if (!canEdit) return; // Chỉ Admin & Warehouse được phép chỉnh sửa
        setEditingId(row.StagingID);
        const vals = {};
        allColumns.forEach((col) => { vals[col] = row[col] === null || row[col] === undefined ? '' : String(row[col]); });
        setEditValues(vals);
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditValues({});
    };

    const saveEdit = async (rowId) => {
        if (!canEdit) {
            notify('Bạn không có quyền chỉnh sửa dữ liệu kho.', false);
            return;
        }
        setSavingRow(true);
        try {
            const res = await updateWarehouseRow(source, rowId, editValues);
            if (res.success) {
                notify(res.message || 'Đã lưu.');
                setEditingId(null);
                setEditValues({});
            } else {
                notify(res.message || 'Lưu thất bại.', false);
            }
        } catch (err) {
            notify(err.response?.data?.message || err.message || 'Không thể kết nối backend.', false);
        } finally {
            setSavingRow(false);
        }
    };

    const saveNewRow = async () => {
        if (!canEdit) {
            notify('Bạn không có quyền thêm dòng mới.', false);
            return;
        }
        setSavingRow(true);
        try {
            const res = await createWarehouseRow(source, newRowValues);
            if (res.success) {
                notify(res.message || 'Đã thêm dòng mới.');
                setShowAddRow(false);
                setNewRowValues({});
                setPage(1);
            } else {
                notify(res.message || 'Thêm thất bại.', false);
            }
        } catch (err) {
            notify(err.response?.data?.message || err.message || 'Không thể kết nối backend.', false);
        } finally {
            setSavingRow(false);
        }
    };

    const submitNewColumn = async () => {
        if (!canEdit) {
            notify('Bạn không có quyền thêm cột mới.', false);
            return;
        }
        if (!newColumn.columnName.trim()) { notify('Vui lòng nhập tên cột.', false); return; }
        setSavingRow(true);
        try {
            const res = await createWarehouseColumn(source, newColumn);
            if (res.success) {
                notify(res.message || 'Đã thêm cột.');
                setShowAddColumn(false);
                setNewColumn({ columnName: '', label: '', dataType: 'NVARCHAR(255)' });
            } else {
                notify(res.message || 'Thêm cột thất bại.', false);
            }
        } catch (err) {
            notify(err.response?.data?.message || err.message || 'Không thể kết nối backend.', false);
        } finally {
            setSavingRow(false);
        }
    };


    return (
        <div className="mx-auto max-w-7xl px-4 py-8">
            {/* Header + tìm kiếm + chọn sheet + hành động */}
            <WarehouseToolbar
                activeSource={activeSource}
                loading={loading}
                canEdit={canEdit}
                search={search}
                onSearchChange={setSearch}
                totalRows={totalRows}
                sources={sources}
                source={source}
                onSelectSource={setSource}
                onOpenDeleteSheet={() => setShowDeleteSheet(true)}
                onOpenAddSheet={() => setShowAddSheet(true)}
                actionMsg={actionMsg}
            />

            {/* Bang nhap lieu truc tiep (Data Grid) — thay the hoan toan Bulk insert tu file */}
            {canEdit && (
                <div className="mb-3" ref={gridFormRef}>
                    <WarehouseDataGrid
                        key={activeSource.key}
                        source={activeSource.key}
                        sourceInfo={{ label: activeSource.label, table: activeSource.table }}
                        canEdit={canEdit}
                        labelFor={labelFor}
                        onSaved={handleGridSaved}
                    />
                </div>
            )}

            {/* Bảng dữ liệu — min-height cố định để khi loading/error không làm giật layout */}
            <WarehouseRowsTable
                allColumns={allColumns}
                labelFor={labelFor}
                rows={tableData}
                loading={loading}
                error={error}
                activeSource={activeSource}
                rowOffset={rowOffset}
                canEdit={canEdit}
                editingId={editingId}
                editValues={editValues}
                onEditValueChange={(col, value) => setEditValues((v) => ({ ...v, [col]: value }))}
                savingRow={savingRow}
                showAddRow={showAddRow}
                newRowValues={newRowValues}
                onNewRowValueChange={(col, value) => setNewRowValues((v) => ({ ...v, [col]: value }))}
                onSaveNewRow={saveNewRow}
                onCancelAddRow={() => { setShowAddRow(false); setNewRowValues({}); }}
                onStartEdit={startEdit}
                onCancelEdit={cancelEdit}
                onSaveEdit={saveEdit}
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

            {/* Modal thêm cột mới */}
            <AddColumnModal
                open={showAddColumn}
                activeSource={activeSource}
                value={newColumn}
                onChange={setNewColumn}
                onClose={() => setShowAddColumn(false)}
                onSubmit={submitNewColumn}
                saving={savingRow}
            />

            {/* Modal tao sheet moi (khong can sua code) */}
            <NewSheetModal
                open={showAddSheet}
                templates={templates}
                value={newSheet}
                onChange={setNewSheet}
                onClose={() => setShowAddSheet(false)}
                onSubmit={submitNewSheet}
                saving={savingRow}
            />

            {/* Modal quản lý / xoá sheet — trang riêng để tránh xoá nhầm */}
            <DeleteSheetModal
                open={showDeleteSheet}
                sources={sources}
                deleteTarget={deleteTarget}
                confirmName={confirmName}
                onSelectTarget={(s) => { setDeleteTarget(s); setConfirmName(''); }}
                onConfirmNameChange={setConfirmName}
                onResetTarget={() => { setDeleteTarget(null); setConfirmName(''); }}
                onClose={() => setShowDeleteSheet(false)}
                onSubmit={submitDeleteSheet}
                deleting={deleting}
            />
        </div>
    );
}

