/**
 * mailer.js — Cấu hình SMTP + chiến lược gửi email chống lỗi mạng nội bộ doanh nghiệp.
 *
 *   1. Chuỗi provider dự phòng (fallback chain):
 *        SMTP 587 STARTTLS → SMTP 465 implicit SSL → SMTP 2525 → REST API (HTTPS 443)
 *      (Cổng 443 rất hiếm khi bị firewall chặn — xem RESEND_API_KEY / SENDGRID_API_KEY trong .env)
 *   2. Timeout tường minh cho từng bước → không bao giờ treo API response.
 *   3. Log chi tiết: mã response SMTP, TLS handshake, stack lỗi, kết quả verify().
 *   4. Chế độ gửi:
 *        - "queue" (mặc định): đẩy vào hàng đợi nội bộ (mailQueue) + retry backoff,
 *          HTTP trả response ngay, không bị block.
 *        - "sync": gửi đồng bộ toàn bộ chain, trả { success:false } nếu TẤT CẢ provider hỏng.
 *
 * Chạy `npm run test:smtp` để chẩn đoán kết nối SMTP/DNS/REST đầy đủ.
 */

const nodemailer = require('nodemailer');
// Nạp .env ngay tại đây để mailer dùng được ở mọi entry point
// (server.js cũng đã gọi config() trước — dotenv không ghi đè biến đã có nên vô hại)
require('dotenv').config({ quiet: true });
const mailQueue = require('../services/mailQueue');

// ==========================================================================
// 1) ĐỌC CẤU HÌNG TỪ .ENV (hỗ trợ cả tên biến cũ EMAIL_USER / EMAIL_PASS)
// ==========================================================================

// Giá trị mặc định dùng khi .env chưa cấu hình
const DEFAULT_SMTP = {
    host: 'smtp.gmail.com',
    port: 587, // 587 = STARTTLS (cổng đã xác nhận mở trong mạng công ty)
    user: 'nguyenhuudatbg18@gmail.com',
    pass: 'dphl ssbr doeh gatk'
};

// Bỏ qua giá trị mẫu trong .env (vd: your_email@gmail.com / your_app_password)
const isPlaceholder = (value) => !value || /your_|placeholder|example\.com/i.test(value);

// Lấy giá trị thật đầu tiên trong danh sách biến env
const firstReal = (...values) => {
    for (const v of values) {
        if (!isPlaceholder(v)) return v;
    }
    return undefined;
};

const toBool = (value, def) => {
    if (value === undefined || value === null || value === '') return def;
    return /^(1|true|yes|on)$/i.test(String(value).trim());
};

const toInt = (value, def) => {
    const n = parseInt(value, 10);
    return Number.isFinite(n) && n > 0 ? n : def;
};

const SMTP_HOST = firstReal(process.env.SMTP_HOST) || DEFAULT_SMTP.host;
const SMTP_USER = firstReal(process.env.SMTP_USER, process.env.EMAIL_USER) || DEFAULT_SMTP.user;
const SMTP_PASS = firstReal(process.env.SMTP_PASS, process.env.EMAIL_PASS) || DEFAULT_SMTP.pass;
const SMTP_PORT = toInt(process.env.SMTP_PORT, DEFAULT_SMTP.port);
// secure: 465 = Implicit SSL; 587/2525 = STARTTLS (secure=false)
const SMTP_SECURE = process.env.SMTP_SECURE
    ? toBool(process.env.SMTP_SECURE, SMTP_PORT === 465)
    : SMTP_PORT === 465;
const SMTP_FROM = firstReal(process.env.SMTP_FROM)
    || `"FACA Library Support" <${SMTP_USER}>`;

// Timeout (ms) — chống treo API khi firewall "nuốt" gói tin im lặng
const SMTP_TIMEOUTS = {
    connectionTimeout: toInt(process.env.SMTP_CONNECTION_TIMEOUT, 10000),
    greetingTimeout: toInt(process.env.SMTP_GREETING_TIMEOUT, 10000),
    socketTimeout: toInt(process.env.SMTP_SOCKET_TIMEOUT, 15000),
    bannerTimeout: toInt(process.env.SMTP_BANNER_TIMEOUT, 10000)
};

// TLS — nếu đi qua proxy nội bộ tự ký cert thì đặt SMTP_TLS_REJECT_UNAUTHORIZED=false
const SMTP_TLS = {
    rejectUnauthorized: toBool(process.env.SMTP_TLS_REJECT_UNAUTHORIZED, true)
};
// Tuỳ chọn nâng cao (chỉ set khi chắc chắn): SMTP_TLS_MIN_VERSION, SMTP_TLS_CIPHERS.
// Lưu ý: KHÔNG dùng ciphers:'SSLv3' — Node/OpenSSL hiện đại đã tắt SSLv3, set vào
// là handshake hỏng ngay. Server cũ cần hạ bảo mật thì dùng SMTP_TLS_CIPHERS=DEFAULT@SECLEVEL=1.
if (process.env.SMTP_TLS_MIN_VERSION) SMTP_TLS.minVersion = process.env.SMTP_TLS_MIN_VERSION;
if (process.env.SMTP_TLS_CIPHERS) SMTP_TLS.ciphers = process.env.SMTP_TLS_CIPHERS;

const SMTP_DEBUG = toBool(process.env.SMTP_DEBUG, false);
const REST_TIMEOUT_MS = toInt(process.env.REST_TIMEOUT_MS, 15000);

// Cổng dự phòng khi cổng chính bị throttling / drop (vd: 465,2525)
const FALLBACK_PORTS = (process.env.SMTP_FALLBACK_PORTS ?? '465,2525')
    .split(',')
    .map((p) => parseInt(p.trim(), 10))
    .filter((p) => Number.isInteger(p) && p > 0 && p < 65536 && p !== SMTP_PORT);

// "queue" (mặc định) = gửi bất đồng bộ + retry | "sync" = gửi đồng bộ
const getDeliveryMode = () => {
    const mode = String(process.env.MAIL_DELIVERY_MODE || 'queue').trim().toLowerCase();
    return mode === 'sync' ? 'sync' : 'queue';
};
// ==========================================================================
// 2) XÂY DỰY CHUỖI PROVIDER (SMTP nhiều cổng + REST API dự phòng)
// ==========================================================================

const createSmtpTransport = (port, secure) => nodemailer.createTransport({
    host: SMTP_HOST,
    port,
    secure, // false = STARTTLS (bắt buộc với cổng 587), true = implicit SSL (465)
    auth: {
        user: SMTP_USER,
        pass: SMTP_PASS
    },
    tls: SMTP_TLS,
    ...SMTP_TIMEOUTS,
    // Log hội thoại SMTP thô khi cần chẩn đoán sâu (SMTP_DEBUG=true)
    ...(SMTP_DEBUG ? { logger: true, debug: true } : {})
});

const smtpProviders = [
    {
        type: 'smtp',
        name: `SMTP ${SMTP_HOST}:${SMTP_PORT} (${SMTP_SECURE ? 'implicit-SSL' : 'STARTTLS'})`,
        port: SMTP_PORT,
        secure: SMTP_SECURE,
        transport: createSmtpTransport(SMTP_PORT, SMTP_SECURE)
    },
    ...FALLBACK_PORTS.map((port) => ({
        type: 'smtp',
        name: `SMTP ${SMTP_HOST}:${port} (dự phòng ${port === 465 ? 'implicit-SSL' : 'STARTTLS'})`,
        port,
        secure: port === 465,
        transport: createSmtpTransport(port, port === 465)
    }))
];

// --- REST API dự phòng (đi qua HTTPS 443 — hiếm khi bị firewall doanh nghiệp chặn) ---
const extractAddress = (addr) => {
    const m = /<([^>]+)>/.exec(String(addr || ''));
    return (m ? m[1] : String(addr || '')).trim();
};

const domainOf = (addr) => {
    const a = extractAddress(addr);
    const i = a.lastIndexOf('@');
    return i > -1 ? a.slice(i + 1).toLowerCase() : '';
};

const toRecipients = (to) => (Array.isArray(to) ? to : [to]).map(String);

async function sendViaResend(mailOptions) {
    const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            from: mailOptions.from,
            to: toRecipients(mailOptions.to),
            subject: mailOptions.subject,
            html: mailOptions.html
        }),
        signal: AbortSignal.timeout(REST_TIMEOUT_MS)
    });
    const text = await res.text();
    if (!res.ok) {
        const err = new Error(`Resend API HTTP ${res.status}: ${text.slice(0, 300)}`);
        err.responseCode = res.status;
        throw err;
    }
    let messageId = null;
    try { messageId = JSON.parse(text).id; } catch { /* bỏ qua */ }
    return { messageId, response: `HTTP ${res.status}` };
}

async function sendViaSendGrid(mailOptions) {
    const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            personalizations: [{ to: toRecipients(mailOptions.to).map((email) => ({ email })) }],
            from: { email: extractAddress(mailOptions.from) },
            subject: mailOptions.subject,
            content: [{ type: 'text/html', value: mailOptions.html }]
        }),
        signal: AbortSignal.timeout(REST_TIMEOUT_MS)
    });
    if (!res.ok && res.status !== 202) {
        const text = await res.text().catch(() => '');
        const err = new Error(`SendGrid API HTTP ${res.status}: ${text.slice(0, 300)}`);
        err.responseCode = res.status;
        throw err;
    }
    return { messageId: res.headers.get('x-message-id'), response: `HTTP ${res.status}` };
}

const restProviders = [];
if (!isPlaceholder(process.env.RESEND_API_KEY)) {
    restProviders.push({
        type: 'rest',
        name: 'Resend REST API (HTTPS 443)',
        send: sendViaResend
    });
}
if (!isPlaceholder(process.env.SENDGRID_API_KEY)) {
    restProviders.push({
        type: 'rest',
        name: 'SendGrid REST API (HTTPS 443)',
        send: sendViaSendGrid
    });
}

/** Thứ tự thử: SMTP cổng chính → cổng dự phòng → REST API (HTTPS 443). */
const PROVIDERS = [
    ...smtpProviders.map((p) => ({
        ...p,
        send: (mailOptions) => p.transport.sendMail(mailOptions)
    })),
    ...restProviders
];
// ==========================================================================
// 3) LOG CHI TIẾT KHI GỬI THẤT BẠI (mã response, stack, trạng thái kết nối)
// ==========================================================================

/** Trích xuất thông tin lỗi dạng JSON an toàn cho log (không lộ nội dung thư/OTP). */
function describeError(err) {
    if (!err) return {};
    return {
        message: err.message || String(err),
        code: err.code || null,                 // ETIMEDOUT, ECONNREFUSED, ECONNECTION...
        responseCode: err.responseCode ?? null, // 454, 535, 550... (SMTP/HTTP)
        response: err.response ? String(err.response).slice(0, 300) : null,
        command: err.command || null,           // lệnh SMTP đang dở khi lỗi
        errno: err.errno ?? null,
        address: err.address || null,
        port: err.port ?? null,
        phase: err.phase || null                 // connect / tls / auth...
    };
}

function logSendError(providerName, err, attemptNo) {
    console.error(`[MAIL] ✉️  Gửi THẤT BẠI qua ${providerName} (lần thử ${attemptNo}):`);
    console.error('[MAIL]   → chi tiết:', JSON.stringify(describeError(err), null, 2));
    if (err && err.stack) {
        console.error('[MAIL]   → stack:\n' + err.stack);
    }
}

// ==========================================================================
// 4) KIỂM TRA KẾT NỐI (transporter.verify) + KHỚP DOMAIN FROM/AUTH
// ==========================================================================

/** verify() từng SMTP transport — log mã response / TLS handshake chi tiết. */
async function verifyAllTransports() {
    const results = [];

    for (const p of smtpProviders) {
        const started = Date.now();
        try {
            await p.transport.verify();
            results.push({ provider: p.name, ok: true, ms: Date.now() - started });
            console.log(`[MAIL] ✅ verify() OK — ${p.name} (${Date.now() - started}ms)`);
        } catch (err) {
            results.push({ provider: p.name, ok: false, ms: Date.now() - started, ...describeError(err) });
            logSendError(`verify() ${p.name}`, err, '-');
        }
    }

    for (const p of restProviders) {
        const started = Date.now();
        try {
            // Chỉ cần HTTP phản hồi (kể cả 404/401) là đường HTTPS 443 thông suốt
            const baseUrl = p.type === 'rest' && p.name.includes('Resend')
                ? 'https://api.resend.com/'
                : 'https://api.sendgrid.com/';
            const res = await fetch(baseUrl, { signal: AbortSignal.timeout(REST_TIMEOUT_MS) });
            results.push({ provider: p.name, ok: true, http: res.status, ms: Date.now() - started });
            console.log(`[MAIL] ✅ REST kết nối OK — ${p.name} (HTTP ${res.status}, ${Date.now() - started}ms)`);
        } catch (err) {
            results.push({ provider: p.name, ok: false, ms: Date.now() - started, ...describeError(err) });
            logSendError(`connect ${p.name}`, err, '-');
        }
    }

    return results;
}

/** Gọi verify() khi server khởi động — KHÔNG chặn khởi động, chỉ log. */
function verifyOnStartup() {
    if (!toBool(process.env.MAIL_VERIFY_ON_STARTUP, true)) {
        console.log('[MAIL] Bỏ qua kiểm tra SMTP khi khởi động (MAIL_VERIFY_ON_STARTUP=false).');
        return;
    }
    checkFromAlignment();
    console.log(`[MAIL] Kiểm tra kết nối SMTP khi khởi động (cổng ${SMTP_PORT}, chế độ gửi: ${getDeliveryMode()})...`);

    const timer = setTimeout(() => {
        console.warn('[MAIL] ⏳ verify() quá 20s — firewall nội bộ có thể đang chặn/throttling SMTP. ' +
            'Chạy: npm run test:smtp');
    }, 20000);
    if (timer.unref) timer.unref();

    verifyAllTransports()
        .then((results) => {
            const ok = results.filter((r) => r.ok).length;
            console.log(`[MAIL] Kết quả verify: ${ok}/${results.length} provider kết nối OK.`);
            if (ok === 0) {
                console.warn('[MAIL] ⚠️ KHÔNG có provider nào kết nối được — email OTP sẽ gửi thất bại. ' +
                    'Chạy npm run test:smtp để chẩn đoán (SMTP / DNS SPF-DKIM-DMARC / REST).');
            }
        })
        .catch((err) => console.error('[MAIL] Lỗi khi verify:', describeError(err)))
        .finally(() => clearTimeout(timer));
}

/**
 * Kiểm tra From domain khớp domain của SMTP user (Domain Verification).
 * Cục lọc spam doanh nghiệp drop ngay khi From ≠ domain đã xác thực (SPF/DKIM).
 */
function checkFromAlignment() {
    const fromDomain = domainOf(SMTP_FROM);
    const userDomain = domainOf(SMTP_USER);

    if (fromDomain && userDomain && fromDomain !== userDomain) {
        console.warn(
            `[MAIL] ⚠️ FROM domain "${fromDomain}" KHÁC domain SMTP auth "${userDomain}". ` +
            'Cục lọc spam doanh nghiệp có thể drop email (cần SPF/DKIM cho domain ' +
            `"${fromDomain}" hoặc đặt SMTP_FROM cùng domain với SMTP_USER).`
        );
        return false;
    }
    if (fromDomain) {
        console.log(`[MAIL] From-domain alignment OK (domain: ${fromDomain}) — vẫn cần SPF/DKIM/DMARC cho domain này.`);
    }
    return true;
}
// ==========================================================================
// 5) GỬI MAIL VỚI FALLBACK CHAIN
// ==========================================================================

/**
 * Thử lần lượt TẤT cả provider cho tới khi có 1 provider thành công.
 * @returns {{success:true, provider:string, ms:number, messageId?:string, attempts:[]}
 *          |{success:false, message:string, attempts:[]}}
 */
async function sendEmailWithFallback({ to, subject, html, text }) {
    const attempts = [];

    for (const provider of PROVIDERS) {
        const started = Date.now();
        try {
            const info = await provider.send({ from: SMTP_FROM, to, subject, html, text });
            const ms = Date.now() - started;
            const responseLine = info && info.response
                ? ' | response: ' + String(info.response).replace(/\r?\n/g, ' ').slice(0, 200)
                : '';
            console.log(
                `[MAIL] ✅ Gửi THÀNH CÔNG qua ${provider.name} → ${to} | ${ms}ms | ` +
                `messageId: ${(info && info.messageId) || '-'}${responseLine}`
            );
            return {
                success: true,
                provider: provider.name,
                ms,
                messageId: info && info.messageId,
                attempts
            };
        } catch (err) {
            const ms = Date.now() - started;
            attempts.push({ provider: provider.name, ms, ...describeError(err) });
            logSendError(provider.name, err, attempts.length);
        }
    }

    console.error(`[MAIL] ❌ TẤT CẢ ${attempts.length} provider đều thất bại → ${to}. Tóm tắt:`);
    console.error(JSON.stringify(attempts, null, 2));
    return {
        success: false,
        message: attempts.map((a) => `${a.provider}: ${a.message}`).join(' | '),
        attempts
    };
}

/**
 * Phân phối 1 thư theo chế độ gửi hiện tại:
 *   - sync : gửi ngay, trả kết quả thật (success:false nếu tất cả provider hỏng)
 *   - queue: đẩy vào hàng đợi nội bộ (retry backoff), trả { queued:true } ngay lập tức
 */
async function dispatch(mailOptions, jobName) {
    if (getDeliveryMode() === 'sync') {
        return await sendEmailWithFallback(mailOptions);
    }

    const jobId = mailQueue.enqueue(jobName, async () => {
        const result = await sendEmailWithFallback(mailOptions);
        if (!result.success) {
            const err = new Error(result.message || 'Tất cả provider gửi mail đều thất bại');
            err.attempts = result.attempts;
            throw err; // để hàng đợi ghi nhận và retry
        }
        return result;
    }, { to: mailOptions.to, subject: mailOptions.subject });

    return { success: true, queued: true, jobId };
}
// ==========================================================================
// 6) API CÔNG KHAI (giữ nguyên tên cũ — không phá code đang gọi)
// ==========================================================================

// Hàm gửi email chung
const sendEmail = async ({ to, subject, html, text }) => {
    return dispatch({ to, subject, html, text }, 'email');
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
        // KHÔNG BAO GIỜ log mailOptions (chứa OTP) — chỉ log kết quả
        const result = await dispatch(mailOptions, 'otp-email');

        if (result.queued) {
            console.log(`📧 [QUEUE] Đã xếp hàng gửi OTP tới ${toEmail} (job #${result.jobId})`);
            return {
                success: true,
                queued: true,
                jobId: result.jobId,
                message: 'Đã đưa OTP vào hàng đợi gửi.'
            };
        }
        if (!result.success) {
            return {
                success: false,
                message: result.message,
                attempts: result.attempts
            };
        }
        console.log(`📧 Đã gửi OTP tới ${toEmail} | provider: ${result.provider} | ${result.ms}ms`);
        return { success: true, provider: result.provider, message: 'Gửi OTP thành công!' };
    } catch (error) {
        console.error('Lỗi gửi email (sendOtpEmail):', describeError(error));
        if (error && error.stack) console.error(error.stack);
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
module.exports.transporter = smtpProviders[0].transport; // transport chính (cổng SMTP_PORT)
module.exports.sendEmail = sendEmail;
module.exports.sendOtpEmail = sendOtpEmail;
module.exports.sendResetPasswordEmail = sendResetPasswordEmail;

// API mới cho chẩn đoán / script test
module.exports.sendEmailWithFallback = sendEmailWithFallback;
module.exports.verifyAllTransports = verifyAllTransports;
module.exports.verifyOnStartup = verifyOnStartup;
module.exports.checkFromAlignment = checkFromAlignment;
module.exports.getQueueStats = () => mailQueue.getStats();
module.exports.describeError = describeError;
module.exports.config = {
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_SECURE,
    user: SMTP_USER,
    pass: SMTP_PASS,
    from: SMTP_FROM,
    fallbackPorts: FALLBACK_PORTS,
    tls: SMTP_TLS,
    timeouts: SMTP_TIMEOUTS,
    mode: getDeliveryMode(),
    debug: SMTP_DEBUG,
    restTimeoutMs: REST_TIMEOUT_MS,
    dkimSelector: process.env.DKIM_SELECTOR || '',
    providers: PROVIDERS.map((p) => ({ name: p.name, type: p.type })),
    hasResendKey: !isPlaceholder(process.env.RESEND_API_KEY),
    hasSendGridKey: !isPlaceholder(process.env.SENDGRID_API_KEY)
};





