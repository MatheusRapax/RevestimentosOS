import { AiImportService } from './src/modules/stock/services/ai-import.service';

const aiService = new AiImportService({} as any);

const ambiguities = [{
  type: 'MULTIPLE_PRICES',
  message: 'Existem múltiplas colunas...',
  options: [
    { label: 'Preço Custo', column: 'Preço Custo' },
    { label: 'Preço Venda', column: 'Preço Venda' }
  ]
}];

const headers = ['SKU', 'Preço de nota sem\r\nIPI', 'Preço Custo', 'Preço Venda'];

const costKeywords = ['preço', 'preco', 'custo', 'valor', 'r$', 'faturamento'];

const multiplePricesAmb = ambiguities.find(a => a.type === 'MULTIPLE_PRICES');
if (multiplePricesAmb) {
    const existingCols = new Set(multiplePricesAmb.options.map((o: any) => o.column));
    headers.forEach(h => {
        if (!h) return;
        const lower = h.toLowerCase();
        if (costKeywords.some(kw => lower.includes(kw))) {
            if (!existingCols.has(h)) {
                multiplePricesAmb.options.push({
                    label: h.replace(/\r\n/g, ' '),
                    column: h,
                    sampleValue: 'N/A' // backend doesn't know sample easily here, or we can look it up
                });
                existingCols.add(h);
            }
        }
    });
}
console.log(JSON.stringify(ambiguities, null, 2));
