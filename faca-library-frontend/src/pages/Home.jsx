import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { FileText, AlertCircle, Package, BookOpen, Boxes, ArrowRight } from 'lucide-react';
import '../styles/Home.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const formatNumber = (n) => (n == null ? '—' : Number(n).toLocaleString('en-US'));

const Home = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [stats, setStats] = useState(null);
    const [statsLoading, setStatsLoading] = useState(true);

    useEffect(() => {
        // Kiem tra phien dang nhap
        const storedUser = localStorage.getItem('user');
        const token = localStorage.getItem('token');

        if (!token || !storedUser) {
            // Neu chua dang nhap, da ve trang Login
            navigate('/login');
        } else {
            setUser(JSON.parse(storedUser));
        }
    }, [navigate]);

    // So lieu that cho Trang chu: GET /api/dashboard/stats
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) return;
        const controller = new AbortController();
        const loadStats = async () => {
            setStatsLoading(true);
            try {
                const res = await axios.get(`${API_URL}/dashboard/stats`, {
                    headers: { Authorization: `Bearer ${token}` },
                    signal: controller.signal,
                });
                setStats(res.data?.data || null);
            } catch (err) {
                if (!axios.isCancel(err)) {
                    console.error('Khong the tai thong ke dashboard:', err);
                    setStats(null);
                }
            } finally {
                setStatsLoading(false);
            }
        };
        loadStats();
        return () => controller.abort();
    }, []);

    if (!user) return null;

    // Thong ke nhanh (KPI Stats Bar) — DU LIEU THAT tu backend
    const kpis = [
        { icon: FileText, value: statsLoading ? '...' : formatNumber(stats?.facaReports), label: t('home.kpiReports'), color: '#60a5fa', to: '/issues/reports' },
        { icon: AlertCircle, value: statsLoading ? '...' : formatNumber(stats?.pendingIssues), label: t('home.kpiPending'), color: '#f87171', to: '/issues' },
        { icon: Package, value: statsLoading ? '...' : formatNumber(stats?.inventoryLots), label: t('home.kpiInventory'), color: '#34d399', to: '/warehouse' },
    ];

    // Loi tat tinh nang chinh
    const features = [
        {
            to: '/issues/reports',
            icon: BookOpen,
            title: t('home.featureReportsTitle'),
            desc: t('home.featureReportsDesc')
        },
        {
            to: '/warehouse',
            icon: Boxes,
            title: t('home.featureInventoryTitle'),
            desc: t('home.featureInventoryDesc')
        }
    ];

    return (
        <div className="home-container">
            {/* ====== Hero Banner KPI ====== */}
            <section className="home-hero">
                <span className="home-hero-badge">Camera Module PE Division</span>
                <h1 className="home-hero-title">FACA & Component Library</h1>
                <p className="home-hero-desc">
                    {t('home.heroDesc')}
                </p>

                <div className="home-stats">
                    {kpis.map((stat) => (
                        <Link to={stat.to} className="home-stat-item" key={stat.label} style={{ textDecoration: 'none' }}>
                            <stat.icon size={28} color={stat.color} />
                            <div>
                                <span className="home-stat-value">{stat.value}</span>
                                <span className="home-stat-label">{stat.label}</span>
                            </div>
                        </Link>
                    ))}
                </div>
            </section>

            {/* ====== Main Features Grid ====== */}
            <section className="home-features">
                <h2 className="home-section-title">{t('home.mainFeatures')}</h2>
                <div className="home-features-grid">
                    {features.map((feature) => (
                        <Link to={feature.to} className="home-feature-card" key={feature.to}>
                            <div className="home-feature-icon">
                                <feature.icon size={30} />
                            </div>
                            <h3 className="home-feature-title">{feature.title}</h3>
                            <p className="home-feature-desc">{feature.desc}</p>
                            <span className="home-feature-link">
                                {t('home.accessNow')} <ArrowRight size={16} />
                            </span>
                        </Link>
                    ))}
                </div>
            </section>
        </div>
    );
};

export default Home;
