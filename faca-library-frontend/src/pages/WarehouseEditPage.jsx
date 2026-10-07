import { useCallback, useState } from 'react';
import WarehouseDataGrid from '../components/warehouse/WarehouseDataGrid';
import WarehouseToolbar from '../components/warehouse/WarehouseToolbar';
import SheetHeaderCard from '../components/warehouse/SheetHeaderCard';
import SheetMetaModal from '../components/warehouse/SheetMetaModal';
import useSheetHeader from '../hooks/useSheetHeader';
import NewSheetModal from '../components/warehouse/NewSheetModal';
import DeleteSheetModal from '../components/warehouse/DeleteSheetModal';
import { FALLBACK_SOURCES, columnLabel } from '../components/warehouse/warehouseConfig';
import useWarehouseSources from '../hooks/useWarehouseSources';
import {
    createWarehouseSource,
    deleteWarehouseSource,
} from '../services/warehouseService';

/**
 * WarehouseEditPage — trang "Edit Warehouse" (/warehouse/edit): bảng nhập liệu trực tiếp
 * (Excel-like) cùng toàn bộ thao tác chỉnh sửa dữ liệu kho:
 *   Thêm dòng / Thêm cột / Xoá dòng chọn / Lưu dữ liệu / Xoá sheet / Sheet mới.
 *
 * Chỉ Admin & Warehouse truy cập được (đã chặn ở route WarehouseEditRoute trong App.jsx).
 *
 * Toàn bộ logic sửa trực tiếp ô + đồng bộ SQL Server nằm trong WarehouseDataGrid;
 * trang này giữ thanh Tìm kiếm (lọc trực tiếp trên bảng nhập liệu) + Dropdown chọn Sheet
 * + quản lý sheet (tạo / xoá).
 */
export default function WarehouseEditPage() {
    // ===== Trạng thái UI chung =====
    const [search, setSearch] = useState('');
    const [actionMsg, setActionMsg] = useState(null);
    const [busy, setBusy] = useState(false);
    // Thống kê do Data Grid báo lên (dòng tải về / dòng hiển thị / số cột / đang tải)
    const [stats, setStats] = useState({ loaded: 0, visible: 0, columns: 0, loading: false });

    // ===== Modal: tạo sheet mới =====
    const [showAddSheet, setShowAddSheet] = useState(false);
    const [newSheet, setNewSheet] = useState({ key: '', label: '', templateKey: 'npi' });
    // ===== Modal: quản lý / xoá sheet (có xác nhận để tránh xoá nhầm) =====
    const [showDeleteSheet, setShowDeleteSheet] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [confirmName, setConfirmName] = useState('');
    const [deleting, setDeleting] = useState(false);

    // ===== Danh mục sheet động từ backend (GET /warehouse/sources) =====
    const { sources, templates, source, setSource, reloadSources } = useWarehouseSources({
        fallbackSources: FALLBACK_SOURCES,
    });
    const activeSource = sources.find((s) => s.key === source) || sources[0] || FALLBACK_SOURCES[0];

    // ===== Khối thông tin Header / Metadata của sheet (dùng chung key trạng thái với màn chỉ đọc) =====
    const { header: sheetHeader, loading: sheetHeaderLoading, error: sheetHeaderError, reload: reloadSheetHeader } = useSheetHeader(source);
    const [headerCollapsed, setHeaderCollapsed] = useState(
        () => localStorage.getItem('warehouse_sheet_header_collapsed') === '1'
    );
    const [showMeta, setShowMeta] = useState(false);
    const toggleHeaderCollapsed = useCallback(() => {
        setHeaderCollapsed((prev) => {
            const next = !prev;
            localStorage.setItem('warehouse_sheet_header_collapsed', next ? '1' : '0');
            return next;
        });
    }, []);

    const notify = (msg, ok = true) => {
        setActionMsg({ ok, msg });
        setTimeout(() => setActionMsg(null), 4000);
    };

    // Data Grid báo số liệu lên -> cập nhật badge đếm bản ghi trên toolbar
    const handleStatsChange = useCallback((s) => setStats(s), []);

    // Đổi sheet: xoá từ khóa tìm kiếm để không lọc nhầm sang sheet mới
    const handleSelectSource = (key) => {
        setSearch('');
        setSource(key);
    };

    // ===== Tạo sheet mới (tự tạo bảng SQL theo template) =====
    const submitNewSheet = async () => {
        if (!newSheet.key.trim() || !newSheet.label.trim()) {
            notify('Nhập key + tên hiển thị (vd key=pkd28, tên=PKD28).', false);
            return;
        }
        setBusy(true);
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
                // Tự đồng bộ danh mục sheet + chọn sheet mới vừa tạo
                const key = res.source && res.source.key;
                await reloadSources(key || undefined);
            } else notify(res.message || 'Tạo sheet thất bại.', false);
        } catch (err) {
            notify(err.response?.data?.message || err.message || 'Không thể kết nối backend.', false);
        } finally { setBusy(false); }
    };

    // ===== Xoá sheet (chỉ Admin & Warehouse, phải gõ đúng tên để xác nhận) =====
    const submitDeleteSheet = async () => {
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
                setSearch('');
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

    return (
        <div className="mx-auto max-w-7xl px-4 py-8">
            {/* Header + tìm kiếm + chọn sheet + nút Xoá sheet / Sheet mới */}
            <WarehouseToolbar
                activeSource={activeSource}
                loading={busy || stats.loading}
                canEdit
                search={search}
                onSearchChange={setSearch}
                totalRows={search.trim() ? stats.visible : stats.loaded}
                sources={sources}
                source={source}
                onSelectSource={handleSelectSource}
                onOpenDeleteSheet={() => setShowDeleteSheet(true)}
                onOpenAddSheet={() => setShowAddSheet(true)}
                actionMsg={actionMsg}
            />

            {/* Khối thông tin Header / Metadata của sheet (thu gọn được) */}
            <SheetHeaderCard
                header={sheetHeader}
                loading={sheetHeaderLoading}
                error={sheetHeaderError}
                collapsed={headerCollapsed}
                onToggleCollapse={toggleHeaderCollapsed}
                canEdit
                onEdit={() => setShowMeta(true)}
            />

            {/* Bảng nhập liệu trực tiếp (Data Grid) — sửa ô / thêm dòng / thêm cột / lưu */}
            <WarehouseDataGrid
                key={activeSource.key}
                source={activeSource.key}
                sourceInfo={{ label: activeSource.label, table: activeSource.table }}
                canEdit
                labelFor={columnLabel}
                search={search}
                onStatsChange={handleStatsChange}
            />

            {/* Modal tạo sheet mới */}
            <NewSheetModal
                open={showAddSheet}
                templates={templates}
                value={newSheet}
                onChange={setNewSheet}
                onClose={() => setShowAddSheet(false)}
                onSubmit={submitNewSheet}
                saving={busy}
            />

            {/* Modal quản lý / xoá sheet */}
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

            {/* Modal sửa metadata header của sheet (chỉ Admin & Warehouse) */}
            {showMeta && (
                <SheetMetaModal
                    source={activeSource.key}
                    header={sheetHeader}
                    onClose={() => setShowMeta(false)}
                    onSaved={() => reloadSheetHeader()}
                />
            )}
        </div>
    );
}

