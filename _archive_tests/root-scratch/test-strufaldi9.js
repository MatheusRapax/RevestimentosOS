const fs = require('fs');
const xlsx = require('xlsx');

const buffer = fs.readFileSync('./planilhas/TABELA COMPLETA STRUFALDI - BLACK (8).xlsx');
const wb = xlsx.read(buffer, { type: 'buffer' });
const ws = wb.Sheets['TABELA ATELIÊ STRUFALDI'];
const rows = xlsx.utils.sheet_to_json(ws, { header: 1, defval: '', raw: true });
console.log('Row 20:', rows[20]);
console.log('Row 21:', rows[21]);
console.log('Row 22:', rows[22]);
