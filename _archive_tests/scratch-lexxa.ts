import * as xlsx from 'xlsx';
const buf = require('fs').readFileSync('TABELA LEXXA BAGNO Maranhão.xlsx');
const workbook = xlsx.read(buf, { type: 'buffer' });
const firstSheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[firstSheetName];
const jsonData = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
for (let i = 0; i < 20; i++) {
  console.log(`Row ${i}:`, jsonData[i]);
}
