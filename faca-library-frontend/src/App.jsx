import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Auth/Login';
import Register from './pages/Auth/Register';
import Home from './pages/Home';
import AdminDashboard from './pages/Admin/AdminDashboard';
import ManageUsers from './pages/Admin/ManageUsers';
import AdminRoleRequests from './pages/Admin/AdminRoleRequestsPage';
import ProfilePage from './pages/Profile';
import IssuesPage from './pages/IssuesPage';
import RoleRequestPage from './pages/RoleRequestPage';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';

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

function App() {
    return (
        <Router>
            <Routes>
                {/* Route Đăng nhập & Đăng ký (Không chứa Header / Footer) */}
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />

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

                {/* Admin: User Dashboard */}
                <Route
                    path="/admin"
                    element={
                        <ProtectedRoute>
                            <MainLayout>
                                <AdminDashboard />
                            </MainLayout>
                        </ProtectedRoute>
                    }
                />

                {/* Admin: Quản lý người dòng */}
                <Route
                    path="/admin/users"
                    element={
                        <ProtectedRoute>
                            <MainLayout>
                                <ManageUsers />
                            </MainLayout>
                        </ProtectedRoute>
                    }
                />

                {/* Admin: Quản lý yêu cau cấpăquyenne */}
                <Route
                    path="/admin/role-requests"
                    element={
                        <ProtectedRoute>
                            <MainLayout>
                                <AdminRoleRequests />
                            </MainLayout>
                        </ProtectedRoute>
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

                {/* Bắt các URL không tồn tại quay về Home */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </Router>
    );
}

export default App;