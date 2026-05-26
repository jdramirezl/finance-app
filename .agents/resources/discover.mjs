import XLSX from 'xlsx';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const dir = '/local/home/jdrami/finance-app/.agents/resources';
const files = [
  'Presupuesto mensual.xlsx',
  'Shin Presupuesto Mensual 2024.xlsx',
  'Presupuesto Mensual 2025.xlsx',
  'Presupuesto Mensual 2025 MEXICO.xlsx',
];

const results = {};

for (const file of files) {
  const wb = XLSX.readFile(join(dir, file));
  const fileInfo = { sheets: [] };
  
  for (const name of wb.SheetNames) {
    const ws = wb.Sheets[name];
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
    const rows = range.e.r - range.s.r + 1;
    const cols = range.e.c - range.s.c + 1;
    
    // Get first 5 rows as sample
    const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
    const sample = data.slice(0, 8).map(row => 
      row.slice(0, Math.min(cols, 20)).map(cell => {
        if (cell === '') return '';
        if (typeof cell === 'number' && cell > 40000 && cell < 50000) {
          // Likely an Excel date serial
          const date = XLSX.SSF.parse_date_code(cell);
          return `[DATE:${date.y}-${String(date.m).padStart(2,'0')}-${String(date.d).padStart(2,'0')}]`;
        }
        return String(cell).substring(0, 50);
      })
    );
    
    // Look for date-like content in first column
    const dates = [];
    for (let i = 0; i < Math.min(data.length, 200); i++) {
      const cell = data[i]?.[0];
      if (typeof cell === 'number' && cell > 40000 && cell < 50000) {
        const d = XLSX.SSF.parse_date_code(cell);
        dates.push(`${d.y}-${String(d.m).padStart(2,'0')}-${String(d.d).padStart(2,'0')}`);
      }
    }
    
    // Look for monetary values (numbers > 1000)
    let moneyColumns = [];
    if (data.length > 2) {
      const headerRow = data[0] || [];
      for (let c = 0; c < Math.min(cols, 20); c++) {
        let numCount = 0;
        for (let r = 1; r < Math.min(data.length, 50); r++) {
          if (typeof data[r]?.[c] === 'number' && data[r][c] > 100) numCount++;
        }
        if (numCount > 3) moneyColumns.push({ col: c, header: String(headerRow[c] || `Col${c}`) });
      }
    }

    fileInfo.sheets.push({
      name,
      rows,
      cols,
      sample,
      datesFound: dates.length > 0 ? { count: dates.length, first: dates[0], last: dates[dates.length-1] } : null,
      moneyColumns,
    });
  }
  
  results[file] = fileInfo;
}

writeFileSync(join(dir, 'discovery-output.json'), JSON.stringify(results, null, 2));
console.log('Discovery complete. Files analyzed:', Object.keys(results).length);
for (const [file, info] of Object.entries(results)) {
  console.log(`\n=== ${file} ===`);
  console.log(`  Sheets (${info.sheets.length}): ${info.sheets.map(s => s.name).join(', ')}`);
  for (const s of info.sheets) {
    console.log(`  [${s.name}] ${s.rows}x${s.cols} | dates: ${s.datesFound ? `${s.datesFound.first} to ${s.datesFound.last} (${s.datesFound.count})` : 'none'} | money cols: ${s.moneyColumns.map(m=>m.header).join(', ') || 'none'}`);
  }
}
