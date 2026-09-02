import { AiImportService } from './src/modules/stock/services/ai-import.service';

async function test() {
  const aiService = new AiImportService({ log: () => {} } as any);
  const headers = [
    'FORMATO',
    'Código Fabricante',
    'Descrição Longa',
    'Descrição Curta',
    'EAN',
    'NCM',
    'CEST',
    'Origem (CST, de 0 a 8)',
    'Unidade (CX, PC, UN, etc)',
    'Peso Líquido',
    'Peso Bruto (produto + embalagem unitária)',
    'Peso (m²)',
    'Preço de nota sem\r\nIPI',
    'Base ICMS',
    'Alíquota ICMS',
    'Alíquota IPI',
    'Alíquota ST'
  ];
  const sampleData = [];
  
  // mock callOpenAI to just print the prompt
  const originalCall = aiService['callOpenAI'];
  aiService['callOpenAI'] = async (prompt: string) => {
    console.log('PROMPT:\n', prompt);
    return '{}';
  };
  
  await aiService.callOpenAIMapping({ headers, sampleData });
}
test();
