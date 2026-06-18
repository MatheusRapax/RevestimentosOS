const xlsx = require('xlsx');
const workbook = xlsx.readFile('./TABELA COMPLETA STRUFALDI - BLACK (8).xlsx');

console.log("Sheet names:", workbook.SheetNames);

workbook.SheetNames.forEach(sheetName => {
    console.log(`\n\n--- Sheet: ${sheetName} ---`);
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
    // Print first 15 rows to see headers and some data
    const preview = data.slice(0, 15);
    preview.forEach((row, i) => {
        console.log(`Row ${i}:`, row);
    });
});
