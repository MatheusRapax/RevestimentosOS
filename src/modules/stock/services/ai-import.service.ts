import { Injectable, Logger } from '@nestjs/common';
import * as xlsx from 'xlsx';
import OpenAI from 'openai';
import * as crypto from 'crypto';
import { PrismaService } from '../../../core/prisma/prisma.service';
import {
  AIClassifiedItemDto,
  AIColumnMappingDto,
  AmbiguityType,
} from '../dto/ai-import.dto';
import { ImportProductItemDto } from '../dto/import-products.dto';

@Injectable()
export class AiImportService {
  private readonly logger = new Logger(AiImportService.name);
  private openai: OpenAI;

  constructor(private readonly prisma: PrismaService) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (apiKey) {
      this.logger.log(`OpenAI API Key carregada com sucesso (termina em ...${apiKey.slice(-4)})`);
    } else {
      this.logger.error('AVISO CRÍTICO: OPENAI_API_KEY não foi encontrada no .env');
    }

    this.openai = new OpenAI({
      apiKey,
    });
  }

  /**
   * Lê o Excel e retorna apenas os nomes das abas válidas (de produtos)
   */
  extractSheetNames(buffer: Buffer): string[] {
    const wb = xlsx.read(buffer, { type: 'buffer' });
    return this.identifyProductSheets(wb.SheetNames);
  }

  /**
   * Lê todas as abas do Excel (ou apenas uma específica se fornecida), desmescla células e converte para JSON plano
   */
  async flattenExcelToJSON(buffer: Buffer, targetSheetName?: string): Promise<{ sheetName: string; rows: any[] }[]> {
    const wb = xlsx.read(buffer, { type: 'buffer' });
    const productSheets = targetSheetName 
      ? [targetSheetName].filter(name => wb.SheetNames.includes(name))
      : this.identifyProductSheets(wb.SheetNames);
    
    const allSheetsData = [];

    for (const sheetName of productSheets) {
      const ws = wb.Sheets[sheetName];
      const merges = ws['!merges'] || [];
      
      // Desmesclar preenchendo as células virtuais com o valor do topo-esquerdo
      for (const merge of merges) {
        const { s, e } = merge;
        const topLeftCellRef = xlsx.utils.encode_cell({ c: s.c, r: s.r });
        const topLeftCell = ws[topLeftCellRef];
        if (!topLeftCell) continue;

        for (let R = s.r; R <= e.r; R++) {
          for (let C = s.c; C <= e.c; C++) {
            if (R === s.r && C === s.c) continue;
            const cellRef = xlsx.utils.encode_cell({ c: C, r: R });
            if (!ws[cellRef]) {
              ws[cellRef] = { t: topLeftCell.t, v: topLeftCell.v, w: topLeftCell.w };
            }
          }
        }
      }

      const rows: any[][] = xlsx.utils.sheet_to_json(ws, { header: 1, defval: '', raw: true });
      
      // Propagar categorias (linhas mescladas horizontalmente)
      let currentCategory = '';
      const processedRows = rows.map((row) => {
        // Se uma linha tiver a primeira célula preenchida e as próximas X células iguais à primeira
        // é um forte indício de que era uma linha de categoria (merge horizontal extenso)
        const firstVal = String(row[0] || '').trim();
        const newRow = [...row];
        if (firstVal && row.length > 3) {
          const isCategory = row.slice(1, 4).every(val => String(val || '').trim() === firstVal);
          if (isCategory) {
            currentCategory = firstVal;
            (newRow as any)._isCategoryRow = true;
          }
        }
        (newRow as any)._category = currentCategory;
        return newRow;
      });

      allSheetsData.push({ sheetName, rows: processedRows });
    }

    return allSheetsData;
  }

  /**
   * Filtra abas que não contêm produtos (ex: Instruções, Local de Uso)
   */
  identifyProductSheets(sheets: string[]): string[] {
    const skipKeywords = ['instru', 'local de uso', 'purificador', 'tabela de frete', 'dados', 'resumo'];
    return sheets.filter(sheet => {
      const lower = sheet.toLowerCase();
      return !skipKeywords.some(keyword => lower.includes(keyword));
    });
  }

  /**
   * Identifica a linha de cabeçalho verdadeira buscando palavras-chave e densidade de colunas
   */
  detectHeaders(rows: any[][]): number {
    const keywords = ['ref', 'código', 'codigo', 'descrição', 'descricao', 'produto', 'ean', 'formato', 'linha'];
    let bestRowIdx = 0;
    let maxScore = -1;

    // Procura nas primeiras 15 linhas (para lidar com cabeçalhos com muita informação inútil acima)
    const searchLimit = Math.min(15, rows.length);
    for (let i = 0; i < searchLimit; i++) {
      const row = rows[i];
      if (!row) continue;

      const cells = row;

      let score = 0;
      let nonEmptyCols = 0;

      for (const cell of cells) {
        const val = String(cell || '').trim().toLowerCase();
        if (val) {
          nonEmptyCols++;
          // Se a célula contiver uma palavra-chave, ganha mais pontos
          if (keywords.some(kw => val.includes(kw))) {
            score += 2;
          }
        }
      }

      // Pontuação total = densidade de colunas preenchidas + peso de palavras-chave
      score += nonEmptyCols;

      if (score > maxScore) {
        maxScore = score;
        bestRowIdx = i;
      }
    }

    return bestRowIdx;
  }

  buildAISample(rows: any[][], headerIdx: number): { headers: string[]; sampleData: any[] } {
    if (headerIdx >= rows.length) {
      return { headers: [], sampleData: [] };
    }

    const headerRow = rows[headerIdx] || [];
    const headers = headerRow.map(h => String(h || '').trim());

    const sampleData = [];
    for (let i = headerIdx + 1; i < rows.length && sampleData.length < 10; i++) {
      const row = rows[i];
      if (!Array.isArray(row)) continue;
      
      const isRowEmpty = row.every(c => !String(c || '').trim());
      if (!isRowEmpty) {
        // Converte os arrays de volta para objetos mapeados pelos cabeçalhos
        const obj: any = {};
        for (let j = 0; j < headers.length; j++) {
            const key = headers[j] || String(j);
            obj[key] = row[j];
        }
        if ((row as any)._category) {
          obj._category = (row as any)._category;
        }
        sampleData.push(obj);
      }
    }

    return { headers, sampleData };
  }

  /**
   * Gera um hash seguro a partir dos cabeçalhos, para detectar schema drift
   */
  generateHeadersHash(headers: string[]): string {
    const normalized = headers.map(h => String(h || '').trim().toLowerCase()).join('|');
    return crypto.createHash('md5').update(normalized).digest('hex');
  }

  /**
   * Busca um mapeamento no cache (evitando re-processamento com IA)
   */
  async getCachedMapping(supplierId: string, clinicId: string, headersHash: string) {
    const cache = await this.prisma.supplierMappingCache.findUnique({
      where: {
        supplierId_headersHash: {
          supplierId,
          headersHash,
        }
      }
    });

    if (!cache) return null;

    try {
      return JSON.parse(cache.mappingPayload);
    } catch (e) {
      this.logger.error(`Erro ao parsear mapping do cache para fornecedor ${supplierId}`, e);
      return null;
    }
  }

  /**
   * Salva um mapeamento no cache
   */
  async saveCachedMapping(supplierId: string, clinicId: string, headersHash: string, mappingPayload: any, confidenceScore: number = 1.0) {
    await this.prisma.supplierMappingCache.upsert({
      where: {
        supplierId_headersHash: {
          supplierId,
          headersHash,
        }
      },
      update: {
        mappingPayload: JSON.stringify(mappingPayload),
        confidenceScore,
      },
      create: {
        supplierId,
        clinicId,
        headersHash,
        mappingPayload: JSON.stringify(mappingPayload),
        confidenceScore,
      }
    });
  }

  /**
   * Chama a OpenAI para inferir o mapeamento de colunas
   */
  async callOpenAIMapping(sample: any): Promise<{
    mapping: AIColumnMappingDto;
    ambiguities: any[];
  }> {
    const prompt = `
Você é um especialista em importação de tabelas de preço do setor de revestimentos cerâmicos e acabamentos para construção civil no Brasil.

Seu objetivo é analisar o cabeçalho e as amostras de dados de uma planilha de um fornecedor e mapear as colunas originais para o nosso sistema.

Regras do domínio:
- Produtos cerâmicos (porcelanato, piso, revestimento) são vendidos por M2.
- Metais, louças e acessórios são vendidos por UNIDADE.
- O preço em tabelas de cerâmica é SEMPRE por m2, nunca por caixa.
- Colunas como "m2/Cx", "Pç/Cx", "Cx/Pallet" indicam produto de área (M2).
- Se não há coluna de unidade explícita mas há "m2/Cx > 0", a unidade é M2.
- Formatos como "60x120", "82x82" indicam dimensões em cm de cerâmica.
- Palavras como "Porcelanato", "Piso", "Revestimento" = cerâmica = M2.
- Palavras como "Torneira", "Cabide", "Misturador", "Válvula" = metal = UN.

Instruções críticas e PROIBIÇÕES:
- CUIDADO EXTREMO: A coluna de "cost" DEVE apontar para a coluna que contém o PREÇO FINANCEIRO (ex: 20,50, R$, etc). A coluna "m2/Cx" ou "M2" contém medidas físicas, NÃO É O CUSTO. NUNCA mapeie "m2/Cx", "Pç/Cx" ou similares para o campo "cost".
- MÚLTIPLOS PREÇOS: Se você identificar 2 ou mais colunas que representam valores financeiros, preços, custos ou faturamentos (ex: "Preço Fob", "Preço Cif", "Vlr Líquido", "ICMS", "IPI", "Custo", "R$"), você NÃO DEVE adivinhar qual é o certo. Você DEVE OBRIGATORIAMENTE gerar uma ambiguidade do tipo MULTIPLE_PRICES incluindo TODAS as colunas que podem ser preços. NÃO OMITA NENHUMA.
- Se não for possível determinar a unidade (nem M2 nem UN), e não houver "m2/Cx", retorne ambiguidade UNKNOWN_UNIT.
- Se os dados estiverem muito confusos devido a células mescladas, retorne MERGED_DATA.
- As chaves de mapping devem conter o NOME EXATO da coluna original do fornecedor. Se a coluna não existir na planilha, defina como null.
- A coluna do custo deve ser apenas daquela que representa um preço em Reais/Dinheiro.
- "m2PerBox" é estritamente a coluna que informa quantos metros quadrados vem em uma caixa.

Amostra de Dados:
${JSON.stringify(sample, null, 2)}
`;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'Você é um assistente mapeador de dados estruturados.' },
        { role: 'user', content: prompt }
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'column_mapping_schema',
          strict: true,
          schema: {
            type: 'object',
            properties: {
              mapping: {
                type: 'object',
                properties: {
                  sku: { type: ['string', 'null'] },
                  name: { type: ['string', 'null'] },
                  cost: { type: ['string', 'null'] },
                  unit: { type: ['string', 'null'] },
                  format: { type: ['string', 'null'] },
                  m2PerBox: { type: ['string', 'null'] },
                  piecesPerBox: { type: ['string', 'null'] },
                  palletBoxes: { type: ['string', 'null'] },
                  weight: { type: ['string', 'null'] },
                  ncm: { type: ['string', 'null'] },
                  cest: { type: ['string', 'null'] },
                  cfop: { type: ['string', 'null'] },
                  cst: { type: ['string', 'null'] },
                },
                required: ['sku', 'name', 'cost', 'unit', 'format', 'm2PerBox', 'piecesPerBox', 'palletBoxes', 'weight', 'ncm', 'cest', 'cfop', 'cst'],
                additionalProperties: false
              },
              ambiguities: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    type: { type: 'string', enum: ['MULTIPLE_PRICES', 'UNKNOWN_UNIT', 'MERGED_DATA'] },
                    message: { type: 'string' },
                    options: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          label: { type: 'string' },
                          column: { type: 'string' },
                          sampleValue: { type: 'string' }
                        },
                        required: ['label', 'column', 'sampleValue'],
                        additionalProperties: false
                      }
                    }
                  },
                  required: ['type', 'message', 'options'],
                  additionalProperties: false
                }
              }
            },
            required: ['mapping', 'ambiguities'],
            additionalProperties: false
          }
        }
      },
      temperature: 0,
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    return { mapping: result.mapping, ambiguities: result.ambiguities };
  }

  /**
   * Chama a OpenAI em lotes para classificar itens (M2 vs UN)
   */
  async callOpenAIClassify(items: any[]): Promise<AIClassifiedItemDto[]> {
    // Para simplificar a POC e não estourar o contexto, vamos fazer o processamento batch simulado se items for grande, 
    // mas na versão real idealmente usamos loteamento de 50 itens.
    
    // Por enquanto, o mapeamento inicial nos dá a base. A classificação linha-a-linha 
    // é opcional se o mapping já identificou bem a coluna unit e m2PerBox.
    return [];
  }

  /**
   * Aplica localmente o mapeamento, sem custo de tokens
   */
  applyMapping(rows: any[], mapping: AIColumnMappingDto, headers: string[]): any[] {
    const mappedRows = [];
    
    // Create an index map for quick lookup
    const headerMap: Record<string, number> = {};
    headers.forEach((h, idx) => {
      if (h) headerMap[String(h).trim().toLowerCase()] = idx;
    });

    const getVal = (row: any, key: string | null) => {
      if (!key) return null;
      const normalizedKey = String(key).trim().toLowerCase();
      const idx = headerMap[normalizedKey];
      return idx !== undefined && row[idx] !== undefined ? row[idx] : null;
    };

    for (const row of rows) {
      if (!row || Object.keys(row).length === 0) continue;
      if (row['_isCategoryRow']) continue;
      
      const skuValRaw = getVal(row, mapping.sku);
      const nameValRaw = getVal(row, mapping.name);

      const skuVal = skuValRaw ? String(skuValRaw).trim() : null;
      const nameVal = nameValRaw ? String(nameValRaw).trim() : null;
      
      // Combinar o nome com a category propagada, se existir
      const category = row['_category'] ? String(row['_category']).trim() : '';
      const finalName = category && nameVal ? `${category} - ${nameVal}` : nameVal;

      if (!skuVal && !nameVal) continue; // Ignora linhas em branco

      mappedRows.push({
        _originalRow: row,
        sku: skuVal,
        name: finalName,
        cost: getVal(row, mapping.cost),
        unit: getVal(row, mapping.unit),
        format: getVal(row, mapping.format),
        m2PerBox: getVal(row, mapping.m2PerBox),
        piecesPerBox: getVal(row, mapping.piecesPerBox),
        palletBoxes: getVal(row, mapping.palletBoxes),
        weight: getVal(row, mapping.weight),
        ncm: getVal(row, mapping.ncm),
        cest: getVal(row, mapping.cest),
        cfop: getVal(row, mapping.cfop),
        cst: getVal(row, mapping.cst),
      });
    }
    return mappedRows;
  }

  /**
   * Limpa caracteres indesejados de campos numéricos e strings corrompidas
   */
  private sanitizeNumber(val: any): number {
    if (!val) return 0;
    if (typeof val === 'number') return val;
    
    let str = String(val).replace(/\\r\\n/g, '').trim();
    // Remover símbolos de moeda e letras, preservando apenas dígitos, vírgula, ponto e sinal negativo
    str = str.replace(/[^\d,\.-]/g, '');
    
    if (str.includes(',') && str.includes('.')) {
      // Formato brasileiro com milhar e decimal: "1.234,56"
      str = str.replace(/\./g, '').replace(',', '.');
    } else if (str.includes(',') && !str.includes('.')) {
      // Formato decimal com vírgula: "123,45"
      str = str.replace(',', '.');
    }
    
    const num = parseFloat(str);
    return isNaN(num) ? 0 : num;
  }

  /**
   * Converte o rawData mapeado para o formato do ERP, calculando o custo da caixa
   */
  generateImportResult(
    mappedItems: any[],
    classifications: AIClassifiedItemDto[],
  ): ImportProductItemDto[] {
    return mappedItems.map(item => {
      const rawCost = this.sanitizeNumber(item.cost);
      const m2PerBox = this.sanitizeNumber(item.m2PerBox);
      const piecesPerBox = this.sanitizeNumber(item.piecesPerBox);
      const palletBoxes = this.sanitizeNumber(item.palletBoxes);
      
      // Regra de Inferência Básica:
      let unit = String(item.unit || '').toUpperCase();
      // Sanitize unit if the AI mistakenly passed a number (like m2 value)
      if (unit && !isNaN(parseFloat(unit))) {
        unit = '';
      }

      if (!unit) {
        if (m2PerBox > 0) unit = 'M2';
        else unit = 'UN';
      }
      if (unit === 'CX' && m2PerBox > 0) {
        unit = 'M2'; // CX cobra M2
      }

      let costCents = 0;
      let costPerM2Cents = 0;

      // Cálculo de custo da caixa
      if (unit === 'M2' && m2PerBox > 0) {
        // rawCost é preço por m2. Precisamos multiplicar pelo m2PerBox para ter o valor da caixa
        costCents = Math.round(rawCost * m2PerBox * 100);
        costPerM2Cents = Math.round(rawCost * 100);
      } else {
        costCents = Math.round(rawCost * 100);
        costPerM2Cents = costCents;
      }

      return {
        sku: item.sku || '',
        name: item.name || 'Sem nome',
        brand: 'A Definir', // Será setado na chamada principal
        unit: unit as any,
        saleType: unit === 'M2' ? 'AREA' : 'UNIT',
        costCents,
        costPerM2Cents, // Para o front mostrar
        boxCoverage: m2PerBox, // Fix: Use boxCoverage instead of m2PerBox to match DTO
        piecesPerBox,
        palletBoxes,
        palletCoverage: 0,
        ean: '',
        ncm: item.ncm || '',
        cest: item.cest || '',
        cfop: item.cfop || '',
        cst: item.cst || '',
        format: item.format || '',
        color: '',
      };
    }).filter(item => {
      // Filtragem rígida para remover linhas que são apenas categorias, cabeçalhos repetidos ou vazios
      if (!item.name || item.name === 'Sem nome') return false;
      if (item.costCents === 0 && item.costPerM2Cents === 0) return false;
      
      const skuLower = item.sku.toLowerCase().trim();
      const nameLower = item.name.toLowerCase().trim();
      
      // Ignorar se o SKU for visivelmente um cabeçalho
      if (/^(ref\.?|sku|cód\.?|código)$/i.test(skuLower)) return false;
      // Ignorar se o Nome for visivelmente um cabeçalho
      if (/^(descrição|nome|produto)$/i.test(nameLower)) return false;
      if (nameLower === 'descrição e formato') return false;

      // Remover formatos vazios que não são produtos (ex: "62 x 120 - Ret.")
      // Um produto de verdade costuma ter um preço > 0, o que já é coberto, mas por segurança:
      if (!item.sku && !item.name.includes(' ')) return false;

      return true;
    });
  }
}
