import { ExcelService } from './src/core/excel/excel.service';
import * as path from 'path';
import * as fs from 'fs';

const excelService = new ExcelService();

function parseStrufaldi(rows: any[]) {
    const results: any[] = [];
    // Header is at row index 2. Data starts at 3.
    const startIndex = rows.length > 3 ? 3 : 0;

    for (let i = startIndex; i < rows.length; i++) {
      const row = rows[i];
      if (!row || !Array.isArray(row) || row.length < 13) continue;

      const sku = String(row[1] || '').trim();
      const name = String(row[2] || '').trim();
      const cost = excelService.parseNumber(row[12]);

      if (!sku || !name || cost <= 0) continue;
      // Skip header rows
      if (sku === 'Código Fabricante' || name === 'Descrição Curta') continue;

      const line = String(row[20] || '').trim();
      const format = String(row[21] || '').trim();
      const boxCoverage = excelService.parseNumber(row[31]);
      const piecesPerBox = Math.round(excelService.parseNumber(row[32]));
      const palletM2 = excelService.parseNumber(row[30]);
      const palletBoxes = boxCoverage > 0 ? Math.round(palletM2 / boxCoverage) : 0;
      const boxWeight = excelService.parseNumber(row[9]);
      const usage = String(row[22] || '').trim(); // Tipo (Piso, Parede, etc)

      results.push({
        sku,
        supplierCode: sku,
        name,
        format,
        line,
        piecesPerBox,
        boxCoverage,
        palletBoxes,
        boxWeight,
        usage,
        costCents: Math.round(cost * 100),
      });
    }
    return results;
}

const filePath = path.join(process.cwd(), 'planilhas', 'TABELA COMPLETA STRUFALDI - BLACK (8).xlsx');
const buf = fs.readFileSync(filePath);
const rows = excelService.parseMultipleSheets(buf, [
  'TABELA ATELIÊ STRUFALDI',
  'TABELA STRUFALDI - LINHA CONVEN',
  'CANTONEIRA',
]);

const results = parseStrufaldi(rows);
const targets = ["TURIM", "NERO", "MARSALA"];
const found = results.filter((r: any) => targets.some(t => r.name.includes(t) && r.name.includes("15X15")));
console.log("Parsed result for targets:", found);
