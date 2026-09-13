// ================================================================
//  inventoryListController.js - Phân trang dữ liệu kho từ SQL Server
//  Thay thế việc đọc file Excel trực tiếp
// ================================================================
const { poolPromise, sql } = require('../config/db');

/**
 * GET /api/inventory/list
 * Trả về danh sách InventoryLots đã lưu trong DB, có phân trang.
 * Query params: page, limit, search
 */
async function getInventoryList(req, res) {
    const pool = await poolPromise;
    let page = parseInt(req.query.page, 10);
    let limit = parseInt(req.query.limit, 10);
    const search = (req.query.search || '').trim();

    if (isNaN(page) || page < 1) page = 1;
    if (isNaN(limit) || limit < 1) limit = 50;
    if (limit > 200) limit = 200;
    const offset = (page - 1) * limit;

    try {
        // Count total rows
        const countSql = search
            ? 'SELECT COUNT(*) AS total FROM dbo.InventoryLots WHERE LotCode LIKE @search OR ProjectName LIKE @search OR MaterialName LIKE @search'
            : 'SELECT COUNT(*) AS total FROM dbo.InventoryLots';

        const countRes = await pool.request()
            .input('search', sql.NVarChar(255), search ? '%' + search + '%' : null)
            .query(countSql);

        const totalRows = countRes.recordset[0].total;
        const totalPages = Math.ceil(totalRows / limit);

        // Data query with pagination
        const dataSql = search
            ? `SELECT TOP (@limit) il.InventoryLotID, il.LotCode, il.ReceiveDate, il.ShipmentQty, il.StockQty, il.QualityHoldQty, il.IQAScrapQty, il.DRI, il.BillNo, il.InvoiceNo, il.DRINo, il.CreatedAt, p.ProjectName, b.BuildCode, m.MaterialName, v.VendorName FROM dbo.InventoryLots il INNER JOIN dbo.Projects p ON p.ProjectID = il.ProjectID INNER JOIN dbo.Builds b ON b.BuildID = il.BuildID INNER JOIN dbo.Materials m ON m.MaterialID = il.MaterialID LEFT JOIN dbo.Vendors v ON v.VendorID = m.VendorID WHERE il.LotCode LIKE @search OR p.ProjectName LIKE @search OR m.MaterialName LIKE @search ORDER BY il.CreatedAt DESC OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`
            : `SELECT TOP (@limit) il.InventoryLotID, il.LotCode, il.ReceiveDate, il.ShipmentQty, il.StockQty, il.QualityHoldQty, il.IQAScrapQty, il.DRI, il.BillNo, il.InvoiceNo, il.DRINo, il.CreatedAt, p.ProjectName, b.BuildCode, m.MaterialName, v.VendorName FROM dbo.InventoryLots il INNER JOIN dbo.Projects p ON p.ProjectID = il.ProjectID INNER JOIN dbo.Builds b ON b.BuildID = il.BuildID INNER JOIN dbo.Materials m ON m.MaterialID = il.MaterialID LEFT JOIN dbo.Vendors v ON v.VendorID = m.VendorID ORDER BY il.CreatedAt DESC OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`;

        const dataReq = pool.request();
        dataReq.input('limit', sql.Int, limit);
        dataReq.input('offset', sql.Int, offset);
        if (search) {
            dataReq.input('search', sql.NVarChar(255), '%' + search + '%');
        }

        const dataResult = await dataReq.query(dataSql);

        // Format data for frontend
        const lots = dataResult.recordset.map(row => ({
            InventoryLotID: row.InventoryLotID,
            LotCode: row.LotCode,
            ProjectName: row.ProjectName,
            BuildCode: row.BuildCode,
            MaterialName: row.MaterialName,
            VendorName: row.VendorName,
            ReceiveDate: row.ReceiveDate ? new Date(row.ReceiveDate).toISOString().split('T')[0] : '',
            ShipmentQty: row.ShipmentQty,
            StockQty: row.StockQty,
            QualityHoldQty: row.QualityHoldQty || 0,
            IQAScrapQty: row.IQAScrapQty || 0,
            DRI: row.DRI,
            BillNo: row.BillNo,
            InvoiceNo: row.InvoiceNo,
            DRINo: row.DRINo,
            CreatedAt: row.CreatedAt ? new Date(row.CreatedAt).toISOString() : '',
        }));

        res.json({
            success: true,
            data: lots,
            pagination: {
                currentPage: page,
                totalPages: totalPages,
                totalRows: totalRows,
                limit: limit,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1,
            }
        });
    } catch (error) {
        console.error('Lỗi khi lấy danh sách InventoryLots:', error);
        res.status(500).json({ success: false, message: 'Không thể tải danh sách kho.', error: error.message });
    }
}

module.exports = { getInventoryList };