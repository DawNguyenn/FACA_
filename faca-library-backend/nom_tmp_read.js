// TEMP test doc sbn27 — se xoa sau
require('dotenv').config();
const jwt = require('jsonwebtoken');
const BASE = 'http://localhost:5000';
const token = jwt.sign({ userId: 1, roleId: 1, email: 'admin@test' }, process.env.JWT_SECRET || 'super_secret_key_faca_library', { expiresIn: '10m' });
const H = { Authorization: `Bearer ${token}` };

(async () => {
    for (const path of ['sbn27', 'sources', 'clo27']) {
        const r = await fetch(`${BASE}/api/warehouse/${path}?page=1&limit=2`, { headers: H });
        let j = { success: false };
        try { j = await r.json(); } catch (e) { j = { raw: 'not-json', status: r.status }; }
        console.log(`GET /${path} -> status=${r.status} success=${j.success} keys=${Object.keys(j).join(',')}${j.message ? ' msg=' + j.message : ''}`);
        if (j.pagination) console.log(`   pagination totalRows=${j.pagination.totalRows} page=${j.pagination.page} limit=${j.pagination.limit} totalCols=${j.pagination.totalColumns}`);
        if (Array.isArray(j.data) && j.data[0]) console.log('   row[0] keys:', Object.keys(j.data[0]).join('|'));
    }
    const r2 = await fetch(`${BASE}/api/warehouse/sbn27?all=1&limit=999`, { headers: H });
    const j2 = await r2.json();
    console.log(`GET /sbn27?all=1 -> status=${r2.status} success=${j2.success} rows=${Array.isArray(j2.data) ? j2.data.length : 'n/a'}`);
    process.exit(0);
})().catch((e) => { console.error('ERR:', e.message); process.exit(1); });