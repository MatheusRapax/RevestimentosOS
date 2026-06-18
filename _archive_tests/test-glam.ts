import { ExcelService } from './src/core/excel/excel.service';
import * as path from 'path';

async function testGlam() {
    const defaultOptions = { raw: false };
    const excelService = new (ExcelService as any)();
    
    const glamFile = '/home/matheus/Área de trabalho/ERP-Geral/revestimentos-fix/GLAM BRASIL 2025 - VAREJO.xlsx';
    console.log('\n--- GLAM BRASIL ---');
    try {
        const rows = await excelService.parseExcel(glamFile, null, defaultOptions);
        console.log(`Linhas: ${rows.length}`);
        
        // Print useful data rows to analyze structure
        for (let i = 0; i < Math.min(30, rows.length); i++) {
            console.log(`Row ${i} length ${rows[i].length}: ${JSON.stringify(rows[i])}`);
        }
    } catch (e) {
        console.log('Error:', e.message);
    }
}

testGlam();
