import { ExcelService } from './src/core/excel/excel.service';
import * as path from 'path';
import * as fs from 'fs';

async function rebuild() {
    const defaultOptions = { raw: false };
    const excelService = new ExcelService();
    
    const files = [
        'LISTA DE PREÇO LOUÇA MOSAIC - MARÇO.csv',
        'TABELA PRECO DECA METAIS.xlsx',
        'TEBELA DEXCO RC.txt.xlsx',
        'TABELA LEXXA BAGNO Maranhão.xlsx'
    ];
    
    for (const name of files) {
        const filePath = path.join(process.cwd(), name);
        const buffer = fs.readFileSync(filePath);
        console.log(`\n--- ${name} ---`);
        try {
            const rows = excelService.parseExcel(buffer, 0, defaultOptions);
            for (let i = 0; i < Math.min(10, rows.length); i++) {
                if (rows[i] && rows[i].length > 0)
                    console.log(`Row ${i} length ${rows[i].length}: ${JSON.stringify(rows[i].slice(0, 15))}`);
            }
        } catch (e) {
            console.log('Error:', e.message);
        }
    }
}

rebuild();
