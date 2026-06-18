import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { ProductImportService } from './src/modules/stock/services/product-import.service';
import * as path from 'path';
import * as fs from 'fs';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const service = app.get(ProductImportService);
  const filePath = path.join(__dirname, 'planilhas', 'Castelli.xlsx');
  const buffer = fs.readFileSync(filePath);
  
  const results = service.processFile(buffer, 'CASTELLI');
  console.log('Total results:', results.length);
  console.log('Sample:');
  console.log(results.slice(0, 5).map(r => ({ sku: r.sku, name: r.name, m2: r.boxCoverage, pieces: r.piecesPerBox, cost: r.costCents })));
  await app.close();
}
main();
