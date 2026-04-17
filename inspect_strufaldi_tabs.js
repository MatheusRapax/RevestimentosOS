const xlsx = require('xlsx');
const workbook = xlsx.readFile('./TABELA COMPLETA STRUFALDI - BLACK (8).xlsx');
console.log("Sheet names:");
workbook.SheetNames.forEach((sheetName, idx) => {
   const sheet = workbook.Sheets[sheetName];
   const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
   console.log(`\nTab ${idx}: ${sheetName} -> ${data.length} rows`);
});
