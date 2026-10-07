import { useQuery } from '@tanstack/react-query';
import { fetchAuditLogs, fetchAuditTables } from '../services/auditLogService';

/**
 * useAuditLogs — nạp nhật ký chỉnh sửa dữ liệu (React Query).
 *
 * @param {Object} params — bộ lọc { page, limit, tableName, recordId, actionType, changedBy, from, to }
 * @returns {{
 *   logs: Array, pagination: Object, summary: Object|null, tables: string[],
 *   isLoading: boolean, isFetching: boolean, isError: boolean, error: any, refetch: Function
 * }}
 */
export default function useAuditLogs(params = {}) {
    const query = useQuery({
        queryKey: ['auditLogs', params],
        queryFn: () => fetchAuditLogs(params),
        // Giữ dữ liệu trang trước khi đổi trang/bộ lọc -> bảng không nháy trắng
        placeholderData: (previous) => previous,
        staleTime: 30_000,
    });

    const tablesQuery = useQuery({
        queryKey: ['auditTables'],
        queryFn: fetchAuditTables,
        staleTime: 300_000,
    });

    return {
        logs: query.data?.logs || [],
        pagination: query.data?.pagination || { page: 1, limit: 20, total: 0, totalPages: 1 },
        summary: query.data?.summary || null,
        tables: tablesQuery.data || [],
        isLoading: query.isLoading,
        isFetching: query.isFetching,
        isError: query.isError,
        error: query.error,
        refetch: query.refetch,
    };
}