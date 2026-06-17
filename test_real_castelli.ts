import { ExcelService } from './src/core/excel/excel.service';
import { ProductImportService } from './src/modules/stock/services/product-import.service';
import * as fs from 'fs';
import * as path from 'path';

async function run() {
  const excel = new ExcelService();
  const srv = new ProductImportService(excel as any);

  const filePath = path.join(__dirname, 'planilhas', 'Tabela Preços Castelli - Tab01 - +70m2.xlsx');
  const buffer = fs.readFileSync(filePath);
  
  const rows = excel.parseAllSheets(buffer);
  
  const results = (srv as any).parseStructured(rows);
  
  console.log(`Parsed ${results.length} products.`);
  if (results.length > 0) {
    console.log("First 3 items:");
    console.log(JSON.stringify(results.slice(0, 3), null, 2));
    
    console.log("Random 3 items:");
    console.log(JSON.stringify(results.slice(20, 23), null, 2));
  }
}

run().catch(console.error);
