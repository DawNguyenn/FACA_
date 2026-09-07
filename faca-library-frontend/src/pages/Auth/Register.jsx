import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, AlertCircle, Cpu, Mail, Lock, User, Building, CheckCircle2, FileText, Database } from 'lucide-react';
import axios from 'axios';
import '../../Styles/Auth.css';

const Register = () => {
    const navigate = useNavigate();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [department, setDepartment] = useState('');

    // State lưu lỗi theo từng trường dữ liệu
    const [fieldErrors, setFieldErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [successMsg, setSuccessMsg] = useState(null);

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';


    // Hàm kiểm tra lỗi riêng của trang web
    const validateForm = () => {
        const errors = {};

        if (!fullName.trim()) {
            errors.fullName = 'Vui lòng nhập họ và tên';
        }

        if (!email.trim()) {
            errors.email = 'Vui lòng nhập email';
        } else if (!/\S+@\S+\.\S+/.test(email)) {
            errors.email = 'Định dạng email không hợp lệ';
        }

        // Regex kiểm tra: Tối thiểu 8 ký tự, ít nhất 1 chữ hoa, 1 số và 1 ký tự đặc biệt
        const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

        if (!password) {
            errors.password = 'Vui lòng nhập mật khẩu';
        } else if (password.length < 8) {
            errors.password = 'Mật khẩu phải chứa ít nhất 8 ký tự';
        } else if (!passwordRegex.test(password)) {
            errors.password = 'Mật khẩu phải bao gồm chữ in hoa, chữ số và ký tự đặc biệt (@$!%*?&)';
        }

        setFieldErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setError(null);
        setSuccessMsg(null);

        // Chạy hàm kiểm tra trước khi gửi
        if (!validateForm()) {
            return;
        }

        setLoading(true);

        try {
            const res = await axios.post(`${API_URL}/auth/register`, {
                email,
                password,
                full_name: fullName,
                department
            });

            if (res.data.success) {
                setSuccessMsg("Đăng ký thành công! Đang chuyển hướng về trang đăng nhập...");
                setEmail('');
                setPassword('');
                setFullName('');
                setDepartment('');
                setFieldErrors({});

                setTimeout(() => {
                    navigate('/login');
                }, 2000);
            }
        } catch (err) {
            console.error("Lỗi đăng ký:", err);
            setError(err.response?.data?.message || "Đăng ký thất bại. Email có thể đã tồn tại.");
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (setter, fieldName) => (e) => {
        setter(e.target.value);
        if (fieldErrors[fieldName]) {
            setFieldErrors(prev => ({ ...prev, [fieldName]: null }));
        }
    };

    return (
        <div className="auth-split-wrapper">
            <div className="auth-hero-panel">
                <div className="hero-overlay"></div>
                <div className="hero-content">
                    <div className="hero-brand">
                        <Cpu size={44} className="hero-brand-icon" />
                        <div>
                            <h2>FACTS</h2>
                            <p>Failure Analysis & Component Tracking System </p>
                        </div>
                    </div>

                    <h1 className="hero-title">
                        FACA & Inventory <br /> Management System
                    </h1>
                    <p className="hero-description">
                        Đăng ký tài khoản nội bộ để truy cập hệ thống báo cáo và cơ sở dữ liệu phân tích lỗi chất lượng.
                    </p>

                    <div className="hero-features">
                        <div className="feature-item">
                            <Database size={20} className="feature-icon" />
                            <span>Tra cứu thông tin và lịch sử các lỗi liên quan đến Camera Module</span>
                        </div>
                        <div className="feature-item">
                            <FileText size={20} className="feature-icon" />
                            <span>Quản lý danh mục kho, linh kiện và vật tư liên quan</span>
                        </div>
                        <div className="feature-item">
                            <CheckCircle2 size={20} className="feature-icon" />
                            <span>Theo dõi tình trạng và tổng hợp báo cáo hệ thống</span>
                        </div>
                    </div>

                    <div className="hero-footer-note">
                        © 2026 LG Innotek Vietnam Hải Phòng. All Rights Reserved.
                    </div>
                </div>
            </div>

            <div className="auth-form-panel">
                <div className="auth-card">
                    <div className="auth-header">
                        <div className="auth-icon-badge">
                            <Cpu size={32} color="#c00000" />
                        </div>
                        <h1 className="auth-title">FACA Library</h1>
                        <span className="auth-company-tag">Tạo tài khoản mới</span>
                    </div>

                    <div className="auth-tab-container">
                        <button className="auth-tab-btn" onClick={() => navigate('/login')}>
                            Đăng Nhập
                        </button>
                        <button className="auth-tab-btn active">Đăng Ký</button>
                    </div>

                    {error && (
                        <div className="auth-error-message">
                            <AlertCircle size={18} style={{ marginRight: 8, flexShrink: 0 }} />
                            <span>{error}</span>
                        </div>
                    )}
                    {successMsg && (
                        <div className="auth-success-message">
                            <ShieldCheck size={18} style={{ marginRight: 8, flexShrink: 0 }} />
                            <span>{successMsg}</span>
                        </div>
                    )}

                    <div className="auth-form-container">
                        {/* Thêm noValidate để tắt tooltip mặc định của trình duyệt */}
                        <form onSubmit={handleRegister} className="auth-form" noValidate>
                            <div className="auth-field-block">
                                <div className={`auth-input-group ${fieldErrors.fullName ? 'input-has-error' : ''}`}>
                                    <User size={18} color={fieldErrors.fullName ? '#c00000' : '#777'} className="auth-input-icon" />
                                    <input
                                        type="text"
                                        placeholder="Họ và tên *"
                                        value={fullName}
                                        onChange={handleInputChange(setFullName, 'fullName')}
                                        className="auth-input"
                                    />
                                </div>
                                {fieldErrors.fullName && <span className="custom-field-error">{fieldErrors.fullName}</span>}
                            </div>

                            <div className="auth-field-block">
                                <div className={`auth-input-group ${fieldErrors.email ? 'input-has-error' : ''}`}>
                                    <Mail size={18} color={fieldErrors.email ? '#c00000' : '#777'} className="auth-input-icon" />
                                    <input
                                        type="email"
                                        placeholder="Email*"
                                        value={email}
                                        onChange={handleInputChange(setEmail, 'email')}
                                        className="auth-input"
                                    />
                                </div>
                                {fieldErrors.email && <span className="custom-field-error">{fieldErrors.email}</span>}
                            </div>

                            <div className="auth-field-block">
                                <div className="auth-input-group">
                                    <Building size={18} color="#777" className="auth-input-icon" />
                                    <input
                                        type="text"
                                        placeholder="Bộ phận"
                                        value={department}
                                        onChange={(e) => setDepartment(e.target.value)}
                                        className="auth-input"
                                    />
                                </div>
                            </div>

                            <div className="auth-field-block">
                                <div className={`auth-input-group ${fieldErrors.password ? 'input-has-error' : ''}`}>
                                    <Lock size={18} color={fieldErrors.password ? '#c00000' : '#777'} className="auth-input-icon" />
                                    <input
                                        type="password"
                                        placeholder="Mật khẩu *"
                                        value={password}
                                        onChange={handleInputChange(setPassword, 'password')}
                                        className="auth-input"
                                    />
                                </div>
                                {fieldErrors.password && <span className="custom-field-error">{fieldErrors.password}</span>}
                            </div>

                            <button type="submit" disabled={loading} className="auth-submit-btn">
                                {loading ? 'Đang xử lý...' : 'Đăng Ký'}
                            </button>
                        </form>
                    </div>

                    <div className="auth-footer">
                        <ShieldCheck size={16} color="#28a745" style={{ marginRight: 6 }} />
                        <span>Hệ thống bảo mật nội bộ LG Innotek</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Register;