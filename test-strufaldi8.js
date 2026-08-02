const { AiImportService } = require('./dist/modules/stock/services/ai-import.service');
const fs = require('fs');

async function run() {
  const aiService = new AiImportService({ log: () => {} });
  const buffer = fs.readFileSync('./planilhas/TABELA COMPLETA STRUFALDI - BLACK (8).xlsx');
  
  const allSheets = await aiService.flattenExcelToJSON(buffer);
  const cantoneira2 = allSheets.find(s => s.sheetName === 'CANTONEIRA');
  const headerIdx2 = aiService.detectHeaders(cantoneira2.rows);
  const headers2 = aiService.buildAISample(cantoneira2.rows, headerIdx2).headers;
  
  const mapping = {
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
  };
  
  const mapped2 = aiService.applyMapping(cantoneira2.rows.slice(headerIdx2 + 1), mapping, headers2);
  const finalItems2 = aiService.generateImportResult(mapped2, []);
  console.log(`Extracted ${finalItems2.length} products from CANTONEIRA using the ATELIÊ mapping.`);
  
  console.log("Headers of CANTONEIRA:", headers2);
  console.log("First 3 mapped items:", mapped2.slice(0, 3));
}
run();
