import axios from 'axios';

/**
 * apiClient — Axios instance dùng chung cho TOÀN BỘ ứng dụng.
 *
 * - Tự động gắn JWT `Authorization: Bearer <token>` từ localStorage vào mọi request.
 * - Chuẩn hoá xử lý lỗi 401: xoá phiên, bắn toast "hết hạn đăng nhập", điều hướng /login.
 * - Cung cấp helper `toErrorMessage()` để lấy message chuẩn từ backend.
 *
 * Lưu ý: instance này KHÔNG đổi shape dữ liệu trả về (vẫn là AxiosResponse đầy đủ)
 * để không phá vỡ code hiện đang đọc `res.data` ở các service/trang.
 */

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Khoá lưu phiên — đồng bộ với toàn bộ app (Login/Header/ProtectedRoute...)
export const TOKEN_KEY = 'token';
export const USER_KEY = 'user';

export const getToken = () => localStorage.getItem(TOKEN_KEY);

/** Header Authorization chuẩn (giữ tương thích với các service cũ). */
export const getAuthHeaders = () => {
    const token = getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
};

/**
 * Bắn toast lên UI từ mọi tầng (kể cả ngoài React như interceptor/service).
 * `ToastProvider` lắng nghe sự kiện `app:toast` để hiển thị.
 */
export const emitToast = (type, message, options = {}) => {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(
        new CustomEvent('app:toast', { detail: { type, message, ...options } }),
    );
};

/** Chuẩn hoá thông điệp lỗi: ưu tiên message do backend trả về. */
export const toErrorMessage = (error, fallback = 'Có lỗi xảy ra.') =>
    error?.response?.data?.message || error?.message || fallback;

// Các endpoint auth: KHÔNG xử lý 401 theo kiểu "hết phiên" (vd sai mật khẩu khi login).
const AUTH_ENDPOINT_RE = /\/auth\/(login|register|forgot-password|reset-password)/;

let redirectingToLogin = false;

const apiClient = axios.create({
    baseURL: API_URL,
    headers: { 'Content-Type': 'application/json' },
});

// ===== Request interceptor: tự động gắn token =====
apiClient.interceptors.request.use(
    (config) => {
        const token = getToken();
        if (token) {
            config.headers = config.headers || {};
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error),
);

// ===== Response interceptor: xử lý 401 tập trung =====
apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        const status = error?.response?.status;
        const config = error?.config || {};
        const isAuthEndpoint = AUTH_ENDPOINT_RE.test(config.url || '');
        const skip = config.skipAuthRedirect === true;

        if (status === 401 && !isAuthEndpoint && !skip) {
            // 1) Xoá phiên đã hết hạn
            localStorage.removeItem(TOKEN_KEY);
            localStorage.removeItem(USER_KEY);

            // 2) Thông báo cho người dùng (interceptor nằm ngoài Router -> dùng CustomEvent)
            emitToast('error', 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');

            // 3) Điều hướng về /login (chờ 1 nhịp để toast kịp hiển thị)
            if (!redirectingToLogin && window.location.pathname !== '/login') {
                redirectingToLogin = true;
                window.setTimeout(() => {
                    window.location.assign('/login');
                }, 600);
            }
        }

        return Promise.reject(error);
    },
);

export default apiClient;
