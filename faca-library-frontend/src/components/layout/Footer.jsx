import { ShieldCheck, Cpu } from 'lucide-react';
import { useSmartTranslate } from '../../hooks/useSmartTranslate';
import '../../Styles/Footer.css';

const Footer = () => {
    const { smartT } = useSmartTranslate();

    return (
        <footer className="main-footer">
            <div className="footer-container">
                <div className="footer-left">
                    <div className="footer-brand">
                        <Cpu size={18} className="footer-icon" />
                        <span>FACA Library & Inventory Management System</span>
                    </div>
                    {/* Chuỗi chưa có key trong i18n -> tự động dịch sang en/ko */}
                    <p className="footer-dept">{smartT('Quản lý FACA & Kho Vật tư')}</p>
                </div>

                <div className="footer-right">
                    <div className="security-tag">
                        <ShieldCheck size={16} color="#28a745" />
                        {/* Có key thủ công: auth.internalSecurity -> ưu tiên dùng bản dịch tay */}
                        <span>{smartT('Hệ thống Bảo mật Nội bộ LG Innotek', 'auth.internalSecurity')}</span>
                    </div>
                    <p className="copyright">{smartT('© 2026 LG Innotek Vietnam Hải Phòng. All Rights Reserved.')}</p>
                </div>
            </div>
        </footer>
    );
};

export default Footer;