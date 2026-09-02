const xlsx = require('xlsx');

const buffer = require('fs').readFileSync('./planilhas/TABELA COMPLETA STRUFALDI - BLACK (8).xlsx');
const wb = xlsx.read(buffer, { type: 'buffer' });
const ws = wb.Sheets['TABELA STRUFALDI - LINHA CONVEN'];
const rows = xlsx.utils.sheet_to_json(ws, { header: 1, defval: '', raw: true });
console.log('Row 3:', rows[3]);
console.log('Row 4:', rows[4]);
