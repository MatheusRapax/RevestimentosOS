import * as xlsx from 'xlsx';
import { AiImportService } from './src/modules/stock/services/ai-import.service';

const aiService = new AiImportService(null as any);

const buffer = require('fs').readFileSync('./planilhas/TABELA COMPLETA STRUFALDI - BLACK (8).xlsx');
const sheets = aiService.extractSheetNames(buffer);

if (sheets.length > 0) {
  aiService.flattenExcelToJSON(buffer, sheets[0]).then(data => {
    const headerIdx = aiService.detectHeaders(data[0].rows);
    if (headerIdx !== -1) {
        const sample = aiService.buildAISample(data[0].rows, headerIdx);
        console.log('Sample Data [0]:', sample.sampleData[0]);
        console.log('Sample Data [1]:', sample.sampleData[1]);
        
        // Also let's check what `applyMapping` would do
        const headerMap = {};
        sample.headers.forEach((h, idx) => {
            if (h) headerMap[aiService['normalizeString'](h)] = idx;
        });
        console.log('HeaderMap:', headerMap);
    }
  });
}
