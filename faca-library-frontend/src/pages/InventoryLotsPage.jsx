import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2, Table2, AlertTriangle, Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { getInventoryLots } from '../services/inventoryService';

export default function InventoryLotsPage() {
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const limit = 20;

    // Truyền tham số phân trang & search vào React Query (Đã tương thích React Query v5)
    const { data, isLoading, isError } = useQuery({
        queryKey: ['inventoryList', page, search],
        queryFn: () => getInventoryLots({ page, limit, search }),
        placeholderData: (previousData) => previousData,
        staleTime: 30_000,
    });

    const inventoryLots = data?.lots ?? data ?? [];
    const totalPages = data?.totalPages ?? 1;
    const totalRecords = data?.total ?? data?.totalCount ?? inventoryLots.length;

    const formatDate = (value) => {
        if (!value) return '-';
        const d = new Date(value);
        return isNaN(d.getTime()) ? value : d.toLocaleDateString('vi-VN');
    };

    // Hàm tạo danh sách các số trang hiển thị
    const getPageNumbers = () => {
        const pages = [];
        const maxPagesToShow = 5;
        let startPage = Math.max(1, page - Math.floor(maxPagesToShow / 2));
        let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

        if (endPage - startPage + 1 < maxPagesToShow) {
            startPage = Math.max(1, endPage - maxPagesToShow + 1);
        }

        for (let i = startPage; i <= endPage; i++) {
            pages.push(i);
        }
        return pages;
    };

    return (
        <div className="mx-auto max-w-7xl px-4 py-8">
            {/* Header + Search */}
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-emerald-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
                        <Table2 className="h-6 w-6" />
                    </span>
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">Inventory Lots</h2>
                        <p className="mt-0.5 text-sm text-slate-500">Quản lý lô tồn kho chuẩn hóa từ dbo.InventoryLots</p>
                    </div>
                </div>

                {/* Thanh tìm kiếm */}
                <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Tìm Lot, Project, Vật liệu..."
                        value={search}
                        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                        className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-4 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                </div>
            </div>

            {/* Bảng dữ liệu */}
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                {isLoading ? (
                    <div className="flex items-center justify-center gap-2 py-12 text-slate-500">
                        <Loader2 className="h-5 w-5 animate-spin text-emerald-600" />
                        Đang tải danh sách tồn kho...
                    </div>
                ) : isError ? (
                    <div className="py-12 text-center text-sm text-red-600">
                        <AlertTriangle className="mx-auto mb-2 h-6 w-6" />
                        Không tải được dữ liệu kho từ server.
                    </div>
                ) : inventoryLots.length === 0 ? (
                    <div className="py-12 text-center text-sm text-slate-400">Không tìm thấy lô hàng nào.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse text-left text-sm">
                            <thead>
                                <tr className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                                    <th className="px-4 py-3 font-semibold">Lot Code</th>
                                    <th className="px-4 py-3 font-semibold">Dự án / Build</th>
                                    <th className="px-4 py-3 font-semibold">Vật liệu</th>
                                    <th className="px-4 py-3 font-semibold">Ngày nhận</th>
                                    <th className="px-4 py-3 font-semibold text-right">Nhập</th>
                                    <th className="px-4 py-3 font-semibold text-right">Lỗi IQA</th>
                                    <th className="px-4 py-3 font-semibold text-right">Tồn kho</th>
                                    <th className="px-4 py-3 font-semibold text-center">DRI</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {inventoryLots.map((lot) => (
                                    <tr key={lot.InventoryLotID || lot.LotCode} className="transition hover:bg-slate-50">
                                        <td className="px-4 py-3 font-medium text-slate-800">{lot.LotCode}</td>
                                        <td className="px-4 py-3 text-slate-600">
                                            <div className="font-medium text-slate-700">{lot.ProjectName}</div>
                                            <div className="text-xs text-slate-400">{lot.BuildCode}</div>
                                        </td>
                                        <td className="px-4 py-3 text-slate-600">{lot.MaterialName}</td>
                                        <td className="px-4 py-3 text-slate-600">{formatDate(lot.ReceiveDate)}</td>
                                        <td className="px-4 py-3 text-right text-slate-600">{lot.ShipmentQty ?? 0}</td>
                                        <td className="px-4 py-3 text-right text-red-500 font-medium">{lot.IQAScrapQty ?? 0}</td>
                                        <td className="px-4 py-3 text-right">
                                            <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                                                (lot.StockQty ?? 0) > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'
                                            }`}>
                                                {lot.StockQty ?? 0}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-center text-slate-600">{lot.DRICode || '-'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Phân trang chuẩn thiết kế (có thông tin tổng số bản ghi và các nút chuyển trang đầy đủ) */}
            {totalPages > 1 && (
                <div className="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-6 py-4 shadow-sm">
                    <div className="text-sm text-slate-500">
                        Trang <span className="font-semibold text-slate-700">{page}</span> / {totalPages}
                        <span className="mx-2">•</span>
                        Tổng số: <span className="font-semibold text-slate-700">{totalRecords}</span> bản ghi
                        <span className="mx-2">•</span>
                        {limit} dòng/trang
                    </div>
                    <div className="flex items-center gap-1.5">
                        {/* Về trang đầu */}
                        <button
                            disabled={page <= 1}
                            onClick={() => setPage(1)}
                            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent"
                            title="Trang đầu"
                        >
                            <ChevronsLeft className="h-4 w-4" />
                        </button>

                        {/* Trang trước */}
                        <button
                            disabled={page <= 1}
                            onClick={() => setPage(p => p - 1)}
                            className="flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent"
                        >
                            <ChevronLeft className="h-4 w-4" /> Trang trước
                        </button>

                        {/* Các nút số trang */}
                        <div className="hidden items-center gap-1 sm:flex">
                            {getPageNumbers().map((pNum) => (
                                <button
                                    key={pNum}
                                    onClick={() => setPage(pNum)}
                                    className={`h-9 w-9 rounded-lg text-sm font-medium transition ${
                                        page === pNum
                                            ? 'bg-slate-900 text-white shadow-sm'
                                            : 'text-slate-600 hover:bg-slate-100 border border-slate-200'
                                    }`}
                                >
                                    {pNum}
                                </button>
                            ))}
                        </div>

                        {/* Trang sau */}
                        <button
                            disabled={page >= totalPages}
                            onClick={() => setPage(p => p + 1)}
                            className="flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent"
                        >
                            Trang sau <ChevronRight className="h-4 w-4" />
                        </button>

                        {/* Về trang cuối */}
                        <button
                            disabled={page >= totalPages}
                            onClick={() => setPage(totalPages)}
                            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent"
                            title="Trang cuối"
                        >
                            <ChevronsRight className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}