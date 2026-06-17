import { ExcelService } from './src/core/excel/excel.service';
import { ProductImportService } from './src/modules/stock/services/product-import.service';

const excel = new ExcelService();
const srv = new ProductImportService(excel as any);

const rows = [
  ['', '', '', '', '', '', '', '', '', '', ''],
  ['', 'Ref.', 'Descrição', 'Formato', 'Linha', 'Pç/Cx', 'm2/Cx', 'Cx/Pal', 'Peso/Cx', 'Uso', 'Preço'],
  ['', '73720', 'San Giusto Plus', '30x120', 'Granilha', '4', '2.2', '32', '32.5', 'Piso', '50.49'],
  ['', '100', 'San Giusto Plus', '30x120', 'Granilha', '4', '2.2', '32', '32.5', 'Piso', '50.49'],
];

const parseStructured = (rows: any[]) => {
    let headerIndex = -1;
    let colSku = -1, colDesc = -1, colFormat = -1, colLine = -1;
    let colPcBox = -1, colM2Box = -1, colPalletBoxes = -1, colBoxWeight = -1;
    let colUsage = -1, colPrice = -1;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (Array.isArray(row)) {
        const rowStr = row.map(c => String(c || '').toLowerCase().trim());
        if (rowStr.includes('ref.') || rowStr.includes('cód.') || rowStr.includes('referência')) {
           headerIndex = i;
           colSku = rowStr.findIndex(c => c === 'ref.' || c === 'cód.' || c === 'referência');
           colDesc = rowStr.findIndex(c => c.includes('descrição') || c.includes('produto'));
           colFormat = rowStr.findIndex(c => c.includes('formato'));
           colLine = rowStr.findIndex(c => c.includes('linha'));
           colPcBox = rowStr.findIndex(c => c.includes('pç/cx') || c.includes('peças'));
           colM2Box = rowStr.findIndex(c => c === 'm2/cx' || c === 'm²/cx' || c.includes('m2') || c.includes('m²'));
           colPalletBoxes = rowStr.findIndex(c => c.includes('cx/pal') || c.includes('palete'));
           colBoxWeight = rowStr.findIndex(c => c.includes('peso'));
           colUsage = rowStr.findIndex(c => c.includes('uso'));
           colPrice = rowStr.findIndex(c => c.includes('preço') || c.includes('r$') || c.includes('frac'));
           break;
        }
      }
    }

    const results: any[] = [];
    const startIndex = headerIndex === -1 ? 0 : headerIndex + 1;

    if (colSku === -1) colSku = 0;
    if (colDesc === -1) colDesc = 1;

    for (let i = startIndex; i < rows.length; i++) {
      const row = rows[i];
      if (!Array.isArray(row)) continue;

      let sku = String(row[colSku] || '').trim();
      let name = String(row[colDesc] || '').trim();

      if (!sku && name && String(row[colDesc + 1] || '').trim()) {
         sku = name;
         name = String(row[colDesc + 1] || '').trim();
         // If shifted, let's just shift all other parsed values?
         // Actually, if the HEADER is shifted, the columns will already point to the correct index!
         // This fallback is only needed if headers were NOT shifted, but data IS shifted!
      }

      if (!sku || !name) continue;
      if (sku.toLowerCase().includes('tab.geral') || sku.toLowerCase().includes('ref.')) continue;

      const format = colFormat !== -1 ? String(row[colFormat] || '').trim() : '';
      const line = colLine !== -1 ? String(row[colLine] || '').trim() : '';
      const piecesPerBox = colPcBox !== -1 ? excel.parseNumber(row[colPcBox]) : 0;
      const boxCoverage = colM2Box !== -1 ? excel.parseNumber(row[colM2Box]) : 0;
      const palletBoxes = colPalletBoxes !== -1 ? excel.parseNumber(row[colPalletBoxes]) : 0;
      const boxWeight = colBoxWeight !== -1 ? excel.parseNumber(row[colBoxWeight]) : 0;
      const usage = colUsage !== -1 ? String(row[colUsage] || '').trim() : '';
      
      let cost = 0;
      if (colPrice !== -1) {
         cost = excel.parseNumber(row[colPrice]);
      } else {
         for (let j = row.length - 1; j >= Math.max(colDesc + 1, 4); j--) {
           const val = excel.parseNumber(row[j]);
           if (val > 0) {
             cost = val;
             break;
           }
         }
      }

      results.push({
        sku,
        name,
        format,
        line,
        piecesPerBox,
        boxCoverage,
        palletBoxes,
        boxWeight,
        usage,
        cost,
      });
    }
    return results;
};

console.log(JSON.stringify(parseStructured(rows), null, 2));

