const xlsx = require('xlsx');
const fs = require('fs');
const buffer = fs.readFileSync('./planilhas/TABELA COMPLETA STRUFALDI - BLACK (8).xlsx');
const wb = xlsx.read(buffer, { type: 'buffer' });
wb.SheetNames.forEach(name => {
  const ws = wb.Sheets[name];
  const rows = xlsx.utils.sheet_to_json(ws, { header: 1 });
  rows.forEach((row, i) => {
    row.forEach((cell, j) => {
      if (String(cell).includes('LANÇAMENTO 2026')) {
        console.log(`Found in sheet ${name}, row ${i}, col ${j}: ${cell}`);
      }
    });
  });
});
