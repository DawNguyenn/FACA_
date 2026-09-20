import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DataGrid, SelectColumn } from 'react-data-grid';
import 'react-data-grid/lib/styles.css';
import { Loader2, Plus, Trash2, Columns3, Save, RotateCcw, AlertTriangle, Keyboard, X } from 'lucide-react';
import axios from 'axios';
import { useToast } from '../common/ToastProvider';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Giới hạn số dòng nạp vào grid 1 lần (khớp MAX_ROWS của backend bulk-save)
const GRID_MAX_ROWS = 5000;

// Kiểu dữ liệu cho cột mới ('' = để backend tự quyết định NVARCHAR(255))
const DATA_TYPES = [
    '',
    'NVARCHAR(50)',
    'NVARCHAR(100)',
    'NVARCHAR(255)',
    'NVARCHAR(500)',
    'NVARCHAR(1000)',
    'NVARCHAR(MAX)',
    'INT',
    'BIGINT',
    'FLOAT',
    'DECIMAL(18,2)',
    'DATE',
    'DATETIME',
    'BIT',
];

const COL_NAME_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;

/**
 * Chuẩn hoá giá trị từ API về chuỗi hiển thị trong ô.
 * - Cột kiểu ngày: rút gọn ISO -> yyyy-MM-dd (date) hoặc yyyy-MM-dd HH:mm (datetime)
 * - Giá trị null/undefined -> ''
 */
const toCellString = (value, dataType) => {
    if (value === null || value === undefined) return '';
    const raw = String(value);
    const type = String(dataType || '').toUpperCase();
    if (/^\d{4}-\d{2}-\d{2}T/.test(raw)) {
        const d = raw.slice(0, 10);
        if (type.startsWith('DATE') && type !== 'DATETIME' && type !== 'DATETIME2') return d;
        return `${d} ${raw.slice(11, 16)}`;
    }
    return raw;
};

const getToken = () => localStorage.getItem('token');
const authHeaders = () => {
    const token = getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
};

/**
 * WarehouseDataGrid — bảng nhập liệu trực tiếp (Excel-like) cho 1 sheet staging.
 *
 * Props:
 *  - source: key của sheet (vd 'sbn27')
 *  - sourceInfo: { label, table } để hiển thị
 *  - canEdit: chỉ Admin/Warehouse mới được sửa & lưu
 *  - labelFor: (columnName) => nhãn hiển thị (dùng COLUMN_LABELS của trang cha)
 *  - onSaved: callback sau khi lưu thành công (để trang cha load lại bảng xem)
 */
export default function WarehouseDataGrid({ source, sourceInfo, canEdit, labelFor, onSaved }) {
    const toast = useToast();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [columns, setColumns] = useState([]);      // [{ name, label, dataType }]
    const [rows, setRows] = useState([]);            // [{ __rid, <ColName>: 'value' }]
    const [selectedRows, setSelectedRows] = useState(() => new Set());
    const [saving, setSaving] = useState(false);
    const [dirty, setDirty] = useState(false);
    const [mode, setMode] = useState('sync');               // sync = mặc định (delta): chỉ gửi thay đổi
    const [showAddColumn, setShowAddColumn] = useState(false);
    const [newColumn, setNewColumn] = useState({ name: '', label: '', dataType: 'NVARCHAR(255)' });
    const [confirmSave, setConfirmSave] = useState(false);
    const [pendingNewCols, setPendingNewCols] = useState([]); // cột thêm trong phiên này (chưa có trong SQL)
    const [deletedRowIds, setDeletedRowIds] = useState(() => new Set()); // StagingID các dòng đã xoá
    const originalRowsRef = useRef(new Map()); // __rid -> snapshot gốc (dùng để tính delta)
    const ridRef = useRef(1);

    // Giữ tham chiếu mới nhất của props/hàm ngoài để không trigger load lại dữ liệu
    const toastRef = useRef(toast);
    toastRef.current = toast;
    const labelForRef = useRef(labelFor);
    labelForRef.current = labelFor;

    const nextRid = () => `r${ridRef.current++}`;

    // ===== Nạp toàn bộ dữ liệu sheet vào grid =====
    const loadData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await axios.get(
                `${API_BASE}/warehouse/${source}?page=1&limit=${GRID_MAX_ROWS}&all=1`,
                { headers: authHeaders() }
            );
            const data = res.data || {};
            if (!data.success) {
                throw new Error(data.message || 'Không tải được dữ liệu.');
            }

            const customCols = data.customColumns || [];
            const cols = (data.columns || [])
                // StagingID là khoá tự tăng, người dùng không nhập -> ẩn khỏi grid
                .filter((c) => String(c).toLowerCase() !== 'stagingid')
                .map((name) => {
                    const custom = customCols.find((c) => String(c.ColumnName).toLowerCase() === String(name).toLowerCase());
                    return {
                        name,
                        label: (custom && custom.Label) || (labelForRef.current ? labelForRef.current(name) : name),
                        dataType: (custom && custom.DataType) || '',
                        isCustom: !!custom,
                    };
                });

            const total = (data.pagination && data.pagination.totalRows) || 0;
            if (total > GRID_MAX_ROWS) {
                toastRef.current.info(`Sheet có ${total} dòng, chỉ nạp ${GRID_MAX_ROWS} dòng đầu vào bảng nhập liệu. Phần còn lại xem ở bảng phía dưới.`, { duration: 8000 });
            }

            setColumns(cols);
            const loadedRows = (data.data || []).map((r) => {
                const row = {
                    __rid: r.StagingID != null ? `sid-${r.StagingID}` : nextRid(),
                    _stagingId: r.StagingID != null ? r.StagingID : undefined,
                };
                cols.forEach((c) => { row[c.name] = toCellString(r[c.name], c.dataType); });
                return row;
            });
            setRows(loadedRows);
            // Snapshot gốc để tính delta (so sánh giá trị thay đổi)
            originalRowsRef.current = new Map(loadedRows.map((r) => [r.__rid, { ...r }]));
            setDeletedRowIds(new Set());
            setSelectedRows(new Set());
            setDirty(false);
        } catch (err) {
            setError(err.response?.data?.message || err.message || 'Không thể kết nối tới backend.');
            setColumns([]);
            setRows([]);
            setDeletedRowIds(new Set());
            originalRowsRef.current = new Map();
        } finally {
            setLoading(false);
        }
    }, [source]);

    useEffect(() => { loadData(); }, [loadData]);

    // Rời sheet đang có thay đổi chưa lưu -> cảnh báo (chỉ cảnh báo khi rời trang)
    useEffect(() => {
        if (!dirty) return;
        const handler = (e) => { e.preventDefault(); e.returnValue = ''; };
        window.addEventListener('beforeunload', handler);
        return () => window.removeEventListener('beforeunload', handler);
    }, [dirty]);

    // ===== Định nghĩa cột cho Data Grid =====
    const gridColumns = useMemo(() => {
        const defs = [];
        if (canEdit) defs.push({ ...SelectColumn, frozen: true, resizable: false, width: 44 });

        // Cột thao tác: xoá nhanh 1 dòng
        defs.push({
            key: '__actions',
            name: '',
            width: 46,
            minWidth: 46,
            frozen: true,
            resizable: false,
            sortable: false,
            draggable: false,
            renderCell: ({ row }) => (
                <button
                    type="button"
                    title="Xoá dòng này"
                    disabled={!canEdit}
                    onClick={() => removeRow(row.__rid)}
                    className="flex h-full w-full items-center justify-center text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
                >
                    <Trash2 className="h-3.5 w-3.5" />
                </button>
            ),
        });

        columns.forEach((c, idx) => {
            defs.push({
                key: c.name,
                name: c.label,
                editable: canEdit,
                resizable: true,
                sortable: false,
                draggable: true,
                width: idx === 0 ? 140 : 150,
                minWidth: 80,
                // renderEditCell bắt buộc: react-data-grid chỉ mở editor khi cột có
                // renderEditCell != null (xem isCellEditableUtil trong lib). Không có hàm
                // này thì setActivePosition(true) / double-click đều không mở ô nhập.
                renderEditCell: ({ row, column, onRowChange, onClose }) => (
                    <input
                        autoFocus
                        type="text"
                        value={row[column.key] ?? ''}
                        onChange={(e) => onRowChange({ ...row, [column.key]: e.target.value })}
                        onBlur={() => onClose(true, false)}
                        style={{ width: '100%', height: '100%', padding: '0 8px', border: '2px solid #217346', fontSize: 13, outline: 'none' }}
                    />
                ),
                renderHeaderCell: () => (
                    <div className="group flex w-full items-center justify-between gap-1">
                        <span className="truncate font-semibold text-slate-600" title={`${c.name}${c.dataType ? ` • ${c.dataType}` : ''}`}>
                            {c.label}
                        </span>
                        {canEdit && (
                            <button
                                type="button"
                                title={`Xoá cột "${c.name}"${c.isCustom ? ' (xoá khỏi bảng SQL khi lưu)' : ' (cột gốc: chỉ ẩn, dữ liệu cột sẽ bị xoá khi lưu replace)'}`}
                                onClick={(e) => { e.stopPropagation(); removeColumn(c); }}
                                className="rounded p-0.5 text-slate-300 opacity-0 transition hover:bg-red-50 hover:text-red-600 group-hover:opacity-100"
                            >
                                <X className="h-3.5 w-3.5" />
                            </button>
                        )}
                    </div>
                ),
            });
        });

        return defs;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [columns, canEdit]);

    // ===== Thao tác trên grid =====
    const requireEdit = () => {
        if (canEdit) return true;
        toast.error('Bạn không có quyền chỉnh sửa sheet này.');
        return false;
    };

    const handleRowsChange = (nextRows) => {
        setRows(nextRows);
        setDirty(true);
    };

    // ===== Click 1 lần vào ô = mở editor luôn (thay vì phải click đúp) =====
    // API chính thức: args.setActivePosition(true) -> ô vừa click vào thẳng mode 'EDIT'
    // (lib đã bind sẵn rowIdx/idx của ô đó). Ô không cho sửa (checkbox / cột thao tác)
    // không có `editable` nên giữ nguyên hành vi cũ (chỉ active, không mở editor).
    // Guard `event.target.closest('input,...')`: khi đang gõ mà click lại vào chính
    // ô input (chỉnh caret/bôi đen) thì KHÔNG reset editor — nếu không bản nháp đang
    // gõ bị thay bằng giá trị đã commit trước đó (biểu hiện "gõ bị mất chữ").
    const handleCellClick = useCallback(({ column, setActivePosition }, event) => {
        if (!canEdit || !column.editable) return;
        const target = event?.target;
        if (target instanceof HTMLElement && target.closest('input, textarea, select')) return;
        setActivePosition(true);
    }, [canEdit]);

    const addRow = (count = 1) => {
        if (!requireEdit()) return;
        const blanks = Array.from({ length: count }, () => {
            const row = { __rid: nextRid(), _stagingId: undefined };
            columns.forEach((c) => { row[c.name] = ''; });
            return row;
        });
        setRows((prev) => [...prev, ...blanks]);
        setDirty(true);
    };

    const removeRow = (rid) => {
        if (!requireEdit()) return;
        const removed = rows.find((r) => r.__rid === rid);
        setRows((prev) => prev.filter((r) => r.__rid !== rid));
        setSelectedRows((prev) => {
            const next = new Set(prev);
            next.delete(rid);
            return next;
        });
        if (removed && removed._stagingId != null) {
            setDeletedRowIds((prev) => new Set([...prev, removed._stagingId]));
        }
        setDirty(true);
    };

    const removeSelectedRows = () => {
        if (!requireEdit()) return;
        if (selectedRows.size === 0) { toast.info('Chọn ít nhất 1 dòng để xoá.'); return; }
        // Gom StagingID của các dòng đã xoá (có mặt trên DB) vào deletedRowIds
        const newIds = [];
        selectedRows.forEach((rid) => {
            const row = rows.find((r) => r.__rid === rid);
            if (row && row._stagingId != null) newIds.push(row._stagingId);
        });
        if (newIds.length > 0) {
            setDeletedRowIds((prev) => new Set([...prev, ...newIds]));
        }
        setRows((prev) => prev.filter((r) => !selectedRows.has(r.__rid)));
        setSelectedRows(new Set());
        setDirty(true);
    };

    const clearAllRows = () => {
        if (!requireEdit()) return;
        const ids = rows.filter((r) => r._stagingId != null).map((r) => r._stagingId);
        if (ids.length > 0) setDeletedRowIds(new Set(ids));
        setRows([]);
        setSelectedRows(new Set());
        setDirty(true);
        toast.info('Đã xoá hết dòng trên bảng nhập liệu. Bấm "Lưu dữ liệu" để ghi thay đổi vào database.');
    };

    // Thêm cột mới: chèn ngay vào grid, backend tạo cột SQL khi bấm Lưu
    const addColumn = () => {
        if (!requireEdit()) return;
        const name = newColumn.name.trim();
        const label = newColumn.label.trim();
        if (!COL_NAME_RE.test(name)) {
            toast.error('Tên cột không hợp lệ: chỉ dùng chữ, số, dấu _ và phải bắt đầu bằng chữ (VD: Ghi_Chu_QC).');
            return;
        }
        if (columns.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
            toast.error(`Cột "${name}" đã tồn tại trên sheet.`);
            return;
        }
        setColumns((prev) => [...prev, { name, label: label || name, dataType: newColumn.dataType, isCustom: true }]);
        setPendingNewCols((prev) => (prev.includes(name) ? prev : [...prev, name]));
        setRows((prev) => prev.map((r) => ({ ...r, [name]: '' })));
        setNewColumn({ name: '', label: '', dataType: 'NVARCHAR(255)' });
        setShowAddColumn(false);
        setDirty(true);
        toast.info(`Đã thêm cột "${name}". Cột sẽ được tạo trong SQL khi bạn bấm "Lưu dữ liệu".`);
    };

    // Xoá cột khỏi grid: cột custom -> DROP luôn khỏi SQL; cột gốc -> chỉ bỏ khỏi lần lưu này
    const removeColumn = async (col) => {
        if (!requireEdit()) return;
        setColumns((prev) => prev.filter((c) => c.name !== col.name));
        setPendingNewCols((prev) => prev.filter((n) => n !== col.name));
        setRows((prev) => prev.map((r) => {
            const copy = { ...r };
            delete copy[col.name];
            return copy;
        }));
        setDirty(true);

        if (!col.isCustom) {
            toast.info(`Cột "${col.name}" là cột gốc của sheet. Đã bỏ khỏi bảng nhập liệu — dữ liệu cột này sẽ bị xoá khi bạn lưu ở chế độ "Thay thế".`);
            return;
        }
        try {
            await axios.delete(`${API_BASE}/warehouse/${source}/columns/${encodeURIComponent(col.name)}`, { headers: authHeaders() });
            toast.success(`Đã xoá cột "${col.name}" khỏi bảng SQL.`);
        } catch (err) {
            toast.error(err.response?.data?.message || err.message || `Không xoá được cột "${col.name}" khỏi SQL.`);
        }
    };

        // ===== Chuyển đổi row grid -> object dữ liệu (null cho ô trống) =====
    const rowToObject = (row) => {
        const obj = {};
        columns.forEach((c) => {
            const v = row[c.name];
            obj[c.name] = v === undefined || v === null || v === '' ? null : v;
        });
        return obj;
    };

    // So sánh row hiện tại với snapshot gốc để kiểm tra có thay đổi (dirty)
    const isRowChanged = (row, original) => {
        if (!original) return true;
        for (const c of columns) {
            const current = row[c.name];
            const orig = original[c.name];
            if (String(current ?? '') !== String(orig ?? '')) return true;
        }
        return false;
    };

    // Tính toán delta: added (dòng mới), updated (dòng đã có nhưng bị sửa), deleted (StagingID đã xoá)
    const computeDeltas = () => {
        const added = [];
        const updated = [];
        for (const row of rows) {
            if (row._stagingId != null) {
                const original = originalRowsRef.current.get(row.__rid);
                if (isRowChanged(row, original)) {
                    const obj = rowToObject(row);
                    obj.StagingID = row._stagingId;
                    updated.push(obj);
                }
            } else {
                added.push(rowToObject(row));
            }
        }
        const deleted = Array.from(deletedRowIds);
        return { added, updated, deleted };
    };

    // ===== Lưu dữ liệu (JSON: columns + rows / delta) =====
    const saveData = async () => {
        if (!requireEdit()) return;
        if (columns.length === 0) { toast.error('Sheet chưa có cột nào để lưu.'); return; }
        setSaving(true);
        try {
            const columnPayload = columns.map((c) => ({ name: c.name, label: c.label, dataType: c.dataType || undefined }));

            // Xây payload theo chế độ lưu
            let payload;
            if (mode === 'sync') {
                // Delta: chỉ gửi thay đổi (thêm / sửa / xoá)
                const { added, updated, deleted } = computeDeltas();
                payload = { mode, columns: columnPayload, added, updated, deleted };
            } else if (mode === 'append') {
                // Chỉ thêm mới: chỉ gửi các dòng mới (chưa có StagingID)
                const { added } = computeDeltas();
                payload = { mode, columns: columnPayload, added };
            } else {
                // replace: gửi toàn bộ dòng (TRUNCATE + INSERT) — giữ nguyên behavior cũ
                payload = {
                    mode,
                    columns: columnPayload,
                    rows: rows.map((r) => {
                        const obj = {};
                        columns.forEach((c) => {
                            const v = r[c.name];
                            obj[c.name] = v === undefined || v === null || v === '' ? null : v;
                        });
                        return obj;
                    }),
                };
            }

            const res = await axios.post(`${API_BASE}/warehouse/${source}/bulk-save`, payload, { headers: authHeaders() });
            const data = res.data || {};
            if (data.success) {
                toast.success(data.message || 'Đã lưu dữ liệu.');
                if (data.newColumnsAdded && data.newColumnsAdded.length) {
                    toast.info(`Đã tạo cột mới trong SQL: ${data.newColumnsAdded.join(', ')}`, { duration: 6000 });
                }
                setDirty(false);
                setPendingNewCols([]);
                setDeletedRowIds(new Set());
                await loadData();
                if (onSaved) onSaved();
            } else {
                toast.error(data.message || 'Lưu dữ liệu thất bại.');
            }
        } catch (err) {
            toast.error(err.response?.data?.message || err.message || 'Không thể kết nối backend.');
        } finally {
            setSaving(false);
            setConfirmSave(false);
        }
    };

    const onConfirmSave = () => {
        if (mode === 'replace') setConfirmSave(true);
        else saveData();
    };

    // ===== Render =====
    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            {/* Thanh công cụ nhập liệu */}
            <div className="mb-3 flex flex-wrap items-center gap-2">
                <div className="mr-auto flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-[#217346]">
                        <Keyboard className="h-4 w-4" />
                    </span>
                    <div>
                        <p className="text-sm font-bold text-slate-800">
                            Bảng nhập liệu — {sourceInfo?.label || source}
                        </p>
                        <p className="text-[11px] text-slate-500">
                            {rows.length} dòng × {columns.length} cột
                            {sourceInfo?.table ? <> • <code className="rounded bg-slate-100 px-1">{sourceInfo.table}</code></> : null}
                            {dirty ? <span className="ml-2 font-semibold text-amber-600">• có thay đổi chưa lưu</span> : null}
                        </p>
                    </div>
                </div>


                <button
                    type="button"
                    onClick={() => addRow(1)}
                    disabled={!canEdit || loading || saving}
                    className="flex items-center gap-1.5 rounded-lg border border-emerald-500 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 shadow-sm transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
                    title="Thêm 1 dòng trống vào cuối bảng"
                >
                    <Plus className="h-3.5 w-3.5" /> Thêm dòng
                </button>
                <button
                    type="button"
                    onClick={() => addRow(5)}
                    disabled={!canEdit || loading || saving}
                    className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    title="Thêm 5 dòng trống"
                >
                    +5 dòng
                </button>
                <button
                    type="button"
                    onClick={() => setShowAddColumn(true)}
                    disabled={!canEdit || loading || saving}
                    className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    title="Thêm cột mới (tự tạo cột trong SQL khi lưu)"
                >
                    <Columns3 className="h-3.5 w-3.5" /> Thêm cột
                </button>
                <button
                    type="button"
                    onClick={removeSelectedRows}
                    disabled={!canEdit || loading || saving || selectedRows.size === 0}
                    className="flex items-center gap-1.5 rounded-lg border border-red-300 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 shadow-sm transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                    title="Xoá các dòng đã tick chọn"
                >
                    <Trash2 className="h-3.5 w-3.5" /> Xoá dòng chọn ({selectedRows.size})
                </button>
                <button
                    type="button"
                    onClick={clearAllRows}
                    disabled={!canEdit || loading || saving || rows.length === 0}
                    className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    title="Xoá toàn bộ dòng trên bảng (chưa ghi vào database cho tới khi Lưu)"
                >
                    <RotateCcw className="h-3.5 w-3.5" /> Xoá hết
                </button>

                <select
                    value={mode}
                    onChange={(e) => setMode(e.target.value)}
                    disabled={!canEdit || saving}
                    className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs font-semibold text-slate-600 shadow-sm outline-none focus:border-emerald-400 disabled:opacity-50"
                    title="Cập nhật thay đổi: chỉ gửi các dòng thay đổi (thêm/sửa/xoá). Chỉ thêm mới: chỉ INSERT dòng mới. Thay thế toàn bộ: xoá dữ liệu cũ rồi ghi lại."
                >
                    <option value="sync">Cập nhật thay đổi</option>
                    <option value="append">Chỉ thêm mới</option>
                    <option value="replace">Thay thế toàn bộ</option>
                </select>

                <button
                    type="button"
                    onClick={onConfirmSave}
                    disabled={!canEdit || saving || loading}
                    className="flex items-center gap-1.5 rounded-lg bg-[#217346] px-4 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#1a5c38] disabled:cursor-not-allowed disabled:opacity-50"
                    title="Lưu toàn bộ bảng nhập liệu vào database"
                >
                    {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                    {saving ? 'Đang lưu...' : 'Lưu dữ liệu'}
                </button>
            </div>

            {!canEdit && (
                <p className="mb-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
                    Bạn đang ở chế độ chỉ đọc — cần quyền Admin hoặc Warehouse để nhập liệu và lưu.
                </p>
            )}
            {error && (
                <p className="mb-2 flex items-center gap-2 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-700">
                    <AlertTriangle className="h-4 w-4" /> {error}
                </p>
            )}

            {/* Data Grid */}
            {loading ? (
                <div className="flex h-[55vh] items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-500">
                    <Loader2 className="h-4 w-4 animate-spin" /> Đang nạp dữ liệu sheet...
                </div>
            ) : (
                <DataGrid
                    className="rdg-light rounded-xl"
                    columns={gridColumns}
                    rows={rows}
                    rowKeyGetter={(row) => row.__rid}
                    onRowsChange={handleRowsChange}
                    onCellClick={handleCellClick}
                    selectedRows={selectedRows}
                    onSelectedRowsChange={setSelectedRows}
                    rowHeight={32}
                    headerRowHeight={34}
                    enableVirtualization={rows.length < 2000}
                    style={{ blockSize: '55vh', '--rdg-font-size': '12.5px' }}
                />
            )}

            <p className="mt-2 text-[11px] text-slate-500">
                Mẹo: click vào ô để sửa ngay (hoặc gõ trực tiếp khi ô đang được chọn)
                Cột mới và dữ liệu chỉ được ghi vào SQL Server khi bạn bấm <b>Lưu dữ liệu</b>.
            </p>

            {/* Modal thêm cột mới */}
            {showAddColumn && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={() => setShowAddColumn(false)}>
                    <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
                        <div className="mb-2 flex items-center gap-2">
                            <Columns3 className="h-5 w-5 text-emerald-600" />
                            <h3 className="text-base font-bold text-slate-800">Thêm cột mới</h3>
                        </div>
                        <p className="mb-4 text-xs text-slate-500">
                            Cột sẽ hiện ngay trên bảng nhập liệu. Khi bấm <b>Lưu dữ liệu</b>, backend tự
                            <code className="mx-1 rounded bg-slate-100 px-1">ALTER TABLE</code>
                            thêm cột vào <code className="rounded bg-slate-100 px-1">{sourceInfo?.table || 'bảng staging'}</code>.
                        </p>
                        <div className="space-y-3">
                            <div>
                                <label className="mb-1 block text-xs font-semibold text-slate-600">Tên cột trong SQL *</label>
                                <input
                                    type="text"
                                    value={newColumn.name}
                                    onChange={(e) => setNewColumn((c) => ({ ...c, name: e.target.value.replace(/[^A-Za-z0-9_]/g, '') }))}
                                    onKeyDown={(e) => { if (e.key === 'Enter') addColumn(); }}
                                    placeholder="VD: Ghi_Chu_QC"
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-semibold text-slate-600">Tiêu đề hiển thị (tùy chọn)</label>
                                <input
                                    type="text"
                                    value={newColumn.label}
                                    onChange={(e) => setNewColumn((c) => ({ ...c, label: e.target.value }))}
                                    onKeyDown={(e) => { if (e.key === 'Enter') addColumn(); }}
                                    placeholder="VD: Ghi chú QC"
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-semibold text-slate-600">Kiểu dữ liệu trong SQL</label>
                                <select
                                    value={newColumn.dataType}
                                    onChange={(e) => setNewColumn((c) => ({ ...c, dataType: e.target.value }))}
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                                >
                                    {DATA_TYPES.map((t) => (
                                        <option key={t || 'default'} value={t}>{t || 'Mặc định (NVARCHAR(255))'}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="mt-5 flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setShowAddColumn(false)}
                                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                            >
                                Hủy
                            </button>
                            <button
                                type="button"
                                onClick={addColumn}
                                className="rounded-lg bg-[#217346] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1a5c38]"
                            >
                                Thêm cột
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal xác nhận ghi đè toàn bộ dữ liệu (mode = replace) */}
            {confirmSave && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={() => !saving && setConfirmSave(false)}>
                    <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
                        <div className="mb-3 flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-amber-500" />
                            <h3 className="text-base font-bold text-slate-800">Ghi đè toàn bộ dữ liệu sheet?</h3>
                        </div>
                        <p className="text-sm text-slate-600">
                            Chế độ <b>Thay thế toàn bộ</b> sẽ xoá hết dữ liệu hiện có trong{' '}
                            <code className="rounded bg-slate-100 px-1">{sourceInfo?.table || 'bảng staging'}</code>{' '}
                            rồi ghi lại <b>{rows.length}</b> dòng đang có trên bảng nhập liệu
                            {pendingNewCols.length > 0 ? <> (kèm tạo {pendingNewCols.length} cột mới trong SQL: <code className="rounded bg-slate-100 px-1">{pendingNewCols.join(', ')}</code>)</> : null}.
                        </p>
                        <p className="mt-2 text-xs text-slate-500">Muốn giữ dữ liệu cũ? Chọn “Cập nhật thay đổi” hoặc “Chỉ thêm mới” trong ô chế độ.</p>
                        <div className="mt-5 flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setConfirmSave(false)}
                                disabled={saving}
                                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                            >
                                Huỷ
                            </button>
                            <button
                                type="button"
                                onClick={saveData}
                                disabled={saving}
                                className="flex items-center gap-1.5 rounded-lg bg-[#217346] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1a5c38] disabled:opacity-50"
                            >
                                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                {saving ? 'Đang lưu...' : 'Đồng ý, lưu'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
