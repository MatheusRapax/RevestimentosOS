import { AiImportService } from './src/modules/stock/services/ai-import.service';

const aiService = new AiImportService({ log: () => {} } as any);

const buffer = require('fs').readFileSync('./planilhas/TABELA COMPLETA STRUFALDI - BLACK (8).xlsx');
const sheets = aiService.extractSheetNames(buffer);

if (sheets.length > 0) {
  aiService.flattenExcelToJSON(buffer, sheets[0]).then(data => {
    const rows = data[0].rows;
    console.log('Total normalized rows:', rows.length);
    console.log('Row 0:', rows[0]);
    console.log('Row 1:', rows[1]);
    console.log('Row 2:', rows[2]);
    console.log('Row 3:', rows[3]);
    
    const headerIdx = aiService.detectHeaders(rows);
    console.log('Header Idx:', headerIdx);
    
    const dataRows = rows.slice(headerIdx + 1);
    console.log('Data Rows length:', dataRows.length);
    console.log('First Data Row:', dataRows[0]);
  });
}
