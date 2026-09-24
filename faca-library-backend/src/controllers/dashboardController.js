/**
 * dashboardController.js — số liệu thật cho Trang chủ (Home).
 *  - facaReports  : COUNT dbo.PresentationReports (thư viện báo cáo FACA quét từ OneDrive)
 *  - pendingIssues: COUNT dbo.issues WHERE status NOT IN ('CLOSED','RESOLVED')
 *  - inventoryLots: COUNT dbo.InventoryLots
 * Bảng nào chưa có thì trả 0 chứ không 500, để Home luôn hiển thị được.
 */
const { poolPromise } = require('../config/db');

async function safeCount(pool, table, where = '') {
    try {
        const r = await pool.request().query(`SELECT COUNT(*) AS total FROM ${table} ${where}`);
        return r.recordset[0]?.total || 0;
    } catch (e) {
        console.warn(`Dashboard count ${table} failed:`, e.message);
        return 0;
    }
}

const getStats = async (req, res) => {
    try {
        const pool = await poolPromise;
        const [facaReports, pendingIssues, inventoryLots, totalIssues] = await Promise.all([
            safeCount(pool, 'dbo.PresentationReports'),
            safeCount(pool, 'dbo.issues', `WHERE UPPER(status) NOT IN ('CLOSED','RESOLVED')`),
            safeCount(pool, 'dbo.InventoryLots'),
            safeCount(pool, 'dbo.issues'),
        ]);
        res.status(200).json({
            success: true,
            data: { facaReports, pendingIssues, inventoryLots, totalIssues },
        });
    } catch (error) {
        console.error('Lỗi khi lấy thống kê dashboard:', error);
        res.status(500).json({ success: false, message: 'Lỗi hệ thống khi tải thống kê.', error: error.message });
    }
};

module.exports = { getStats };
