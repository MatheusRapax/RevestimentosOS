import { ExcelService } from './src/core/excel/excel.service';
import * as path from 'path';
import * as fs from 'fs';

async function rebuild() {
    const defaultOptions = { raw: false };
    const excelService = new ExcelService();
    
    const filePath = path.join(process.cwd(), 'TABELA PRECO DECA METAIS.xlsx');
    const buffer = fs.readFileSync(filePath);
    try {
        const rows = excelService.parseExcel(buffer, 0, defaultOptions);
        for (let i = 8; i < 11; i++) {
            if (rows[i]) {
                for (let j = 0; j < rows[i].length; j++) {
                    console.log(`Col ${j}: ${rows[i][j]}`);
                }
            }
        }
    } catch (e) {}
}

rebuild();
