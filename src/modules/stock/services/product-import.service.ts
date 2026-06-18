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
  palletCoverage?: number;
  boxWeight: number;
  /** Custo real da CAIXA/UNIDADE em centavos — salvo no banco */
  costCents: number;
  /** Custo por m² lido da planilha — apenas para exibição/auditoria no preview */
  costPerM2Cents?: number;
  height?: number;
  width?: number;
  depth?: number;
  color?: string;
  /** Unidade de medida: M2, UN, CX, ML, PC */
  unit?: string;
  /** saleType derivado da unidade: M2 → AREA, demais → UNIT */
  saleType?: 'UNIT' | 'AREA' | 'BOTH';
}

export type ImportStrategy = 'CASTELLI' | 'PIERINI' | 'EMBRAMACO' | 'BOUTIQUE BRASIL' | 'GLAM BRASIL' | 'LEXXA BAGNO' | 'MOSAIC' | 'DECA' | 'DEXCO' | 'STRUFALDI' | 'STANDARD';

@Injectable()
export class ProductImportService {
  constructor(private excelService: ExcelService) {}

  /**
   * Calcula o custo da CAIXA em centavos.
   * Para produtos com m² (boxCoverage > 0), o custo da planilha é por m²
   * e precisa ser multiplicado pelo boxCoverage para obter o custo da caixa.
   * Para produtos unitários (boxCoverage = 0), o custo é direto.
   */
  private calcCostCents(costPerUnit: number, boxCoverage: number): number {
    if (boxCoverage > 0) {
      return Math.round(costPerUnit * boxCoverage * 100);
    }
    return Math.round(costPerUnit * 100);
  }

  /**
   * Generates the standard 16-column import template as an Excel Buffer.
   * Returned to the client via GET /stock/products/import/template.
   */
  generateTemplateBuffer(): Buffer {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const XLSX = require('xlsx');

    const header = [
      'SKU (Obrigatório)',
      'Nome do Produto (Obrigatório)',
      'Unidade de Medida (M2/UN/CX/ML/PC) (Obrigatório)',
      'Custo (R$) (Obrigatório)',
      'Formato (ex: 60x120)',
      'Acabamento / Cor',
      'M2 por Caixa',
      'Peças por Caixa',
      'Caixas por Palete',
      'M2 por Palete',
      'Peso por Caixa (kg)',
      'Uso (ex: Piso, Parede, Externo)',
      'Linha / Coleção',
      'Largura (cm)',
      'Altura (cm)',
      'Profundidade (cm)',
    ];

    const exampleM2 = [
      'REV-001', 'Porcelanato Calacata Oro', 'M2', '50,00',
      '60x120', 'Polido', '2,16', '3', '30', '64,80', '28,5',
      'Piso Interno', 'Mármore', '', '', '',
    ];

    const exampleUN = [
      'MET-001', 'Torneira Lavatório Bica Alta', 'UN', '150,00',
      '', 'Cromado', '', '', '', '', '1,2',
      'Banheiro', 'Metais', '15', '25', '5',
    ];

    const exampleCX = [
      'PIS-001', 'Piso Vinílico Click 4mm', 'CX', '180,00',
      '18x122', 'Carvalho Natural', '2,23', '14', '40', '89,20', '12,0',
      'Piso Interno', 'Vinílico', '', '', '',
    ];

    const instructions = [
      ['INSTRUÇÕES DE PREENCHIMENTO'],
      [''],
      ['UNIDADE DE MEDIDA — Valores aceitos:'],
      ['  M2  → Produto vendido por m² (porcelanatos, pisos, revestimentos de parede)'],
      ['  UN  → Produto vendido por unidade (torneiras, vasos, boxes)'],
      ['  CX  → Produto vendido por caixa (pisos vinílicos, laminados)'],
      ['  ML  → Produto vendido por metro linear (rodapés, perfis)'],
      ['  PC  → Produto vendido por peça (espelhos, painéis)'],
      [''],
      ['CUSTO (R$):'],
      ['  → Se Unidade = M2: informe o custo por m². O preço de venda também será por m².'],
      ['  → Para os demais tipos: informe o custo por unidade/caixa/peça diretamente.'],
      [''],
      ['PREÇO DE VENDA:'],
      ['  → Não é informado aqui. O sistema calcula usando o Markup da Marca/Categoria.'],
      [''],
      ['MARCA:'],
      ['  → Não é informada aqui. É selecionada no formulário antes do upload do arquivo.'],
    ];

    const wb = XLSX.utils.book_new();

    const wsData = XLSX.utils.aoa_to_sheet([header, exampleM2, exampleUN, exampleCX]);
    wsData['!cols'] = [
      { wch: 14 }, { wch: 35 }, { wch: 36 }, { wch: 18 },
      { wch: 18 }, { wch: 20 }, { wch: 14 }, { wch: 14 },
      { wch: 16 }, { wch: 14 }, { wch: 18 }, { wch: 28 },
      { wch: 20 }, { wch: 14 }, { wch: 14 }, { wch: 18 },
    ];
    XLSX.utils.book_append_sheet(wb, wsData, 'Produtos');

    const wsInstr = XLSX.utils.aoa_to_sheet(instructions);
    wsInstr['!cols'] = [{ wch: 100 }];
    XLSX.utils.book_append_sheet(wb, wsInstr, 'Instruções');

    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
  }

  processFile(buffer: Buffer, strategy: ImportStrategy): ImportProductResult[] {
    // STRUFALDI spreads products across multiple sheets — read all of them first
    if (strategy === 'STRUFALDI') {
      const rows = this.excelService.parseMultipleSheets(buffer, [
        'TABELA ATELIÊ STRUFALDI',
        'TABELA STRUFALDI - LINHA CONVEN',
        'CANTONEIRA',
      ]);
      this.validateTemplate(rows, strategy);
      return this.parseStrufaldi(rows);
    }

    let rows: any[];
    if (strategy === 'EMBRAMACO') {
      rows = this.excelService.parseAllSheets(buffer);
    } else {
      rows = this.excelService.parseExcel(buffer);
    }
    
    this.validateTemplate(rows, strategy);

    let results: ImportProductResult[] = [];

    switch (strategy) {
      case 'STANDARD':
        results = this.parseStandardLayout(rows);
        break;
      case 'CASTELLI':
      case 'EMBRAMACO':
        results = this.parseStructured(rows); // Both share similar tabular structure
        break;
      case 'PIERINI':
        results = this.parsePierini(rows);
        break;
      case 'BOUTIQUE BRASIL':
        results = this.parseDueFratelli(rows);
        break;
      case 'GLAM BRASIL':
        results = this.parseGlam(rows);
        break;
      case 'LEXXA BAGNO':
        results = this.parseLexxa(rows);
        break;
      case 'MOSAIC':
      case 'DECA':
        results = this.parseMosaicGroup(rows);
        break;
      case 'DEXCO':
        results = this.parseDexco(rows);
        break;
      default:
        throw new BadRequestException('Strategy not implemented');
    }

    if (results.length === 0) {
      throw new BadRequestException(
        `Nenhum produto válido foi encontrado. O layout da planilha não parece ser compatível com o modelo selecionado (${strategy}) ou a planilha está vazia.`
      );
    }

    return results;
  }

  // ========== PRIVATE CALCULATION UTILS ==========
  

  // ========== PARSERS ==========

  /**
   * Layout Padrão Oficial Unificado (M² + Unitário) — 16 colunas
   * Marca e Preço de Venda são definidos fora da planilha (no sistema).
   *
   * Col  0: SKU
   * Col  1: Nome do Produto
   * Col  2: Unidade de Medida (M2, UN, CX, ML, PC)
   * Col  3: Custo (R$) — por m² se unit=M2 e boxCoverage>0, caso contrário unitário
   * Col  4: Formato
   * Col  5: Acabamento / Cor
   * Col  6: M2 por Caixa
   * Col  7: Peças por Caixa
   * Col  8: Caixas por Palete
   * Col  9: M2 por Palete
   * Col 10: Peso por Caixa (kg)
   * Col 11: Uso
   * Col 12: Linha / Coleção
   * Col 13: Largura (cm)
   * Col 14: Altura (cm)
   * Col 15: Profundidade (cm)
   */
  private parseStandardLayout(rows: any[]): ImportProductResult[] {
    const results: ImportProductResult[] = [];

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!Array.isArray(row) || !row[0]) continue;

      const sku = String(row[0] || '').trim();
      const name = String(row[1] || '').trim();

      if (!sku && !name) continue;

      const rawUnit = String(row[2] || '').trim().toUpperCase();
      const unit = rawUnit || 'UN';
      const saleType: 'UNIT' | 'AREA' | 'BOTH' = unit === 'M2' ? 'AREA' : 'UNIT';

      const rawCost = this.excelService.parseNumber(row[3]);
      const format = String(row[4] || '').trim();
      const color = String(row[5] || '').trim();

      const m2Box = this.excelService.parseNumber(row[6]);
      const pcBox = this.excelService.parseNumber(row[7]);
      const palletBoxes = this.excelService.parseNumber(row[8]);
      const palletCoverage = this.excelService.parseNumber(row[9]);
      const boxWeight = this.excelService.parseNumber(row[10]);
      const usage = String(row[11] || '').trim();
      const line = String(row[12] || '').trim();
      const width = this.excelService.parseNumber(row[13]);
      const height = this.excelService.parseNumber(row[14]);
      const depth = this.excelService.parseNumber(row[15]);

      // Cost logic:
      // - M2 products: costCents = box cost in cents (rawCost × m2PerBox × 100)
      //   The system quotes by boxes → qty × costPerBox
      //   costPerM2Cents is kept separately for display in the preview table
      // - All others: costCents = unit/box cost directly
      const costPerM2Cents = unit === 'M2' && rawCost ? Math.round(rawCost * 100) : undefined;
      const costCents = unit === 'M2' && m2Box > 0
        ? Math.round(rawCost * m2Box * 100)  // box cost = R$/m² × m²/cx
        : Math.round((rawCost ?? 0) * 100);

      results.push({
        sku,
        supplierCode: sku,
        name,
        unit,
        saleType,
        format,
        color,
        piecesPerBox: pcBox,
        boxCoverage: m2Box,
        palletBoxes,
        palletCoverage: palletCoverage || undefined,
        boxWeight,
        usage,
        line,
        width: width || undefined,
        height: height || undefined,
        depth: depth || undefined,
        costPerM2Cents,
        costCents,
      });
    }

    return results;
  }

  private validateTemplate(rows: any[], strategy: ImportStrategy) {
    if (!rows || rows.length === 0) {
      this.throwInvalidTemplate(strategy);
    }

    let isValid = false;
    const maxRowsToCheck = Math.min(rows.length, 50);

    for (let i = 0; i < maxRowsToCheck; i++) {
      const row = rows[i] || [];
      const rowStr = row.map((c: any) => String(c || '').trim().toLowerCase());

      switch (strategy) {
        case 'STANDARD':
          // Validates the unified 18-col template by checking its mandatory header columns
          if (
            rowStr.some((c: string) => c.includes('sku')) &&
            rowStr.some((c: string) => c.includes('nome do produto') || c.includes('nome'))
          ) {
            isValid = true;
          }
          break;
        case 'CASTELLI':
        case 'EMBRAMACO':
          if (rowStr.includes('ref.') && rowStr.includes('descrição')) isValid = true;
          break;
        case 'PIERINI':
          if (rowStr.includes('linha') && rowStr.includes('cód.') && rowStr.includes('descrição')) isValid = true;
          break;
        case 'DEXCO':
          if (rowStr.includes('codigoproduto') || rowStr.includes('material')) isValid = true;
          break;
        case 'STRUFALDI':
          if (rowStr.includes('código fabricante') || rowStr.includes('descrição curta')) isValid = true;
          break;
        case 'MOSAIC':
        case 'DECA':
          if (rowStr.includes('material') || rowStr.includes('codigoproduto')) isValid = true;
          break;
        case 'BOUTIQUE BRASIL':
          if (rowStr.includes('cód.') && (rowStr.includes('descrição') || rowStr.includes('produtos'))) isValid = true;
          break;
        case 'GLAM BRASIL':
          if (rowStr.includes('cód.') && (rowStr.includes('descrição') || rowStr.includes('produtos'))) isValid = true;
          break;
        case 'LEXXA BAGNO':
          if (rowStr.includes('referência') && rowStr.includes('descrição')) isValid = true;
          break;
        default:
          isValid = true;
      }

      if (isValid) break;
    }

    if (!isValid) {
      this.throwInvalidTemplate(strategy);
    }
  }

  private throwInvalidTemplate(strategy: string) {
    throw new BadRequestException({
      message: `A estrutura da planilha não corresponde ao modelo esperado para o fornecedor ${strategy}. Por favor, verifique se selecionou o modelo correto ou se a planilha sofreu alterações estruturais.`,
      error: 'Invalid Template',
      code: 'INVALID_TEMPLATE',
      statusCode: 400,
    });
  }

  private parseStructured(rows: any[]): ImportProductResult[] {
    // Headers around row 4/5.
    // We look for "Ref." or "Descrição" to start.
    let headerIndex = -1;
    let fracIndex = -1;
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (row.includes('Ref.') && row.includes('Descrição')) {
        headerIndex = i;
        for (let j = 0; j < row.length; j++) {
          if (String(row[j] || '').toLowerCase().includes('frac')) {
            fracIndex = j;
          }
        }
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

      // If the name column is just a number (e.g. "62.59"), this is likely a price table, not the product definition.
      // Many supplier spreadsheets include a second table at the bottom with pricing terms.
      if (!isNaN(Number(col1.replace(',', '.'))) && col1.trim() !== '') continue;

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

      const isShortFormat =
        (String(row[4] || '').includes('R$') || typeof row[4] === 'number') &&
        !row[10];

      let cost = 0;
      let format = String(row[2] || '').trim();
      let line = String(row[3] || '').trim();

      if (isShortFormat) {
        cost = this.excelService.parseNumber(row[4]);
        // Tenta pegar um preço mais à frente se existir
        for (let j = row.length - 1; j >= 4; j--) {
          const val = this.excelService.parseNumber(row[j]);
          if (val > 0) {
            cost = val;
            break;
          }
        }
      } else {
        if (fracIndex !== -1 && row[fracIndex]) {
          cost = this.excelService.parseNumber(row[fracIndex]);
        } else {
          // Pega o último preço válido a partir da coluna 10
          for (let j = row.length - 1; j >= 10; j--) {
            const val = this.excelService.parseNumber(row[j]);
            if (val > 0) {
              cost = val;
              break;
            }
          }
          if (cost === 0) {
            cost = this.excelService.parseNumber(row[10]);
          }
        }
      }

      // Skip if cost is 0 (likely a section header like "20 x 120 ... R$ 0,00")
      if (cost === 0) continue;

      const boxCoverage = this.excelService.parseNumber(row[5]);
      const finalCost = isNaN(cost) ? 0 : cost;

      results.push({
        sku: col0,
        supplierCode: col0,
        name: col1,
        format: format,
        line: line,
        piecesPerBox: this.excelService.parseNumber(row[4]),
        boxCoverage,
        palletBoxes: this.excelService.parseNumber(row[6]),
        boxWeight: this.excelService.parseNumber(row[8]),
        usage: String(row[9] || '').trim(),
        costCents: this.calcCostCents(finalCost, boxCoverage),
        costPerM2Cents: Math.round(finalCost * 100),
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
      const colLinha = String(row[1] || '')
        .trim()
        .replace(/[\r\n]+/g, '')
        .trim();
      const colMetaKey = String(row[2] || '')
        .trim()
        .replace(/[\r\n]+/g, '')
        .toLowerCase();
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
      const formatMatch = product.description.match(
        /(\d+[,.]?\d*)\s*[xX]\s*(\d+[,.]?\d*)\s*(?:CM|cm)?/,
      );
      const format = formatMatch ? `${formatMatch[1]}x${formatMatch[2]}` : '';

      // Calculate box weight from boxCoverage and weightPerSqm
      const boxWeight =
        metadata.boxCoverage && metadata.weightPerSqm
          ? Math.round(metadata.boxCoverage * metadata.weightPerSqm * 100) / 100
          : 0;

      // Calculate palletBoxes from palletCoverage and boxCoverage
      const palletBoxes =
        metadata.palletCoverage &&
        metadata.boxCoverage &&
        metadata.boxCoverage > 0
          ? Math.round(metadata.palletCoverage / metadata.boxCoverage)
          : 0;

      const parsedCost = this.excelService.parseNumber(product.price);
      const coverage = metadata.boxCoverage || 0;

      results.push({
        sku: product.code,
        supplierCode: product.code,
        name: product.description,
        format: format,
        line: product.lineName,
        usage: metadata.usage || '',
        boxCoverage: coverage,
        piecesPerBox: 0,
        palletBoxes: palletBoxes,
        boxWeight: boxWeight,
        costCents: this.calcCostCents(parsedCost, coverage),
        costPerM2Cents: Math.round(parsedCost * 100),
      });
    }

    return results;
  }
  private parseLexxa(rows: any[]): ImportProductResult[] {
    const results: ImportProductResult[] = [];
    for (const row of rows) {
      if (!Array.isArray(row) || row.length < 10) continue;
      
      const sku = String(row[2] || '').trim();
      const name = String(row[3] || '').trim();
      const color = String(row[5] || '').trim();
      
      let priceVal = row[18];
      const cost = this.excelService.parseNumber(priceVal);

      if (sku && name && cost > 0 && sku !== 'REFERÊNCIA') {
        const height = this.excelService.parseNumber(row[6]);
        const width = this.excelService.parseNumber(row[7]);
        const depth = this.excelService.parseNumber(row[8]);
        const boxWeight = this.excelService.parseNumber(row[9]);

        // Lexxa Bagno: produtos unitários (louças, metais) — sem m², custo é direto
        results.push({
          sku,
          supplierCode: sku,
          name,
          format: '',
          line: '',
          boxCoverage: 0,
          palletBoxes: 0,
          boxWeight,
          piecesPerBox: 0,
          usage: '',
          costCents: Math.round(cost * 100),
          costPerM2Cents: Math.round(cost * 100),
          color,
          height,
          width,
          depth,
        });
      }
    }
    return results;
  }

  private parseMosaicGroup(rows: any[]): ImportProductResult[] {
    let skuIdx = 12, nameIdx = 20, lineIdx = 25, weightIdx1 = 29, weightIdx2 = 30;
    let costIdx1 = 49, costIdx2 = 37, valorNfIdx = 50;

    // Detect dynamically
    for (let i = 0; i < Math.min(rows.length, 50); i++) {
      const row = rows[i];
      if (!Array.isArray(row)) continue;
      const rowStr = row.map(c => String(c || '').trim().toLowerCase());
      
      let tmpSku = rowStr.indexOf('material');
      if (tmpSku === -1) tmpSku = rowStr.indexOf('codigoproduto');

      if (tmpSku !== -1) {
        skuIdx = tmpSku;
        
        nameIdx = rowStr.indexOf('descricao_completa');
        if (nameIdx === -1) nameIdx = rowStr.indexOf('produto');
        
        lineIdx = rowStr.indexOf('linha do item');
        if (lineIdx === -1) lineIdx = rowStr.indexOf('hierarquia3');
        if (lineIdx === -1) lineIdx = rowStr.indexOf('hierarquia 3');
        if (lineIdx === -1) lineIdx = rowStr.indexOf('grupopreco');
        
        weightIdx1 = rowStr.indexOf('peso_bruto');
        if (weightIdx1 === -1) weightIdx1 = rowStr.indexOf('pesobruto');
        
        weightIdx2 = rowStr.indexOf('peso liquido');
        if (weightIdx2 === -1) weightIdx2 = rowStr.indexOf('pesoliquido');
        
        costIdx1 = rowStr.indexOf('preço_sugerido_consumidor');
        
        costIdx2 = rowStr.indexOf('valorlista');
        
        let nfIdx = rowStr.indexOf('valor da nf');
        if (nfIdx === -1) nfIdx = rowStr.indexOf('valordanf');
        valorNfIdx = nfIdx;
        break;
      }
    }

    const results: ImportProductResult[] = [];
    for (const row of rows) {
      if (!Array.isArray(row) || row.length < Math.max(skuIdx, costIdx1)) continue;
      
      const sku = String(row[skuIdx] || '').replace(/'/g, '').trim(); 
      const name = String(row[nameIdx] || '').trim();
      const line = String(row[lineIdx] || '').trim(); 
      const weight = this.excelService.parseNumber(row[weightIdx1] || row[weightIdx2]);
      
      let cost = 0;
      if (valorNfIdx !== -1 && row[valorNfIdx] !== undefined && row[valorNfIdx] !== '') {
         cost = this.excelService.parseNumber(row[valorNfIdx]);
      }
      if (cost <= 0) cost = this.excelService.parseNumber(row[costIdx1]);
      if (cost <= 0) cost = this.excelService.parseNumber(row[costIdx2]);

      if (sku && name && cost > 0 && sku.toLowerCase() !== 'material') {
        // Mosaic/Deca: produtos unitários — sem m², custo é direto
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
          costPerM2Cents: Math.round(cost * 100),
        });
      }
    }
    return results;
  }

  private parseDueFratelliLayout(
    rows: any[],
    cols: { lineCol: number; metaLabelCol: number; metaValCol: number; skuCol: number; nameCol: number; priceStart: number; priceEnd: number },
  ): ImportProductResult[] {
    // PASS 1: Collect all metadata sections.
    // A section starts when "Uso:" appears in metaLabelCol. Metadata spans ~5 rows.
    interface Section {
      startRow: number;
      format: string;
      line: string;
      usage: string;
      boxCoverage: number;
      palletBoxes: number;
      boxWeight: number;
    }

    const sections: Section[] = [];
    let current: Section | null = null;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!row || !Array.isArray(row)) continue;

      const rawMetaLabel = String(row[cols.metaLabelCol] || '').trim();
      const metaLabel = rawMetaLabel.toLowerCase();
      const isStarred = rawMetaLabel.startsWith('*');

      // Detect new section by "Uso:" (without asterisk) in metaLabelCol
      // "*Uso:" is a secondary annotation, not a section start
      if (!isStarred && metaLabel === 'uso:') {
        // Look backwards from this row to find true section start (format/dimension row)
        let startRow = i;
        for (let b = i - 1; b >= 0; b--) {
          const prevRow = rows[b];
          if (!prevRow || !Array.isArray(prevRow)) break;
          const prevLineCell = String(prevRow[cols.lineCol] || '').trim();
          const prevLabel = String(prevRow[cols.metaLabelCol] || '').trim().toLowerCase();
          // Stop if we hit the end of a previous section (peso row)
          if (prevLabel.includes('peso por m')) break;
          // If this row has a format dimension, this is the real section start
          if (prevLineCell && /\d+.*[xX].*\d+/.test(prevLineCell)) {
            startRow = b;
            break;
          }
          // Also check if it has products (extend section start to include them)
          const prevSku = String(prevRow[cols.skuCol] || '').trim();
          if (prevSku && prevSku !== 'CÓD.') startRow = b;
        }

        current = {
          startRow,
          format: '',
          line: '',
          usage: String(row[cols.metaValCol] || '').trim(),
          boxCoverage: 0,
          palletBoxes: 0,
          boxWeight: 0,
        };
        sections.push(current);

        // Retroactively collect format/line from rows we looked back through
        for (let b = startRow; b < i; b++) {
          const prevRow = rows[b];
          if (!prevRow) continue;
          const prevLineCell = String(prevRow[cols.lineCol] || '').trim();
          if (prevLineCell) {
            const parts = prevLineCell.split(/\r?\n/);
            for (const part of parts) {
              const p = part.trim();
              if (!p) continue;
              if (/\d+.*[xX].*\d+/.test(p)) current.format = p;
              else if (p.length < 30 && p !== 'LINHA' && p !== 'INFORMAÇÕES' && p !== 'OBSERVAÇÕES' && !p.includes('DUEFRATELLI') && !p.includes('BRASIL') && !p.includes('Produtos classe') && !p.includes('NCM') && !p.includes('FOB')) current.line = p;
            }
          }
        }
      }

      if (!current) continue;

      // Strip asterisk for metadata value matching (but NOT for section detection above)
      const cleanLabel = metaLabel.replace(/^\*/, '');
      if (cleanLabel.includes('m² por caixa:') || cleanLabel.includes('m2 por caixa:')) {
        current.boxCoverage = this.excelService.parseNumber(row[cols.metaValCol]);
      } else if (cleanLabel.includes('m² por palete:') || cleanLabel.includes('m2 por palete:')) {
        const palletM2 = this.excelService.parseNumber(row[cols.metaValCol]);
        current.palletBoxes = current.boxCoverage > 0 ? Math.round(palletM2 / current.boxCoverage) : 0;
      } else if (cleanLabel.includes('peso por m')) {
        current.boxWeight = this.excelService.parseNumber(row[cols.metaValCol]);
      }

      // Collect format/line from lineCol
      const lineCell = String(row[cols.lineCol] || '').trim();
      if (lineCell) {
        const parts = lineCell.split(/\r?\n/);
        for (const part of parts) {
          const p = part.trim();
          if (!p) continue;
          if (/\d+.*[xX].*\d+/.test(p)) {
            current.format = p;
          } else if (
            p.length < 30 &&
            p !== 'LINHA' && p !== 'INFORMAÇÕES' && p !== 'OBSERVAÇÕES' &&
            !p.includes('DUEFRATELLI') && !p.includes('BRASIL') &&
            !p.includes('Produtos classe') && !p.includes('NCM') && !p.includes('FOB')
          ) {
            current.line = p;
          }
        }
      }
    }

    // PASS 2: Collect products and assign metadata from their section.
    const results: ImportProductResult[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!row || !Array.isArray(row)) continue;

      const sku = String(row[cols.skuCol] || '').trim();
      const name = String(row[cols.nameCol] || '').trim();

      if (!sku || !name) continue;
      if (sku === 'CÓD.' || name === 'DESCRIÇÃO' || name === 'PRODUTOS') continue;

      // Find cost in price range
      let cost = 0;
      for (let j = cols.priceStart; j <= cols.priceEnd; j++) {
        if (row[j] !== undefined && row[j] !== null && row[j] !== '') {
          cost = this.excelService.parseNumber(row[j]);
          if (cost > 0) break;
        }
      }

      if (cost <= 0) continue;

      // Find the section that applies to this row (most recent section starting <= i)
      let section: Section | null = null;
      for (let s = sections.length - 1; s >= 0; s--) {
        if (sections[s].startRow <= i) {
          section = sections[s];
          break;
        }
      }

      const coverage = section?.boxCoverage || 0;

      results.push({
        sku: String(sku).replace(/^\*/, ''),
        supplierCode: String(sku).replace(/^\*/, ''),
        name,
        format: section?.format || '',
        line: section?.line || '',
        piecesPerBox: 0,
        boxCoverage: coverage,
        palletBoxes: section?.palletBoxes || 0,
        boxWeight: section?.boxWeight || 0,
        usage: section?.usage || '',
        costCents: this.calcCostCents(cost, coverage),
        costPerM2Cents: Math.round(cost * 100),
      });
    }

    return results;
  }

  // Boutique Brasil: LINHA=col1, INFO=col2-3, SKU=col4, Nome=col6, Preço=col9
  private parseDueFratelli(rows: any[]): ImportProductResult[] {
    return this.parseDueFratelliLayout(rows, {
      lineCol: 1, metaLabelCol: 2, metaValCol: 3,
      skuCol: 4, nameCol: 6, priceStart: 7, priceEnd: 10,
    });
  }

  // Glam Brasil: LINHA=col0, INFO=col1-2, SKU=col3, Nome=col5, Preço=col6
  private parseGlam(rows: any[]): ImportProductResult[] {
    return this.parseDueFratelliLayout(rows, {
      lineCol: 0, metaLabelCol: 1, metaValCol: 2,
      skuCol: 3, nameCol: 5, priceStart: 6, priceEnd: 8,
    });
  }

  // Dexco: Tabular layout — each row is a product with dedicated columns
  private parseDexco(rows: any[]): ImportProductResult[] {
    let skuIdx = -1, nameIdx = -1, pcBoxIdx = -1, m2BoxIdx = -1, usoIdx = -1,
        palletIdx = -1, formatIdx = -1, weightIdx = -1, lineIdx = -1,
        valorNFIdx = -1, valorListaIdx = -1;

    let startRow = 1;
    for (let i = 0; i < Math.min(rows.length, 50); i++) {
      const row = rows[i];
      if (!Array.isArray(row)) continue;
      const rowStr = row.map(c => String(c || '').trim().toLowerCase());
      
      skuIdx = rowStr.indexOf('codigoproduto');
      if (skuIdx === -1) skuIdx = rowStr.indexOf('material');
      
      if (skuIdx !== -1) {
        nameIdx = rowStr.indexOf('produto');
        if (nameIdx === -1) nameIdx = rowStr.indexOf('descricao_completa');
        
        pcBoxIdx = rowStr.indexOf('pcporcx');
        m2BoxIdx = rowStr.indexOf('m2porcx');
        usoIdx = rowStr.indexOf('classeuso');
        palletIdx = rowStr.indexOf('qtdepallet');
        formatIdx = rowStr.indexOf('hierarquia3');
        if (formatIdx === -1) formatIdx = rowStr.findIndex(r => r.includes('formato'));
        weightIdx = rowStr.indexOf('pesobruto');
        if (weightIdx === -1) weightIdx = rowStr.indexOf('peso_bruto');
        lineIdx = rowStr.indexOf('grupopreco');
        if (lineIdx === -1) lineIdx = rowStr.indexOf('grupo preco');
        
        let nfIdx = rowStr.indexOf('valor da nf');
        if (nfIdx === -1) nfIdx = rowStr.indexOf('valordanf');
        valorNFIdx = nfIdx;
        
        valorListaIdx = rowStr.indexOf('valorlista');
        
        startRow = i + 1;
        break;
      }
    }

    if (skuIdx === -1) skuIdx = 12;
    if (nameIdx === -1) nameIdx = 20;
    if (pcBoxIdx === -1) pcBoxIdx = 14;
    if (m2BoxIdx === -1) m2BoxIdx = 15;
    if (usoIdx === -1) usoIdx = 16;
    if (palletIdx === -1) palletIdx = 21;
    if (formatIdx === -1) formatIdx = 25;
    if (weightIdx === -1) weightIdx = 29;
    if (lineIdx === -1) lineIdx = 9;
    if (valorListaIdx === -1) valorListaIdx = 37;
    if (valorNFIdx === -1) valorNFIdx = 50;

    const results: ImportProductResult[] = [];
    for (let i = startRow; i < rows.length; i++) {
      const row = rows[i];
      if (!Array.isArray(row)) continue;

      const sku = String(row[skuIdx] || '').replace(/'/g, '').trim();
      const name = String(row[nameIdx] || '').trim();
      
      let cost = 0;
      if (valorNFIdx !== -1 && row[valorNFIdx] !== undefined && row[valorNFIdx] !== '') {
        cost = this.excelService.parseNumber(row[valorNFIdx]);
      }
      if (cost <= 0) {
        cost = this.excelService.parseNumber(row[valorListaIdx]);
      }

      if (!sku || !name || cost <= 0) continue;
      if (sku.toLowerCase() === 'codigoproduto' || sku.toLowerCase() === 'material') continue; // skip header

      const piecesPerBox = Math.round(this.excelService.parseNumber(row[pcBoxIdx]));
      const boxCoverage = this.excelService.parseNumber(row[m2BoxIdx]);
      const usage = String(row[usoIdx] || '').trim();
      const palletM2 = this.excelService.parseNumber(row[palletIdx]);
      const palletBoxes = boxCoverage > 0 ? Math.round(palletM2 / boxCoverage) : 0;
      const format = String(row[formatIdx] || '').trim();
      const boxWeight = this.excelService.parseNumber(row[weightIdx]);
      const line = String(row[lineIdx] || '').trim();

      results.push({
        sku,
        supplierCode: sku,
        name,
        format,
        line,
        piecesPerBox,
        boxCoverage,
        palletBoxes,
        boxWeight,
        usage,
        costCents: this.calcCostCents(cost, boxCoverage),
        costPerM2Cents: Math.round(cost * 100),
      });
    }
    return results;
  }

  private parseStrufaldi(rows: any[]): ImportProductResult[] {
    const results: ImportProductResult[] = [];
    // Header is at row index 2. Data starts at 3.
    const startIndex = rows.length > 3 ? 3 : 0;

    for (let i = startIndex; i < rows.length; i++) {
      const row = rows[i];
      if (!row || !Array.isArray(row) || row.length < 13) continue;

      const sku = String(row[1] || '').trim();
      const name = String(row[2] || '').trim();
      const cost = this.excelService.parseNumber(row[12]);

      if (!sku || !name || cost <= 0) continue;
      // Skip header rows
      if (sku === 'Código Fabricante' || name === 'Descrição Curta') continue;

      const line = String(row[20] || '').trim();
      const format = String(row[21] || '').trim();
      const boxCoverage = this.excelService.parseNumber(row[31]);
      const piecesPerBox = Math.round(this.excelService.parseNumber(row[32]));
      const palletM2 = this.excelService.parseNumber(row[30]);
      const palletBoxes = boxCoverage > 0 ? Math.round(palletM2 / boxCoverage) : 0;
      const boxWeight = this.excelService.parseNumber(row[9]);
      const usage = String(row[22] || '').trim(); // Tipo (Piso, Parede, etc)

      results.push({
        sku,
        supplierCode: sku,
        name,
        format,
        line,
        piecesPerBox,
        boxCoverage,
        palletBoxes,
        boxWeight,
        usage,
        costCents: this.calcCostCents(cost, boxCoverage),
        costPerM2Cents: Math.round(cost * 100),
      });
    }
    return results;
  }

}
