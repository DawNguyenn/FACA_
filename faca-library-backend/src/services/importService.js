const Excel = require('exceljs');
const path = require('path');
const fs = require('fs');
const JSZip = require('jszip');
const { sql, poolPromise } = require('../config/db');

// Column variants for dynamic header mapping (Case-insensitive & Trim)
// Used to match Excel header names against multiple possible variants
const COLUMN_VARIANTS = {
    ProjectName: ['Model', 'Dự án', 'Project', 'ProjectName'],
    BuildCode: ['Build', 'BuildCode'],
    ReceiveDate: ['Received (Date)', 'Received Date', 'ReceiveDate', 'Change Date'],
    MaterialName: ['Material', 'MaterialName', 'Tên NVL'],
    VendorName: ['Vendor', 'VendorName', 'Nhà cung cấp'],
    Description: ['Description', 'Mô tả'],
    Config: ['Config'],
    LotCode: ['Lot ID', 'LotCode', 'Mã Lot'],
    ShipmentQty: ['Shipment Qty', 'ShipmentQty', 'Số lượng nhập'],
    StockQty: ['Qty Tồn Kho', 'Tồn Kho', 'StockQty'],
    BillNo: ['Bill', 'BillNo'],
    InvoiceNo: ['I/V', 'InvoiceNo', 'Invoice'],
    EmployeeCode: ['Mã NV', 'DRI', 'Receiver']
};

// List of header names that indicate a LOT CODE column
const LOT_CODE_HEADERS = ['lot id', 'lot code', 'lot', 'mã lot', 'ma lot'];

// Fixed column positions (fallback when dynamic mapping fails)
// Column A=1, B=2, etc. - positions are 1-indexed for ExcelJS
const FIXED_COLUMN_MAP = {
    2: 'ProjectName',      // Column B: Model/ProjectName
    3: 'BuildCode',        // Column C: Build/BuildCode
    5: 'MaterialName',     // Column E: Material
    6: 'VendorName',       // Column F: Vendor
    9: 'LotCode',          // Column I: Lot ID (CRITICAL - without this, bulk load will fail)
    10: 'ShipmentQty',     // Column J: Shipment Qty
    12: 'StockQty'         // Column L: Stock Qty (Tồn Kho)
};

// Header row to read for column mapping (usually row 1, 2, or 4 depending on Excel structure)
const HEADER_ROW = 4;
const DATA_START_ROW = 5;
const BATCH_SIZE = 1000;

function normalizeHeader(value) {
    if (value === null || value === undefined) return '';
    return String(value).trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Check if a header row contains a LotCode column
 * This is the key check - sheets without LotCode like NVL sheets should be skipped
 * @param {Object} headerRow - Header row from Excel
 * @returns {boolean} - True if LotCode column is found
 */
function hasLotCodeColumn(headerRow) {
    const values = headerRow.values || [];
    for (let i = 1; i < values.length; i++) {
        const normalized = normalizeHeader(values[i]);
        if (LOT_CODE_HEADERS.some(header => normalized.includes(header))) {
            return true;
        }
    }
    return false;
}

/**
 * Detect column mapping from header row using COLUMN_VARIANTS
 * Supports case-insensitive and trimmed matching against multiple header name variants
 * @param {Object} headerRow - Header row from Excel
 * @returns {Object} - Column index to field name mapping
 */
function detectSheetColumnMap(headerRow) {
    const values = headerRow.values || [];
    const dynamicMap = {};

    // Build lookup table from COLUMN_VARIANTS for quick matching
    // Map each variant (lowercase) to its field name
    const variantLookup = {};
    for (const [fieldName, variants] of Object.entries(COLUMN_VARIANTS)) {
        for (const variant of variants) {
            variantLookup[normalizeHeader(variant)] = fieldName;
        }
    }

    // Scan each header cell and try to match
    for (let i = 1; i < values.length; i++) {
        const cellValue = values[i];
        if (cellValue === null || cellValue === undefined) continue;

        const normalized = normalizeHeader(cellValue);
        
        // Try exact match first
        if (variantLookup[normalized]) {
            dynamicMap[i] = variantLookup[normalized];
            continue;
        }

        // Try partial match (header contains a known variant)
        for (const [fieldName, variants] of Object.entries(COLUMN_VARIANTS)) {
            for (const variant of variants) {
                const normVariant = normalizeHeader(variant);
                if (normalized.includes(normVariant) || normVariant.includes(normalized)) {
                    dynamicMap[i] = fieldName;
                    break;
                }
            }
        }
    }

    // Determine what columns were mapped
    const mappedColumns = Object.values(dynamicMap);
    const hasProject = mappedColumns.includes('ProjectName');
    const hasMaterial = mappedColumns.includes('MaterialName');
    const hasLot = mappedColumns.includes('LotCode');
    const hasBuild = mappedColumns.includes('BuildCode');

    // Only accept the dynamic map if it has the essential columns
    // For inventory import, we critically need: ProjectName, MaterialName, LotCode
    // BuildCode and VendorName are strongly recommended but not strictly required
    const hasEssentialColumns = hasProject && hasMaterial && hasLot;
    const hasEnoughColumns = Object.keys(dynamicMap).length >= 4;

    if (hasEssentialColumns && hasEnoughColumns) {
        // Log successful dynamic mapping
        console.log(`✓ Sheet has LotCode column - using dynamic mapping (${Object.keys(dynamicMap).length} columns detected)`);
        return dynamicMap;
    }

    // If this sheet doesn't have LotCode, it's likely a NVL/transaction sheet - skip it
    if (!hasLot) {
        console.log(`✗ Sheet does NOT have LotCode/Lot ID column - skipping (likely NVL or transaction sheet)`);
        return null; // Signal to skip this sheet
    }

    // Fallback to fixed column positions if dynamic mapping didn't capture enough
    console.log(`⚠ Sheet has LotCode but dynamic mapping incomplete - using fixed fallback mapping`);
    return { ...FIXED_COLUMN_MAP };
}

function normalizeDate(value) {
    if (!value) return '';
    if (value instanceof Date) {
        const y = value.getFullYear();
        const m = String(value.getMonth() + 1).padStart(2, '0');
        const d = String(value.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }
    if (typeof value === 'number') {
        const date = new Date(Date.UTC(1899, 11, 30));
        date.setUTCDate(date.getUTCDate() + value);
        const y = date.getUTCFullYear();
        const m = String(date.getUTCMonth() + 1).padStart(2, '0');
        const d = String(date.getUTCDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }
    const str = String(value).trim();
    if (!str) return '';
    const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) return isoMatch[0];
    const slashMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (slashMatch) {
        const d = slashMatch[1].padStart(2, '0');
        const m = slashMatch[2].padStart(2, '0');
        const y = slashMatch[3];
        return `${y}-${m}-${d}`;
    }
    const parsed = new Date(str);
    if (!isNaN(parsed)) {
        const y = parsed.getFullYear();
        const m = String(parsed.getMonth() + 1).padStart(2, '0');
        const d = String(parsed.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }
    return str;
}

/**
 * Chuẩn hóa ngày tháng từ Excel sang định dạng ISO YYYY-MM-DD
 * Xử lý: Date object, Excel Serial Number, String (DD/MM/YYYY, YYYY-MM-DD)
 * @param {*} val - Giá trị từ ô Excel
 * @returns {string|null} - Chuỗi ngày YYYY-MM-DD hoặc null nếu rỗng
 */
function parseExcelDate(val) {
    if (!val) {
        // Nếu không có ngày, mặc định lấy ngày hiện tại YYYY-MM-DD
        return new Date().toISOString().split('T')[0];
    }

    // 1. Trường hợp là đối tượng Date trong JS
    if (val instanceof Date) {
        return isNaN(val.getTime()) ? new Date().toISOString().split('T')[0] : val.toISOString().split('T')[0];
    }

        // 2. Trường hợp là Excel Serial Number (ví dụ: 46238)
    if (typeof val === 'number') {
        const utcDays = val - 25569;
        const date = new Date(utcDays * 86400 * 1000);
        return isNaN(date.getTime()) ? new Date().toISOString().split('T')[0] : date.toISOString().split('T')[0];
    }

    // 3. Trường hợp là String
    if (typeof val === 'string') {
        const clean = val.trim();
        if (!clean) {
            // Nếu chuỗi rỗng, mặc định lấy ngày hiện tại
            return new Date().toISOString().split('T')[0];
        }

        // Xử lý định dạng DD/MM/YYYY hoặc DD-MM-YYYY
        if (clean.includes('/') || clean.includes('-')) {
            const parts = clean.split(/[\/\-]/);
            if (parts.length === 3) {
                // Nếu phần đầu là ngày (1-2 chữ số) và phần cuối là năm (4 chữ số)
                if (parts[0].length <= 2 && parts[2].length === 4) {
                    const day = parts[0].padStart(2, '0');
                    const month = parts[1].padStart(2, '0');
                    const year = parts[2];
                    return `${year}-${month}-${day}`;
                }
            }
        }
        return clean;
    }

    return String(val);
}

function cleanValue(value, maxLength = 255) {
    if (value === null || value === undefined) return '';
    let str = String(value).trim();
    if (maxLength && str.length > maxLength) str = str.substring(0, maxLength);
    return str;
}

function isEmptyRow(mapped) {
    const requiredFields = ['projectName', 'materialName', 'lotCode', 'shipmentQty'];
    return requiredFields.every(field => {
        const val = mapped[field];
        return !val || val.trim() === '';
    });
}

/**
 * Reorder zip entries so that xl/workbook.xml comes BEFORE xl/worksheets/*.xml.
 *
 * The ExcelJS writer emits workbook.xml at the END of the zip, which causes
 * the stream-based WorkbookReader to fail (this.model is undefined when
 * _parseWorksheet runs on a deferred worksheet). This function rewrites the
 * zip with a safe entry order so the stream reader works reliably.
 *
 * @param {string} inputPath  - original .xlsx path
 * @returns {string}          - path to a temp file with reordered entries
 */
async function reorderZipForStreamReading(inputPath) {
    const data = fs.readFileSync(inputPath);
    const zip = await JSZip.loadAsync(data);

    // Desired priority order (entries not listed keep their relative order)
    const priority = [
        '[Content_Types].xml',
        '_rels/.rels',
        'xl/_rels/workbook.xml.rels',
        'xl/workbook.xml',
        'xl/sharedStrings.xml',
        'xl/styles.xml',
    ];

    const entries = [];
    zip.forEach((relativePath, file) => {
        entries.push({ path: relativePath, file });
    });

    // Sort: priority entries first (by index), then everything else in original order
    entries.sort((a, b) => {
        const aIdx = priority.indexOf(a.path);
        const bIdx = priority.indexOf(b.path);
        if (aIdx === -1 && bIdx === -1) return 0;
        if (aIdx === -1) return 1;
        if (bIdx === -1) return -1;
        return aIdx - bIdx;
    });

    // Build a new zip with the sorted entries
    const newZip = new JSZip();
    for (const { path: p, file } of entries) {
        if (file.dir) {
            newZip.folder(p);
        } else {
            const content = await file.async('nodebuffer');
            newZip.file(p, content);
        }
    }

    const tmpDir = path.join(require('os').tmpdir(), 'faca-imports');
    if (!fs.existsSync(tmpDir)) {
        fs.mkdirSync(tmpDir, { recursive: true });
    }
    const outputPath = path.join(tmpDir, `reordered-${Date.now()}-${Math.round(Math.random() * 1e9)}.xlsx`);
    const buffer = await newZip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
    fs.writeFileSync(outputPath, buffer);
    return outputPath;
}

/**
 * Find the column index for a given field name in a column map.
 * Returns undefined if not found (cleanValue handles undefined → null).
 */
function findKeyByValue(map, fieldName) {
    if (!map) return undefined;
    for (const key of Object.keys(map)) {
        if (map[key] === fieldName) {
            return Number(key);
        }
    }
    return undefined;
}

// ---------------------------------------------------------------
// Helper functions
// ---------------------------------------------------------------

/**
 * Normalise any date-like value into 'yyyy-MM-dd' for SQL Server.
 * ExcelJS may return a JS Date, a serial number, or a string.
 */
function normalizeDate(value) {
    if (value === null || value === undefined || value === '') return null;

    // Native Date object
    if (value instanceof Date) {
        if (isNaN(value.getTime())) return null;
        const y = value.getFullYear();
        const m = String(value.getMonth() + 1).padStart(2, '0');
        const d = String(value.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }

    // Excel serial date (numeric)
    if (typeof value === 'number') {
        const date = new Date(EXCEL_EPOCH.getTime() + value * 86400000);
        if (!isNaN(date.getTime())) {
            const y = date.getFullYear();
            const m = String(date.getMonth() + 1).padStart(2, '0');
            const d = String(date.getDate()).padStart(2, '0');
            return `${y}-${m}-${d}`;
        }
    }

    // Try parsing as a string date
    const parsed = new Date(value);
    if (!isNaN(parsed.getTime())) {
        const y = parsed.getFullYear();
        const m = String(parsed.getMonth() + 1).padStart(2, '0');
        const d = String(parsed.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }

    // Last resort: return the raw string (SP TRY_CAST will flag it as invalid)
    return String(value).trim();
}

/**
 * Trim + stringify a cell value; null for empty strings.
 */
function cleanValue(value, maxLength) {
    if (value === null || value === undefined) return null;
    let str = String(value).trim();
    if (str === '') return null;
    if (maxLength && str.length > maxLength) {
        str = str.substring(0, maxLength);
    }
    return str;
}

/**
 * Build a mssql.Table that mirrors dbo.Staging_InventoryImport for bulk copy.
 * A fresh Table is created per batch because mssql consumes rows during bulk.
 */
function createStagingTable() {
    const table = new sql.Table('dbo.Staging_InventoryImport');
    table.columns.add('ImportID', sql.Int, { nullable: false });
    table.columns.add('RowNumber', sql.Int, { nullable: true });
    table.columns.add('RowIndex', sql.Int, { nullable: true });
    table.columns.add('SheetName', sql.NVarChar(255), { nullable: true });
    table.columns.add('FileName', sql.NVarChar(255), { nullable: false });
    table.columns.add('ProjectName', sql.NVarChar(255), { nullable: true });
    table.columns.add('BuildCode', sql.NVarChar(255), { nullable: true });
    table.columns.add('MaterialName', sql.NVarChar(255), { nullable: true });
    table.columns.add('VendorName', sql.NVarChar(255), { nullable: true });
    table.columns.add('Description', sql.NVarChar(500), { nullable: true });
    table.columns.add('Config', sql.NVarChar(255), { nullable: true });
    table.columns.add('LotCode', sql.NVarChar(100), { nullable: true });
    table.columns.add('ReceiveDate', sql.NVarChar(50), { nullable: true });
    table.columns.add('ShipmentQty', sql.NVarChar(50), { nullable: true });
    table.columns.add('RnD', sql.NVarChar(100), { nullable: true });
    table.columns.add('StockQty', sql.NVarChar(50), { nullable: true });
    table.columns.add('OutputDate', sql.NVarChar(50), { nullable: true });
    table.columns.add('Receiver', sql.NVarChar(255), { nullable: true });
    table.columns.add('EmployeeCode', sql.NVarChar(50), { nullable: true });
    table.columns.add('BillNo', sql.NVarChar(100), { nullable: true });
    table.columns.add('InvoiceNo', sql.NVarChar(100), { nullable: true });
    table.columns.add('Remark', sql.NVarChar(sql.MAX), { nullable: true });
    table.columns.add('IsValid', sql.Bit, { nullable: false });
    table.columns.add('ErrorMessage', sql.NVarChar(1000), { nullable: true });
    return table;
}

/**
 * Flush a batch of accumulated rows into the staging table via mssql bulk copy.
 *
 * @param {object} pool       - connected mssql.ConnectionPool
 * @param {number} importId   - ImportID (FK to FileImportHistory)
 * @param {string} fileName   - uploaded file name (for diagnostics)
 * @param {Array}  rows       - array of mapped row objects
 */
async function flushBatch(pool, importId, fileName, rows) {
    if (!rows.length) return 0;
    const table = createStagingTable();

    for (const row of rows) {
        table.rows.add(
            importId,
            row.rowNumber,
            row.rowIndex,
            row.sheetName || '',
            fileName,
            row.projectName,
            row.buildCode,
            row.materialName,
            row.vendorName,
            row.description,
            row.config,
            row.lotCode,
            row.receiveDate,
            row.shipmentQty,
            row.rnd,
            row.stockQty,
            row.outputDate,
            row.receiver,
            row.employeeCode,
            row.billNo,
            row.invoiceNo,
            row.remark,
            0,
            null
        );
    }

    const request = pool.request();
    await request.bulk(table);
    return rows.length;
}

// ---------------------------------------------------------------
// Main streaming pipeline
// ---------------------------------------------------------------

/**
 * Stream-process an uploaded Excel file, bulk-load into staging,
 * then execute the validation / INSERT stored procedure.
 *
 * @param {string} filePath  - absolute path to the uploaded temp file
 * @param {number} importId  - ImportID from FileImportHistory
 * @param {number} userId    - authenticated user id (for FileImportHistory.ImportBy)
 * @returns {Promise<object>}  result from sp_ProcessInventoryImport
 */
async function processExcelStream(filePath, importId, userId) {
    const fileName = path.basename(filePath);
    const pool = await poolPromise;

    // ---------------------------------------------------------------
    // 1a. Reorder zip entries so xl/workbook.xml comes BEFORE worksheets.
    //     The ExcelJS writer emits workbook.xml at the END of the zip,
    //     which breaks the stream reader (this.model is undefined when
    //     _parseWorksheet runs on a deferred worksheet).
    // ---------------------------------------------------------------
    let reorderedPath = null;
    let fileToStream = filePath;
    try {
        reorderedPath = await reorderZipForStreamReading(filePath);
        fileToStream = reorderedPath;
    } catch (reorderErr) {
        console.warn(`[importService] Zip reordering failed, using original file: ${reorderErr.message}`);
    }

    let batch = [];
    let totalRows = 0;
    const flushPromises = [];
    let streamError = null;

    try {
        // ----------------------------------------------------------------
        // 1. Stream the workbook using exceljs WorkbookReader.read()
        //    Events are emitted synchronously, but file I/O (unzip SAX
        //    parsing) yields between rows, allowing flush promises to
        //    drain.  After the stream ends we await all pending flushes
        //    before calling the SP — keeping memory bounded at ~BATCH_SIZE.
        // ----------------------------------------------------------------
        const workbookReader = new Excel.stream.xlsx.WorkbookReader(fileToStream);

    let hasWorksheets = false;
    const sheetStats = {};

    workbookReader.on('worksheet', (wsReader) => {
        if (streamError) return;
        hasWorksheets = true;

        // Per-sheet state - mỗi sheet có mapping riêng
        let sheetColumnMap = null;
        let sheetName = '';
        let sheetRowCount = 0;
        let sheetSkipped = false;

        wsReader.on('row', (row) => {
            if (streamError || sheetSkipped) return;

            const rowNumber = row.number;

            // Row 4 là header - validate và detect mapping cho sheet này
            if (rowNumber === HEADER_ROW) {
                sheetName = wsReader.name || 'Unknown';
                console.log(`[importService] Processing sheet: "${sheetName}"`);

                // Kiểm tra sheet có chứa LotCode không
                if (!hasLotCodeColumn(row)) {
                    console.warn(`[importService] SKIPPING sheet "${sheetName}" - No LotCode column found`);
                    sheetSkipped = true;
                    sheetStats[sheetName] = { status: 'SKIPPED', reason: 'No LotCode column' };
                    return;
                }

                // Detect column mapping cho sheet này
                sheetColumnMap = detectSheetColumnMap(row);
                console.log(`[importService] Sheet "${sheetName}" column map:`, sheetColumnMap);
                sheetStats[sheetName] = { status: 'PROCESSING', mapping: sheetColumnMap };
                return;
            }

            // Skip rows trước data start
            if (rowNumber < DATA_START_ROW) return;

            // Nếu sheet bị skip hoặc chưa có mapping, bỏ qua
            if (!sheetColumnMap) {
                return;
            }

            const values = row.values;
            const map = sheetColumnMap;

            // Helper để lấy giá trị từ column index theo mapping
            const getVal = (fieldName) => {
                for (const [colIdx, colName] of Object.entries(map)) {
                    if (colName === fieldName && values[colIdx] !== undefined) {
                        return values[colIdx];
                    }
                }
                return '';
            };

            // Map dữ liệu với fixed positions
            const mapped = {
                rowNumber: totalRows + batch.length + 1,
                rowIndex: rowNumber,
                sheetName: sheetName,
                projectName: cleanValue(getVal('ProjectName'), 255),
                buildCode: cleanValue(getVal('BuildCode'), 255),
                materialName: cleanValue(getVal('MaterialName'), 255),
                vendorName: cleanValue(getVal('VendorName'), 255),
                description: cleanValue(getVal('Description'), 500),
                config: cleanValue(getVal('Config'), 255),
                lotCode: cleanValue(getVal('LotCode'), 100),
                receiveDate: parseExcelDate(getVal('ReceiveDate')),
                shipmentQty: cleanValue(getVal('ShipmentQty'), 50),
                rnd: cleanValue(getVal('RnD'), 100),
                stockQty: cleanValue(getVal('StockQty'), 50),
                outputDate: parseExcelDate(getVal('OutputDate')),
                receiver: cleanValue(getVal('Receiver'), 255),
                employeeCode: cleanValue(getVal('EmployeeCode'), 50),
                billNo: cleanValue(getVal('BillNo'), 100),
                invoiceNo: cleanValue(getVal('InvoiceNo'), 100),
                remark: cleanValue(getVal('Remark'), 10000),
            };

            // Log nếu LotCode rỗng để debug
            if (!mapped.lotCode) {
                console.warn(`[importService] Row ${rowNumber} in sheet "${sheetName}" has empty LotCode. Column 9 value:`, values[9]);
            }

            batch.push(mapped);
            sheetRowCount++;

            if (batch.length >= BATCH_SIZE) {
                const toFlush = batch.splice(0, BATCH_SIZE);
                const p = flushBatch(pool, importId, fileName, toFlush)
                    .then((count) => { totalRows += count; })
                    .catch((err) => {
                        if (!streamError) streamError = err;
                    });
                flushPromises.push(p);
            }
        });

        wsReader.on('end', () => {
            if (sheetStats[sheetName]) {
                sheetStats[sheetName].rowsProcessed = sheetRowCount;
                if (sheetStats[sheetName].status === 'PROCESSING') {
                    sheetStats[sheetName].status = 'COMPLETED';
                }
            }
            console.log(`[importService] Sheet "${sheetName}" finished. Rows processed: ${sheetRowCount}`);
        });

        wsReader.on('error', (err) => {
            console.error(`[importService] Sheet "${sheetName}" error:`, err.message);
            if (!streamError) streamError = err;
        });
    });

    workbookReader.on('error', (err) => {
        streamError = err;
    });

        // Start streaming
    workbookReader.read();

    // Wait for the stream to finish (always listen for 'end')
    await new Promise((resolve, reject) => {
        workbookReader.on('end', resolve);
        workbookReader.on('error', reject);
    });

    // Check for streaming errors
    if (streamError) throw streamError;

    // Wait for all in-flight bulk-insert promises to settle
    if (flushPromises.length > 0) {
        await Promise.allSettled(flushPromises);
    }

    // Re-check for errors that occurred during flush
    if (streamError) throw streamError;

    // Flush any remaining rows
    if (batch.length > 0) {
        totalRows += await flushBatch(pool, importId, fileName, batch);
        batch = [];
    }

    // Log sheet statistics
    console.log(`[importService] Sheet statistics:`, JSON.stringify(sheetStats, null, 2));
    console.log(`[importService] Total rows staged: ${totalRows}`);

    // ----------------------------------------------------------------
    // 2. Call the stored procedure: validate → FK map → INSERT
    //    → update history → clean up staging.
    // ----------------------------------------------------------------
    const spRequest = pool.request();
    spRequest.input('ImportID', sql.Int, importId);
    spRequest.input('UserID', sql.Int, userId);

    const spResult = await spRequest.execute('dbo.sp_ProcessInventoryImport');

    // ----------------------------------------------------------------
    // 3. Clean up the uploaded temp file and the reordered copy (if any)
    // ----------------------------------------------------------------
    fs.unlink(filePath, (err) => {
        if (err) {
            console.error(`[importService] Failed to delete temp file ${filePath}:`, err.message);
        }
    });
    if (reorderedPath) {
        fs.unlink(reorderedPath, (err) => {
            if (err) {
                console.error(`[importService] Failed to delete reordered file ${reorderedPath}:`, err.message);
            }
        });
    }

    return {
        totalRows,
        spResult: spResult.recordset?.[0] || null,
        sheetStats,
    };
    } catch (err) {
        // Clean up temp files even on error
        fs.unlink(filePath, () => {});
        if (reorderedPath) {
            fs.unlink(reorderedPath, () => {});
        }
        throw err;
    }
}

module.exports = {
    processExcelStream,
    normalizeDate,
    parseExcelDate,
    cleanValue,
    createStagingTable,
    flushBatch,
    isEmptyRow,
    FIXED_COLUMN_MAP,
    BATCH_SIZE,
    HEADER_ROW,
    DATA_START_ROW,
};