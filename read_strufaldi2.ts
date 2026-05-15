import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { ExcelService } from './src/modules/stock/services/excel.service';
import * as path from 'path';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const excelService = app.get(ExcelService);
  
  const filePath = path.join(process.cwd(), 'planilhas', 'TABELA COMPLETA STRUFALDI - BLACK (8).xlsx');
  
  try {
    const rows = await excelService.parseExcelFile(filePath);
    console.log('Searching for products...');
    
    // Print row 4 (a normal product) to see its layout
    const normalRow = rows[4];
    console.log(`Normal product at row 4: ${normalRow ? normalRow[2] : 'null'}`);
    if (normalRow) {
       for (let i = 0; i < normalRow.length; i++) {
         if (normalRow[i] !== undefined && normalRow[i] !== null && normalRow[i] !== '') {
           console.log(`  Index ${i}: ${normalRow[i]}`);
         }
       }
    }

  } catch (error) {
    console.error('Error reading file:', error);
  } finally {
    await app.close();
  }
}

bootstrap();
