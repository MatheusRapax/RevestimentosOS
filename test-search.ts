import * as path from 'path';
import * as fs from 'fs';
import { ExcelService } from './src/core/excel/excel.service';

async function main() {
  const excel = new ExcelService();
  const filePath = path.join(__dirname, 'planilhas', 'Tabela Preços Castelli - Tab01 - +70m2.xlsx');
  const buffer = fs.readFileSync(filePath);
  const rows = excel.parseAllSheets(buffer);
  
  for (let i = 500; i < 560; i++) {
    console.log(`Row ${i}:`, rows[i].join(' | '));
  }
}
main();
