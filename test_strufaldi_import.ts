import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { ProductImportService } from './src/modules/stock/services/product-import.service';
import * as path from 'path';
import * as fs from 'fs';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const service = app.get(ProductImportService);
  
  const filePath = path.join(process.cwd(), 'planilhas', 'TABELA COMPLETA STRUFALDI - BLACK (8).xlsx');
  const buf = fs.readFileSync(filePath);
  
  try {
    const results = await (service as any).parseStrufaldi((app.get('ExcelService') as any).parseMultipleSheets(buf, [
      'TABELA ATELIÊ STRUFALDI',
      'TABELA STRUFALDI - LINHA CONVEN',
      'CANTONEIRA',
    ]));
    
    const targets = ["TURIM", "NERO", "MARSALA"];
    const found = results.filter((r: any) => targets.some(t => r.name.includes(t) && r.name.includes("15X15")));
    console.log("Parsed result for targets:", found);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await app.close();
  }
}

bootstrap();
