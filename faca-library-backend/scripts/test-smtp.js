#!/usr/bin/env node
/**
 * test-smtp.js — Script chẩn đoán gửi email trên MÁY CHỦ nội bộ doanh nghiệp.
 *
 * Chạy trực tiếp trên môi trường corporate (firewall/proxy):
 *   npm run test:smtp                          → chẩn đoán đầy đủ
 *   npm run test:smtp -- --send you@corp.com   → gửi 1 email test thật (fallback chain)
 *   npm run test:smtp -- --port 465            → chỉ probe các cổng được chỉ định
 *   npm run test:smtp -- --host smtp.x.com --user a@b.com --pass secret
 *
 * Kiểm tra từng bước, log mã response SMTP + thời gian từng bước:
 *   [1] Cấu hình hiện tại (đã mask mật khẩu)
 *   [2] DNS: phân giải SMTP host, MX, SPF / DMARC / DKIM (Domain Verification)
 *   [3] Raw SMTP: TCP connect → banner → EHLO (STARTTLS/AUTH) → TLS handshake
 *        (cert subject/issuer/hạn) → AUTH (mã 235/535) — MỖI BƯỚC CÓ TIMEOUT
 *   [4] nodemailer verify() cho từng transport
 *   [5] REST API qua HTTPS 443 (Resend/SendGrid) — dự phòng khi SMTP bị chặn
 *   [6] (tuỳ chọn) Gửi email test thật qua chuỗi fallback
 *
 * Exit code: 0 = ít nhất 1 đường gửi OK, 1 = tất cả hỏng (dùng cho CI/monitor).
 */

const path = require('path');
const dns = require('dns').promises;
const net = require('net');
const tls = require('tls');

require('dotenv').config({ path: path.join(__dirname, '..', '.env'), quiet: true });
const mailer = require(path.join(__dirname, '..', 'src', 'controllers', 'mailer.js'));

const CFG = mailer.config;

// ---------------------------------------------------------------------------
// Tham số dòng lệnh
// ---------------------------------------------------------------------------
const argv = process.argv.slice(2);
const getFlag = (name) => {
    const i = argv.indexOf(name);
    return i !== -1 && argv[i + 1] ? argv[i + 1] : null;
};
const OPTS = {
    host: getFlag('--host') || CFG.host,
    user: getFlag('--user') || CFG.user,
    pass: getFlag('--pass') || CFG.pass,
    sendTo: getFlag('--send'),
    ports: getFlag('--port')
        ? [parseInt(getFlag('--port'), 10)].filter(Number.isInteger)
        : [CFG.port, ...CFG.fallbackPorts]
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const mask = (s) => {
    if (!s) return '(chưa cấu hình)';
    if (s.length <= 4) return '****';
    return s.slice(0, 3) + '***' + s.slice(-2);
};

const fmtMs = (ms) => `${ms}ms`;

const banner = (title) => {
    console.log('');
    console.log('='.repeat(72));
    console.log(` ${title}`);
    console.log('='.repeat(72));
};

const ok = (msg) => console.log(`  ✅ ${msg}`);
const warn = (msg) => console.log(`  ⚠️  ${msg}`);
const fail = (msg) => console.log(`  ❌ ${msg}`);
const info = (msg) => console.log(`  ℹ️  ${msg}`);

const withTimeout = (promise, ms, label) => Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => {
        const e = new Error(`${label} quá ${ms}ms (TIMEOUT — firewall có thể đang drop gói tin)`);
        e.code = 'ETIMEDOUT';
        reject(e);
    }, ms))
]);

// Tóm tắt lỗi chẩn đoán dạng 1 dòng
const brief = (err) => {
    if (!err) return '?';
    const parts = [err.message || String(err)];
    if (err.code) parts.push(`code=${err.code}`);
    if (err.responseCode !== undefined && err.responseCode !== null) parts.push(`responseCode=${err.responseCode}`);
    if (err.response) parts.push(`response=${String(err.response).replace(/\r?\n/g, ' ').slice(0, 160)}`);
    return parts.join(' | ');
};

// Kết quả tổng hợp
const summary = { dnsOk: false, smtpOk: false, restOk: false, verifyOk: false, sentOk: false };

// ---------------------------------------------------------------------------
// [1] CẤU HÌNH HIỆN TẠI
// ---------------------------------------------------------------------------
function printConfig() {
    banner('[1] CẤU HÌNH SMTP HIỆN TẠI');
    info(`Host chính      : ${OPTS.host}:${CFG.port} (${CFG.secure ? 'implicit-SSL' : 'STARTTLS'})`);
    info(`Cổng dự phòng   : ${CFG.fallbackPorts.join(', ') || '(không)'}`);
    info(`SMTP user       : ${OPTS.user}`);
    info(`SMTP pass       : ${mask(OPTS.pass)}`);
    info(`From            : ${CFG.from}`);
    info(`Chế độ gửi      : ${CFG.mode} | timeout: ${JSON.stringify(CFG.timeouts)}`);
    info(`TLS             : rejectUnauthorized=${CFG.tls.rejectUnauthorized}` +
        `${CFG.tls.minVersion ? ', minVersion=' + CFG.tls.minVersion : ''}` +
        `${CFG.tls.ciphers ? ', ciphers=' + CFG.tls.ciphers : ''}`);
    info(`Provider chain  : ${CFG.providers.map((p) => p.name).join('  →  ')}`);
    info(`REST key        : Resend=${CFG.hasResendKey ? 'CÓ' : 'không'}, SendGrid=${CFG.hasSendGridKey ? 'CÓ' : 'không'}`);
    if (String(process.env.SMTP_PASS || '').includes(' ')) {
        warn('SMTP_PASS chứa khoảng trắng (kiểu app-password Gmail dạng "abcd efgh ijkl mnop") — ' +
            'phải giữ nguyên khoảng trắng trong .env, không cắt bớt.');
    }
    mailer.checkFromAlignment();
}

// ---------------------------------------------------------------------------
// [2] DNS: phân giải host + SPF / DMARC / DKIM (Domain Verification)
// ---------------------------------------------------------------------------
const domainOf = (addr) => {
    const m = /<([^>]+)>/.exec(String(addr || ''));
    const a = (m ? m[1] : String(addr || '')).trim();
    const i = a.lastIndexOf('@');
    return i > -1 ? a.slice(i + 1).toLowerCase() : '';
};

async function checkDns() {
    banner('[2] DNS + SPF / DKIM / DMARC (Domain Verification / Deliverability)');
    const host = OPTS.host;

    // 2a. Phân giải địa chỉ SMTP host
    try {
        const started = Date.now();
        const addrs = await withTimeout(dns.resolve4(host), 8000, `resolve4(${host})`);
        ok(`${host} → ${addrs.join(', ')} (${fmtMs(Date.now() - started)})`);
        summary.dnsOk = true;
    } catch (err) {
        fail(`Không phân giải được ${host}: ${brief(err)}`);
        try {
            const v6 = await dns.resolve6(host);
            info(`${host} (AAAA) → ${v6.join(', ')}`);
            summary.dnsOk = true;
        } catch { /* không có AAAA */ }
    }

    // 2b. MX của domain gửi (nice-to-have)
    const fromDomain = domainOf(CFG.from);
    if (fromDomain) {
        try {
            const mx = await dns.resolveMx(fromDomain);
            info(`MX ${fromDomain}: ${mx.map((r) => `${r.exchange}(prio ${r.priority})`).join(', ') || '(không có)'}`);
        } catch (err) {
            warn(`Không tra được MX ${fromDomain}: ${err.code || err.message}`);
        }
    }

    // 2c. SPF — record TXT bắt đầu bằng "v=spf1"
    const checkTxt = async (label, domain, matcher, mustHave) => {
        try {
            const records = await dns.resolveTxt(domain);
            const flat = records.map((chunks) => chunks.join(''));
            const hit = flat.find(matcher);
            if (hit) ok(`${label} (${domain}): ${hit.slice(0, 200)}`);
            else if (mustHave) fail(`${label} (${domain}): KHÔNG tìm thấy. ${mustHave}`);
            else info(`${label} (${domain}): không có (không bắt buộc)`);
            return !!hit;
        } catch (err) {
            if (mustHave) fail(`${label} (${domain}): lỗi tra DNS (${err.code || err.message}). ${mustHave}`);
            else info(`${label} (${domain}): không tra được (${err.code || err.message})`);
            return false;
        }
    };

    const spfHint = '→ Thêm TXT: "v=spf1 include:<thu-muc-cua-nha-cung-cap> ~all" (Gmail: include:_spf.google.com)';
    const dmarcHint = '→ Thêm TXT tại _dmarc.' + fromDomain + ': "v=DMARC1; p=none; rua=mailto:bao-cao@' + fromDomain + '"';

    await checkTxt('SPF', fromDomain, (r) => /^v=spf1/i.test(r), spfHint);
    await checkTxt('DMARC', `_dmarc.${fromDomain}`, (r) => /^v=DMARC1/i.test(r), dmarcHint);

    // 2d. DKIM — cần biết selector (DKIM_SELECTOR trong .env, mặc định "default"/"google"/"selector1")
    const selectors = [...new Set([process.env.DKIM_SELECTOR || 'default', 'google', 'selector1', 's1', 'k1'].filter(Boolean))];
    let dkimFound = false;
    for (const sel of selectors) {
        const dkimDomain = `${sel}._domainkey.${fromDomain}`;
        try {
            const records = await dns.resolveTxt(dkimDomain);
            const flat = records.map((c) => c.join(''));
            const hit = flat.find((r) => /p=/.test(r));
            if (hit) {
                ok(`DKIM (${dkimDomain}): ${hit.slice(0, 120)}...`);
                dkimFound = true;
                break;
            }
        } catch { /* selector khác */ }
    }
    if (!dkimFound) {
        warn(`Chưa thấy record DKIM cho ${fromDomain} (đã thử selector: ${selectors.join(', ')}). ` +
            '→ Cục lọc spam doanh nghiệp có thể quarantine email. ' +
            'Tạo record "selector._domainkey.' + fromDomain + '" (TXT) và đặt DKIM_SELECTOR trong .env.');
    }
}

// ---------------------------------------------------------------------------
// [3] RAW SMTP PROBE — TCP → banner → EHLO → STARTTLS → AUTH (mỗi bước có timeout)
// ---------------------------------------------------------------------------

/** Trích 1 response SMTP hoàn chỉnh khỏi buffer (hỗ trợ multiline "250-... 250 ..."). */
function tryExtractResponse(buffer) {
    const lines = buffer.split('\r\n');
    let text = '';
    for (let i = 0; i < lines.length - 1; i++) {
        const line = lines[i];
        text += (text ? '\n' : '') + line;
        if (/^\d{3} /.test(line)) {
            const consumed = lines.slice(0, i + 1).join('\r\n').length + 2;
            return {
                code: parseInt(line.slice(0, 3), 10),
                text,
                rest: buffer.slice(consumed)
            };
        }
        if (!/^\d{3}-/.test(line)) return null; // dòng không phải SMTP response
    }
    return null; // chưa đủ dòng
}

/**
 * Probe 1 cổng SMTP: đo thời gian từng bước, log banner/EHLO/capabilities,
 * hoàn tất TLS handshake và lấy cert, đăng nhập AUTH — bắt chính xác lỗi
 * (timeout, ECONNREFUSED, mã response 454/535...) thay vì "treo im lặng".
 */
async function rawSmtpProbe(host, port) {
    const timeoutMs = CFG.timeouts.connectionTimeout || 10000;
    const rejectUnauthorized = CFG.tls.rejectUnauthorized;
    const implicitTls = port === 465; // 465 = implicit SSL, còn lại = STARTTLS
    const steps = [];
    const result = { host, port, implicitTls, steps, ok: false, authOk: false, caps: [], error: null };

    let raw = null;      // socket gốc (TCP hoặc TLS nếu implicit)
    let io = null;       // socket đang đọc/ghi hiện tại (đổi sang TLS sau STARTTLS)
    let buf = '';
    const waiters = [];

    const cleanup = () => {
        for (const w of waiters.splice(0)) clearTimeout(w.timer);
        try { if (raw) raw.destroy(); } catch { /* bỏ qua */ }
    };

    const onData = (chunk) => {
        buf += chunk.toString('utf8');
        while (waiters.length) {
            const resp = tryExtractResponse(buf);
            if (!resp) break;
            buf = resp.rest;
            const w = waiters.shift();
            clearTimeout(w.timer);
            w.resolve(resp);
        }
    };
    const onFatal = (err) => {
        for (const w of waiters.splice(0)) {
            clearTimeout(w.timer);
            w.reject(err);
        }
    };
    const attach = (sock) => {
        io = sock;
        sock.on('data', onData);
        sock.on('error', onFatal);
        sock.on('close', () => onFatal(Object.assign(
            new Error('Server đóng kết nối'), { code: 'ECONNRESET' }
        )));
    };
    const detach = (sock) => {
        sock.removeAllListeners('data');
        sock.removeAllListeners('error');
    };
    const read = (label) => new Promise((resolve, reject) => {
        const w = { resolve, reject };
        w.timer = setTimeout(() => {
            const idx = waiters.indexOf(w);
            if (idx !== -1) waiters.splice(idx, 1);
            reject(Object.assign(
                new Error(`Chờ "${label}" quá ${timeoutMs}ms (TIMEOUT — không nhận được phản hồi)`),
                { code: 'ETIMEDOUT' }
            ));
        }, timeoutMs);
        waiters.push(w);
        onData(''); // đề phòng response đã nằm sẵn trong buffer
    });
    const write = (cmd) => new Promise((resolve, reject) => {
        io.write(cmd, (err) => (err ? reject(err) : resolve()));
    });
    const step = async (name, fn) => {
        const s = Date.now();
        try {
            const out = await fn();
            const ms = Date.now() - s;
            steps.push({ name, ok: true, ms });
            ok(`${name}: OK (${fmtMs(ms)})${out ? ` — ${out}` : ''}`);
            return out;
        } catch (err) {
            const ms = Date.now() - s;
            steps.push({ name, ok: false, ms, error: brief(err) });
            fail(`${name}: ${brief(err)} (${fmtMs(ms)})`);
            throw err;
        }
    };

    try {
        // 1) TCP/TLS connect
        await step(`TCP connect ${host}:${port}${implicitTls ? ' (implicit TLS)' : ''}`, () =>
            new Promise((resolve, reject) => {
                const sock = implicitTls
                    ? tls.connect({ host, port, servername: host, rejectUnauthorized })
                    : net.connect({ host, port });
                const timer = setTimeout(() => {
                    sock.destroy();
                    reject(Object.assign(
                        new Error(`Kết nối quá ${timeoutMs}ms (TIMEOUT — firewall drop/throttling?)`),
                        { code: 'ETIMEDOUT' }
                    ));
                }, timeoutMs);
                sock.once(implicitTls ? 'secureConnect' : 'connect', () => {
                    clearTimeout(timer);
                    raw = sock;
                    attach(sock);
                    resolve();
                });
                sock.once('error', (err) => {
                    clearTimeout(timer);
                    reject(err);
                });
            }));

        // 2) Banner 220
        await step('Banner (220)', async () => {
            const r = await read('banner');
            if (r.code !== 220) throw Object.assign(new Error(r.text), { responseCode: r.code });
            return r.text.split('\n')[0];
        });

        // 3) EHLO — xem capabilities (STARTTLS / AUTH / SIZE...)
        await step('EHLO', async () => {
            await write('EHLO faca-library-test\r\n');
            const r = await read('EHLO');
            if (r.code !== 250) throw Object.assign(new Error(r.text), { responseCode: r.code });
            result.caps = r.text.split('\n')
                .map((l) => (l.match(/^\d{3}[- ]?(.*)$/)?.[1] || l).trim())
                .filter((l) => /^(STARTTLS|AUTH|SIZE|PIPELINING|8BITMIME|SMTPUTF8)/i.test(l));
            return result.caps.join(' | ') || '(không khai báo capability)';
        });

        // 4) TLS handshake (bắt cert để chẩn đoán proxy nội bộ tự ký)
        if (implicitTls) {
            await step('TLS handshake (implicit SSL)', () => describeCert(io));
        } else if (result.caps.some((c) => /^STARTTLS/i.test(c))) {
            await step('STARTTLS + TLS handshake', async () => {
                await write('STARTTLS\r\n');
                const r = await read('STARTTLS');
                if (r.code !== 220) throw Object.assign(new Error(r.text), { responseCode: r.code });
                detach(io);
                const ts = await new Promise((resolve, reject) => {
                    const t = tls.connect({ socket: raw, servername: host, rejectUnauthorized });
                    const timer = setTimeout(() => {
                        t.destroy();
                        reject(Object.assign(
                            new Error(`TLS handshake quá ${timeoutMs}ms (TIMEOUT)`),
                            { code: 'ETIMEDOUT' }
                        ));
                    }, timeoutMs);
                    t.once('secureConnect', () => { clearTimeout(timer); resolve(t); });
                    t.once('error', (err) => { clearTimeout(timer); reject(err); });
                });
                attach(ts);
                return describeCert(ts);
            });
        } else {
            warn('Server không khai báo STARTTLS — thư gửi TRƯỚC KHI mã hóa có thể bị lọc bỏ/spam.');
        }

        // 5) AUTH — đo mã response 235 (OK) / 535 (sai pass) / 454 (throttle)
        if (OPTS.user && OPTS.pass) {
            await step('AUTH (đăng nhập SMTP)', async () => {
                const hasPlain = result.caps.some((c) => /\bPLAIN\b/i.test(c));
                const hasLogin = result.caps.some((c) => /\bLOGIN\b/i.test(c));
                let authed = false;

                if (hasPlain || (!hasPlain && !hasLogin)) {
                    const initial = Buffer.from(`\0${OPTS.user}\0${OPTS.pass}`).toString('base64');
                    await write(`AUTH PLAIN ${initial}\r\n`);
                    const r = await read('AUTH PLAIN');
                    if (r.code === 235) return 'AUTH PLAIN → 235 Accepted';
                    if (r.code !== 334 && r.code !== 504 && r.code !== 500 && r.code !== 502) {
                        throw Object.assign(new Error(r.text), { responseCode: r.code }); // 535/530/454...
                    }
                    // 334/504/500/502 → rơi xuống thử AUTH LOGIN
                    authed = r.code === 235;
                }

                if (!authed) {
                    await write('AUTH LOGIN\r\n');
                    const r1 = await read('AUTH LOGIN (step1)');
                    if (r1.code !== 334) throw Object.assign(new Error(r1.text), { responseCode: r1.code });
                    await write(Buffer.from(OPTS.user).toString('base64') + '\r\n');
                    const r2 = await read('AUTH LOGIN (step2)');
                    if (r2.code !== 334) throw Object.assign(new Error(r2.text), { responseCode: r2.code });
                    await write(Buffer.from(OPTS.pass).toString('base64') + '\r\n');
                    const r3 = await read('AUTH LOGIN (step3)');
                    if (r3.code !== 235) throw Object.assign(new Error(r3.text), { responseCode: r3.code });
                    return 'AUTH LOGIN → 235 Accepted';
                }
            });
            result.authOk = steps.some((s) => s.name.startsWith('AUTH') && s.ok);
        } else {
            warn('Chưa có SMTP user/pass — bỏ qua bước AUTH.');
        }

        // 6) QUIT
        try { await write('QUIT\r\n'); } catch { /* bỏ qua */ }

        result.ok = steps.every((s) => s.ok);
    } catch (err) {
        result.error = brief(err);
    } finally {
        cleanup();
    }
    return result;
}

/** Mô tả chứng chỉ / giao thức / cipher TLS của server (chẩn đoán proxy tự ký). */
function describeCert(sock) {
    const cert = typeof sock.getPeerCertificate === 'function' ? sock.getPeerCertificate() : null;
    const parts = [];
    if (typeof sock.getProtocol === 'function' && sock.getProtocol()) parts.push(`protocol=${sock.getProtocol()}`);
    if (typeof sock.getCipher === 'function' && sock.getCipher()) parts.push(`cipher=${sock.getCipher().name}`);
    if (cert && cert.subject) parts.push(`subjectCN="${cert.subject.CN || JSON.stringify(cert.subject)}"`);
    if (cert && cert.issuer) parts.push(`issuer="${cert.issuer.O || cert.issuer.CN || JSON.stringify(cert.issuer)}"`);
    if (cert && cert.valid_to) parts.push(`valid_to=${cert.valid_to}`);
    if (sock.authorized === false) {
        parts.push('AUTHORIZED=FALSE (cert tự ký — đúng trường hợp proxy MITM nội bộ: đặt SMTP_TLS_REJECT_UNAUTHORIZED=false)');
    }
    return parts.join(', ');
}

async function runRawProbes() {
    banner('[3] RAW SMTP PROBE (mỗi bước có timeout — chẩn đoán firewall/proxy)');
    let anyOk = false;
    for (const port of OPTS.ports) {
        info(`— Probe ${OPTS.host}:${port} —`);
        const r = await rawSmtpProbe(OPTS.host, port);
        if (r.ok) anyOk = true;
        if (r.error) fail(`Kết quả cổng ${port}: ${r.error}`);
        else {
            ok(`Kết quả cổng ${port}: ${r.ok ? 'TẤT CẢ bước OK' : 'một số bước thất bại'}` +
                `${r.authOk ? ' (AUTH 235 Accepted)' : ''}`);
        }
    }
    summary.smtpOk = anyOk;

    if (!anyOk) {
        console.log('');
        info('GỢI Ý CHẨN ĐOÁN theo lỗi gặp phải:');
        info(' • TIMEOUT khi connect → firewall drop SYN → xin whitelist SMTP_HOST hoặc dùng cổng 465/2525 / REST 443');
        info(' • Banner/EHLO OK nhưng TLS hỏng → proxy TLS inspection → SMTP_TLS_REJECT_UNAUTHORIZED=false (đã set trong .env)');
        info(' • AUTH 535/534 → sai mật khẩu hoặc Gmail chặn đăng nhập → dùng App Password (16 ký tự, giữ nguyên khoảng trắng)');
        info(' • AUTH 454/451 → server throttle đăng nhập → chờ vài phút, hoặc bật REST fallback (RESEND_API_KEY/SENDGRID_API_KEY)');
        info(' • Kết nối OK nhưng email vẫn vào spam → kiểm tra section [2] SPF/DKIM/DMARC + From khớp domain auth');
    }
}

async function runVerify() {
    banner('[4] NODEMAILER verify() (đúng luồng gửi thật của ứng dụng)');
    try {
        const results = await mailer.verifyAllTransports();
        summary.verifyOk = results.some((r) => r.ok);
        info(`verify(): ${results.filter((r) => r.ok).length}/${results.length} transport OK`);
    } catch (err) {
        fail(`verifyAllTransports ném lỗi: ${brief(err)}`);
    }
}

async function runRestChecks() {
    banner('[5] REST API QUA HTTPS 443 (đường dự phòng khi SMTP bị chặn)');
    const targets = [
        { name: 'Resend', url: 'https://api.resend.com/emails', key: CFG.hasResendKey, envKey: 'RESEND_API_KEY' },
        { name: 'SendGrid', url: 'https://api.sendgrid.com/v3/mail/send', key: CFG.hasSendGridKey, envKey: 'SENDGRID_API_KEY' }
    ];
    for (const t of targets) {
        const s = Date.now();
        try {
            const res = await withTimeout(fetch(t.url, { method: 'GET' }), CFG.restTimeoutMs, `GET ${t.url}`);
            // 401/404/405 đều chứng minh cổng 443 thông suốt (chỉ 5xx/network error là lỗi)
            const statusOk = res.status < 500;
            summary.restOk = summary.restOk || statusOk;
            (statusOk ? ok : fail)(
                `${t.url} → HTTP ${res.status} (${fmtMs(Date.now() - s)}) ` +
                (t.key ? '(đã có API key — SẴN SÀNG dùng làm fallback)'
                    : `(CHƯA có API key — thêm ${t.envKey} vào .env để kích hoạt)`)
            );
        } catch (err) {
            fail(`${t.url}: ${brief(err)}`);
        }
    }
}

async function runSendTest() {
    banner('[6] GỬI EMAIL TEST THẬT QUA CHUỖI FALLBACK');
    info(`Đang gửi tới ${OPTS.sendTo} ...`);
    const result = await mailer.sendEmailWithFallback({
        to: OPTS.sendTo,
        subject: `[FACA Library] Test gửi mail ${new Date().toISOString()}`,
        html: `<p>Đây là email test từ <code>scripts/test-smtp.js</code> lúc ` +
            `${new Date().toLocaleString('vi-VN')}.</p>` +
            `<p>Nhận được thư này = đường gửi OK (xem mục "provider" trong log ứng dụng).</p>`
    });
    if (result.success) {
        summary.sentOk = true;
        ok(`GỬI THÀNH CÔNG qua ${result.provider} (${result.ms}ms, messageId=${result.messageId || '-'})`);
    } else {
        fail('Gửi thất bại trên TẤT CẢ provider. Chi tiết từng attempt:');
        console.log(JSON.stringify(result.attempts, null, 2));
    }
}

function printSummary() {
    banner('TỔNG KẾT');
    const lines = [
        ['[2] DNS phân giải SMTP host', summary.dnsOk],
        ['[3] Raw SMTP probe (≥1 cổng)', summary.smtpOk],
        ['[4] nodemailer verify() (≥1 transport)', summary.verifyOk],
        ['[5] REST HTTPS 443', summary.restOk]
    ];
    if (OPTS.sendTo) lines.push(['[6] Gửi email test thật', summary.sentOk]);
    for (const [name, pass] of lines) (pass ? ok : fail)(name);

    const smtpPathOk = summary.smtpOk || summary.verifyOk;
    const restPathOk = summary.restOk && (CFG.hasResendKey || CFG.hasSendGridKey);
    const anyPathOk = summary.sentOk || smtpPathOk || restPathOk;

    console.log('');
    if (anyPathOk) {
        ok('→ ÍT NHẤT 1 đường gửi mail đang hoạt động (exit code 0).');
    } else {
        fail('→ KHÔNG đường gửi mail nào hoạt động — email OTP sẽ thất bại (exit code 1).');
        info('Ưu tiên: 1) mở cổng SMTP cho SMTP_HOST ở firewall, 2) thêm API key REST (RESEND_API_KEY/SENDGRID_API_KEY), 3) báo IT kiểm tra proxy.');
    }
    return anyPathOk ? 0 : 1;
}

// ---------------------------------------------------------------------------
// MAIN
// ---------------------------------------------------------------------------
async function main() {
    console.log(`FACA Library — chẩn đoán gửi email | ${new Date().toISOString()}`);
    console.log(`Node ${process.version} | ${process.platform} ${process.arch} | cwd: ${process.cwd()}`);
    if (!CFG.host) {
        fail('Không đọc được cấu hình SMTP — kiểm tra file .env ở thư mục backend.');
        process.exit(1);
    }
    printConfig();
    await checkDns();
    await runRawProbes();
    await runVerify();
    await runRestChecks();
    if (OPTS.sendTo) await runSendTest();
    process.exit(printSummary());
}

main().catch((err) => {
    console.error('Lỗi không mong đợi khi chạy test-smtp.js:', err);
    process.exit(1);
});






