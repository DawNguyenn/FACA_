const XLSX = require('d:/faca-library/faca-library-backend/node_modules/xlsx');
const wb = XLSX.readFile('d:/Quan_Ly_Nguyen_Vat_Lieu_NPI.xlsx', { cellFormula: true });
const ws = wb.Sheets['CHS'];
// Cột 17 (index 16) = cột Q (Tổng Qty Tồn Cả Đơn)
for (let r = 5; r <= 12; r++) {
    const cell = ws['Q' + r];
    console.log('Q' + r, cell ? JSON.stringify({ v: cell.v, f: cell.f, t: cell.t }) : '(trống)');
}
// Cột P (Tồn kho = 16) & L (Qty Tồn Kho = 12) để so công thức
console.log('--- P (Ghi Chú?) ---');
for (let r = 4; r <= 6; r++) console.log('P' + r, ws['P' + r] ? JSON.stringify(ws['P' + r]) : '(trống)');
// header theo ký tự
const hdr = ['O', 'P', 'Q', 'R', 'S'].map((c) => c + '3 = ' + (ws[c + '3'] ? ws[c + '3'].v : '?'));
console.log(hdr.join('\n'));
