const xlsx = require('xlsx');

const filename = process.argv[2];
const workbook = xlsx.readFile(filename);
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const data = xlsx.utils.sheet_to_json(worksheet, { header: 1 });

console.log("SheetName:", sheetName);
console.log("Total rows:", data.length);
console.log("First 15 rows:");
for(let i = 0; i < Math.min(15, data.length); i++) {
    console.log(`Row ${i}:`, data[i]);
}
