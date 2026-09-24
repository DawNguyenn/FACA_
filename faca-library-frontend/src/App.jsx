import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';
import Home from './pages/Home';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminRoleRequests from './pages/admin/AdminRoleRequestsPage';
import ProfilePage from './pages/Profile';
import IssuesPage from './pages/IssuesPage';
import ErrorReportsPage from './pages/ErrorReportsPage';
import RoleRequestPage from './pages/RoleRequestPage';
import WarehouseExcelViewer from './pages/WarehouseExcelViewer';
import InventoryLotsPage from './pages/InventoryLotsPage';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import ToastProvider from './components/common/ToastProvider';
import { isAdmin } from './services/authUtils';

// Component layout chứa Header, Nội dung chính và Footer
const MainLayout = ({ children }) => {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
            <Header />
            <main style={{ flex: 1, backgroundColor: '#f4f6f9' }}>
                {children}
            </main>
            <Footer />
        </div>
    );
};

// Component bảo vệ Route (Bắt buộc phải đăng nhập)
const ProtectedRoute = ({ children }) => {
    const token = localStorage.getItem('token');
    if (!token) {
        return <Navigate to="/login" replace />;
    }
    return children;
};

// Component bảo vệ Route dành cho Admin (Bắt buộc đăng nhập + có quyền Admin)
// Người dùng không có quyền Admin sẽ bị chuyển hướng về trang chủ
const AdminRoute = ({ children }) => {
    const token = localStorage.getItem('token');
    if (!token) {
        return <Navigate to="/login" replace />;
    }
    if (!isAdmin()) {
        return <Navigate to="/" replace />;
    }
    return children;
};

function App() {
    return (
        <ToastProvider>
        <Router>
            <Routes>
                {/* Route Đăng nhập & Đăng ký (Không chứa Header / Footer) */}
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />

                {/* Route Quên mật khẩu & Đặt lại mật khẩu (truy cập từ link trong email) */}
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />

                {/* Route Trang chủ & các trang nghiệp vụ (Được bảo vệ + Có Header & Footer) */}
                <Route 
                    path="/" 
                    element={
                        <ProtectedRoute>
                            <MainLayout>
                                <Home />
                            </MainLayout>
                        </ProtectedRoute>
                    } 
                />

                {/* Admin: User Dashboard (chỉ dành cho Admin) */}
                <Route
                    path="/admin"
                    element={
                        <AdminRoute>
                            <MainLayout>
                                <AdminDashboard />
                            </MainLayout>
                        </AdminRoute>
                    }
                />

                {/* Admin: Quản lý người dùng (chỉ dành cho Admin) */}
                <Route
                    path="/admin/users"
                    element={
                        <AdminRoute>
                            <MainLayout>
                                <AdminDashboard />
                            </MainLayout>
                        </AdminRoute>
                    }
                />

                {/* Admin: Quản lý yêu cầu cấp quyền (chỉ dành cho Admin) */}
                <Route
                    path="/admin/role-requests"
                    element={
                        <AdminRoute>
                            <MainLayout>
                                <AdminRoleRequests />
                            </MainLayout>
                        </AdminRoute>
                    }
                />

                {/* Trang cá nhân (Profile) */}
                <Route
                    path="/profile"
                    element={
                        <ProtectedRoute>
                            <MainLayout>
                                <ProfilePage />
                            </MainLayout>
                        </ProtectedRoute>
                    }
                />

                {/* Quản lý Lỗi (lọc category theo query ?category_id=) */}
                <Route
                    path="/issues"
                    element={
                        <ProtectedRoute>
                            <MainLayout>
                                <IssuesPage />
                            </MainLayout>
                        </ProtectedRoute>
                    }
                />

                {/* Quản lý Lỗi: thư viện báo cáo PowerPoint quét từ OneDrive (?category=LOI_DIEN|LOI_QUANG|LOI_CO) */}
                <Route
                    path="/issues/reports"
                    element={
                        <ProtectedRoute>
                            <MainLayout>
                                <ErrorReportsPage />
                            </MainLayout>
                        </ProtectedRoute>
                    }
                />

                {/* Xin cấp quyền / Đổi vai trò */}
                <Route
                    path="/request-role"
                    element={
                        <ProtectedRoute>
                            <MainLayout>
                                <RoleRequestPage />
                            </MainLayout>
                        </ProtectedRoute>
                    }
                />

                {/* Kho dữ liệu Excel */}
                <Route
                    path="/warehouse"
                    element={
                        <ProtectedRoute>
                            <MainLayout>
                                <WarehouseExcelViewer />
                            </MainLayout>
                        </ProtectedRoute>
                    }
                />

                {/* Inventory Lots (tách riêng khỏi Kho dữ liệu Excel) */}
                <Route
                    path="/warehouse/inventory-lots"
                    element={
                        <ProtectedRoute>
                            <MainLayout>
                                <InventoryLotsPage />
                            </MainLayout>
                        </ProtectedRoute>
                    }
                />

                {/* Bắt các URL không tồn tại quay về Home */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </Router>
        </ToastProvider>
    );
}

export default App;