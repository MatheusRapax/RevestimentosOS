const fs = require('fs');
let file = fs.readFileSync('src/modules/stock/services/product-import.service.ts', 'utf8');

const switchEndIndex = file.indexOf('default:');

const newCases = `
      case 'DUEFRATELLI':
        return this.parseDueFratelli(rows);
      case 'GLAM':
        return this.parseGlam(rows);
      case 'LEXXA':
        return this.parseLexxa(rows);
      case 'MOSAIC_GROUP':
        return this.parseMosaicGroup(rows);
`;

file = file.slice(0, switchEndIndex) + newCases + file.slice(switchEndIndex);

const parsersCode = `
  private parseLexxa(rows: any[]): ImportProductResult[] {
    const results: ImportProductResult[] = [];
    for (const row of rows) {
      if (!Array.isArray(row) || row.length < 10) continue;
      
      const sku = String(row[2] || '').trim();
      const name = String(row[3] || '').trim();
      const line = String(row[5] || '').trim();
      let priceVal = row[12] !== undefined ? row[12] : row[11];
      
      const cost = this.excelService.parseNumber(priceVal);

      if (sku && name && cost > 0 && sku !== 'REFERÊNCIA') {
        results.push({
          sku,
          supplierCode: sku,
          name,
          format: '',
          line,
          boxCoverage: 0,
          palletBoxes: 0,
          boxWeight: 0,
          piecesPerBox: 0,
          usage: '',
          costCents: Math.round(cost * 100),
        });
      }
    }
    return results;
  }

  private parseMosaicGroup(rows: any[]): ImportProductResult[] {
    const results: ImportProductResult[] = [];
    for (const row of rows) {
      if (!Array.isArray(row) || row.length < 40) continue;
      
      const sku = String(row[12] || '').replace(/'/g, '').trim(); 
      const name = String(row[20] || '').trim();
      const line = String(row[25] || '').trim(); 
      const weight = this.excelService.parseNumber(row[29] || row[30]);
      let cost = this.excelService.parseNumber(row[49]);
      if (!cost || cost === 0) cost = this.excelService.parseNumber(row[50]);

      if (sku && name && cost > 0 && sku !== 'Material') {
        results.push({
          sku,
          supplierCode: sku,
          name,
          format: '',
          line,
          boxCoverage: 0,
          palletBoxes: 0,
          boxWeight: weight,
          piecesPerBox: 0,
          usage: '',
          costCents: Math.round(cost * 100),
        });
      }
    }
    return results;
  }

  private parseDueFratelli(rows: any[]): ImportProductResult[] {
    const results: ImportProductResult[] = [];
    let currentFormat = '';
    let currentLine = '';
    let currentUsage = '';
    let currentBoxCoverage = 0;
    let currentPalletBoxes = 0;
    let currentBoxWeight = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!row || !Array.isArray(row)) continue;

      for (let j = 0; j < 6; j++) {
        const cellVal = String(row[j] || '').trim();
        if (!cellVal) continue;
        
        const lowerVal = cellVal.toLowerCase();
        if (lowerVal.includes('uso:')) {
            currentUsage = String(row[j+1] || '').trim();
        } else if (lowerVal.includes('m² por caixa:')) {
            currentBoxCoverage = this.excelService.parseNumber(row[j+1] || row[j+2]);
        } else if (lowerVal.includes('m² por palete:')) {
            currentPalletBoxes = Math.round(this.excelService.parseNumber(row[j+1] || row[j+2]) / (currentBoxCoverage || 1));
        } else if (lowerVal.includes('peso por m²:')) {
            currentBoxWeight = this.excelService.parseNumber(row[j+1] || row[j+2]);
        } else if (/\d+,\d+\s*[xX]\s*\d+/.test(cellVal) || /\d+\s*[xX]\s*\d+/.test(cellVal)) {
            const parts = cellVal.split('\n');
            currentFormat = parts[0].trim();
            if (parts.length > 1) currentLine = parts[1].trim();
        }
      }

      let nameIndex = -1;
      let nameVal = '';
      for (let j = 3; j <= 8; j++) {
        const val = String(row[j] || '').trim().toUpperCase();
        if ((val.startsWith('REVEST') || val.startsWith('PORCELANATO') || val.startsWith('PISO') || val.includes('EXTRA CX'))) {
            nameIndex = j;
            nameVal = val;
            break;
        }
      }

      if (nameIndex !== -1) {
        let sku = String(row[nameIndex - 2] || '').trim();
        if (sku.startsWith('*')) sku = sku.substring(1);

        let cost = 0;
        for (let j = nameIndex + 1; j <= nameIndex + 5; j++) {
            if (row[j] && (typeof row[j] === 'number' || /^\\d+[.,]\\d+/.test(row[j]) || (typeof row[j] === 'string' && row[j].includes('R$')))) {
                cost = this.excelService.parseNumber(row[j]);
                if (cost > 0) break;
            }
        }

        if (cost > 0 && sku) {
            results.push({
                sku,
                supplierCode: sku,
                name: nameVal,
                format: currentFormat,
                line: currentLine,
                piecesPerBox: 0,
                boxCoverage: currentBoxCoverage,
                palletBoxes: currentPalletBoxes,
                boxWeight: currentBoxWeight,
                usage: currentUsage,
                costCents: Math.round(cost * 100),
            });
        }
      }
    }
    return results;
  }

  private parseGlam(rows: any[]): ImportProductResult[] {
    const results: ImportProductResult[] = [];
    let currentFormat = '';

    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (!row || !Array.isArray(row)) continue;

        const col1 = String(row[1] || '').trim();
        const col2 = String(row[2] || '').trim();
        
        if (col1.match(/\\d+.*[xX].*\\d+/)) {
            currentFormat = col1;
        } else if (col2.match(/\\d+.*[xX].*\\d+/)) {
            currentFormat = col2;
        }

        const sku = String(row[4] || '').trim().replace(/\\.0$/, '');
        const name = String(row[5] || '').trim();
        
        if (sku && name && sku !== 'REF.' && name !== 'PRODUTOS') {
            const weight = this.excelService.parseNumber(row[6]);
            const boxInfo = String(row[7] || '').toLowerCase();
            let piecesPerBox = 0;
            let boxCoverage = 0;

            const pcsMatch = boxInfo.match(/(\\d+)\\s*pçs/i) || boxInfo.match(/(\\d+)\\s*p/i);
            if (pcsMatch) piecesPerBox = parseInt(pcsMatch[1], 10);

            const m2Match = boxInfo.match(/(\\d+(?:[.,]\\d+)?)\\s*m/i);
            if (m2Match) boxCoverage = this.excelService.parseNumber(m2Match[1]);

            let cost = 0;
            for (let j = 8; j < 14; j++) {
                if (row[j] && typeof row[j] === 'string' && row[j].includes('R$')) {
                    cost = this.excelService.parseNumber(row[j]);
                    break;
                }
                if (row[j] && (typeof row[j] === 'number' || /^\\d+[.,]\\d+/.test(row[j]))) {
                    cost = this.excelService.parseNumber(row[j]);
                    if (cost > 0) break;
                }
            }

            if (cost > 0) {
                results.push({
                    sku: sku,
                    supplierCode: sku,
                    name,
                    format: currentFormat,
                    line: '',
                    piecesPerBox,
                    boxCoverage,
                    palletBoxes: 0,
                    usage: '',
                    boxWeight: weight,
                    costCents: Math.round(cost * 100),
                });
            }
        }
    }
    return results;
  }
`;

const lastBracketIndex = file.lastIndexOf('}');
file = file.slice(0, lastBracketIndex - 1) + parsersCode + "\n}\n";

fs.writeFileSync('src/modules/stock/services/product-import.service.ts', file);
