// TEMP fix — cắt khối code dán nhầm trong listStaging (sẽ xoá sau)
const fs = require('fs');
const p = 'src/controllers/stagingDataController.js';
const lines = fs.readFileSync(p, 'utf8').split(/\r?\n/);
const spliceLine0 = 257; // index 257 = dòng 258 (1-based)
const spliceEnd0 = 274;  // index 274 = dòng 275 (1-based)
const block = [
    '        return res.json({',
    '            success: true,',
    '            source: sourceKey,',
    '            columns: source.columns,',
    '            customColumns: customCols,',
    '            data: dataResult.recordset,',
    '            pagination: {',
    '                page: safePage,',
    '                limit,',
    '                totalRows,',
    '                totalPages,',
    '                hasNextPage: safePage < totalPages,',
    '                totalColumns: allColumns.length,',
    "                all: req.query.all === '1' ? 1 : 0,",
    '            },',
    '        });',
];
if (String(lines[spliceLine0]).includes('let message;')) {
    const removed = lines.slice(spliceLine0, spliceEnd0 + 1);
    const outLines = lines.slice(0, spliceLine0).concat(block, lines.slice(spliceEnd0 + 1));
    fs.writeFileSync(p, outLines.join('\n'), 'utf8');
    console.log('OK thay', removed.length, 'dong. Dong sau cat la:', JSON.stringify(outLines[spliceLine0 + block.length]));
    console.log('Dong dong 258 moi:', JSON.stringify(outLines[spliceLine0]));
} else {
    console.log('VAN DE: dong 258 khong phai let message; ->', JSON.stringify(lines[spliceLine0]));
    process.exit(2);
}