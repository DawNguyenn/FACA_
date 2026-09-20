// Smoke test các handler mới của stagingDataController (không cần chạy server)
const ctrl = require('../src/controllers/stagingDataController');

const makeRes = () => {
    const res = { statusCode: 200, body: null };
    res.status = (code) => { res.statusCode = code; return res; };
    res.json = (b) => { res.body = b; return res; };
    return res;
};

(async () => {
    // 1. INSERT dòng mới vào Staging_SBN27
    const insRes = makeRes();
    await ctrl.insertStagingRowHandler(
        { params: { source: 'sbn27' }, body: { values: { Model: 'TEST-INSERT', Build: 'SMOKE', Material: 'Smoke Material', Vendor: 'Goertek', Ghi_Chu: 'test inline edit' } } },
        insRes
    );
    console.log('INSERT:', insRes.statusCode, JSON.stringify(insRes.body));
    const newId = insRes.body && insRes.body.StagingID;

    // 2. UPDATE dòng vừa thêm
    const updRes = makeRes();
    await ctrl.updateStagingRowHandler(
        { params: { source: 'sbn27', id: String(newId) }, body: { values: { Ghi_Chu: 'đã sửa qua API', Qty_Ton_Kho: '999' } } },
        updRes
    );
    console.log('UPDATE:', updRes.statusCode, JSON.stringify(updRes.body));

    // 3. UPDATE với cột không được phép (bảo mật)
    const badRes = makeRes();
    await ctrl.updateStagingRowHandler(
        { params: { source: 'sbn27', id: String(newId) }, body: { values: { Model: 'HACK; DROP TABLE users' } } },
        badRes
    );
    console.log('UPDATE-OK-COL:', badRes.statusCode, JSON.stringify(badRes.body));

    // 4. Thêm cột động
    const colRes = makeRes();
    await ctrl.addStagingColumnHandler(
        { params: { source: 'sbn27' }, body: { columnName: 'Test_Col_Smoke', label: 'Cột test', dataType: 'NVARCHAR(255)' } },
        colRes
    );
    console.log('ADD-COLUMN:', colRes.statusCode, JSON.stringify(colRes.body));

    // 5. Thêm cột trùng (409)
    const colDupRes = makeRes();
    await ctrl.addStagingColumnHandler(
        { params: { source: 'sbn27' }, body: { columnName: 'Test_Col_Smoke' } },
        colDupRes
    );
    console.log('ADD-COLUMN-DUP:', colDupRes.statusCode, JSON.stringify(colDupRes.body));

    // 6. Kiểm tra dữ liệu trong DB sau thao tác
    const { sql, poolPromise } = require('../src/config/db');
    const pool = await poolPromise;
    const chk = await pool.request()
        .input('Id', sql.BigInt, newId)
        .query("SELECT StagingID, Model, Build, Ghi_Chu, Qty_Ton_Kho FROM dbo.Staging_SBN27 WHERE StagingID = @Id");
    console.log('VERIFY-ROW:', JSON.stringify(chk.recordset[0]));

    // 7. Dọn dẹp: xóa dòng test + xóa cột test + xóa metadata
    await pool.request().input('Id', sql.BigInt, newId).query('DELETE FROM dbo.Staging_SBN27 WHERE StagingID = @Id');
    await pool.request().query('ALTER TABLE dbo.Staging_SBN27 DROP COLUMN Test_Col_Smoke');
    await pool.request().query("DELETE FROM dbo.Staging_CustomColumns WHERE SourceKey = 'sbn27' AND ColumnName = 'Test_Col_Smoke'");
    console.log('CLEANUP DONE');
    process.exit(0);
})().catch((e) => { console.error('FAILED:', e.message); process.exit(1); });
