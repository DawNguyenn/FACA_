import React, { useState, useEffect } from 'react';
import { Loader2, FileSpreadsheet, AlertTriangle, Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// ================================================================
//  WarehouseExcelViewer — SQL-CENTRIC (chỉ hiển thị)
//  Dữ liệu được BULK INSERT thủ công vào SQL Server:
//    - dbo.Staging_CHS / Staging_PSM27 / Staging_PDX27 / Staging_DuAnKhac
//    - dbo.Staging_NVL_Tray / Staging_NVL_Cap / Staging_NVL_Smt
//  Backend chỉ SELECT + LIKE search + OFFSET/FETCH pagination.
// ================================================================

const PAGE_LIMIT = 50; // Số dòng mỗi trang — phân trang phía Database

// 7 nguồn dữ liệu staging (khớp STAGING_SOURCES trong stagingDataController.js)
// Khớp 7 sheet của file Quan_Ly_Nguyen_Vat_Lieu_NPI.xlsx
const SOURCES = [
    { key: 'chs', label: 'CHS', table: 'Staging_CHS' },
    { key: 'psm27', label: 'PSM27', table: 'Staging_PSM27' },
    { key: 'pdx27', label: 'PDX27', table: 'Staging_PDX27' },
    { key: 'khac', label: 'Dự Án Khác', table: 'Staging_DuAnKhac' },
    { key: 'tray', label: 'NVL - TRAY', table: 'Staging_NVL_Tray' },
    { key: 'cap', label: 'NVL - CAP', table: 'Staging_NVL_Cap' },
    { key: 'smt', label: 'NVL - SMT', table: 'Staging_NVL_Smt' },
];

// Nhãn tiếng Việt thân thiện cho các cột (fallback: tên cột gốc)
const COLUMN_LABELS = {
    Change_Date: 'Ngày thay đổi',
    Model: 'Model',
    Build: 'Build',
    Received_Date: 'Ngày nhận',
    Material: 'Vật liệu',
    Vendor: 'Nhà cung cấp',
    Description: 'Mô tả',
    Config: 'Config',
    Lot_ID: 'Lot ID',
    Shipment_Qty: 'SL nhập',
    RnD: 'RnD',
    Qty_Ton_Kho: 'Tồn kho',
    Output_Date: 'Ngày xuất',
    Receiver: 'Người nhận',
    Ma_NV: 'Mã NV',
    Ghi_Chu: 'Ghi chú',
    Tong_Qty_Ton: 'Tổng tồn',
    Bill: 'Bill',
    IV: 'I/V',
    Qty_Xuat_Hang: 'SL xuất hàng',
    Ton_Kho: 'Tồn kho',
    IQA_Result: 'Kết quả IQA',
    Special_Note: 'Ghi chú đặc biệt',
    Xuat_1_Date: 'Xuất 1 — Ngày',
    Xuat_1_DRI: 'Xuất 1 — DRI',
    Xuat_1_Qty: 'Xuất 1 — SL',
    Xuat_2_Date: 'Xuất 2 — Ngày',
    Xuat_2_DRI: 'Xuất 2 — DRI',
    Xuat_2_Qty: 'Xuất 2 — SL',
    Xuat_3_Date: 'Xuất 3 — Ngày',
    Xuat_3_DRI: 'Xuất 3 — DRI',
    Xuat_3_Qty: 'Xuất 3 — SL',
};

const columnLabel = (name) => COLUMN_LABELS[name] || name;

// Các cột số lượng — hiển thị định dạng số và tự bỏ ký tự quote (") thừa
// do lỗi BULK INSERT từ CSV gây ra (VD: "1 → 1 → hiển thị 1)
const NUMERIC_COLS = new Set([
    'Shipment_Qty', 'Qty_Ton_Kho', 'Tong_Qty_Ton', 'RnD',
    'Qty_Xuat_Hang', 'Ton_Kho', 'Xuat_1_Qty', 'Xuat_2_Qty', 'Xuat_3_Qty',
]);

const displayValue = (col, value) => {
    if (value === null || value === undefined) return '';
    const cleaned = String(value).replace(/"/g, '').trim();
    if (NUMERIC_COLS.has(col) && cleaned !== '' && !Number.isNaN(Number(cleaned))) {
        return Number(cleaned).toLocaleString('vi-VN');
    }
    return cleaned;
};

/**
 * GET request helper trả về JSON body + Authorization header (nếu có token).
 */
const fetchJSON = async (url) => {
    const token = localStorage.getItem('token');
    const response = await axios.get(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    return response.data;
};

export default function WarehouseExcelViewer() {
    const [source, setSource] = useState(SOURCES[0].key);
    const [tableData, setTableData] = useState([]);
    const [columns, setColumns] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    // Phân trang + tìm kiếm (server-side: OFFSET/FETCH + WHERE LIKE)
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalRows, setTotalRows] = useState(0);
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');

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
        const params = new URLSearchParams({
            page: String(page),
            limit: String(PAGE_LIMIT),
        });
        if (debouncedSearch) params.set('search', debouncedSearch);

        fetchJSON(`${API_BASE}/warehouse/${source}?${params.toString()}`)
            .then((res) => {
                if (cancelled) return;
                if (res.success) {
                    setColumns(res.columns || []);
                    setTableData(res.data || []);
                    const pg = res.pagination || {};
                    setTotalPages(pg.totalPages || 1);
                    setTotalRows(pg.totalRows || 0);
                    setPage(pg.page || page);
                } else {
                    setColumns([]);
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
    }, [source, page, debouncedSearch]);

    const activeSource = SOURCES.find((s) => s.key === source) || SOURCES[0];
    const rowOffset = (page - 1) * PAGE_LIMIT;

    return (
        <div className="mx-auto max-w-7xl px-4 py-8">
            {/* Header + chọn nguồn dữ liệu */}
            <div className="mb-6 rounded-2xl border border-emerald-200 bg-white p-6 shadow-sm">
                <div className="flex items-start gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
                        <FileSpreadsheet className="h-6 w-6" />
                    </span>
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">Kho Dữ Liệu</h2>
                        <p className="mt-0.5 text-sm text-slate-500">
                            Dữ liệu kho đọc trực tiếp từ SQL Server (bảng{' '}
                            <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">{activeSource.table}</code>)
                        </p>
                    </div>
                </div>

                {/* Tìm kiếm + tổng số bản ghi */}
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="relative">
                        <Search className="pointer-events-none absolute left-2.5 top-2 h-4 w-4 text-slate-400" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Tìm kiếm trên mọi cột..."
                            className="w-72 rounded-lg border border-slate-300 bg-white py-1.5 pl-8 pr-3 text-sm text-slate-700 shadow-sm transition placeholder:text-slate-400 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                        />
                    </div>
                    <span className="rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                        {totalRows} bản ghi
                    </span>
                </div>
            </div>

            {/* Thanh sheet kiểu Excel — trên bảng, cuộn ngang khi nhiều dự án */}
            <div className="mb-3 overflow-x-auto rounded-xl border border-slate-200 bg-slate-200/70 shadow-sm">
                <div className="flex min-w-max items-end">
                    {SOURCES.map((s) => {
                        const active = source === s.key;
                        return (
                            <button
                                key={s.key}
                                onClick={() => setSource(s.key)}
                                disabled={loading}
                                title={`${s.label} — ${s.table}`}
                                className={`group flex items-center gap-1.5 whitespace-nowrap border-r border-slate-300 px-4 py-2 text-xs font-medium transition ${
                                    active
                                        ? 'border-x border-t border-[#217346] bg-white text-[#217346] shadow-[inset_0_-3px_0_0_#217346]'
                                        : 'bg-slate-200/0 text-slate-600 hover:bg-white/70'
                                } disabled:cursor-not-allowed disabled:opacity-50`}
                            >
                                <FileSpreadsheet
                                    className={`h-3.5 w-3.5 shrink-0 ${active ? 'text-[#217346]' : 'text-emerald-600/60 group-hover:text-emerald-600'}`}
                                />
                                {s.label}
                            </button>
                        );
                    })}
                    <span className="flex-1" />
                </div>
            </div>

            {/* Bảng dữ liệu */}
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                {loading ? (
                    <div className="flex items-center justify-center gap-2 py-16 text-slate-500">
                        <Loader2 className="h-5 w-5 animate-spin text-emerald-600" />
                        Đang tải dữ liệu...
                    </div>
                ) : error ? (
                    <div className="py-12 text-center text-sm text-red-600">
                        <AlertTriangle className="mx-auto mb-2 h-6 w-6" />
                        {error}
                    </div>
                ) : tableData.length === 0 ? (
                    <div className="py-16 text-center text-sm text-slate-400">
                        Không có dữ liệu. Hãy BULK INSERT dữ liệu vào bảng{' '}
                        <code className="rounded bg-slate-100 px-1 py-0.5">{activeSource.table}</code> trong SQL Server.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-max w-full border-collapse text-left text-sm">
                            <thead>
                                <tr>
                                    {/* Cột số thứ tự */}
                                    <th className="sticky left-0 z-10 w-10 border border-slate-300 bg-[#17375E] px-2 py-2.5 text-center text-xs font-semibold text-white">
                                        #
                                    </th>
                                    {columns.map((col) => (
                                        <th key={col} className="border border-slate-300 bg-[#17375E] px-4 py-2.5 text-center text-xs font-bold whitespace-nowrap text-white">
                                            {columnLabel(col)}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {tableData.map((row, rIdx) => (
                                    <tr key={rIdx} className="transition hover:bg-blue-50">
                                        <td className="sticky left-0 z-10 border border-slate-300 bg-slate-100 px-2 py-2 text-center text-xs font-medium text-slate-500">
                                            {rowOffset + rIdx + 1}
                                        </td>
                                        {columns.map((col) => (
                                            <td key={col} className="border border-slate-300 px-4 py-2 whitespace-nowrap text-slate-700">
                                                {displayValue(col, row[col])}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Footer phân trang */}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-5 py-3 shadow-sm">
                <span className="text-sm text-slate-500">
                    Trang <span className="font-semibold text-slate-700">{page}</span> / {totalPages}
                    <span className="mx-1.5 text-slate-300">•</span>
                    Tổng số: <span className="font-semibold text-slate-700">{totalRows}</span> bản ghi
                    <span className="mx-1.5 text-slate-300">•</span>
                    {PAGE_LIMIT} dòng/trang
                </span>
                <div className="flex items-center gap-1.5">
                    <button
                        onClick={() => setPage(1)}
                        disabled={page <= 1 || loading}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                        title="Trang đầu"
                    >
                        <ChevronsLeft className="h-4 w-4" />
                    </button>
                    <button
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page <= 1 || loading}
                        className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        <ChevronLeft className="h-4 w-4" />
                        Trang trước
                    </button>
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        const start = Math.max(1, Math.min(page - 2, totalPages - 4));
                        return start + i;
                    }).filter((p) => p >= 1 && p <= totalPages).map((p) => (
                        <button
                            key={p}
                            onClick={() => setPage(p)}
                            disabled={loading}
                            className={`h-8 w-8 rounded-lg text-sm font-medium transition ${
                                p === page
                                    ? 'bg-[#17375E] text-white shadow'
                                    : 'border border-slate-300 text-slate-600 hover:bg-slate-100'
                            } disabled:cursor-not-allowed disabled:opacity-40`}
                        >
                            {p}
                        </button>
                    ))}
                    <button
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={page >= totalPages || loading}
                        className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        Trang sau
                        <ChevronRight className="h-4 w-4" />
                    </button>
                    <button
                        onClick={() => setPage(totalPages)}
                        disabled={page >= totalPages || loading}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                        title="Trang cuối"
                    >
                        <ChevronsRight className="h-4 w-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}