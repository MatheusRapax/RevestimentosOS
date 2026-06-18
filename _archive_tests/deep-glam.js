const xlsx = require('xlsx');
const wb = xlsx.readFile('./GLAM BRASIL 2025 - VAREJO.xlsx');
const sheet = wb.Sheets[wb.SheetNames[0]];
const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
// Show ALL rows to understand full structure
for (let i = 0; i < Math.min(60, data.length); i++) {
    const row = data[i];
    if (row && row.length > 0)
        console.log(`Row ${i} [${row.length}]: ${JSON.stringify(row)}`);
}
