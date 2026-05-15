import { ExcelService } from './src/core/excel/excel.service';
const fs = require('fs');
const excelService = new ExcelService();
const buf = fs.readFileSync('./planilhas/TABELA PRECO DECA METAIS.xlsx');
const rows = excelService.parseExcel(buf);
const r0 = rows[0].map((c:any) => String(c||'').trim().toLowerCase());
console.log("Val at index 12:", JSON.stringify(r0[12]));
console.log("Is equal to 'material':", r0[12] === 'material');
