const { AiImportService } = require('./dist/modules/stock/services/ai-import.service');
const fs = require('fs');

async function run() {
  const aiService = new AiImportService({ log: () => {} });
  const buffer = fs.readFileSync('./planilhas/TABELA COMPLETA STRUFALDI - BLACK (8).xlsx');
  
  aiService.callOpenAIMapping = async (args) => {
    return {
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
      },
      ambiguities: []
    };
  };

  const sheetsData = await aiService.flattenExcelToJSON(buffer, 'TABELA ATELIÊ STRUFALDI');
  const targetSheet = sheetsData[0];
  const headerIdx = aiService.detectHeaders(targetSheet.rows);
  const headers = aiService.buildAISample(targetSheet.rows, headerIdx).headers;
  
  const aiResult = await aiService.callOpenAIMapping({ headers, sampleData: [] });
  const mapped = aiService.applyMapping(targetSheet.rows.slice(headerIdx + 1), aiResult.mapping, headers);
  
  const finalItems = aiService.generateImportResult(mapped, []);
  console.log(`Extracted ${finalItems.length} products from ATELIÊ STRUFALDI`);
  
  // also check CANTONEIRA
  const cantoneiraSheet = sheetsData.find(s => s.sheetName === 'CANTONEIRA');
  if (cantoneiraSheet) {
      const cHeaders = aiService.buildAISample(cantoneiraSheet.rows, aiService.detectHeaders(cantoneiraSheet.rows)).headers;
      const cMapped = aiService.applyMapping(cantoneiraSheet.rows.slice(aiService.detectHeaders(cantoneiraSheet.rows) + 1), aiResult.mapping, cHeaders);
      const cFinalItems = aiService.generateImportResult(cMapped, []);
      console.log(`Extracted ${cFinalItems.length} products from CANTONEIRA using the SAME ATELIÊ mapping.`);
  } else {
      const allSheets = await aiService.flattenExcelToJSON(buffer);
      const cantoneira2 = allSheets.find(s => s.sheetName === 'CANTONEIRA');
      const headerIdx2 = aiService.detectHeaders(cantoneira2.rows);
      const headers2 = aiService.buildAISample(cantoneira2.rows, headerIdx2).headers;
      const mapped2 = aiService.applyMapping(cantoneira2.rows.slice(headerIdx2 + 1), aiResult.mapping, headers2);
      const finalItems2 = aiService.generateImportResult(mapped2, []);
      console.log(`Extracted ${finalItems2.length} products from CANTONEIRA using the ATELIÊ mapping.`);
  }

}
run();
