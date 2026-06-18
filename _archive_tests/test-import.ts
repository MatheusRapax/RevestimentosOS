import { ProductImportService } from './src/modules/stock/services/product-import.service';
import { ExcelService } from './src/core/excel/excel.service';

async function run() {
  const excelService = new ExcelService();
  const productImportService = new ProductImportService(excelService);

  try {
    const fs = require('fs');
    const buffer = fs.readFileSync('./planilhas/TABELA PRECO DECA METAIS.xlsx');
    
    console.log("Testing processFile for DECA...");
    const result = productImportService.processFile(buffer, 'DECA');
    console.log("Template valid! Parsed", result.length, "items.");
    if (result.length > 0) {
      console.log("Sample items:", JSON.stringify(result.slice(0, 3), null, 2));
    }
  } catch (error) {
    console.error("Error parsing DECA:", error);
  }
}

run();
