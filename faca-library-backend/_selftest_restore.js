/**
 * Self-test Khoi phuc nhat ky (chay tay, khong dua vao production):
 *   Set-Location backend; node .\_selftest_restore.js
 * Verify: listAuditLogs ISO-Z + restored_indexes · bulk DELETE/UPDATE theo dong
 *   (changeIndex) · DELETE/UPDATE don · cac nhanh loi 400/404/409.
 */
const { sql, poolPromise } = require('./src/config/db');
const {
    listAuditLogs, ensureAuditLogsSchema, AUDIT_TABLE,
} = require('./src/services/auditLogService');
const { restoreAuditLogHandler } = require('./src/controllers/stagingDataController');

const TEST_TABLE = '__rt_idx_test';
let pass = 0;
let fail = 0;
const check = (name, cond, extra = '') => {
    if (cond) { pass += 1; console.log(`  PASS  ${name}`); }
    else { fail += 1; console.log(`  FAIL  ${name} ${extra}`); }
};
const makeRes = () => ({
    code: 200,
    out: null,
    status(c) { this.code = c; return this; },
    json(o) { this.out = o; return o; },
});
const mkReq = (id, body) => ({
    params: { id: String(id) },
    body: body || {},
    user: { userId: 1, email: 'selftest@test.local' },
    headers: {},
    socket: { remoteAddress: '127.0.0.1' },
    ip: '127.0.0.1',
});
const callRestore = async (id, body) => {
    const res = makeRes();
    await restoreAuditLogHandler(mkReq(id, body), res);
    return res;
};
const insertAudit = async (pool, table, recordId, action, payload) => {
    const r = await pool.request()
        .input('T', sql.VarChar(100), table)
        .input('R', sql.VarChar(100), recordId)
        .input('A', sql.VarChar(20), action)
        .input('J', sql.NVarChar(sql.MAX), JSON.stringify(payload))
        .query(`INSERT INTO ${AUDIT_TABLE} (table_name, record_id, action_type, changes_json)
                OUTPUT INSERTED.audit_id
                VALUES (@T, @R, @A, @J);`);
    return Number(r.recordset[0].audit_id);
};
const getAudit = async (pool, id) => {
    const r = await pool.request()
        .input('Id', sql.BigInt, id)
        .query(`SELECT restored_at, restored_indexes FROM ${AUDIT_TABLE} WHERE audit_id = @Id;`);
    return r.recordset[0] || {};
};
const countRows = async (pool) => {
    const r = await pool.request().query(`SELECT COUNT(*) AS C FROM dbo.${TEST_TABLE};`);
    return r.recordset[0].C;
};

(async () => {
    const pool = await poolPromise;
    try {
        await ensureAuditLogsSchema(pool);
        await pool.request().query(`
            IF OBJECT_ID('dbo.${TEST_TABLE}') IS NOT NULL DROP TABLE dbo.${TEST_TABLE};
            CREATE TABLE dbo.${TEST_TABLE} (
                StagingID BIGINT IDENTITY(1,1) PRIMARY KEY,
                ColA NVARCHAR(50) NULL,
                ColB NVARCHAR(50) NULL
            );
            INSERT INTO dbo.${TEST_TABLE} (ColA, ColB) VALUES (N'a1', N'b1'), (N'a2', N'b2'), (N'a3', N'b3');
        `);

        console.log('\n[1] listAuditLogs: ISO-8601 UTC Z + restored_indexes');
        const tz = await pool.request().query(
            `SELECT DATEDIFF(minute, SYSUTCDATETIME(), GETDATE()) AS utc_off,
                    CONVERT(varchar(33), GETDATE(), 126) AS sv;`);
        const off = tz.recordset[0].utc_off;
        console.log('      server GETDATE =', tz.recordset[0].sv, '| off(min) =', off, off > 0 ? '(ICT/Viet Nam)' : '');
        check('offset server > 0 (muc gio dia phuong)', off > 0, `off=${off}`);

        const idT1 = await insertAudit(pool, TEST_TABLE, '0', 'UPDATE', [{ field: 'ColA', old: 'x', new: 'y' }]);
        const lst = await listAuditLogs(pool, { page: 1, limit: 1, tableName: TEST_TABLE });
        const fresh = (lst.logs || [])[0] || {};
        check('changed_at ISO ...Z', /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/.test(String(fresh.changed_at)), String(fresh.changed_at));
        check("cot 'restored_indexes' co trong ket qua", 'restored_indexes' in fresh, Object.keys(fresh).join(','));
        const w = await pool.request().query(
            `SELECT CONVERT(varchar(33), changed_at, 126) AS wall FROM ${AUDIT_TABLE} WHERE audit_id = ${idT1};`);
        const expected = Date.parse(`${w.recordset[0].wall}Z`) - off * 60000;
        check('UTC = wall-clock - offset (khop 1s)', Math.abs(Date.parse(String(fresh.changed_at)) - expected) < 1000,
            `${fresh.changed_at} vs wall ${w.recordset[0].wall}`);
        console.log('      changed_at =', fresh.changed_at);

        console.log('\n[2] Bulk DELETE khoi phuc theo dong (changeIndex)');
        const idBulk = await insertAudit(pool, TEST_TABLE, '*', 'DELETE', {
            summary: { mode: 'sync', deleted_count: 2, rowsDeleted: 2 },
            truncated: false,
            changes: [
                { type: 'DELETE', row_identifier: 'Row #9001 (ColA=a1)', data: { ColA: 'a1', ColB: 'b1' } },
                { type: 'DELETE', row_identifier: 'Row #9002 (ColA=a2)', data: { ColA: 'a2', ColB: 'b2' } },
            ],
        });
        await pool.request().query(`DELETE FROM dbo.${TEST_TABLE} WHERE ColA IN (N'a1', N'a2');`);
        check('setup: con 1 dong', (await countRows(pool)) === 1);

        let r = await callRestore(idBulk, { changeIndex: 0 });
        check('changeIndex=0 -> 200', r.code === 200 && r.out && r.out.success, JSON.stringify(r.out));
        check('chi chen 1 dong (tong 2)', (await countRows(pool)) === 2, `count=${await countRows(pool)}`);
        let a = await getAudit(pool, idBulk);
        check("restored_indexes='[0]'", a.restored_indexes === '[0]', String(a.restored_indexes));
        check('restored_at van NULL (dho dang)', a.restored_at === null, String(a.restored_at));

        r = await callRestore(idBulk, { changeIndex: 0 });
        check('changeIndex=0 lan 2 -> 409', r.code === 409, `code=${r.code}`);
        check('khong chen trung dong', (await countRows(pool)) === 2, `count=${await countRows(pool)}`);

        r = await callRestore(idBulk, {});
        check('khoi phuc not (toan bo) -> 200', r.code === 200 && r.out && r.out.success, JSON.stringify(r.out));
        check('du 3 dong (a1,a2,a3)', (await countRows(pool)) === 3, `count=${await countRows(pool)}`);
        a = await getAudit(pool, idBulk);
        check("restored_indexes='[0,1]'", a.restored_indexes === '[0,1]', String(a.restored_indexes));
        check('restored_at da set (du dong)', a.restored_at !== null, String(a.restored_at));
        r = await callRestore(idBulk, {});
        check('goi lan nua -> 409', r.code === 409, `code=${r.code}`);

        console.log('\n[3] DELETE don khoi phuc');
        const sid3 = Number((await pool.request().query(
            `SELECT StagingID FROM dbo.${TEST_TABLE} WHERE ColA = N'a3';`)).recordset[0].StagingID);
        const idDel1 = await insertAudit(pool, TEST_TABLE, String(sid3), 'DELETE',
            { StagingID: sid3, ColA: 'a3', ColB: 'b3' });
        await pool.request().query(`DELETE FROM dbo.${TEST_TABLE} WHERE StagingID = ${sid3};`);
        check('setup: a3 da xoa', (await countRows(pool)) === 2);
        r = await callRestore(idDel1, {});
        check('DELETE don -> 200', r.code === 200 && r.out && r.out.success, JSON.stringify(r.out));
        const back3 = await pool.request().query(`SELECT ColB FROM dbo.${TEST_TABLE} WHERE StagingID = ${sid3};`);
        check('dong tro lai StagingID cu', back3.recordset.length === 1 && back3.recordset[0].ColB === 'b3',
            JSON.stringify(back3.recordset));
        a = await getAudit(pool, idDel1);
        check('restored_at set (don)', a.restored_at !== null, String(a.restored_at));

        console.log('\n[4] UPDATE don khoi phuc');
        const sidA1 = Number((await pool.request().query(
            `SELECT StagingID FROM dbo.${TEST_TABLE} WHERE ColA = N'a1';`)).recordset[0].StagingID);
        await pool.request().query(`UPDATE dbo.${TEST_TABLE} SET ColB = N'b1-EDIT' WHERE StagingID = ${sidA1};`);
        const idUpd1 = await insertAudit(pool, TEST_TABLE, String(sidA1), 'UPDATE',
            [{ field: 'ColB', old: 'b1', new: 'b1-EDIT' }]);
        r = await callRestore(idUpd1, {});
        check('UPDATE don -> 200', r.code === 200 && r.out && r.out.success, JSON.stringify(r.out));
        const b1 = await pool.request().query(`SELECT ColB FROM dbo.${TEST_TABLE} WHERE StagingID = ${sidA1};`);
        check('ColB ve b1', b1.recordset[0].ColB === 'b1', String(b1.recordset[0].ColB));

        console.log('\n[5] Bulk UPDATE khoi phuc theo dong');
        await pool.request().query(
            `UPDATE dbo.${TEST_TABLE} SET ColB = N'b1-BULK' WHERE StagingID = ${sidA1};
             UPDATE dbo.${TEST_TABLE} SET ColA = N'a3-BULK' WHERE StagingID = ${sid3};`);
        const idBulkUpd = await insertAudit(pool, TEST_TABLE, '*', 'UPDATE', {
            summary: { mode: 'sync', updated_count: 2, rowsUpdated: 2 },
            truncated: false,
            changes: [
                { type: 'UPDATE', row_identifier: `Row #${sidA1} (ColA=a1)`, fields: [{ field: 'ColB', old_value: 'b1', new_value: 'b1-BULK' }] },
                { type: 'UPDATE', row_identifier: `Row #${sid3} (ColA=a3)`, fields: [{ field: 'ColA', old_value: 'a3', new_value: 'a3-BULK' }] },
            ],
        });
        r = await callRestore(idBulkUpd, { changeIndex: 1 });
        check('bulk UPDATE changeIndex=1 -> 200', r.code === 200 && r.out && r.out.success, JSON.stringify(r.out));
        check('message co phan bo qua', /1\/2/.test(String(r.out && r.out.message)), String(r.out && r.out.message));
        const a3v = await pool.request().query(`SELECT ColA FROM dbo.${TEST_TABLE} WHERE StagingID = ${sid3};`);
        check('a3 da revert', a3v.recordset[0].ColA === 'a3', String(a3v.recordset[0].ColA));
        const a1v = await pool.request().query(`SELECT ColB FROM dbo.${TEST_TABLE} WHERE StagingID = ${sidA1};`);
        check('a1 CHUA revert', a1v.recordset[0].ColB === 'b1-BULK', String(a1v.recordset[0].ColB));
        a = await getAudit(pool, idBulkUpd);
        check("restored_indexes='[1]' do dang", a.restored_indexes === '[1]', String(a.restored_indexes));
        check('restored_at NULL (bulk UPDATE do dang)', a.restored_at === null, String(a.restored_at));

        r = await callRestore(idBulkUpd, { changeIndex: 0 });
        check('khoi phuc not changeIndex=0 -> 200', r.code === 200 && r.out && r.out.success, JSON.stringify(r.out));
        const a1v2 = await pool.request().query(`SELECT ColB FROM dbo.${TEST_TABLE} WHERE StagingID = ${sidA1};`);
        check('a1 da revert', a1v2.recordset[0].ColB === 'b1', String(a1v2.recordset[0].ColB));
        a = await getAudit(pool, idBulkUpd);
        check('[0,1] + restored_at set', a.restored_indexes === '[0,1]' && a.restored_at !== null,
            `${a.restored_indexes}/${a.restored_at}`);

        console.log('\n[6] Truong hop loi');
        const idBad1 = await insertAudit(pool, TEST_TABLE, String(sidA1), 'UPDATE',
            [{ field: 'ColB', old: 'b1', new: 'x' }]);
        r = await callRestore(idBad1, { changeIndex: 0 });
        check('changeIndex tren log don -> 400', r.code === 400, `code=${r.code}`);
        r = await callRestore(idBad1, { changeIndex: 1.5 });
        check('changeIndex le -> 400', r.code === 400, `code=${r.code}`);
        r = await callRestore(999999999, {});
        check('id khong ton tai -> 404', r.code === 404, `code=${r.code}`);
        const idBulk2 = await insertAudit(pool, TEST_TABLE, '*', 'DELETE', {
            summary: { mode: 'sync', deleted_count: 1, rowsDeleted: 1 },
            truncated: false,
            changes: [{ type: 'DELETE', row_identifier: 'Row #1', data: { ColA: 'z', ColB: 'z' } }],
        });
        r = await callRestore(idBulk2, { changeIndex: 5 });
        check('changeIndex vuot qua -> 400', r.code === 400, `code=${r.code}`);
    } catch (e) {
        fail += 1;
        console.log('EXCEPTION:', (e && e.stack) || e);
    } finally {
        try {
            const pool = await poolPromise;
            console.log('\n[CLEANUP]');
            await pool.request().query(`IF OBJECT_ID('dbo.${TEST_TABLE}') IS NOT NULL DROP TABLE dbo.${TEST_TABLE};`);
            await pool.request().query(`DELETE FROM ${AUDIT_TABLE} WHERE table_name = '${TEST_TABLE}';`);
            console.log('  da xoa bang test + log test');
        } catch (e) {
            console.log('  cleanup loi:', e.message);
        }
        console.log(`\n=== RESULT: ${pass} PASS / ${fail} FAIL ===`);
        process.exit(fail ? 1 : 0);
    }
})();

