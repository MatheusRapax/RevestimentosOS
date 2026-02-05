import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

const directory = "/home/matheus/Área de trabalho/ERP-Geral/revestimentos/planilhas";
const files = [
    "BOUTIQUE BRASIL 2025 - VAREJO PIERINI.xlsx",
    "Tabela Preços Castelli - Tab01 - +70m2.xlsx",
    "Tabela Preço Embramaco Porcelanato - Tab01_Nova Politica_Jan2025.xls"
];

files.forEach(filename => {
    console.log(`\n\n--- Analyzing: ${filename} ---`);
    const filePath = path.join(directory, filename);

    try {
        const workbook = XLSX.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];

        // Convert to array of arrays
        const data = XLSX.utils.sheet_to_json(sheet, { header: 1, range: 0, defval: "" });

        console.log(`First 5 rows (to identify header):`);
        for (let i = 0; i < Math.min(10, data.length); i++) {
            console.log(`Row ${i}:`, JSON.stringify(data[i]));
        }

    } catch (e) {
        console.error(`Error processing ${filename}:`, e.message);
    }
});
