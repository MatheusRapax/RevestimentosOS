    parseDueFratelli(rows: any[]): ImportProductResult[] {
        const results: ImportProductResult[] = [];
        let currentFormat = '';
        let currentLine = '';
        let currentUsage = '';
        let currentBoxCoverage = 0;
        let currentPalletBoxes = 0;
        let currentBoxWeight = 0;
        let currentThickness = '';

        for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (!row || !Array.isArray(row)) continue;

        // Extract section info (format, line, box parameters)
        // Scrape all text cells in the row for metadata
        for (let j = 0; j < 5; j++) {
            const cellVal = String(row[j] || '').trim();
            if (!cellVal) continue;
            
            if (cellVal.toLowerCase().includes('uso:')) {
                currentUsage = String(row[j+1] || '').trim();
            } else if (cellVal.toLowerCase().includes('m² por caixa:')) {
                currentBoxCoverage = this.excelService.parseNumber(row[j+1] || row[j+2]);
            } else if (cellVal.toLowerCase().includes('m² por palete:')) {
                currentPalletBoxes = Math.round(this.excelService.parseNumber(row[j+1] || row[j+2]) / (currentBoxCoverage || 1));
            } else if (cellVal.toLowerCase().includes('peso por m²:')) {
                currentBoxWeight = this.excelService.parseNumber(row[j+1] || row[j+2]); // Assuming this is weight or we keep it string
            } else if (cellVal.toLowerCase().includes('espessura:')) {
                currentThickness = String(row[j+1] || '').trim();
            } else if (/x\s*\d+\s*cm/.test(cellVal) || /\d+,\d+\s*[xX]\s*\d+/.test(cellVal)) {
                // Heuristic to find format like "6,5 x 25,6 cm \n River" or "20 x 20 cm"
                const parts = cellVal.split('\n');
                currentFormat = parts[0].trim();
                if (parts.length > 1) currentLine = parts[1].trim();
            }
        }

        // Try to identify the product Name. It usually contains "CX" with the coverage or "REVEST"
        let nameIndex = -1;
        let nameVal = '';
        for (let j = 3; j <= 8; j++) {
            const val = String(row[j] || '').trim();
            // In DueFratelli, product names usually start with REVEST, PISO, PORCELANATO and have CX or M2
            if ((val.startsWith('REVEST') || val.startsWith('PORCELANATO') || val.startsWith('PISO') || val.includes('EXTRA CX'))) {
                nameIndex = j;
                nameVal = val;
                break;
            }
        }

        if (nameIndex !== -1) {
            // Found a product!
            const eanIndex = nameIndex - 1;
            const skuIndex = nameIndex - 2;

            let sku = String(row[skuIndex] || '').trim();
            if (sku.startsWith('*')) sku = sku.substring(1); // Some SKUs start with * marking new items

            // Find cost checking cells to the right of Name
            let cost = 0;
            for (let j = nameIndex + 1; j <= nameIndex + 5; j++) {
                if (row[j] && (typeof row[j] === 'number' || /^\d+[.,]\d+/.test(row[j]))) {
                    cost = this.excelService.parseNumber(row[j]);
                    break;
                }
            }

            if (cost > 0 && sku) {
                results.push({
                    sku: sku,
                    supplierCode: sku,
                    name: nameVal,
                    format: currentFormat,
                    line: currentLine,
                    piecesPerBox: 0, // Not explicitly available usually
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
