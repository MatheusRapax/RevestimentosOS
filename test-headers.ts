import { AiImportService } from './src/modules/stock/services/ai-import.service';

const service = new AiImportService(null as any);

const rows = [
  ['STRUFALDI', '', '', '', ''],
  ['', '', '', '', ''],
  ['Referência', 'Descrição', 'Formato', 'Preço FOB', 'M2/CX'],
  ['123', 'Revestimento Azul', '10x10', '10,50', '2.0'],
  ['124', 'Revestimento Branco', '10x10', '9,50', '2.0']
];

const headerIdx = service.detectHeaders(rows);
console.log('Header Idx:', headerIdx);
const { headers } = service.buildAISample(rows, headerIdx);
console.log('Headers:', headers);
