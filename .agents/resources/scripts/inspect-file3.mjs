#!/usr/bin/env node
// Quick inspection of Presupuesto Mensual 2025.xlsx structure.

import XLSX from 'xlsx';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SOURCE = join(__dirname, '..', 'Presupuesto Mensual 2025.xlsx');

const wb = XLSX.readFile(SOURCE, { cellDates: false });

console.log('Sheet names:');
console.log(wb.SheetNames);

for (const sheet of ['January', 'September']) {
  const ws = wb.Sheets[sheet];
  if (!ws) {
    console.log(`\n--- ${sheet}: not found`);
    continue;
  }
  const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: true });
  console.log(`\n--- ${sheet} (rows: ${data.length}) ---`);
  // Print first 6 rows, all columns
  for (let r = 0; r < Math.min(8, data.length); r++) {
    const row = data[r] || [];
    const rowDisplay = row.slice(0, 22).map((c, i) => `${i}:${typeof c === 'string' ? `"${c.slice(0, 20)}"` : c}`);
    console.log(`Row ${r}: [${rowDisplay.join(', ')}]`);
  }
  // Count maximum column width
  const maxCols = Math.max(...data.map(r => (r || []).length));
  console.log(`max columns: ${maxCols}`);
}
