require('dotenv').config();
const { poolPromise, sql } = require('./src/config/db');
const { resolveSource } = require('./src/controllers/stagingDataController');
(async () => {
    const pool = await poolPromise;
    const source = await resolveSource(pool, 'sbn27');
    if (!source) { console.log('KHONG TIM THAY source sbn27'); process.exit(1); }
    console.log('source columns:', JSON.stringify(source.columns));
    console.log('source.orderBy:', JSON.stringify(source.orderBy));
    console.log('source.table:', source.table);
    const GRID_MAX_ROWS = 3000;
    const limit = 2, page = 1;
    const search = '';
    const customCols = await pool.request().input('SourceKey', sql.NVarChar(30), 'sbn27').query('SELECT ColumnName FROM dbo.Staging_CustomColumns WHERE SourceKey = @SourceKey');
    const seenCols = new Set();
    const allColumns = [...source.columns, ...customCols.recordset.map((c) => c.ColumnName)].filter((c) => { const k = String(c).toLowerCase(); if (seenCols.has(k)) return false; seenCols.add(k); return true; });
    console.log('allColumns:', JSON.stringify(allColumns));
    const colList = ['[StagingID]', ...allColumns.map((c) => `[${c}]`)].join(', ');
    console.log('colList:', colList);
    try {
        const dataResult = await pool.request()
            .query(`SELECT ${colList} FROM ${source.table} ORDER BY ${source.orderBy} OFFSET 0 ROWS FETCH NEXT 2 ROWS ONLY;`);
        console.log('OK rows:', dataResult.recordset.length, 'keys:', dataResult.recordset[0] ? Object.keys(dataResult.recordset[0]).join('|') : 'none');
    } catch (e) {
        console.log('SELECT LOI:', e.message);
    }
    process.exit(0);
})().catch((e) => { console.error('FATAL:', e.message); process.exit(1); });