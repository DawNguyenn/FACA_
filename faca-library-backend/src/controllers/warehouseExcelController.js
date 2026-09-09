// ================================================================
//  warehouseExcelController.js — Đọc & hiển thị file Excel quản lý kho
//  (D:\DAWN_ANIME_Warehouse_Management_System.xlsx) dưới dạng JSON.
// ================================================================
const XLSX = require('xlsx');

// FILE_PATH tuyệt đối trên máy — đọc trực tiếp từ ổ đĩa
const FILE_PATH = process.env.WAREHOUSE_EXCEL_PATH
    || 'D:\\DAWN_ANIME_Warehouse_Management_System.xlsx';

// Lỗi EBUSY / EACCES: file đang bị khóa bởi một chương trình khác (vd Excel)
const isFileLockError = (err) =>
    err &&
    (err.code === 'EBUSY' ||
        err.code === 'EACCES' ||
        err.code === 'EPERM' ||
        /EBUSY/.test(err.message || '') ||
        /being used by another process/i.test(err.message || ''));

// Trả về message thân thiện cho người dùng
const friendyError = (err) => {
    if (isFileLockError(err)) {
        return 'File Excel đang bị khóa hoặc đang mở. Vui lòng đóng file D:\\DAWN_ANIME_Warehouse_Management_System.xlsx trên máy tính rồi thử lại.';
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
const getSheetData = (req, res) => {
    try {
        const sheetName = req.query.name;
        const workbook = XLSX.readFile(FILE_PATH, { cellDates: true });
        const targetSheetName = sheetName || workbook.SheetNames[0];
        const sheet = workbook.Sheets[targetSheetName];

        if (!sheet) {
            return res.status(404).json({ success: false, message: `Sheet "${targetSheetName}" không tồn tại.` });
        }

        // - range: config số dòng tiêu đề thừa ở phía trên nếu có (mặc định auto-detect)
        //   Muốn bỏ X dòng rác đầu tiên: đặt range = X + 1 (sheet_to_json tính từ 1 trở đi)
        // - defval: "" => điền giá trị mặc định rỗng, đảm bảo đủ key cho mọi hàng
        // - raw: false => convert giá trị thành string (số -> text, ngày -> dd/MM/yyyy)
        // - dateNF: định dạng ngày tháng khi raw:false
        const range = parseInt(req.query.range, 10) || 0; // 0 => auto-detect
        const data = XLSX.utils.sheet_to_json(sheet, {
            defval: '',
            raw: false,
            dateNF: 'yyyy-mm-dd',
            ...(range ? { range } : {}),
        });

        res.json({ success: true, sheetName: targetSheetName, data });
    } catch (error) {
        console.error('Lỗi khi đọc dữ liệu sheet:', error);
        res.status(500).json({ success: false, error: friendyError(error) });
    }
};

module.exports = { getSheets, getSheetData, FILE_PATH };