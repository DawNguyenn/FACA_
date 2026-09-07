import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FileText, AlertCircle, Package, BookOpen, Boxes, ArrowRight } from 'lucide-react';
import '../Styles/Home.css';

const Home = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);

    useEffect(() => {
        // Kiểm tra phiên đăng nhập
        const storedUser = localStorage.getItem('user');
        const token = localStorage.getItem('token');

        if (!token || !storedUser) {
            // Nếu chưa đăng nhập, đá về trang Login
            navigate('/login');
        } else {
            setUser(JSON.parse(storedUser));
        }
    }, [navigate]);

    if (!user) return null;

    // Thống kê nhanh (KPI Stats Bar)
    const stats = [
        { icon: FileText, value: '1,248', label: 'Báo cáo FACA', color: '#60a5fa' },
        { icon: AlertCircle, value: '14', label: 'Sự cố chờ xử lý', color: '#f87171' },
        { icon: Package, value: '3,520', label: 'Linh kiện tồn kho', color: '#34d399' },
    ];

    // Lối tắt tính năng chính
    const features = [
        {
            to: '/issues',
            icon: BookOpen,
            title: 'Thư viện FACA',
            desc: 'Tra cứu và học hỏi từ các báo cáo phân tích Failure Analysis & Corrective Action (8D / 5-Why) của Camera Module Division.'
        },
        {
            to: '/inventory',
            icon: Boxes,
            title: 'Kho linh kiện',
            desc: 'Quản lý, theo dõi tồn kho và kiểm soát nguồn linh kiện theo thời gian thực trên toàn phân xưởng.'
        }
    ];

    return (
        <div className="home-container">
            {/* ====== Hero Banner KPI ====== */}
            <section className="home-hero">
                <span className="home-hero-badge">Camera Module PE Division</span>
                <h1 className="home-hero-title">FACA & Component Library</h1>
                <p className="home-hero-desc">
                    Hệ thống tra cứu Failure Analysis & Corrective Action (8D / 5-Why) và
                    kho linh kiện nội bộ — hỗ trợ phân tích, chia sẻ bài học kinh nghiệm
                    và quản lý nguồn vật tư hiệu quả cho toàn Division.
                </p>

                <div className="home-stats">
                    {stats.map((stat) => (
                        <div className="home-stat-item" key={stat.label}>
                            <stat.icon size={28} color={stat.color} />
                            <div>
                                <span className="home-stat-value">{stat.value}</span>
                                <span className="home-stat-label">{stat.label}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* ====== Main Features Grid ====== */}
            <section className="home-features">
                <h2 className="home-section-title">Tính năng chính</h2>
                <div className="home-features-grid">
                    {features.map((feature) => (
                        <Link to={feature.to} className="home-feature-card" key={feature.to}>
                            <div className="home-feature-icon">
                                <feature.icon size={30} />
                            </div>
                            <h3 className="home-feature-title">{feature.title}</h3>
                            <p className="home-feature-desc">{feature.desc}</p>
                            <span className="home-feature-link">
                                Truy cập ngay <ArrowRight size={16} />
                            </span>
                        </Link>
                    ))}
                </div>
            </section>
        </div>
    );
};

export default Home;