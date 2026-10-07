/**
 * mailQueue.js — Hàng đợi gửi email nội bộ (in-process background job queue).
 *
 * Mục tiêu (Reliability Architecture):
 *   1. API HTTP KHÔNG bị block bởi SMTP handshake (gửi bất đồng bộ, trả response ngay).
 *   2. Email KHÔNG bị mất khi mạng rung động — retry với backoff tăng dần.
 *   3. Có thống kê (succeeded / failed / retries / pending) để không còn "rớt im lặng".
 *
 * Lưu ý: đây là queue dùng trong RAM của MỘT tiến trình Node — không cần Redis.
 * Nếu triển khai nhiều instance (cluster / nhiều server) thì thay lớp này bằng
 * BullMQ + Redis/Agenda; interface enqueue(name, fn, meta) giữ nguyên nên chỉ
 * cần thay mỗi file này.
 *
 * Cấu hình qua .env:
 *   MAIL_QUEUE_CONCURRENCY   (mặc định 2)    — số job chạy song song
 *   MAIL_QUEUE_MAX_ATTEMPTS  (mặc định 3)    — số lần thử tối đa cho 1 job
 *   MAIL_QUEUE_RETRY_BASE_MS (mặc định 5000) — độ trễ lần retry đầu (x2 mỗi lần)
 *   MAIL_QUEUE_RETRY_MAX_MS  (mặc định 60000)— trần độ trễ retry
 */

const toInt = (value, def) => {
    const n = parseInt(value, 10);
    return Number.isFinite(n) && n > 0 ? n : def;
};

class MailQueue {
    constructor(options = {}) {
        this.concurrency = options.concurrency || 2;
        this.maxAttempts = options.maxAttempts || 3;
        this.retryBaseMs = options.retryBaseMs || 5000;
        this.retryMaxMs = options.retryMaxMs || 60000;
        this.jobs = [];       // job đang chờ (kể cả job chờ retry)
        this.running = 0;     // số job đang chạy
        this.nextId = 1;
        this.timer = null;
        this.stats = { enqueued: 0, succeeded: 0, failed: 0, retries: 0 };
    }

    /**
     * Đẩy 1 job vào hàng đợi.
     * @param {string} name   Tên job để log (vd: 'otp-email')
     * @param {(attempt:number)=>Promise<any>} fn Hàm gửi; PHẢI throw khi thất bại
     * @param {object} meta   Thông tin kèm theo (to, subject...) chỉ dùng để log
     * @returns {number} jobId
     */
    enqueue(name, fn, meta = {}) {
        const job = {
            id: this.nextId++,
            name,
            fn,
            meta,
            attempts: 0,
            readyAt: Date.now(),
            lastError: null
        };
        this.jobs.push(job);
        this.stats.enqueued += 1;
        console.log(
            `[MAIL-QUEUE] + Job #${job.id} (${name}) → ${meta.to || '?'} | ` +
            `hàng chờ: ${this.jobs.length} | đang chạy: ${this.running}`
        );
        this._pump();
        return job.id;
    }
    /** Chạy job tới hạn ngạch đồng thời và hẹn giờ đánh thức cho job chưa tới lượt. */
    _pump() {
        const now = Date.now();
        while (this.running < this.concurrency) {
            const idx = this.jobs.findIndex((j) => j.readyAt <= now);
            if (idx === -1) break;
            const [job] = this.jobs.splice(idx, 1);
            this._execute(job);
        }

        // Hẹn giờ đánh thức cho job đang chờ (retry chưa tới hạn / slot đầy)
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }
        if (this.jobs.length > 0) {
            const nextReady = Math.min(...this.jobs.map((j) => j.readyAt));
            const delay = Math.max(nextReady - Date.now(), 50);
            this.timer = setTimeout(() => {
                this.timer = null;
                this._pump();
            }, delay);
            if (this.timer.unref) this.timer.unref(); // không chặn process thoát
        }
    }

    async _execute(job) {
        this.running += 1;
        job.attempts += 1;
        const started = Date.now();
        try {
            await job.fn(job.attempts);
            this.stats.succeeded += 1;
            console.log(
                `[MAIL-QUEUE] ✅ Job #${job.id} (${job.name}) THÀNH CÔNG — ` +
                `lần thử ${job.attempts}, mất ${Date.now() - started}ms`
            );
        } catch (error) {
            // Tóm tắt lỗi (không in nội dung thư/OTP — chỉ mã lỗi để chẩn đoán)
            const summary = {
                message: error && error.message,
                code: (error && error.code) || null,
                responseCode: (error && error.responseCode) || null
            };

            if (job.attempts >= this.maxAttempts) {
                this.stats.failed += 1;
                console.error(
                    `[MAIL-QUEUE] ❌ Job #${job.id} (${job.name}) THẤT BẠI vĩnh viễn ` +
                    `sau ${job.attempts} lần thử:`, JSON.stringify(summary)
                );
                if (error && Array.isArray(error.attempts)) {
                    console.error('[MAIL-QUEUE]   → chi tiết từng provider:',
                        JSON.stringify(error.attempts, null, 2));
                }
            } else {
                this.stats.retries += 1;
                const backoff = Math.min(
                    this.retryBaseMs * Math.pow(2, job.attempts - 1),
                    this.retryMaxMs
                );
                job.lastError = summary;
                job.readyAt = Date.now() + backoff;
                this.jobs.push(job);
                console.warn(
                    `[MAIL-QUEUE] ⚠️ Job #${job.id} (${job.name}) lỗi lần ${job.attempts} ` +
                    `(${summary.responseCode || summary.code || summary.message}) — ` +
                    `thử lại sau ${backoff}ms`
                );
            }
        } finally {
            this.running -= 1;
            this._pump();
        }
    }
    /** Thống kê cho chẩn đoán (log khi khởi động / gọi từ script test). */
    getStats() {
        return {
            ...this.stats,
            pending: this.jobs.length,
            inFlight: this.running,
            concurrency: this.concurrency,
            maxAttempts: this.maxAttempts
        };
    }
}

const singleton = new MailQueue({
    concurrency: toInt(process.env.MAIL_QUEUE_CONCURRENCY, 2),
    maxAttempts: toInt(process.env.MAIL_QUEUE_MAX_ATTEMPTS, 3),
    retryBaseMs: toInt(process.env.MAIL_QUEUE_RETRY_BASE_MS, 5000),
    retryMaxMs: toInt(process.env.MAIL_QUEUE_RETRY_MAX_MS, 60000)
});

module.exports = singleton;
module.exports.MailQueue = MailQueue;


