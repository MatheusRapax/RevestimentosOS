import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { ProductImportService } from './src/modules/stock/services/product-import.service';
import * as fs from 'fs';
import * as path from 'path';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const importer = app.get(ProductImportService);
  
  const buffer = fs.readFileSync(path.join(process.cwd(), 'TABELA COMPLETA STRUFALDI - BLACK (8).xlsx'));
  console.log('Parsing file with Strufaldi strategy...');
  const results = importer.processFile(buffer, 'STRUFALDI');
  
  console.log(`Parsed ${results.length} valid products from Strufaldi spreadsheet.`);
  if (results.length > 0) {
      console.log('First Valid Product:', results[0]);
      console.log('Last Valid Product:', results[results.length - 1]);
  }
  
  await app.close();
}
bootstrap().catch(console.error);
