import { ExcelService } from './src/core/excel/excel.service';
import * as path from 'path';
import * as fs from 'fs';

async function testGlamProper() {
    const defaultOptions = { raw: false };
    const excelService = new ExcelService();
    
    for (const name of ['GLAM BRASIL 2025 - VAREJO.xlsx', 'BOUTIQUE BRASIL 2025- VAREJO DUEFRATELLI.xlsx']) {
        const filePath = path.join(process.cwd(), name);
        const buffer = fs.readFileSync(filePath);
        console.log(`\n--- ${name} ---`);
        try {
            const rows = excelService.parseExcel(buffer, 0, defaultOptions);
            console.log(`Linhas: ${rows.length}`);
            
            for (let i = 0; i < Math.min(30, rows.length); i++) {
                if (rows[i] && rows[i].length > 0)
                    console.log(`Row ${i} length ${rows[i].length}: ${JSON.stringify(rows[i])}`);
            }
        } catch (e) {
            console.log('Error:', e.message);
        }
    }
}

testGlamProper();
