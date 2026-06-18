import { ExcelService } from './src/core/excel/excel.service';
import * as fs from 'fs';
import * as path from 'path';

const excelService = new ExcelService();
const buffer = fs.readFileSync('GLAM BRASIL 2025 - VAREJO.xlsx');
const rows = excelService.parseExcel(buffer, 0, { raw: false });

const results = [];
let currentFormat = '';
let currentLine = '';

for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row || !Array.isArray(row)) continue;

    // Col 1 or 2 might have format
    if (String(row[1] || '').trim().includes('X') || String(row[1] || '').trim().includes('x')) {
        currentFormat = String(row[1] || '').trim();
    } else if (String(row[2] || '').trim().includes('X') || String(row[2] || '').trim().includes('x')) {
        currentFormat = String(row[2] || '').trim();
    }
    
    // In some rows, format is in row[1] alone.
    if (String(row[1] || '').trim().length > 3 && !String(row[1] || '').trim().match(/^\d+$/)) {
        if (!String(row[1] || '').trim().includes('FORM') && !String(row[1]).includes('REF')) {
            // Might be format or line
            const val = String(row[1] || '').trim();
            if (val.match(/\d+\s*[xX]\s*\d+/)) {
                currentFormat = val;
            }
        }
    }

    const sku = String(row[4] || '').trim();
    const name = String(row[5] || '').trim();
    
    if (sku && name && sku !== 'REF.' && name !== 'PRODUTOS') {
        const weight = excelService.parseNumber(row[6]);
        const boxInfo = String(row[7] || '').toLowerCase(); // e.g., "  Cx c/ 36 Pçs / 5 M² "
        let piecesPerBox = 0;
        let boxCoverage = 0;

        const pcsMatch = boxInfo.match(/(\d+)\s*pçs/i) || boxInfo.match(/(\d+)\s*p/i);
        if (pcsMatch) piecesPerBox = parseInt(pcsMatch[1], 10);

        const m2Match = boxInfo.match(/(\d+(?:[.,]\d+)?)\s*m/i);
        if (m2Match) boxCoverage = excelService.parseNumber(m2Match[1]);

        let cost = 0;
        for (let j = 8; j < 12; j++) {
            if (row[j] && typeof row[j] === 'string' && row[j].includes('R$')) {
                cost = excelService.parseNumber(row[j]);
                break;
            }
            if (row[j] && (typeof row[j] === 'number' || /^\d+[.,]\d+/.test(row[j]))) {
                cost = excelService.parseNumber(row[j]);
                if (cost > 0) break;
            }
        }

        if (cost > 0) {
            results.push({ sku, name, format: currentFormat, boxWeight: weight, piecesPerBox, boxCoverage, costCents: cost * 100 });
        }
    }
}
console.log(results.slice(0, 10));
