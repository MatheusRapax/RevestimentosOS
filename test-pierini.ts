import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { ProductImportService } from './src/modules/stock/services/product-import.service';
import * as fs from 'fs';
import * as path from 'path';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const importer = app.get(ProductImportService);
  
  const buffer = fs.readFileSync(path.join(process.cwd(), 'BOUTIQUE BRASIL 2025- VAREJO DUEFRATELLI.xlsx'));
  console.log('Parsing file with PIERINI strategy...');
  const results = importer.processFile(buffer, 'PIERINI');
  
  console.log(`Parsed ${results.length} valid products from BOUTIQUE BRASIL spreadsheet.`);
  if (results.length > 0) {
      console.log('First Valid Product:', results[0]);
      console.log('Last Valid Product:', results[results.length - 1]);
  } else {
      console.log('Failed to parse any products!');
  }
  
  await app.close();
}
bootstrap().catch(console.error);
