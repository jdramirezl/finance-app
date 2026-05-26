import XLSX from 'xlsx';
import { writeFileSync } from 'fs';
import { join } from 'path';

const dir = '/local/home/jdrami/finance-app/.agents/resources';

function sampleSheet(file, sheetName, maxRows = 15) {
  const wb = XLSX.readFile(join(dir, file));
  const ws = wb.Sheets[sheetName];
  if (!ws) return null;
  const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: true });
  return data.slice(0, maxRows).map(row => row.slice(0, 22).map(cell => {
    if (cell === '') return '';
    if (typeof cell === 'number' && cell > 40000 && cell < 50000) {
      const d = XLSX.SSF.parse_date_code(cell);
      return `DATE:${d.y}-${String(d.m).padStart(2,'0')}-${String(d.d).padStart(2,'0')}`;
    }
    if (typeof cell === 'number') return cell;
    return String(cell).substring(0, 60);
  }));
}

const samples = {
  // File 1: Original - sample oldest and newest monthly tabs + Resumen
  'file1_123': sampleSheet('Presupuesto mensual.xlsx', '123'),
  'file1_623_2': sampleSheet('Presupuesto mensual.xlsx', '623 - 2'),
  'file1_1223': sampleSheet('Presupuesto mensual.xlsx', '1223'),
  'file1_524': sampleSheet('Presupuesto mensual.xlsx', '524'),
  'file1_ResumenV2': sampleSheet('Presupuesto mensual.xlsx', 'ResumenV2'),
  'file1_TransaccionesV2': sampleSheet('Presupuesto mensual.xlsx', 'TransaccionesV2'),
  
  // File 2: 2024 - sample a few months + Resumen
  'file2_January': sampleSheet('Shin Presupuesto Mensual 2024.xlsx', 'January'),
  'file2_July': sampleSheet('Shin Presupuesto Mensual 2024.xlsx', 'July'),
  'file2_November': sampleSheet('Shin Presupuesto Mensual 2024.xlsx', 'November'),
  'file2_Resumen': sampleSheet('Shin Presupuesto Mensual 2024.xlsx', 'Resumen'),
  
  // File 3: 2025 Colombia - sample months + Resumen
  'file3_January': sampleSheet('Presupuesto Mensual 2025.xlsx', 'January'),
  'file3_May': sampleSheet('Presupuesto Mensual 2025.xlsx', 'May'),
  'file3_Resumen': sampleSheet('Presupuesto Mensual 2025.xlsx', 'Resumen'),
  
  // File 4: 2025 Mexico - sample months + Resumen
  'file4_October': sampleSheet('Presupuesto Mensual 2025 MEXICO.xlsx', 'October'),
  'file4_November': sampleSheet('Presupuesto Mensual 2025 MEXICO.xlsx', 'November'),
  'file4_Resumen': sampleSheet('Presupuesto Mensual 2025 MEXICO.xlsx', 'Resumen'),
};

writeFileSync(join(dir, 'deep-samples.json'), JSON.stringify(samples, null, 2));

// Print readable output
for (const [key, data] of Object.entries(samples)) {
  console.log(`\n${'='.repeat(60)}\n${key}\n${'='.repeat(60)}`);
  if (!data) { console.log('  (sheet not found)'); continue; }
  for (const row of data) {
    const cells = row.map(c => c === '' ? '·' : String(c).padEnd(12).substring(0, 12));
    console.log('  ' + cells.join(' | '));
  }
}
