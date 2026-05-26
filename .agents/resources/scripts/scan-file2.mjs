import XLSX from 'xlsx';

const FILE = '/local/home/jdrami/finance-app/.agents/resources/Shin Presupuesto Mensual 2024.xlsx';
const wb = XLSX.readFile(FILE);

// For each month, find the last row with data in each of the 4 sections
// Sections: Gastos (col 0), Ingresos (col 6), Gastos Fijos (col 11), Ingresos Fijos (col 16) -- cols+1 for Dec
const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function isSectionRowEmpty(row, baseCol, section) {
  let cols;
  if (section === 'Gastos') cols = [baseCol+0, baseCol+1, baseCol+2, baseCol+3, baseCol+4];
  if (section === 'Ingresos') cols = [baseCol+6, baseCol+7, baseCol+8, baseCol+9];
  if (section === 'Gastos Fijos') cols = [baseCol+11, baseCol+12, baseCol+13, baseCol+14];
  if (section === 'Ingresos Fijos') cols = [baseCol+16, baseCol+17, baseCol+18, baseCol+19];
  return cols.every(c => row[c] === undefined || row[c] === '' || row[c] === null);
}

for (const m of months) {
  const ws = wb.Sheets[m];
  const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: true });
  const baseCol = m === 'December' ? 1 : 0;
  const stats = { Gastos: 0, Ingresos: 0, 'Gastos Fijos': 0, 'Ingresos Fijos': 0 };
  const lastRows = { Gastos: 0, Ingresos: 0, 'Gastos Fijos': 0, 'Ingresos Fijos': 0 };
  const resetEntries = [];
  for (let r = 3; r < data.length; r++) {
    const row = data[r] || [];
    for (const sec of ['Gastos','Ingresos','Gastos Fijos','Ingresos Fijos']) {
      if (!isSectionRowEmpty(row, baseCol, sec)) {
        stats[sec]++;
        lastRows[sec] = r;
        // Detect "Reset" string anywhere in section
        const cellsStr = JSON.stringify(row).toLowerCase();
        if (cellsStr.includes('reset')) {
          resetEntries.push({ sheet: m, section: sec, row: r, content: row.slice(0,22) });
        }
      }
    }
  }
  console.log(`${m}: G=${stats.Gastos} (last r${lastRows.Gastos}), I=${stats.Ingresos} (last r${lastRows.Ingresos}), GF=${stats['Gastos Fijos']} (last r${lastRows['Gastos Fijos']}), IF=${stats['Ingresos Fijos']} (last r${lastRows['Ingresos Fijos']})`);
}

// Now scan all sheets for "Reset" string anywhere
console.log('\n--- Reset entries found ---');
let resetCount = 0;
for (const m of months) {
  const ws = wb.Sheets[m];
  const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: true });
  for (let r = 0; r < data.length; r++) {
    const row = data[r] || [];
    for (let c = 0; c < row.length; c++) {
      if (typeof row[c] === 'string' && row[c].toLowerCase().includes('reset')) {
        console.log(`${m} R${r} C${c}: "${row[c]}" | full row: ${JSON.stringify(row.slice(0, 22))}`);
        resetCount++;
      }
    }
  }
}
console.log(`Total Reset entries: ${resetCount}`);
