// ================================================================
//  mailer.js — Cấu hình Nodemailer (Gmail SMTP) + các hàm gửi email
//    - sendOtpEmail(to, otp)                  : gửi mã OTP khôi phục mật khẩu (hiệu lực 5 phút)
//    - sendResetPasswordEmail(to, name, link) : gửi link đặt lại mật khẩu (hiệu lực 15 phút)
//    - sendEmail({ to, subject, html })       : hàm gửi chung
//
//  Cấu hình đọc từ .env: SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS / SMTP_FROM
//  Nếu .env chưa điền (hoặc còn giá trị mẫu) thì dùng giá trị mặc định bên dưới.
// ================================================================
const nodemailer = require('nodemailer');

// Giá trị mặc định dùng khi .env chưa cấu hình
const DEFAULT_SMTP = {
    host: 'smtp.gmail.com',
    port: 465,
    user: 'nguyenhuudatbg18@gmail.com',
    pass: 'dphl ssbr doeh gatk'
};

// Bỏ qua giá trị mẫu trong .env (vd: your_email@gmail.com / your_app_password)
const isPlaceholder = (value) => !value || /your_|placeholder|example\.com/i.test(value);

const SMTP_USER = isPlaceholder(process.env.SMTP_USER) ? DEFAULT_SMTP.user : process.env.SMTP_USER;
const SMTP_PASS = isPlaceholder(process.env.SMTP_PASS) ? DEFAULT_SMTP.pass : process.env.SMTP_PASS;
const SMTP_PORT = parseInt(process.env.SMTP_PORT, 10) || DEFAULT_SMTP.port;
const SMTP_FROM = process.env.SMTP_FROM || `"FACA Library Support" <${SMTP_USER}>`;

// Cấu hình transporter dùng Gmail SMTP
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || DEFAULT_SMTP.host,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465, // 465 = SSL, 587 = STARTTLS
    auth: {
        user: SMTP_USER,
        pass: SMTP_PASS
    }
});

// Hàm gửi email chung
const sendEmail = async ({ to, subject, html }) => {
    const info = await transporter.sendMail({ from: SMTP_FROM, to, subject, html });
    console.log('📧 Đã gửi email tới:', to, '| MessageId:', info.messageId);
    return info;
};

// Hàm gửi OTP khôi phục mật khẩu (email dạng mã 6 số, hiệu lực 5 phút)
const sendOtpEmail = async (toEmail, otpCode) => {
    const mailOptions = {
        from: SMTP_FROM,
        to: toEmail,
        subject: 'Mã xác thực khôi phục mật khẩu (OTP)',
        html: `
            <div style="font-family: Arial, sans-serif; padding: 20px;">
                <h2>Yêu cầu đặt lại mật khẩu</h2>
                <p>Mã OTP của bạn là:</p>
                <h1 style="color: #4CAF50; letter-spacing: 5px;">${otpCode}</h1>
                <p>Mã này có hiệu lực trong vòng 5 phút. Vui lòng không chia sẻ mã này cho bất kỳ ai.</p>
            </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log('📧 Đã gửi OTP tới:', toEmail);
        return { success: true, message: 'Gửi OTP thành công!' };
    } catch (error) {
        console.error('Lỗi gửi email:', error);
        return { success: false, message: error.message };
    }
};

// Hàm gửi email chứa link đặt lại mật khẩu (hiệu lực 15 phút)
const sendResetPasswordEmail = async (to, fullName, resetLink) => {
    const html = `
    <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
        <div style="background: #1a73e8; color: #fff; padding: 20px 28px;">
            <h2 style="margin: 0; font-size: 20px;">FACA Library — Đặt lại mật khẩu</h2>
        </div>
        <div style="padding: 28px;">
            <p>Xin chào <strong>${fullName || 'bạn'}</strong>,</p>
            <p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn. Nhấn vào nút bên dưới để tạo mật khẩu mới:</p>
            <p style="text-align: center; margin: 28px 0;">
                <a href="${resetLink}" style="background: #1a73e8; color: #fff; padding: 12px 28px; border-radius: 6px; text-decoration: none; font-weight: bold;">
                    Đặt lại mật khẩu
                </a>
            </p>
            <p style="font-size: 13px; color: #555;">Hoặc dán liên kết sau vào trình duyệt:<br>
                <a href="${resetLink}" style="color: #1a73e8; word-break: break-all;">${resetLink}</a>
            </p>
            <p style="font-size: 13px; color: #555;">Liên kết này chỉ có hiệu lực trong <strong>15 phút</strong>.</p>
            <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 24px 0;">
            <p style="font-size: 12px; color: #999;">Nếu bạn không yêu cầu đặt lại mật khẩu, bạn có thể bỏ qua email này — mật khẩu hiện tại vẫn không thay đổi.</p>
        </div>
    </div>`;

    return sendEmail({ to, subject: 'FACA Library — Yêu cầu đặt lại mật khẩu', html });
};

// Tương thích code cũ: `require('./mailer')` vẫn gọi được như một hàm (gửi OTP)
module.exports = sendOtpEmail;
module.exports.transporter = transporter;
module.exports.sendEmail = sendEmail;
module.exports.sendOtpEmail = sendOtpEmail;
module.exports.sendResetPasswordEmail = sendResetPasswordEmail;
