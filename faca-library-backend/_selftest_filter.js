/** Self-test filter ngày (Đến ngày = bao trọn ngày) — chạy tay, xong xóa. */
const { poolPromise } = require('./src/config/db');
const { listAuditLogs } = require('./src/services/auditLogService');

(async () => {
    const pool = await poolPromise;
    const day = '2026-10-07';
    const toOnly = await listAuditLogs(pool, { page: 1, limit: 1, to: day });
    const daySpan = await listAuditLogs(pool, { page: 1, limit: 1, from: day, to: day });
    console.log('to=07/10 (toan ngay ket thuc) total =', toOnly.pagination.total);
    console.log('from=to=07/10 (trong ngay)     total =', daySpan.pagination.total);
    const ok = daySpan.pagination.total > 0 && toOnly.pagination.total >= daySpan.pagination.total;
    console.log(ok ? 'FILTER TEST PASS' : 'FILTER TEST FAIL');
    process.exit(ok ? 0 : 1);
})();
