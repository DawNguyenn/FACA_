import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2, Table2, AlertTriangle, Search } from 'lucide-react';
import { getPaginatedInventory } from '../services/inventoryService';
import WarehousePagination from '../components/warehouse/WarehousePagination';

export default function InventoryLotsPage() {
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const limit = 50;

  // Phân trang phía server: /api/inventory/list?page&limit&search
  // Debounce search 400ms để không gọi API mỗi lần gõ phím
  React.useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Truyền tham số phân trang & search vào React Query
  const { data, isLoading, isError } = useQuery({
    queryKey: ['inventoryList', page, search],
    queryFn: () => getPaginatedInventory({ page, limit, search }),
    keepPreviousData: true,
    staleTime: 30_000,
  });

  // Backend trả { success, data: lots[], pagination: { currentPage, totalPages, totalRows, limit } }
  const inventoryLots = data?.data ?? [];
  const pagination = data?.pagination ?? {};
  const totalPages = pagination.totalPages ?? 1;
  const totalRows = pagination.totalRows ?? inventoryLots.length;

  const formatDate = (value) => {
    if (!value) return '-';
    const d = new Date(value);
    return isNaN(d.getTime()) ? value : d.toLocaleDateString('vi-VN');
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
            <p className="mt-0.5 text-sm text-slate-500">
              Quản lý lô tồn kho chuẩn hóa từ dbo.InventoryLots
            </p>
          </div>
        </div>

        {/* Thanh tìm kiếm */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm Lot, Project, Vật liệu..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
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
          <div className="py-12 text-center text-sm text-slate-400">
            Không tìm thấy lô hàng nào.
          </div>
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
                  <tr
                    key={lot.InventoryLotID || lot.LotCode}
                    className="transition hover:bg-slate-50"
                  >
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {lot.LotCode}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      <div className="font-medium text-slate-700">
                        {lot.ProjectName}
                      </div>
                      <div className="text-xs text-slate-400">
                        {lot.BuildCode}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {lot.MaterialName}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {formatDate(lot.ReceiveDate)}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600">
                      {lot.ShipmentQty ?? 0}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-red-500">
                      {lot.IQAScrapQty ?? 0}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          (lot.StockQty ?? 0) > 0
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-red-100 text-red-600'
                        }`}
                      >
                        {lot.StockQty ?? 0}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-slate-600">
                      {lot.DRI || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Thanh phân trang: Trang 1/6 • Tổng số: 278 bản ghi • 50 dòng/trang */}
      <WarehousePagination
        page={page}
        totalPages={totalPages}
        totalRows={totalRows}
        pageLimit={limit}
        loading={isLoading}
        onPageChange={setPage}
      />
    </div>
  );
}