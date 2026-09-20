import { ShieldCheck, Cpu, Code } from 'lucide-react';
import { useSmartTranslate } from '../../hooks/useSmartTranslate';
import '../../styles/Footer.css';

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
                    <div className="footer-subtext">
                        <span className="footer-dept">{smartT('Quản lý FACA & Kho Vật tư')}</span>
                        <span className="separator">•</span>
                        <span className="footer-author">
                            <Code size={12} className="author-code-icon" />
                            Crafted by <strong className="author-name">Dawn</strong>
                        </span>
                    </div>
                </div>

                <div className="footer-right">
                    <div className="security-tag">
                        <ShieldCheck size={16} color="#28a745" />
                        <span>{smartT('Hệ thống Bảo mật Nội bộ LG Innotek', 'auth.internalSecurity')}</span>
                    </div>
                    <p className="copyright">{smartT('© 2026 LG Innotek Vietnam Hải Phòng. All Rights Reserved.')}</p>
                </div>
            </div>
        </footer>
    );
};

export default Footer;