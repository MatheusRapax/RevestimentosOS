import { AiImportService } from './src/modules/stock/services/ai-import.service';

const headers = ['SKU', 'Preço de nota sem\r\nIPI', 'Preço Custo', 'Preço Venda'];
const costKeywords = ['preço', 'preco', 'custo', 'valor', 'r$', 'faturamento'];

const priceHeaders = headers.filter(h => {
    if (!h) return false;
    const lower = h.toLowerCase();
    return costKeywords.some(kw => lower.includes(kw));
});

let ambiguities: any[] = []; // pretend OpenAI returned no ambiguities

if (priceHeaders.length > 1) {
    let multiplePricesAmb = ambiguities.find(a => a.type === 'MULTIPLE_PRICES');
    if (!multiplePricesAmb) {
        multiplePricesAmb = {
            type: 'MULTIPLE_PRICES',
            message: 'Encontramos múltiplas colunas de preço. Qual delas devemos usar?',
            options: []
        };
        ambiguities.push(multiplePricesAmb);
    }
    
    const existingCols = new Set(multiplePricesAmb.options.map((o: any) => o.column));
    priceHeaders.forEach(h => {
        if (!existingCols.has(h)) {
            multiplePricesAmb.options.push({
                label: h.replace(/\r\n/g, ' '),
                column: h,
                sampleValue: 'N/A'
            });
            existingCols.add(h);
        }
    });
}

console.log(JSON.stringify(ambiguities, null, 2));
