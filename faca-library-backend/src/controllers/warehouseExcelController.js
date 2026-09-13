const XLSX = require('xlsx');

// FILE_PATH tuyệt đối trên máy 
const FILE_PATH = process.env.WAREHOUSE_EXCEL_PATH
    || 'D:\\Quan_Ly_Nguyen_Vat_Lieu_NPI.xlsx';

const isFileLockError = (err) =>
    err &&
    (err.code === 'EBUSY' ||
        err.code === 'EACCES' ||
        err.code === 'EPERM' ||
        /EBUSY/.test(err.message || '') ||
        /being used by another process/i.test(err.message || ''));

const friendyError = (err) => {
    if (isFileLockError(err)) {
        return 'File Excel đang bị khóa hoặc đang mở. Vui lòng đóng file D:\\Quan_Ly_Nguyen_Vat_Lieu_NPI.xlsx trên máy tính rồi thử lại.';
    }
    if (err && err.code === 'ENOENT') {
        return `Không tìm thấy file Excel: ${FILE_PATH}`;
    }
    return err.message || 'Có lỗi xảy ra khi đọc file Excel.';
};

// API 1: GET /api/sheets — danh sách tất cả SheetName trong workbook
const getSheets = (req, res) => {
    try {
        const workbook = XLSX.readFile(FILE_PATH, { cellDates: true });
        res.json({ success: true, sheets: workbook.SheetNames });
    } catch (error) {
        console.error('Lỗi khi đọc danh sách sheets:', error);
        res.status(500).json({ success: false, message: friendyError(error) });
    }
};

// API 2: GET /api/sheet-data?name={sheetName} — dữ liệu của 1 sheet
// Trả về { title, subtitle, headers, data }:
//  - title/subtitle: 2 dòng tiêu đề merged phía trên bảng (nếu có)
//  - headers: hàng tiêu đề cột (hàng đầu tiên có >= 5 ô không trống)
//  - data: các dòng dữ liệu bên dưới headers (bỏ dòng trống)
const getSheetData = (req, res) => {
    try {
        const sheetName = req.query.name;
        const workbook = XLSX.readFile(FILE_PATH, { cellDates: true });
        const targetSheetName = sheetName || workbook.SheetNames[0];
        const sheet = workbook.Sheets[targetSheetName];

        if (!sheet) {
            return res.status(404).json({ success: false, message: `Sheet "${targetSheetName}" không tồn tại.` });
        }

        // Đọc toàn bộ sheet dạng mảng 2 chiều
        const aoa = XLSX.utils.sheet_to_json(sheet, {
            header: 1,
            defval: '',
            raw: false,
            dateNF: 'yyyy-mm-dd',
        });

        const headerIdx = aoa.findIndex(
            (row) => row.filter((c) => String(c).trim() !== '').length >= 5
        );

        if (headerIdx === -1) {
            return res.status(404).json({ success: false, message: `Sheet "${targetSheetName}" không có hàng tiêu đề cột.` });
        }

        const headers = aoa[headerIdx].map((h) => String(h).trim());
        const title = String(aoa[0]?.[0] || '').trim();
        const subtitle = String(aoa[1]?.[0] || '').trim();

        // Chuyển toàn bộ dòng dữ liệu thành object, bỏ dòng trống
        let rows = aoa
            .slice(headerIdx + 1)
            .filter((row) => row.some((c) => String(c).trim() !== ''))
            .map((row) => {
                const obj = {};
                headers.forEach((h, i) => { obj[h] = row[i] ?? ''; });
                return obj;
            });

        // Phân trang + tìm kiếm (server-side để giảm RAM trình duyệt)
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.min(500, Math.max(1, parseInt(req.query.limit, 10) || 50));
        const search = String(req.query.search || '').trim().toLowerCase();

        if (search) {
            rows = rows.filter((row) =>
                headers.some((h) => String(row[h] ?? '').toLowerCase().includes(search))
            );
        }

        const totalRows = rows.length;
        const totalPages = Math.max(1, Math.ceil(totalRows / limit));
        const safePage = Math.min(page, totalPages);
        const data = rows.slice((safePage - 1) * limit, safePage * limit);

        res.json({
            success: true,
            sheetName: targetSheetName,
            title,
            subtitle,
            headers,
            data,
            pagination: { page: safePage, limit, totalRows, totalPages },
        });
    } catch (error) {
        console.error('Lỗi khi đọc dữ liệu sheet:', error);
        res.status(500).json({ success: false, error: friendyError(error) });
    }
};
module.exports = { getSheets, getSheetData, FILE_PATH };