// Script kiểm tra tạm — đối chiếu cấu trúc DB với STAGING_SOURCES
(async () => {
  const { poolPromise } = require('D:/faca-library/faca-library-backend/src/config/db');
  const { STAGING_SOURCES } = require('D:/faca-library/faca-library-backend/src/controllers/stagingDataController');

  const pool = await poolPromise;

  // 1. Danh sách bảng staging hiện có trong DB
  const tables = await pool.request().query(
    "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME LIKE 'Staging_%' ORDER BY TABLE_NAME"
  );
  console.log('=== BẢNG STAGING TRONG DB ===');
  tables.recordset.forEach((t) => console.log(' -', t.TABLE_NAME));

  // 2. Đối chiếu từng nguồn: cột cấu hình vs cột thực tế
  console.log('\n=== ĐỐI CHIẾU CỘT (config vs DB) ===');
  let allOk = true;
  for (const [key, src] of Object.entries(STAGING_SOURCES)) {
    const tableName = src.table.replace('dbo.', '');
    const cols = await pool.request().query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = '${tableName}' ORDER BY ORDINAL_POSITION`
    );
    const dbCols = cols.recordset.map((c) => c.COLUMN_NAME);
    const cfgCols = src.columns;
    const missingInCfg = dbCols.filter((c) => !cfgCols.includes(c));
    const missingInDb = cfgCols.filter((c) => !dbCols.includes(c));
    const ok = missingInCfg.length === 0 && missingInDb.length === 0;
    if (!ok) allOk = false;
    console.log(`${ok ? 'OK ' : 'MISMATCH'} ${key} (${tableName}) — DB: ${dbCols.length} cột, config: ${cfgCols.length} cột${ok ? '' : `\n    Thiếu trong config: ${missingInCfg.join(', ') || '(không)'}\n    Thiếu trong DB: ${missingInDb.join(', ') || '(không)'}`}`);
  }

  // 3. Đếm dòng dữ liệu từng bảng
  console.log('\n=== SỐ DÒNG DỮ LIỆU ===');
  for (const [key, src] of Object.entries(STAGING_SOURCES)) {
    const r = await pool.request().query(`SELECT COUNT(*) AS N FROM ${src.table}`);
    console.log(` - ${key.padEnd(10)} ${String(r.recordset[0].N).padStart(8)} dòng`);
  }

  // 4. Thử 1 truy vấn phân trang thật (giống listStaging)
  console.log('\n=== TEST TRUY VẤN PHÂN TRANG (nguồn chs) ===');
  const src = STAGING_SOURCES.chs;
  const colList = src.columns.map((c) => `[${c}]`).join(', ');
  const data = await pool.request()
    .input('Search', '%%')
    .input('Offset', 0)
    .input('Limit', 3)
    .query(`SELECT ${colList} FROM ${src.table} WHERE 1 = 1 ORDER BY ${src.orderBy} OFFSET @Offset ROWS FETCH NEXT @Limit ROWS ONLY;`);
  console.log(`Trả về ${data.recordset.length} dòng mẫu — OK`);

  // 5. Chi tiết Staging_TongTon (đang mismatch Change_Date)
  console.log('\n=== CHI TIẾT Staging_TongTon ===');
  const tt = await pool.request().query(
    "SELECT COLUMN_NAME, ORDINAL_POSITION FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='Staging_TongTon' ORDER BY ORDINAL_POSITION"
  );
  console.log(tt.recordset.map((x) => `${x.ORDINAL_POSITION}: ${x.COLUMN_NAME}`).join(' | '));
  const sample = await pool.request().query('SELECT TOP 2 * FROM Staging_TongTon');
  console.log(JSON.stringify(sample.recordset, null, 1));

  console.log(allOk ? '\n>>> TẤT CẢ KHỚP — SẴN SÀNG HIỂN THỊ FRONTEND' : '\n>>> CÓ MISMATCH — CẦN KIỂM TRA LẠI');
  process.exit(0);
})().catch((e) => { console.error('ERR:', e.message); process.exit(1); });
