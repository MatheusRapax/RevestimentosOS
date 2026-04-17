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
            const results = parseDueFratelli(excelService, rows);
            console.log(`Found ${results.length} products`);
            if (results.length > 0) {
                console.log('Sample 1:', results[0]);
                console.log('Sample 2:', results[1]);
                console.log('Sample L:', results[results.length-1]);
            }
        } catch (e) {
            console.log('Error:', e.message);
        }
    }
}

function parseDueFratelli(excelService: any, rows: any[]) {
    const results = [];

    let currentLine = '';
    let currentFormat = '';
    let currentUsage = '';
    let currentThickness = '';
    let currentBoxCoverage = 0;
    let currentPalletCoverage = 0;
    let currentWeightPerSqm = 0;

    for (let rowIndex=0; rowIndex<rows.length; rowIndex++) {
      const row = rows[rowIndex];
      if (!Array.isArray(row) || row.length === 0) continue;

      let metaKey = '';
      let metaVal = '';
      for (let i = 0; i < 4; i++) {
        const val = String(row[i] || '').trim().toLowerCase();
        if (val.includes('uso') || val.includes('m² por caixa') || val.includes('m² por palete') || val.includes('peso por m²') || val.includes('espessura')) {
           metaKey = val;
           metaVal = String(row[i+1] || '').trim();
           break;
        }
      }

      const col0 = String(row[0] || '').trim();
      
      if (col0 && col0.length > 2) {
        if (/^\d+[,.]?\d*\s*[xX]\s*\d+[,.]?\d*/.test(col0)) {
           currentFormat = col0;
        } else if (!col0.toLowerCase().includes('uso') && 
                   !col0.toLowerCase().includes('m²') && 
                   !col0.toLowerCase().includes('peso') &&
                   !col0.toLowerCase().includes('espessura') &&
                   !col0.toLowerCase().includes('grupo') &&
                   !col0.toLowerCase().includes('obs')) {
           if (col0 !== 'Ref.' && !col0.toLowerCase().includes('descri') && !col0.toLowerCase().includes('tab.geral') && !col0.includes('=')) {
               currentLine = col0;
           }
        }
      }

      if (metaKey) {
         if (metaKey.includes('uso')) currentUsage = metaVal;
         if (metaKey.includes('espessura')) currentThickness = metaVal;
         if (metaKey.includes('m² por caixa')) currentBoxCoverage = excelService.parseNumber(metaVal);
         if (metaKey.includes('m² por palete')) currentPalletCoverage = excelService.parseNumber(metaVal);
         if (metaKey.includes('peso por m²')) currentWeightPerSqm = excelService.parseNumber(metaVal);
      }

      let sku = '';
      let barcode = '';
      let name = '';
      let price = 0;

      let barcodeCol = -1;
      for (let i = 1; i <= 8; i++) {
         const val = String(row[i] || '').trim();
         if (val.length === 13 && /^\d{13}$/.test(val)) {
             barcodeCol = i;
             break;
         }
      }

      if (barcodeCol !== -1) {
         sku = String(row[barcodeCol - 1] || '').trim();
         barcode = String(row[barcodeCol] || '').trim();
         name = String(row[barcodeCol + 1] || '').trim();
         
         for (let p = barcodeCol + 2; p < Math.min(row.length, barcodeCol + 6); p++) {
             let pVal = row[p];
             if (pVal === null || pVal === undefined || pVal === '') continue;
             let pNum = excelService.parseNumber(pVal);
             if (pNum > 0 && pNum < 2000) { 
                 if (typeof pVal === 'number' || String(pVal).includes('R$') || String(pVal).includes(',')) {
                     price = pNum;
                     break;
                 }
             }
         }
      } else {
         const possibleSku = String(row[3] || '').trim();
         const possibleName = String(row[5] || '').trim();
         if (possibleSku && possibleSku.length >= 3 && /^\d+$/.test(possibleSku) && possibleName.length > 5) {
             sku = possibleSku;
             name = possibleName;
             for (let p = 6; p < row.length; p++) {
                 let pVal = row[p];
                 if (pVal === null || pVal === undefined || pVal === '') continue;
                 let pNum = excelService.parseNumber(pVal);
                 if (pNum > 0 && pNum < 2000 && (typeof pVal === 'number' || String(pVal).includes('R$') || String(pVal).includes(','))) {
                     price = pNum;
                     break;
                 }
             }
         }
      }

      if (sku && name && price > 0) {
         const palletBoxes = currentPalletCoverage && currentBoxCoverage 
             ? Math.round(currentPalletCoverage / currentBoxCoverage) : 0;
         const boxWeight = currentBoxCoverage && currentWeightPerSqm
             ? Math.round(currentBoxCoverage * currentWeightPerSqm * 100) / 100 : 0;

         let prodFormat = currentFormat;
         const formatMatch = name.match(/(\d+[,.]?\d*)\s*[xX]\s*(\d+[,.]?\d*)\s*(?:CM|cm)?/);
         if (formatMatch) {
             prodFormat = `${formatMatch[1]}x${formatMatch[2]}`;
         }

         results.push({
             sku: sku,
             supplierCode: sku,
             name: name,
             format: prodFormat,
             line: currentLine,
             boxCoverage: currentBoxCoverage,
             palletBoxes: palletBoxes,
             boxWeight: boxWeight,
             piecesPerBox: 0,
             usage: currentUsage,
             costCents: Math.round(price * 100)
         });
      }
    }
    return results;
}

testGlamProper();
