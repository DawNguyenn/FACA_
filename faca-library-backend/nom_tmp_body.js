// TEMP test — se xoa sau
require('dotenv').config();
const jwt = require('jsonwebtoken');
const BASE = 'http://localhost:5000';
const token = jwt.sign({ userId: 1, roleId: 1, email: 'admin@test' }, process.env.JWT_SECRET || 'super_secret_key_faca_library', { expiresIn: '10m' });
const H = { Authorization: `Bearer ${token}` };
(async () => {
    const r = await fetch(`${BASE}/api/warehouse/sbn27?page=1&limit=2`, { headers: H });
    const text = await r.text();
    console.log('STATUS:', r.status, 'CT:', r.headers.get('content-type'));
    console.log('BODY (first 1200):'); 
    console.log(text.slice(0, 1200));
    process.exit(0);
})().catch((e) => { console.error('ERR:', e.message); process.exit(1); });