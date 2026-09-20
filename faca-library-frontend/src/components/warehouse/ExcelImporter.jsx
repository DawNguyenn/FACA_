// ================================================================
//  ExcelImporter.jsx — Stream-based Excel import UI
//  (React 19 + Vite, ES modules, TailwindCSS, lucide-react)
// ================================================================

import React, { useState, useRef, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    FileSpreadsheet,
    Upload,
    X,
    CheckCircle,
    XCircle,
    Clock,
    AlertTriangle,
    RefreshCw,
} from 'lucide-react';
import {
    importExcelFile,
    getImportStatus,
    getImportErrors,
} from '../../services/inventoryService';

// ---------------------------------------------------------------
// Inline toast (no external toast library required)
// ---------------------------------------------------------------

function Toast({ message, type = 'info', onClose }) {
    const typeStyles = {
        info:    'bg-blue-50 border-blue-200 text-blue-800',
        success: 'bg-green-50 border-green-200 text-green-800',
        error:   'bg-red-50 border-red-200 text-red-800',
        warning: 'bg-amber-50 border-amber-200 text-amber-800',
    };

    return (
        <div
            className={`fixed top-4 right-4 z- [9999] max-w-md rounded-lg border px-4 py-3 shadow-lg ${typeStyles[type]}`}
        >
            <div className="flex items-start gap-3">
                <div className="mt-0.5 shrink-0">
                    {type === 'success' && <CheckCircle className="h-5 w-5 text-green-600" />}
                    {type === 'error' && <XCircle className="h-5 w-5 text-red-600" />}
                    {type === 'warning' && <AlertTriangle className="h-5 w-5 text-amber-600" />}
                    {type === 'info' && <FileSpreadsheet className="h-5 w-5 text-blue-600" />}
                </div>
                <div className="flex-1 text-sm">{message}</div>
                {onClose && (
                    <button
                        onClick={onClose}
                        className="shrink-0 rounded p-1 hover:bg-black/5"
                    >
                        <X className="h-4 w-4" />
                    </button>
                )}
            </div>
        </div>
    );
}

// ---------------------------------------------------------------
// Status badge
// ---------------------------------------------------------------

function StatusBadge({ status }) {
    const styles = {
        PENDING:    'bg-gray-100 text-gray-700',
        PROCESSING: 'bg-blue-100 text-blue-800',
        SUCCESS:    'bg-green-100 text-green-800',
        PARTIAL:    'bg-amber-100 text-amber-800',
        FAILED:     'bg-red-100 text-red-800',
    };
    const style = styles[status] || 'bg-gray-100 text-gray-700';

    const icons = {
        PENDING:    <Clock className="h-3 w-3" />,
        PROCESSING: <RefreshCw className="h-3 w-3 animate-spin" />,
        SUCCESS:    <CheckCircle className="h-3 w-3" />,
        PARTIAL:    <AlertTriangle className="h-3 w-3" />,
        FAILED:     <XCircle className="h-3 w-3" />,
    };

        return (
        <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${style}`}
        >
            {icons[status]}
            {status || 'UNKNOWN'}
        </span>
    );
}

// ---------------------------------------------------------------
// Main ExcelImporter component
// ---------------------------------------------------------------

export default function ExcelImporter({ onImportComplete }) {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [toast, setToast] = useState(null);
    const fileInputRef = useRef(null);
    const queryClient = useQueryClient();

    // -- Mutation: upload Excel file ----------------------------------
    const uploadMutation = useMutation({
        mutationFn: (file) => importExcelFile(file),
        onSuccess: () => {
            showToast('File is being processed in background...', 'info');
        },
        onError: (error) => {
            const msg =
                error?.response?.data?.message ||
                error.message ||
                'Upload thất bại. Vui lòng thử lại.';
            showToast(`Lỗi tải lên: ${msg}`, 'error');
        },
    });

    const importId = uploadMutation.data?.importId;

    // -- Polling query: import status ---------------------------------
    const { data: statusData, refetch: refetchStatus, isFetching } = useQuery({
        queryKey: ['importStatus', importId],
        queryFn: () => getImportStatus(importId),
        enabled: !!importId && uploadMutation.isSuccess,
        refetchInterval: (query) => {
            const status = query.state.data?.status;
            if (status === 'PROCESSING' || status === 'PENDING') return 3000;
            return false;
        },
        staleTime: 1000,
        refetchOnWindowFocus: false,
    });

    // -- When import completes, invalidate the inventory list -------
    useEffect(() => {
        const status = statusData?.status;
        if (status && status !== 'PROCESSING' && status !== 'PENDING') {
            // Completed → refresh inventory list
            queryClient.invalidateQueries(['inventoryList']);

            if (typeof onImportComplete === 'function') {
                onImportComplete(status, statusData);
            }

            if (status === 'SUCCESS') {
                showToast(
                    `Nhập thành công ${statusData.totalRows || 0} dòng dữ liệu.`,
                    'success',
                );
            } else if (status === 'PARTIAL') {
                showToast(
                    `Đã nhập một phần (${statusData.totalRows || 0} dòng thành công, ${statusData.errorRows || 0} lỗi).`,
                    'warning',
                );
            } else if (status === 'FAILED') {
                showToast(
                    'Quá trình nhập thất bại. Vui lòng kiểm tra lại file và thử lại.',
                    'error',
                );
            }
        }
    }, [statusData?.status, queryClient]);

    // -- Helpers -----------------------------------------------------
    const showToast = (message, type) => {
        setToast({ message, type, id: Date.now() });
    };

    const handleFileChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate extension
        const ext = file.name.split('.').pop().toLowerCase();
        if (!['xlsx', 'xls', 'xlsb'].includes(ext)) {
            showToast('Chỉ hỗ trợ tệp Excel (.xlsx, .xls, .xlsb).', 'error');
            return;
        }
        setSelectedFile(file);
        setToast(null);
    };

    const handleUpload = () => {
        if (!selectedFile) {
            showToast('Vui lòng chọn một file trước.', 'warning');
            return;
        }
        uploadMutation.mutate(selectedFile);
    };

    const reset = () => {
        setSelectedFile(null);
        uploadMutation.reset();
        setToast(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

        const openModal = () => {
        setIsOpen(true);
        reset();
    };

    return (
        <>
            {/* Toast notifications */}
            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast(null)}
                />
            )}

            {/* Trigger button */}
            <button
                onClick={openModal}
                className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow transition hover:bg-emerald-700"
            >
                <FileSpreadsheet className="h-4 w-4" />
                Nhập Excel
            </button>

            {/* Modal */}
            {isOpen && (
                <div className="fixed inset-0 z- [9999] flex items-center justify-center bg-black/50">
                    <div className="relative w-full max-w-3xl rounded-xl bg-white shadow-xl">
                        {/* Header */}
                        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
                            <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-800">
                                <Upload className="h-5 w-5 text-emerald-600" />
                                Nhập dữ liệu từ Excel
                            </h2>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="rounded p-1 text-slate-500 hover:bg-slate-100"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-6">
                            {!uploadMutation.isSuccess && (
                                <>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept=".xlsx,.xls,.xlsb"
                                        onChange={handleFileChange}
                                        className="hidden"
                                    />

                                    <div
                                        onClick={() => fileInputRef.current?.click()}
                                        className="cursor-pointer rounded-lg border-2 border-dashed border-slate-300 p-6 text-center transition hover:border-emerald-400 hover:bg-emerald-50"
                                    >
                                        <FileSpreadsheet className="mx-auto mb-2 h-8 w-8 text-slate-400" />
                                        <p className="text-sm text-slate-600">
                                            {selectedFile ? selectedFile.name : 'Click để chọn file Excel'}
                                        </p>
                                        {selectedFile && (
                                            <p className="mt-1 text-xs text-slate-500">
                                                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                                            </p>
                                        )}
                                    </div>

                                    <button
                                        onClick={handleUpload}
                                        disabled={!selectedFile || uploadMutation.isPending}
                                        className="mt-4 w-full rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                                    >
                                        {uploadMutation.isPending ? 'Đang tải lên...' : 'Bắt đầu nhập'}
                                    </button>

                                    {uploadMutation.isError && (
                                        <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3">
                                            <p className="text-sm text-red-800">
                                                {uploadMutation.error?.message || 'Có lỗi xảy ra khi tải lên.'}
                                            </p>
                                        </div>
                                    )}
                                </>
                            )}

                            {uploadMutation.isSuccess && (
                                <ProcessingStatus
                                    importId={importId}
                                    statusData={statusData}
                                    isFetching={isFetching}
                                    refetchStatus={refetchStatus}
                                    onReset={reset}
                                />
                            )}
                        </div>
                    </div>
                </div>
                        )}
        </>
    );
}

// ---------------------------------------------------------------
// ProcessingStatus — shows upload result + polling display
// ---------------------------------------------------------------

function ProcessingStatus({ importId, statusData, isFetching, refetchStatus, onReset }) {
    return (
        <div className="space-y-4">
            {/* Upload result header */}
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-blue-800">
                            Đã nhận file: {statusData?.fileName || '...'}
                        </p>
                        <p className="text-xs text-blue-600">Mã nhập: #{importId}</p>
                    </div>
                    <StatusBadge status={statusData?.status || 'PROCESSING'} />
                </div>
            </div>

            {/* Polling details grid */}
            {statusData && (
                <div className="text-sm text-slate-600">
                    <div className="grid grid-cols-2 gap-2">
                        <div><span className="font-medium">Tổng hàng:</span> {statusData.totalRows || 0}</div>
                        <div><span className="font-medium">Hàng lỗi:</span> {statusData.errorRows || 0}</div>
                        <div><span className="font-medium">Cập nhật:</span> {new Date(statusData.processedAt || Date.now()).toLocaleString('vi-VN')}</div>
                        <div><span className="font-medium">Trạng thái:</span> {isFetching ? 'Đang cập nhật...' : 'Đã cập nhật'}</div>
                    </div>
                </div>
            )}

            <button
                onClick={() => refetchStatus()}
                className="flex items-center gap-1 rounded border border-slate-300 px-3 py-1 text-xs text-slate-600 hover:bg-slate-100"
            >
                <RefreshCw className="h-3 w-3" />
                Làm mới
            </button>

            {/* Error details link */}
            {statusData &&
                (statusData.status === 'PARTIAL' || statusData.status === 'FAILED') &&
                statusData.errorRows > 0 && (
                    <ErrorDetailsModal importId={importId} />
                )}

            <button
                onClick={onReset}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-100"
            >
                                Nhập file khác
            </button>
        </div>
    );
}

// ---------------------------------------------------------------
// ErrorDetailsModal — shows failed-row diagnostics from staging
// ---------------------------------------------------------------

function ErrorDetailsModal({ importId }) {
    const [isOpen, setIsOpen] = useState(false);

    const { data: errorData, isLoading, error } = useQuery({
        queryKey: ['importErrors', importId],
        queryFn: () => getImportErrors(importId),
        enabled: isOpen,
        staleTime: 30_000,
    });

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="text-sm text-amber-600 hover:underline"
            >
                Xem chi tiết lỗi
            </button>

            {isOpen && (
                <div className="fixed inset-0 z- [9999] flex items-center justify-center bg-black/50">
                    <div className="relative max-h-[80vh] w-full max-w-4xl overflow-y-auto rounded-xl bg-white shadow-xl">
                        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
                            <h3 className="font-semibold text-slate-800">
                                Chi tiết lỗi nhập ({errorData?.errorCount || 0} lỗi)
                            </h3>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="rounded p-1 text-slate-500 hover:bg-slate-100"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="p-4">
                            {isLoading && (
                                <div className="py-8 text-center text-slate-500">
                                    <RefreshCw className="mx-auto mb-2 h-6 w-6 animate-spin text-emerald-600" />
                                    Đang tải...
                                </div>
                            )}

                            {error && (
                                <p className="text-sm text-red-600">
                                    {error?.message || 'Không thể tải chi tiết lỗi.'}
                                </p>
                            )}

                            {errorData && !isLoading && (
                                <div className="overflow-x-auto">
                                    <table className="w-full border-collapse text-left text-sm">
                                        <thead>
                                            <tr className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                                                <th className="border-b border-slate-200 px-3 py-2 font-semibold">Dòng</th>
                                                <th className="border-b border-slate-200 px-3 py-2 font-semibold">Sheet</th>
                                                <th className="border-b border-slate-200 px-3 py-2 font-semibold">Lot ID</th>
                                                <th className="border-b border-slate-200 px-3 py-2 font-semibold">Model</th>
                                                <th className="border-b border-slate-200 px-3 py-2 font-semibold">Build</th>
                                                <th className="border-b border-slate-200 px-3 py-2 font-semibold">Material</th>
                                                <th className="border-b border-slate-200 px-3 py-2 font-semibold">Lỗi</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                        {errorData.errors.map((err, i) => (
                                                <tr key={i} className="transition hover:bg-slate-50">
                                                    <td className="whitespace-nowrap px-3 py-2 text-slate-700">{err.RowIndex || err.RowNumber || ''}</td>
                                                    <td className="whitespace-nowrap px-3 py-2 text-slate-700">{err.SheetName || ''}</td>
                                                    <td className="whitespace-nowrap px-3 py-2 text-slate-700">{err.LotCode || ''}</td>
                                                    <td className="px-3 py-2 text-slate-700">{err.ProjectName || ''}</td>
                                                    <td className="px-3 py-2 text-slate-700">{err.BuildCode || ''}</td>
                                                    <td className="px-3 py-2 text-slate-700">{err.MaterialName || ''}</td>
                                                    <td className="px-3 py-2 text-red-600">{err.ErrorMessage || 'Không xác định'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}