const path = require('path');
const fs = require('fs');
const os = require('os');
const { sql, poolPromise } = require('../config/db');
const { processExcelStream } = require('../services/importService');

const multer = require('multer');

const excelStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const tmpDir = path.join(os.tmpdir(), 'faca-imports');
        if (!fs.existsSync(tmpDir)) {
            fs.mkdirSync(tmpDir, { recursive: true });
        }
        cb(null, tmpDir);
    },
    filename: (req, file, cb) => {
        const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, `import-${unique}${ext}`);
    },
});

const xlsxFileFilter = (req, file, cb) => {
    const allowed = ['.xlsx', '.xls', '.xlsb'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
        cb(null, true);
    } else {
        cb(new Error('Chỉ hỗ trợ tệp Excel (.xlsx, .xls, .xlsb).'));
    }
};

const upload = multer({
    storage: excelStorage,
    limits: { fileSize: 50 * 1024 * 1024 }, 
        fileFilter: xlsxFileFilter,
});


async function runBackgroundImport(filePath, importId, userId) {
    try {
        const result = await processExcelStream(filePath, importId, userId);
        console.log(`[Import ${importId}] ✓ Completed:`, result.spResult);
        return result;
    } catch (err) {
        console.error(`[Import ${importId}] ✗ Background job failed:`, err.message);
        try {
            const pool = await poolPromise;
            await pool.request()
                .input('ImportID', sql.Int, importId)
                .query(
                    `UPDATE dbo.FileImportHistory
                     SET Status = 'FAILED', ImportDate = GETDATE()
                     WHERE ImportID = @ImportID`
                );
        } catch (updateErr) {
            console.error(`[Import ${importId}] Failed to update status to FAILED:`, updateErr.message);
        }
                return null;
    }
}

// ---------------------------------------------------------------
// POST /api/inventory/import
// ---------------------------------------------------------------

const importInventory = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'Không nhận được tệp tin. Vui lòng chọn một file Excel.',
            });
        }

        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Người dùng chưa xác thực.',
            });
        }

        const fileName = req.file.originalname;
        const filePath = req.file.path;

        // Create a pending FileImportHistory record → capture IDENTITY ImportID
        const pool = await poolPromise;
        const insertResult = await pool.request()
            .input('FileName', sql.NVarChar(255), fileName)
            .input('ImportBy', sql.Int, userId)
            .input('Status', sql.NVarChar(20), 'PENDING')
            .query(
                `INSERT INTO dbo.FileImportHistory (FileName, ImportDate, ImportBy, Status)
                 OUTPUT INSERTED.ImportID
                 VALUES (@FileName, GETDATE(), @ImportBy, @Status)`
            );

        const importId = insertResult.recordset[0].ImportID;

        // Fire-and-forget: background processing runs independently
        runBackgroundImport(filePath, importId, userId)
            .catch((err) => {
                console.error(`[Import ${importId}] Uncaught background error:`, err);
            });

        // Instant 202 Accepted
        return res.status(202).json({
            success: true,
            importId: importId,
            status: 'PROCESSING',
            message: 'File is being processed in background...',
        });
    } catch (err) {
        console.error('Import API error:', err);
        return res.status(500).json({
            success: false,
            message: 'Không thể khởi tạo quá trình nhập file. Vui lòng thử lại.',
            error: process.env.NODE_ENV === 'development' ? err.message : undefined,
                });
    }
};

// ---------------------------------------------------------------
// GET /api/inventory/import/:importId/status
//  Returns the current processing status + summary counts.
// ---------------------------------------------------------------

const getImportStatus = async (req, res) => {
    try {
        const { importId } = req.params;
        const userId = req.user?.userId;

        const pool = await poolPromise;
        let query = `
            SELECT ImportID, FileName, ImportDate, TotalRows, Status
            FROM dbo.FileImportHistory
            WHERE ImportID = @ImportID
        `;
        const request = pool.request();
        request.input('ImportID', sql.Int, parseInt(importId, 10));

        // Non-admin users can only see their own imports
        if (userId && req.user?.roleId !== 1) {
            query += ' AND ImportBy = @UserID';
            request.input('UserID', sql.Int, userId);
        }

        const result = await request.query(query);

        if (result.recordset.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy lịch sử nhập file này.',
            });
        }

        const record = result.recordset[0];

        // If there are failed rows in staging (IsValid = 0), include a count
        const errorCheck = await pool.request()
            .input('ImportID', sql.Int, parseInt(importId, 10))
            .query(
                `SELECT COUNT(*) AS ErrorCount
                 FROM dbo.Staging_InventoryImport
                 WHERE ImportID = @ImportID AND IsValid = 0`
            );

        return res.json({
            success: true,
            importId: record.ImportID,
            fileName: record.FileName,
            status: record.Status,
            totalRows: record.TotalRows,
            errorRows: errorCheck.recordset[0]?.ErrorCount || 0,
            processedAt: record.ImportDate,
        });
    } catch (err) {
        console.error('Get import status error:', err);
        return res.status(500).json({
            success: false,
            message: 'Lỗi khi truy vấn trạng thái nhập file.',
            error: process.env.NODE_ENV === 'development' ? err.message : undefined,
        });
    }
};

// ---------------------------------------------------------------
// GET /api/inventory/import/:importId/errors
//  Returns diagnostic details for failed rows (still in staging).
// ---------------------------------------------------------------

const getImportErrors = async (req, res) => {
    try {
        const { importId } = req.params;
        const userId = req.user?.userId;

        const pool = await poolPromise;

        // Verify the user owns this import (admin roleId = 1 bypasses)
        const ownershipCheck = await pool.request()
            .input('ImportID', sql.Int, parseInt(importId, 10))
            .query(
                `SELECT ImportBy FROM dbo.FileImportHistory WHERE ImportID = @ImportID`
            );

        if (ownershipCheck.recordset.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy lịch sử nhập file này.',
            });
        }

        if (userId && req.user?.roleId !== 1 && ownershipCheck.recordset[0].ImportBy !== userId) {
            return res.status(403).json({
                success: false,
                message: 'Bạn không có quyền xem lỗi của lần nhập này.',
            });
        }

        // Return failed rows with diagnostics
        const errorRows = await pool.request()
            .input('ImportID', sql.Int, parseInt(importId, 10))
            .query(
                `SELECT RowNumber, RowIndex, SheetName, FileName, LotCode,
                        ProjectName, BuildCode, MaterialName,
                        ReceiveDate, ShipmentQty, EmployeeCode,
                        ErrorMessage
                 FROM dbo.Staging_InventoryImport
                 WHERE ImportID = @ImportID AND IsValid = 0
                 ORDER BY SheetName, RowIndex`
            );

        return res.json({
            success: true,
            importId: parseInt(importId, 10),
            errorCount: errorRows.recordset.length,
            errors: errorRows.recordset,
        });
    } catch (err) {
        console.error('Get import errors error:', err);
        return res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy chi tiết lỗi nhập file.',
            error: process.env.NODE_ENV === 'development' ? err.message : undefined,
        });
    }
};

// ---------------------------------------------------------------
// GET /api/inventory
//  Returns paginated inventory lots with readable FK names (for the
//  frontend useQuery key ['inventoryList']).
//  Query params: page (default 1), limit (default 50, max 100),
//                search, project, material
// ---------------------------------------------------------------

const getInventoryLots = async (req, res) => {
    try {
        const pool = await poolPromise;

        // Parse pagination params
        const page = parseInt(req.query.page, 10) || 1;
        const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);
        const offset = (page - 1) * limit;

        // Parse optional filters
        const search = (req.query.search || '').trim();
        const project = (req.query.project || '').trim();
        const material = (req.query.material || '').trim();

        // Build dynamic WHERE clause
        const whereConditions = [];
        const inputs = [];

        if (search) {
            whereConditions.push(
                `(il.LotCode LIKE @Search OR p.ProjectName LIKE @Search OR m.MaterialName LIKE @Search)`
            );
            inputs.push({ name: 'Search', type: sql.NVarChar(100), value: `%${search}%` });
        }
        if (project) {
            whereConditions.push(`p.ProjectName LIKE @Project`);
            inputs.push({ name: 'Project', type: sql.NVarChar(100), value: `%${project}%` });
        }
        if (material) {
            whereConditions.push(`m.MaterialName LIKE @Material`);
            inputs.push({ name: 'Material', type: sql.NVarChar(100), value: `%${material}%` });
        }

        const whereClause = whereConditions.length > 0
            ? `WHERE ${whereConditions.join(' AND ')}`
            : '';

        // Count total records (for pagination metadata)
        const countResult = await pool.request()
            .input('Search', sql.NVarChar(100), search ? `%${search}%` : null)
            .input('Project', sql.NVarChar(100), project ? `%${project}%` : null)
            .input('Material', sql.NVarChar(100), material ? `%${material}%` : null)
            .query(
                `SELECT COUNT(*) AS TotalCount
                 FROM dbo.InventoryLots il
                 LEFT JOIN dbo.Projects  p ON p.ProjectId  = il.ProjectID
                 LEFT JOIN dbo.Builds    b ON b.BuildId    = il.BuildID
                 LEFT JOIN dbo.Materials m ON m.MaterialID = il.MaterialID
                 ${whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : ''}`
            );
        const totalCount = countResult.recordset[0].TotalCount;
        const totalPages = Math.ceil(totalCount / limit);

        // Build the main query with pagination
        const query = `
            SELECT il.InventoryLotID, il.LotCode,
                   il.ProjectID,       p.ProjectName,
                   il.BuildID,         b.BuildCode,
                   il.MaterialID,      m.MaterialName,
                   il.ReceiveDate, il.ShipmentQty, il.IQAScrapQty, il.StockQty,
                   il.DRI,             u.employee_code AS DRICode,
                   il.BillNo, il.InvoiceNo, il.Remark, il.CreateDate
            FROM dbo.InventoryLots il
            LEFT JOIN dbo.Projects  p ON p.ProjectId  = il.ProjectID
            LEFT JOIN dbo.Builds    b ON b.BuildId    = il.BuildID
            LEFT JOIN dbo.Materials m ON m.MaterialID = il.MaterialID
            LEFT JOIN dbo.users     u ON u.user_id    = il.DRI
            ${whereClause}
            ORDER BY il.CreateDate DESC, il.InventoryLotID DESC
            OFFSET @Offset ROWS
            FETCH NEXT @Limit ROWS ONLY
        `;

        const result = await pool.request()
            .input('Offset', sql.Int, offset)
            .input('Limit', sql.Int, limit)
            .input('Search', sql.NVarChar(100), search ? `%${search}%` : null)
            .input('Project', sql.NVarChar(100), project ? `%${project}%` : null)
            .input('Material', sql.NVarChar(100), material ? `%${material}%` : null)
            .query(query);

        return res.json({
            success: true,
            data: result.recordset,
            pagination: {
                page,
                limit,
                totalCount,
                totalPages,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1,
            },
        });
    } catch (err) {
        console.error('Get inventory lots error:', err);
        return res.status(500).json({
            success: false,
            message: 'Không tải được danh sách kho.',
            error: process.env.NODE_ENV === 'development' ? err.message : undefined,
        });
    }
};

module.exports = {
    importInventory,
    getImportStatus,
    getImportErrors,
    getInventoryLots,
    upload,
};