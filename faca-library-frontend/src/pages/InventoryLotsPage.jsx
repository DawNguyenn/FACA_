import { useQuery } from '@tanstack/react-query';
import { Loader2, Table2, AlertTriangle } from 'lucide-react';
import { getInventoryLots } from '../services/inventoryService';

// ================================================================
//  InventoryLotsPage — Bảng Inventory Lots (dbo.InventoryLots)
//  Tách riêng khỏi WarehouseExcelViewer, hiển thị tại
//  dropdown "Kho & Vật tư" -> "Inventory Lots" (/warehouse/inventory-lots)
// ================================================================
export default function InventoryLotsPage() {
    const inventoryQuery = useQuery({
        queryKey: ['inventoryList'],
        queryFn: () => getInventoryLots(),
        staleTime: 30_000,
    });
    const inventoryLots = inventoryQuery.data ?? [];

    // Format ngày giờ ISO -> dd/mm/yyyy cho dễ đọc
    const formatDate = (value) => {
        if (!value) return '';
        const d = new Date(value);
        return isNaN(d.getTime()) ? value : d.toLocaleDateString('vi-VN');
    };

    return (
        <div className="mx-auto max-w-7xl px-4 py-8">
            {/* Header */}
            <div className="mb-6 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-white p-6 shadow-sm">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
                    <Table2 className="h-6 w-6" />
                </span>
                <div>
                    <h2 className="text-xl font-bold text-slate-800">Inventory Lots</h2>
                    <p className="mt-0.5 text-sm text-slate-500">
                        Danh sách lots tồn kho từ bảng dbo.InventoryLots
                    </p>
                </div>
                <span className="ml-auto rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                    {inventoryLots.length} lots
                </span>
            </div>

            {/* Bảng Inventory Lots */}
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                {inventoryQuery.isLoading ? (
                    <div className="flex items-center justify-center gap-2 py-12 text-slate-500">
                        <Loader2 className="h-5 w-5 animate-spin text-emerald-600" />
                        Loading inventory...
                    </div>
                ) : inventoryQuery.isError ? (
                    <div className="py-12 text-center text-sm text-red-600">
                        <AlertTriangle className="mx-auto mb-2 h-6 w-6" />
                        Không tải được danh sách kho.
                    </div>
                ) : inventoryLots.length === 0 ? (
                    <div className="py-12 text-center text-sm text-slate-400">
                        Chưa có lots được nhập. Hãy dùng nút &quot;Nhập Excel&quot; ở trang Kho dữ liệu Excel để upload file tồn kho.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse text-left text-sm">
                            <thead>
                                <tr className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                                    <th className="whitespace-nowrap border-b border-slate-200 px-3 py-2.5 font-semibold">Lot Code</th>
                                    <th className="whitespace-nowrap border-b border-slate-200 px-3 py-2.5 font-semibold">Project</th>
                                    <th className="whitespace-nowrap border-b border-slate-200 px-3 py-2.5 font-semibold">Build</th>
                                    <th className="whitespace-nowrap border-b border-slate-200 px-3 py-2.5 font-semibold">Material</th>
                                    <th className="whitespace-nowrap border-b border-slate-200 px-3 py-2.5 font-semibold">Receive Date</th>
                                    <th className="whitespace-nowrap border-b border-slate-200 px-3 py-2.5 font-semibold">Qty</th>
                                    <th className="whitespace-nowrap border-b border-slate-200 px-3 py-2.5 font-semibold">Stock</th>
                                    <th className="whitespace-nowrap border-b border-slate-200 px-3 py-2.5 font-semibold">DRI</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {inventoryLots.map((lot) => (
                                    <tr key={lot.InventoryLotID} className="transition hover:bg-slate-50">
                                        <td className="whitespace-nowrap px-3 py-2.5 font-medium text-slate-800">{lot.LotCode}</td>
                                        <td className="whitespace-nowrap px-3 py-2.5 text-slate-600">{lot.ProjectName}</td>
                                        <td className="whitespace-nowrap px-3 py-2.5 text-slate-600">{lot.BuildCode}</td>
                                        <td className="whitespace-nowrap px-3 py-2.5 text-slate-600">{lot.MaterialName}</td>
                                        <td className="whitespace-nowrap px-3 py-2.5 text-slate-600">{formatDate(lot.ReceiveDate)}</td>
                                        <td className="whitespace-nowrap px-3 py-2.5 text-slate-600">{lot.ShipmentQty}</td>
                                        <td className="whitespace-nowrap px-3 py-2.5 text-slate-600">{lot.StockQty}</td>
                                        <td className="whitespace-nowrap px-3 py-2.5 text-slate-600">{lot.DRICode}</td>
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
