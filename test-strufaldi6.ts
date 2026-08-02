import { AiImportService } from './src/modules/stock/services/ai-import.service';
import * as fs from 'fs';

async function run() {
  const aiService = new AiImportService({ log: () => {} } as any);
  const buffer = fs.readFileSync('./planilhas/TABELA COMPLETA STRUFALDI - BLACK (8).xlsx');
  
  // mock callOpenAI to return the mapping we EXPECT from the new prompt
  aiService['callOpenAI'] = async (prompt) => {
    return JSON.stringify({
      mapping: {
        sku: "Código Fabricante",
        name: "Descrição Curta",
        cost: "Preço de nota sem\r\nIPI",
        unit: "Unidade (CX, PC, UN, etc)",
        format: "FORMATO",
        m2PerBox: "M²/caixa",
        piecesPerBox: "Peças/caixa",
        palletBoxes: "M²/Palet",
        weight: "Peso (m²)",
        ncm: "NCM",
        cest: "CEST",
        cst: "Origem (CST, de 0 a 8)",
        ean: "EAN"
      }
    });
  };

  const sheetsData = await aiService.flattenExcelToJSON(buffer, 'TABELA ATELIÊ STRUFALDI');
  const targetSheet = sheetsData[0];
  const headerIdx = aiService.detectHeaders(targetSheet.rows);
  const headers = aiService.buildAISample(targetSheet.rows, headerIdx).headers;
  
  const aiResult = await aiService.callOpenAIMapping({ headers, sampleData: [] });
  const mapped = aiService.applyMapping(targetSheet.rows.slice(headerIdx + 1), aiResult.mapping, headers);
  
  const finalItems = aiService.generateImportResult(mapped, []);
  console.log(`Extracted ${finalItems.length} products from ATELIÊ STRUFALDI`);
  if (finalItems.length > 0) {
    console.log('Sample [0]:', finalItems[0]);
  }
}
run();
