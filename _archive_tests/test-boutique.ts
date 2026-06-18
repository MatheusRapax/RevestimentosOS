import { ExcelService } from './src/core/excel/excel.service';
import * as path from 'path';

async function testBoutique() {
    const defaultOptions = { raw: false };
    const excelService = new (ExcelService as any)();
    
    const filePath = '/home/matheus/Área de trabalho/ERP-Geral/revestimentos-fix/BOUTIQUE BRASIL 2025- VAREJO DUEFRATELLI.xlsx';
    console.log('\n--- BOUTIQUE BRASIL ---');
    try {
        const rows = await excelService.parseExcel(filePath, null, defaultOptions);
        console.log(`Linhas: ${rows.length}`);
        
        for (let i = 0; i < Math.min(30, rows.length); i++) {
            console.log(`Row ${i} length ${rows[i].length}: ${JSON.stringify(rows[i])}`);
        }
    } catch (e) {
        console.log('Error:', e.message);
    }
}

testBoutique();
