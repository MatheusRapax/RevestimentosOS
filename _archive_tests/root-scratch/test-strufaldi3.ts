import { AiImportService } from './src/modules/stock/services/ai-import.service';

const aiService = new AiImportService({ log: () => {} } as any);
const buffer = require('fs').readFileSync('./planilhas/TABELA COMPLETA STRUFALDI - BLACK (8).xlsx');
const sheets = aiService.extractSheetNames(buffer);

aiService.flattenExcelToJSON(buffer, 'TABELA STRUFALDI - LINHA CONVEN').then(data => {
  if (data.length === 0) { console.log('Empty data'); return; }
  const rows = data[0].rows;
  const headerIdx = aiService.detectHeaders(rows);
  console.log('CONVEN Header Idx:', headerIdx);
  if (headerIdx !== -1) {
    const sample = aiService.buildAISample(rows, headerIdx);
    console.log('CONVEN Headers:', sample.headers);
  }
});
