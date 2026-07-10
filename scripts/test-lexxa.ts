import { readFile } from 'fs/promises';
import * as XLSX from 'xlsx';

async function test() {
  const buf = await readFile('./planilhas/TABELA LEXXA BAGNO Maranhão.xlsx');
  const wb = XLSX.read(buf, { type: 'buffer' });
  const sheetName = wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
  
  for (let i = 0; i < Math.min(30, rows.length); i++) {
    const row = rows[i] as any[];
    console.log(`Row ${i}:`, row.map((v, i) => `${i}:${v}`).filter((_, i) => row[i] !== undefined));
  }
}

test().catch(console.error);
