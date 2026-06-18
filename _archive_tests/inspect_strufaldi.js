const xlsx = require('xlsx');
const workbook = xlsx.readFile('./TABELA COMPLETA STRUFALDI - BLACK (8).xlsx');
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
const headers = data[2];
const map = {};
headers.forEach((h, i) => map[h] = i);
console.log(JSON.stringify(map, null, 2));
