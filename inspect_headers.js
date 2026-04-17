const xlsx = require('xlsx');
const workbook = xlsx.readFile('./TABELA COMPLETA STRUFALDI - BLACK (8).xlsx');
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];
const data = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: null });

// Let's find the header row by looking for "Ref" or "Código" or "EAN"
let headerRowIdx = -1;
for (let i = 0; i < 10; i++) {
   if (data[i] && data[i].some(cell => cell && typeof cell === 'string' && (cell.toLowerCase().includes('sku') || cell.toLowerCase().includes('código') || cell.toLowerCase().includes('ean')))) {
      headerRowIdx = i;
      break;
   }
}

if (headerRowIdx !== -1) {
   console.log(`Headers found at row ${headerRowIdx}:`);
   const headers = data[headerRowIdx];
   headers.forEach((h, i) => {
      console.log(`${i}: ${h}`);
   });
   console.log(`\nSample Data (row ${headerRowIdx + 1}):`);
   const sample = data[headerRowIdx + 1];
   sample.forEach((v, i) => {
      console.log(`${i}: ${headers[i]} = ${v}`);
   });
} else {
   console.log("Could not identify header row.");
}
