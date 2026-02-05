import { Injectable, BadRequestException } from '@nestjs/common';
import { ExcelService } from '../../../core/excel/excel.service';

export interface ImportProductResult {
    sku: string;
    supplierCode: string;
    name: string;
    format: string;
    line: string;
    usage: string;
    boxCoverage: number;
    piecesPerBox: number;
    palletBoxes: number;
    boxWeight: number;
    costCents: number;
}

export type ImportStrategy = 'CASTELLI' | 'PIERINI' | 'EMBRAMACO';

@Injectable()
export class ProductImportService {
    constructor(private excelService: ExcelService) { }

    processFile(buffer: Buffer, strategy: ImportStrategy): ImportProductResult[] {
        const rows = this.excelService.parseExcel(buffer);

        switch (strategy) {
            case 'CASTELLI':
            case 'EMBRAMACO':
                return this.parseStructured(rows); // Both share similar tabular structure
            case 'PIERINI':
                return this.parsePierini(rows);
            default:
                throw new BadRequestException('Strategy not implemented');
        }
    }

    private parseStructured(rows: any[]): ImportProductResult[] {
        // Headers around row 4/5. 
        // We look for "Ref." or "Descrição" to start.
        let headerIndex = -1;
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            if (row.includes('Ref.') && row.includes('Descrição')) {
                headerIndex = i;
                break;
            }
        }

        // If no header found, maybe start from 0 strictly? 
        // But user provided data has repeated headers.
        // Let's iterate all rows and skip those that are headers or section titles.

        const results: ImportProductResult[] = [];

        // Iterate data rows (start from header + 1 if found, else 0)
        const startIndex = headerIndex === -1 ? 0 : headerIndex + 1;

        for (let i = startIndex; i < rows.length; i++) {
            const row = rows[i];
            // Safe access
            const col0 = String(row[0] || '').trim();
            const col1 = String(row[1] || '').trim();

            // Skip empty rows
            if (!col0 && !col1) continue;

            // Skip repeated headers
            if (col0 === 'Ref.' || col1 === 'Descrição') continue;

            // Skip Section Headers (e.g., "20 x 120", "62 x 120 - ACT")
            // Heuristic: If Col 0 looks like a Format (contains 'x' or 'X') and Price is 0/Empty, it's likely a header.
            // Or if Col 0 is "Tab.Geral..."
            if (col0.toLowerCase().includes('tab.geral')) continue;

            // If Col 0 is a format like "62 x 120" and the rest is empty/price 0, it is a section.
            // But sometimes the SKU might look like that? Unlikely. SKUs are usually numeric like 73720.
            // User's SKUs: 73720, P70604. 
            // Section Headers: "20 x 120", "62 x 120 - ACT". 
            // Distinction: SKUs usually don't have spaces around 'x' unless it's a format.
            // Also, section headers usually don't have a valid price in the price column, or price is 0.00.

            // Check if it's a valid product line
            // It must have a SKU (Col 0) and a Description (Col 1).
            // And usually a Price (Col 4 or 10 depending on file version).
            // Based on User snippet: 
            // SKU (0) | Name (1) | Format (2) | Line (3) | Cost (4) -> This is a DIFFERENT layout than the code expected!
            // Code expected: Ref(0), Desc(1), Format(2), Line(3), Pcs(4)... Cost(10).
            // User snippet: 73720	San Giusto Plus	30x120	Granilha	R$ 50,49

            // WE NEED TO DETECT THE LAYOUT or be flexible.
            // Let's assume the user might have fewer columns.
            // If Col 4 is Price (contains R$ or is number), then it's the short format.

            const isShortFormat = (String(row[4] || '').includes('R$') || typeof row[4] === 'number') && !row[10];

            let cost = 0;
            let format = '';
            let line = '';

            if (isShortFormat) {
                format = String(row[2] || '').trim();
                line = String(row[3] || '').trim();
                cost = this.excelService.parseNumber(row[4]);
            } else {
                format = String(row[2] || '').trim();
                line = String(row[3] || '').trim();
                cost = this.excelService.parseNumber(row[10]);
            }

            // Skip if cost is 0 (likely a section header like "20 x 120 ... R$ 0,00")
            if (cost === 0) continue;

            results.push({
                sku: col0,
                supplierCode: col0,
                name: col1,
                format: format,
                line: line,
                piecesPerBox: this.excelService.parseNumber(row[4]), // Likely wrong for short format, will be 0/cost
                boxCoverage: this.excelService.parseNumber(row[5]),
                palletBoxes: this.excelService.parseNumber(row[6]),
                boxWeight: this.excelService.parseNumber(row[8]),
                usage: String(row[9] || '').trim(),
                costCents: isNaN(cost) ? 0 : Math.round(cost * 100),
            });
        }
        return results;
    }

    private parsePierini(rows: any[]): ImportProductResult[] {
        // TWO-PASS APPROACH:
        // PASS 1: Collect all metadata per LINE (because metadata is spread across multiple rows)
        // PASS 2: Create products using the complete metadata for each LINE

        interface LineMetadata {
            usage?: string;
            thickness?: string;
            boxCoverage?: number;
            palletCoverage?: number;
            weightPerSqm?: number;
        }

        interface RawProduct {
            lineName: string;
            code: string;
            barcode: string;
            description: string;
            price: any;
        }

        const lineMetadataMap = new Map<string, LineMetadata>();
        const rawProducts: RawProduct[] = [];

        // Perini ACTUAL structure based on file analysis:
        // Col B (1): LINHA (line name) - only on first row of group
        // Col C (2): Metadata KEY ("Uso:", "Espessura:", "m² por caixa:", etc.)
        // Col D (3): Metadata VALUE
        // Col E (4): CÓD. (product code)
        // Col F (5): CÓD. DE BARRAS
        // Col G (6): DESCRIÇÃO
        // Col J (9): R$/m²

        let currentLine = '';

        // PASS 1: Scan all rows to collect metadata and raw products
        for (const row of rows) {
            const colLinha = String(row[1] || '').trim().replace(/[\r\n]+/g, '').trim();
            const colMetaKey = String(row[2] || '').trim().replace(/[\r\n]+/g, '').toLowerCase();
            const colMetaVal = String(row[3] || '').trim();
            const colCod = String(row[4] || '').trim();
            const colBarcode = String(row[5] || '').trim();
            const colDesc = String(row[6] || '').trim();
            const colPrice = row[9];

            // Skip header rows
            if (colLinha === 'LINHA' || colMetaKey.includes('informações')) continue;
            if (colLinha.toLowerCase().includes('pierini')) continue;

            // Detect new line name
            if (colLinha && colLinha.length > 1 && !colLinha.match(/^\d+$/)) {
                currentLine = colLinha;
                // Initialize metadata for this line if not exists
                if (!lineMetadataMap.has(currentLine)) {
                    lineMetadataMap.set(currentLine, {});
                }
            }

            // Accumulate metadata for current line
            if (currentLine && colMetaKey) {
                const meta = lineMetadataMap.get(currentLine) || {};

                if (colMetaKey.includes('uso')) {
                    meta.usage = colMetaVal;
                }
                if (colMetaKey.includes('espessura')) {
                    meta.thickness = colMetaVal;
                }
                if (colMetaKey.includes('m²') && colMetaKey.includes('caixa')) {
                    meta.boxCoverage = this.excelService.parseNumber(colMetaVal);
                }
                if (colMetaKey.includes('m²') && colMetaKey.includes('palete')) {
                    meta.palletCoverage = this.excelService.parseNumber(colMetaVal);
                }
                if (colMetaKey.includes('peso')) {
                    meta.weightPerSqm = this.excelService.parseNumber(colMetaVal);
                }

                lineMetadataMap.set(currentLine, meta);
            }

            // Collect raw product data (will process in pass 2)
            const isValidCode = colCod && colCod.length >= 3 && /^\d+$/.test(colCod);
            const hasDescription = colDesc && colDesc.length > 3;

            if (isValidCode && hasDescription && currentLine) {
                rawProducts.push({
                    lineName: currentLine,
                    code: colCod,
                    barcode: colBarcode,
                    description: colDesc,
                    price: colPrice,
                });
            }
        }

        // PASS 2: Create final products with complete metadata
        const results: ImportProductResult[] = [];

        for (const product of rawProducts) {
            const metadata = lineMetadataMap.get(product.lineName) || {};

            // Extract format from description (e.g., "6,5X25,6CM")
            const formatMatch = product.description.match(/(\d+[,.]?\d*)\s*[xX]\s*(\d+[,.]?\d*)\s*(?:CM|cm)?/);
            const format = formatMatch ? `${formatMatch[1]}x${formatMatch[2]}` : '';

            // Calculate box weight from boxCoverage and weightPerSqm
            const boxWeight = (metadata.boxCoverage && metadata.weightPerSqm)
                ? Math.round(metadata.boxCoverage * metadata.weightPerSqm * 100) / 100
                : 0;

            // Calculate palletBoxes from palletCoverage and boxCoverage
            const palletBoxes = (metadata.palletCoverage && metadata.boxCoverage && metadata.boxCoverage > 0)
                ? Math.round(metadata.palletCoverage / metadata.boxCoverage)
                : 0;

            results.push({
                sku: product.code,
                supplierCode: product.code,
                name: product.description,
                format: format,
                line: product.lineName,
                usage: metadata.usage || '',
                boxCoverage: metadata.boxCoverage || 0,
                piecesPerBox: 0, // Not in Perini data
                palletBoxes: palletBoxes,
                boxWeight: boxWeight,
                costCents: Math.round(this.excelService.parseNumber(product.price) * 100),
            });
        }

        return results;
    }
}
