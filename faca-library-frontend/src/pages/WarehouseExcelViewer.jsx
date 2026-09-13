import React, { useState, useEffect } from 'react';
import { Loader2, Table2, FileSpreadsheet, AlertTriangle, MapPin, Upload, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Search } from 'lucide-react';
import ExcelImporter from '../components/ExcelImporter';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

/**
 * GET request helper returning parsed JSON body.
 * Adds Authorization header when a token exists (same pattern as inventoryService).
 * @param {string} url
 * @returns {Promise<any>} response data
 */
const fetchJSON = async (url) => {
    const token = localStorage.getItem('token');
    const response = await axios.get(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    return response.data;
};

// ================================================================
//  WarehouseExcelViewer — Hiển thị dữ liệu kho từ SQL Server
//  (Thay thế đọc file Excel client-side bằng API phân trang)
// ================================================================
const PAGE_LIMIT = 50; // Số dòng cố định mỗi trang — giảm RAM trình duyệt

// Role được phép xem dữ liệu kho (theo role_id trong SQL Server):
// 1 = Admin, 4 = Warehouse
const ALLOWED_ROLE_IDS = [1, 4];

/**
 * Lấy thông tin user + roleId từ localStorage (được đồng bộ bởi Header qua /auth/me).
 * Hỗ trợ nhiều biến đặt tên: RoleId / role_id / roleid / role.
 */
const getCurrentUser = () => {
    try {
        return JSON.parse(localStorage.getItem('user') || 'null');
    } catch {
        return null;
    }
};

const getUserRoleId = (user) => {
    if (!user) return null;
    const raw = user.RoleId ?? user.RoleID ?? user.role_id ?? user.roleid ?? user.roleId;
    const num = Number(raw);
    if (!Number.isNaN(num) && raw !== null && raw !== '' && raw !== undefined) return num;
    const roleName = String(user.role_name || user.role || '').toLowerCase();
    if (roleName === 'admin') return 1;
    if (roleName === 'warehouse') return 4;
    return null;
};

export default function WarehouseExcelViewer() {
    // Quyền import: chỉ Admin (1) / Warehouse (4) mới thấy nút "Nhập Excel"
    // — mọi user vẫn xem và tìm kiếm dữ liệu bình thường
    const [currentUser] = useState(getCurrentUser);
    const canImport = ALLOWED_ROLE_IDS.includes(getUserRoleId(currentUser));
    const [sheets, setSheets] = useState([]);
    const [currentSheet, setCurrentSheet] = useState('');
    const [tableData, setTableData] = useState([]);
    const [sheetHeaders, setSheetHeaders] = useState([]);
    const [sheetMeta, setSheetMeta] = useState({ title: '', subtitle: '' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    // Phân trang + tìm kiếm (server-side)
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalRows, setTotalRows] = useState(0);
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');

    // Debounce từ khóa tìm kiếm 400ms để không gọi API liên tục khi gõ
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(search.trim()), 400);
        return () => clearTimeout(timer);
    }, [search]);

    // Reset về trang 1 mỗi khi đổi sheet hoặc đổi từ khóa tìm kiếm
    useEffect(() => {
        setPage(1);
    }, [currentSheet, debouncedSearch]);

    // Load danh sách sheets ngay khi mount (chỉ khi có quyền)
    useEffect(() => {
        fetchJSON(`${API_BASE}/warehouse/sheets`)
            .then(res => {
                if (res.success && res.sheets.length > 0) {
                    setSheets(res.sheets);
                    setCurrentSheet(res.sheets[0]);
                } else {
                    setError(res.message || 'Không có sheet nào.');
                }
            })
            .catch(err => setError(err.message || 'Không thể kết nối tới backend.'));
    }, []);

    // Load dữ liệu sheet: chỉ nhận tối đa `limit` dòng/trang từ backend
    useEffect(() => {
        if (!currentSheet) return undefined;
        let cancelled = false;
        setLoading(true);
        setError(null);
        const params = new URLSearchParams({
            name: currentSheet,
            page: String(page),
            limit: String(PAGE_LIMIT),
        });
        if (debouncedSearch) params.set('search', debouncedSearch);

        fetchJSON(`${API_BASE}/warehouse/sheet-data?${params.toString()}`)
            .then(res => {
                if (cancelled) return;
                if (res.success) {
                    setSheetMeta({ title: res.title || '', subtitle: res.subtitle || '' });
                    setSheetHeaders(res.headers || []);
                    setTableData(res.data || []);
                    const pg = res.pagination || {};
                    setTotalPages(pg.totalPages || 1);
                    setTotalRows(pg.totalRows || (res.data || []).length);
                    setPage(pg.page || page);
                } else {
                    setSheetMeta({ title: '', subtitle: '' });
                    setSheetHeaders([]);
                    setTableData([]);
                    setTotalRows(0);
                    setTotalPages(1);
                    setError(res.message || res.error || 'Không tải được dữ liệu sheet.');
                }
            })
            .catch(err => {
                if (cancelled) return;
                setSheetMeta({ title: '', subtitle: '' });
                setSheetHeaders([]);
                setTableData([]);
                setTotalRows(0);
                setTotalPages(1);
                setError(err.message || 'Không thể kết nối tới backend.');
            })
            .finally(() => { if (!cancelled) setLoading(false); });

        return () => { cancelled = true; };
    }, [currentSheet, page, debouncedSearch]);

    // Headers của bảng Excel: ưu tiên headers từ API, fallback về key của dòng đầu
    const headers = sheetHeaders.length > 0
        ? sheetHeaders
        : (tableData.length > 0 ? Object.keys(tableData[0]) : []);

    // Vị trí dòng đầu tiên của trang hiện tại (đánh số # giống Excel)
    const rowOffset = (page - 1) * PAGE_LIMIT;

    return (
        <div className="mx-auto max-w-7xl px-4 py-8">
{/* Header */}
            <div className="mb-6 flex items-start justify-between gap-4 rounded-2xl border border-emerald-200 bg-white p-6 shadow-sm">
                <div className="flex items-start gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
                        <FileSpreadsheet className="h-6 w-6" />
                    </span>
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">Kho Dữ Liệu Excel</h2>
                        <p className="mt-0.5 flex items-center gap-1 text-sm text-slate-500">
                            <MapPin className="h-3.5 w-3.5" />
                            D:\Quan_Ly_Nguyen_Vat_Lieu_NPI.xlsx
                        </p>
                    </div>
                </div>

                {/* Dropdown chọn sheet */}
                <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Chọn Sheet
                    </label>
                    <select
                        value={currentSheet}
                        onChange={(e) => setCurrentSheet(e.target.value)}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                    >
                        {sheets.map(sheet => (
                            <option key={sheet} value={sheet}>{sheet}</option>
                        ))}
                    </select>
                </div>
{/* Nút Nhập Excel — chỉ Admin / WareHouse mới nhìn thấy */}
                {canImport && <ExcelImporter onImportComplete={() => undefined} />}
            </div>

            {/* Lỗi */}
            {error && (
                <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            {/* Bảng dữ liệu — thiết kế giống file Excel */}
            <div className="overflow-hidden rounded-xl border border-slate-300 bg-white shadow-sm">
                {/* Banner tiêu đề nền xanh navy giống Excel */}
                {sheetMeta.title && (
                    <div className="bg-[#17375E] px-4 py-5 text-center">
                        <h3 className="text-base font-bold uppercase tracking-wide text-white sm:text-lg">
                            {sheetMeta.title}
                        </h3>
                        {sheetMeta.subtitle && (
                            <p className="mt-1 text-sm italic text-blue-100">{sheetMeta.subtitle}</p>
                        )}
                    </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-5 py-2.5">
                    <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                        <Table2 className="h-4 w-4 text-emerald-600" />
                        Sheet: {currentSheet || '...'}
                    </h3>

                    <div className="flex items-center gap-3">
                        {/* Ô tìm kiếm — lọc dữ liệu phía backend */}
                        <div className="relative">
                            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Tìm kiếm trong sheet..."
                                className="w-56 rounded-lg border border-slate-300 bg-white py-1.5 pl-8 pr-3 text-sm text-slate-700 shadow-sm transition placeholder:text-slate-400 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                            />
                        </div>
                        <span className="rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                            {totalRows} bản ghi
                        </span>
                    </div>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center gap-2 py-16 text-slate-500">
                        <Loader2 className="h-5 w-5 animate-spin text-emerald-600" />
                        Đang tải dữ liệu...
                    </div>
                ) : tableData.length === 0 ? (
                    <div className="py-16 text-center text-sm text-slate-400">
                        {error ? 'Không có dữ liệu để hiển thị.' : 'Sheet trống.'}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-max w-full border-collapse text-left text-sm">
                            <thead>
                                <tr>
                                    {/* Cột số thứ tự giống Excel */}
                                    <th className="sticky left-0 z-10 w-10 border border-slate-300 bg-[#17375E] px-2 py-2.5 text-center text-xs font-semibold text-white">
                                        #
                                    </th>
                                    {headers.map((h, i) => (
                                        <th key={i} className="border border-slate-300 bg-[#17375E] px-4 py-2.5 text-center text-xs font-bold whitespace-nowrap text-white">
                                            {h}
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
                                        {headers.map((col, cIdx) => (
                                            <td key={cIdx} className="border border-slate-300 px-4 py-2 whitespace-nowrap text-slate-700">
                                                {row[col] ?? ''}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Footer phân trang — điều hướng trang mượt mà */}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-5 py-3 shadow-sm">
                <span className="text-sm text-slate-500">
                    Trang <span className="font-semibold text-slate-700">{page}</span> / {totalPages}
                    <span className="mx-1.5 text-slate-300">•</span>
                    Tổng số: <span className="font-semibold text-slate-700">{totalRows}</span> bản ghi
                    <span className="mx-1.5 text-slate-300">•</span>
                    {PAGE_LIMIT} dòng/trang
                </span>
                <div className="flex items-center gap-1.5">
                    {/* Về trang đầu */}
                    <button
                        onClick={() => setPage(1)}
                        disabled={page <= 1 || loading}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                        title="Trang đầu"
                    >
                        <ChevronsLeft className="h-4 w-4" />
                    </button>
                    {/* Trang trước */}
                    <button
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page <= 1 || loading}
                        className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        <ChevronLeft className="h-4 w-4" />
                        Trang trước
                    </button>

                    {/* Số trang lân cận (tối đa 5 nút) */}
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

                    {/* Trang sau */}
                    <button
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={page >= totalPages || loading}
                        className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        Trang sau
                        <ChevronRight className="h-4 w-4" />
                    </button>
                    {/* Đến trang cuối */}
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