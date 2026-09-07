import React from 'react';
import { ShieldCheck, Cpu } from 'lucide-react';
import '../../Styles/Footer.css';

const Footer = () => {
    return (
        <footer className="main-footer">
            <div className="footer-container">
                <div className="footer-left">
                    <div className="footer-brand">
                        <Cpu size={18} className="footer-icon" />
                        <span>FACA Library & Inventory Management System</span>
                    </div>
                    <p className="footer-dept">Quản lý FACA & Kho Vật tư</p>
                </div>

                <div className="footer-right">
                    <div className="security-tag">
                        <ShieldCheck size={16} color="#28a745" />
                        <span>Hệ thống Bảo mật Nội bộ LG Innotek</span>
                    </div>
                    <p className="copyright">© 2026 LG Innotek Vietnam Hải Phòng. All Rights Reserved.</p>
                </div>
            </div>
        </footer>
    );
};

export default Footer;