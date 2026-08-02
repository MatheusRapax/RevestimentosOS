const xlsx = require('xlsx');

const buffer = require('fs').readFileSync('./planilhas/TABELA COMPLETA STRUFALDI - BLACK (8).xlsx');
const wb = xlsx.read(buffer, { type: 'buffer' });
const ws = wb.Sheets['CANTONEIRA'];
const rows = xlsx.utils.sheet_to_json(ws, { header: 1, defval: '', raw: true });
console.log(`CANTONEIRA has ${rows.length} rows.`);
console.log('Row 2:', rows[2]);
console.log('Row 3:', rows[3]);
console.log('Row 4:', rows[4]);
console.log('Row 5:', rows[5]);
console.log('Row 6:', rows[6]);
