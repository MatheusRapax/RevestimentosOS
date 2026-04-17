import { ExcelService } from './src/core/excel/excel.service';
import * as path from 'path';
import * as fs from 'fs';

async function bootstrap() {
    const excelService = new ExcelService();
    
    let filePath = path.join(process.cwd(), 'GLAM BRASIL 2025 - VAREJO.xlsx');
    let buffer = fs.readFileSync(filePath);
    try {
        const rows = excelService.parseExcel(buffer, 0, { raw: true });
        
        console.log("Analyzing rows...");
        for (let i = 0; i < Math.min(30, rows.length); i++) {
            const row = rows[i];
            if (!Array.isArray(row) || row.length === 0) continue;
            
            console.log(`Row ${i} length ${row.length}:`, JSON.stringify(row.slice(0, 15)));
        }
    } catch (error: any) {
        console.error('Error parsing file:', error.message);
    }
}

bootstrap();
