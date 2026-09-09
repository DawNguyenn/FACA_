import React, { useState, useEffect } from 'react';
import { Loader2, Table2, FileSpreadsheet, AlertTriangle, MapPin } from 'lucide-react';

// Nhất quán với convention của app này:
// VITE_API_URL đang chứa đuôi "/api" (vd http://localhost:5000/api).
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// ================================================================
//  fetchJSON — Fetch an toàn: kiểm tra HTTP status + Content-Type
//  trước khi .json(), tránh lỗi "Unexpected token '<'" khi server
//  trả về HTML (404, sai cổng) thay vì JSON.
// ================================================================
async function fetchJSON(url) {
    let response;
    try {
        response = await fetch(url);
    } catch (err) {
        throw new Error('Không thể kết nối tới Backend. Vui lòng kiểm tra server đang chạy.');
    }

    const contentType = response.headers.get('content-type') || '';

    // Backend trả trang HTML (Vite 404 / sai cổng) => báo lỗi rõ ràng
    if (!contentType.includes('application/json')) {
        const bodyPreview = await response.text();
        throw new Error(
            `Server trả về lỗi HTTP ${response.status} (không phải JSON). ` +
            `Vui lòng kiểm tra Backend đang chạy đúng cổng và đường dẫn API. ` +
            `Nhận được: ${bodyPreview.slice(0, 120)}`
        );
    }

    if (!response.ok) {
        throw new Error(`Server trả về lỗi HTTP ${response.status}.`);
    }

    return response.json();
}

// ================================================================
//  WarehouseExcelViewer — Đọc & hiển thị file Excel quản lý kho
//  Nguồn: D:\DAWN_ANIME_Warehouse_Management_System.xlsx (qua Backend)
// ================================================================
export default function WarehouseExcelViewer() {
    const [sheets, setSheets] = useState([]);
    const [currentSheet, setCurrentSheet] = useState('');
    const [tableData, setTableData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Load danh sách sheets ngay khi mount
    useEffect(() => {
        fetchJSON(`${API_BASE}/sheets`)
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

    // Load dữ liệu sheet khi currentSheet thay đổi
    useEffect(() => {
        if (!currentSheet) return;
        setLoading(true);
        setError(null);
        fetchJSON(`${API_BASE}/sheet-data?name=${encodeURIComponent(currentSheet)}`)
            .then(res => {
                if (res.success) {
                    setTableData(res.data);
                } else {
                    setTableData([]);
                    setError(res.message || res.error || 'Không tải được dữ liệu sheet.');
                }
            })
            .catch(err => {
                setTableData([]);
                setError(err.message || 'Không thể kết nối tới backend.');
            })
            .finally(() => setLoading(false));
    }, [currentSheet]);

    // Bóc tách key của phần tử đầu tiên để làm tiêu đề cột <th>
    const headers = tableData.length > 0 ? Object.keys(tableData[0]) : [];

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
                            D:\DAWN_ANIME_Warehouse_Management_System.xlsx
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
            </div>

            {/* Lỗi */}
            {error && (
                <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            {/* Bảng dữ liệu */}
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-3">
                    <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                        <Table2 className="h-4 w-4 text-emerald-600" />
                        {currentSheet || '...'}
                    </h3>
                    <span className="rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                        {tableData.length} hàng
                    </span>
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
                        <table className="w-full border-collapse text-left text-sm">
                            <thead>
                                <tr className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                                    {headers.map((h, i) => (
                                        <th key={i} className="whitespace-nowrap border-b border-slate-200 px-4 py-3 font-semibold">
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {tableData.map((row, rIdx) => (
                                    <tr key={rIdx} className="transition hover:bg-slate-50">
                                        {headers.map((col, cIdx) => (
                                            <td key={cIdx} className="whitespace-nowrap px-4 py-2.5 text-slate-700">
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
        </div>
    );
}