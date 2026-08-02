const { AiImportService } = require('./dist/modules/stock/services/ai-import.service.js');

async function test() {
  const aiService = new AiImportService({ log: () => {} });
  
  // Fake the env for OpenAI
  process.env.OPENAI_API_KEY = require('fs').readFileSync('.env', 'utf-8')
    .split('\n')
    .find(line => line.startsWith('OPENAI_API_KEY='))
    ?.split('=')[1];

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
  
  // Real sample data from Strufaldi
  const sampleData = [
    {
      'FORMATO': '6X24',
      'Código Fabricante': '25460',
      'Descrição Longa': 'BIANCHE 6X24',
      'Descrição Curta': 'REVESTIMENTO 6X24 BIANCHE',
      'EAN': '7898670612660',
      'Preço de nota sem\r\nIPI': 58
    }
  ];

  try {
    const res = await aiService.callOpenAIMapping({ headers, sampleData });
    console.log('AI RESPONSE:\n', JSON.stringify(res, null, 2));
  } catch (e) {
    console.error('Error:', e.message);
  }
}
test();
