const fs = require('fs');
const xlsx = require('xlsx');

const buffer = fs.readFileSync('./planilhas/TABELA COMPLETA STRUFALDI - BLACK (8).xlsx');
const wb = xlsx.read(buffer, { type: 'buffer' });
const ws = wb.Sheets['TABELA ATELIÊ STRUFALDI'];
const rows = xlsx.utils.sheet_to_json(ws, { header: 1, defval: '', raw: true });

let custoIdx = -1;
let precoNotaIdx = -1;

const headers = rows[2]; // assuming row index 2 is headers
for (let i = 0; i < headers.length; i++) {
   if (headers[i] === 'Preço Custo') custoIdx = i;
   if (headers[i] && headers[i].includes('Preço de nota')) precoNotaIdx = i;
}

console.log('Preço Custo index:', custoIdx);
console.log('Preço de nota index:', precoNotaIdx);

let precoCustoCount = 0;
let precoNotaCount = 0;

for (let i = 3; i < rows.length; i++) {
   if (custoIdx !== -1 && rows[i][custoIdx]) precoCustoCount++;
   if (precoNotaIdx !== -1 && rows[i][precoNotaIdx]) precoNotaCount++;
}

console.log('Rows with Preço Custo populated:', precoCustoCount);
console.log('Rows with Preço de nota populated:', precoNotaCount);
