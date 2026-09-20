import { useCallback, useEffect, useState } from 'react';
import { getUsers } from '../services/userService';

/**
 * useAdminUsers — nạp danh sách người dùng từ backend (GET /api/users)
 * và giữ trạng thái loading / lỗi / đang gửi request cho các thao tác CRUD.
 *
 * @returns {{
 *   users: Array, loading: boolean, loadError: string|null,
 *   submitting: boolean, setSubmitting: Function, refreshUsers: () => Promise<void>
 * }}
 */
export default function useAdminUsers() {
    // --- Raw state (data from Backend API) ---
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    const refreshUsers = useCallback(async () => {
        setLoading(true);
        setLoadError(null);
        try {
            const data = await getUsers();
            setUsers(data);
        } catch (err) {
            setLoadError(err.message || 'Không thể tải danh sách người dùng.');
        } finally {
            setLoading(false);
        }
    }, []);

    // Nạp dữ liệu từ Backend khi component mount.
    // Dùng setTimeout để không gọi setState đồng bộ trong effect body.
    useEffect(() => {
        const t = window.setTimeout(refreshUsers, 0);
        return () => window.clearTimeout(t);
    }, [refreshUsers]);

    return { users, loading, loadError, submitting, setSubmitting, refreshUsers };
}
