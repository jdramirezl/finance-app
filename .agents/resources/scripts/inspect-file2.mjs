import XLSX from 'xlsx';
import { join } from 'path';

const FILE = '/local/home/jdrami/finance-app/.agents/resources/Shin Presupuesto Mensual 2024.xlsx';
const wb = XLSX.readFile(FILE);

function fmt(cell) {
  if (cell === undefined || cell === null || cell === '') return '·';
  if (typeof cell === 'number' && cell > 40000 && cell < 50000) {
    const d = XLSX.SSF.parse_date_code(cell);
    return `D:${d.y}-${String(d.m).padStart(2,'0')}-${String(d.d).padStart(2,'0')}`;
  }
  if (typeof cell === 'number') return String(cell);
  return String(cell).substring(0, 18);
}

function inspect(sheetName, rowsToShow = 20, colsToShow = 22) {
  console.log(`\n${'='.repeat(80)}\nSHEET: ${sheetName}\n${'='.repeat(80)}`);
  const ws = wb.Sheets[sheetName];
  if (!ws) {
    console.log('  (not found)');
    return;
  }
  const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: true });
  console.log(`  Total rows: ${data.length}`);
  // Show column header row indices
  const colHdr = '       ' + Array.from({ length: colsToShow }, (_, i) => String(i).padStart(8)).join(' | ');
  console.log(colHdr);
  for (let r = 0; r < Math.min(rowsToShow, data.length); r++) {
    const row = data[r] || [];
    const cells = Array.from({ length: colsToShow }, (_, c) => fmt(row[c]).padEnd(8).substring(0, 8));
    console.log(`  R${String(r).padStart(3)}: ${cells.join(' | ')}`);
  }
}

console.log('Sheet names:', wb.SheetNames);
inspect('January', 12);
inspect('December', 12);
inspect('November', 8);
// Show some data rows for January to look for entries
console.log('\n--- January rows 3-15 ---');
inspect('January', 16);
