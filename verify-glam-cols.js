const xlsx = require('xlsx');
const wb = xlsx.readFile('./GLAM BRASIL 2025 - VAREJO.xlsx');
const sheet = wb.Sheets[wb.SheetNames[0]];
const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
console.log("=== GLAM HEADERS ===");
for (let i = 0; i < 6; i++) {
    if (data[i] && data[i].length > 0)
        console.log(`Row ${i}: ${JSON.stringify(data[i])}`);
}
console.log("\n=== FIRST PRODUCTS ===");
for (let i = 3; i < 12; i++) {
    if (data[i] && data[i].length > 3)
        console.log(`Row ${i}: col4="${data[i][4]}" col5="${data[i][5]}" col6="${data[i][6]}" col9="${data[i][9]}"`);
}
