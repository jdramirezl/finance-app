#!/usr/bin/env node
// Quick inspector for File 4 (Mexico). Confirms layout for October & November.
import XLSX from 'xlsx';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SOURCE_PATH = join(__dirname, '..', 'Presupuesto Mensual 2025 MEXICO.xlsx');

const wb = XLSX.readFile(SOURCE_PATH, { cellDates: false });
console.log('Sheets:', wb.SheetNames);

for (const name of ['October', 'November']) {
  const ws = wb.Sheets[name];
  if (!ws) {
    console.log(`  ${name}: NOT FOUND`);
    continue;
  }
  const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: true });
  console.log(`\n=== ${name} (rows: ${data.length}) ===`);
  console.log(`!ref: ${ws['!ref']}`);
  console.log('Row 1 (headers):', JSON.stringify(data[1]));
  console.log('Row 3 (first data):', JSON.stringify(data[3]));
  if (data.length > 4) console.log('Row 4:', JSON.stringify(data[4]));
  if (data.length > 5) console.log('Row 5:', JSON.stringify(data[5]));

  // Print first 30 rows showing the 4-section layout (cols 0-18)
  console.log('\nFirst 30 rows, cols 0..18:');
  for (let r = 0; r < Math.min(30, data.length); r++) {
    const row = data[r] || [];
    const cells = [];
    for (let c = 0; c < 19; c++) {
      const v = row[c];
      if (v === '' || v === null || v === undefined) cells.push('-');
      else cells.push(String(v).slice(0, 14));
    }
    console.log(`r${String(r).padStart(2)}: ${cells.map(c => c.padEnd(14)).join('|')}`);
  }
}
