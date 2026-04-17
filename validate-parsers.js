const xlsx = require('xlsx');

function parseNumber(val) {
    if (val === null || val === undefined || val === '') return 0;
    if (typeof val === 'number') return val;
    const str = String(val).replace(/[R$\s]/g, '').replace(',', '.');
    return parseFloat(str) || 0;
}

function testFile(filename, cols) {
    const wb = xlsx.readFile(filename);
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });

    // PASS 1: sections (with backward-lookup)
    const sections = [];
    let current = null;
    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (!row || !Array.isArray(row)) continue;
        const rawLabel = String(row[cols.metaLabelCol] || '').trim();
        const metaLabel = rawLabel.toLowerCase();
        const isStarred = rawLabel.startsWith('*');

        // Only "Uso:" without * creates a section
        if (!isStarred && metaLabel === 'uso:') {
            let startRow = i;
            for (let b = i - 1; b >= 0; b--) {
                const pr = rows[b];
                if (!pr || !Array.isArray(pr)) break;
                const pLine = String(pr[cols.lineCol] || '').trim();
                const pLabel = String(pr[cols.metaLabelCol] || '').trim().toLowerCase();
                if (pLabel.includes('peso por m')) break;
                if (pLine && /\d+.*[xX].*\d+/.test(pLine)) { startRow = b; break; }
                const pSku = String(pr[cols.skuCol] || '').trim();
                if (pSku && pSku !== 'CÓD.') startRow = b;
            }
            current = { startRow, format: '', line: '', usage: String(row[cols.metaValCol] || '').trim(), boxCoverage: 0, palletBoxes: 0, boxWeight: 0 };
            sections.push(current);
            // Retroactive format/line from lookback rows
            for (let b = startRow; b < i; b++) {
                const pr = rows[b]; if (!pr) continue;
                const pLine = String(pr[cols.lineCol] || '').trim();
                if (pLine) { pLine.split(/\r?\n/).forEach(p => { p = p.trim(); if (!p) return; if (/\d+.*[xX].*\d+/.test(p)) current.format = p; else if (p !== 'LINHA' && p !== 'INFORMAÇÕES' && !p.includes('DUEFRATELLI') && !p.includes('BRASIL')) current.line = p; }); }
            }
        }
        if (!current) continue;

        const cleanLabel = metaLabel.replace(/^\*/, '');
        if (cleanLabel.includes('m² por caixa:') || cleanLabel.includes('m2 por caixa:')) current.boxCoverage = parseNumber(row[cols.metaValCol]);
        else if (cleanLabel.includes('m² por palete:')) { const pm2 = parseNumber(row[cols.metaValCol]); current.palletBoxes = current.boxCoverage > 0 ? Math.round(pm2 / current.boxCoverage) : 0; }
        else if (cleanLabel.includes('peso por m')) current.boxWeight = parseNumber(row[cols.metaValCol]);
        const lineCell = String(row[cols.lineCol] || '').trim();
        if (lineCell) { lineCell.split(/\r?\n/).forEach(p => { p = p.trim(); if (!p) return; if (/\d+.*[xX].*\d+/.test(p)) current.format = p; else if (p !== 'LINHA' && p !== 'INFORMAÇÕES' && !p.includes('DUEFRATELLI') && !p.includes('BRASIL')) current.line = p; }); }
    }

    console.log(`  Sections found: ${sections.length}`);
    sections.forEach((s, idx) => console.log(`    S${idx}: startRow=${s.startRow}, fmt=${s.format}, line=${s.line}, uso=${s.usage}, m2cx=${s.boxCoverage}, cxPal=${s.palletBoxes}, peso=${s.boxWeight}`));

    // PASS 2: products
    let products = 0; let withMeta = 0; let noMeta = 0;
    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (!row || !Array.isArray(row)) continue;
        const sku = String(row[cols.skuCol] || '').trim();
        const name = String(row[cols.nameCol] || '').trim();
        if (!sku || !name || sku === 'CÓD.' || name === 'DESCRIÇÃO' || name === 'PRODUTOS') continue;
        let cost = 0;
        for (let j = cols.priceStart; j <= cols.priceEnd; j++) { if (row[j] !== undefined && row[j] !== null && row[j] !== '') { cost = parseNumber(row[j]); if (cost > 0) break; } }
        if (cost <= 0) continue;
        let section = null;
        for (let s = sections.length - 1; s >= 0; s--) { if (sections[s].startRow <= i) { section = sections[s]; break; } }
        products++;
        if (section && section.boxCoverage > 0) withMeta++; else noMeta++;
        if (products <= 8) console.log(`  [${i}] SKU=${sku}, Cost=${cost}, Format=${section?.format || '?'}, Line=${section?.line || '?'}, Usage=${section?.usage || '?'}, m2/cx=${section?.boxCoverage || 0}, cx/palet=${section?.palletBoxes || 0}, peso=${section?.boxWeight || 0}`);
    }
    console.log(`  TOTAL: ${products} products, ${withMeta} with boxCoverage, ${noMeta} without`);
}

console.log("=== BOUTIQUE BRASIL ===");
testFile('./BOUTIQUE BRASIL 2025- VAREJO DUEFRATELLI.xlsx', { lineCol: 1, metaLabelCol: 2, metaValCol: 3, skuCol: 4, nameCol: 6, priceStart: 7, priceEnd: 10 });

console.log("\n=== GLAM BRASIL ===");
testFile('./GLAM BRASIL 2025 - VAREJO.xlsx', { lineCol: 0, metaLabelCol: 1, metaValCol: 2, skuCol: 3, nameCol: 5, priceStart: 6, priceEnd: 8 });
