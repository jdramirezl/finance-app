#!/usr/bin/env node
/**
 * One-off inspector to dump the relevant Resumen-style ranges from each of the
 * 4 historical Excel files. NO DB writes. Used to validate row/column layouts
 * before writing extract-snapshots.mjs.
 */

import XLSX from 'xlsx';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const RESOURCES_DIR = resolve(__dirname, '..');

const FILES = {
  file1: join(RESOURCES_DIR, 'Presupuesto mensual.xlsx'),
  file2: join(RESOURCES_DIR, 'Shin Presupuesto Mensual 2024.xlsx'),
  file3: join(RESOURCES_DIR, 'Presupuesto Mensual 2025.xlsx'),
  file4: join(RESOURCES_DIR, 'Presupuesto Mensual 2025 MEXICO.xlsx'),
};

function readSheet(wb, name) {
  const ws = wb.Sheets[name];
  if (!ws) return null;
  return XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, raw: true });
}

function dumpRange(label, data, rowStart, rowEnd, colStart, colEnd) {
  console.log(`\n=== ${label} (rows ${rowStart}-${rowEnd}, cols ${colStart}-${colEnd}) ===`);
  for (let r = rowStart; r <= rowEnd && r < data.length; r++) {
    const row = data[r] || [];
    const slice = [];
    for (let c = colStart; c <= colEnd; c++) {
      const v = row[c];
      if (v === null || v === undefined || v === '') {
        slice.push(' . ');
      } else if (typeof v === 'number') {
        slice.push(String(v));
      } else {
        slice.push(`"${String(v).slice(0, 30)}"`);
      }
    }
    console.log(`  r${r}: ${slice.join(' | ')}`);
  }
}

console.log('═'.repeat(80));
console.log('FILE 1 — Presupuesto mensual.xlsx');
console.log('═'.repeat(80));
{
  const wb = XLSX.readFile(FILES.file1);
  console.log('Sheets:', wb.SheetNames.join(', '));

  // V1 sheets — Saldo inicial/final at top
  for (const sn of ['123', '223', '323']) {
    const data = readSheet(wb, sn);
    if (!data) { console.log(`  ${sn}: NOT FOUND`); continue; }
    dumpRange(`Sheet ${sn} — top rows`, data, 0, 4, 0, 6);
  }

  // 1223 — V2 Standard with Reset entries in income col
  {
    const data = readSheet(wb, '1223');
    if (data) {
      // Income cols are H-K (7-10) for V2 Standard
      // Find Reset entries
      console.log('\n--- 1223 Reset entries (scan for "Reset" in any cell) ---');
      for (let r = 0; r < Math.min(data.length, 50); r++) {
        const row = data[r] || [];
        for (let c = 0; c < row.length; c++) {
          const v = row[c];
          if (typeof v === 'string' && v.trim().toLowerCase() === 'reset') {
            // Print the row context
            console.log(
              `  r${r} c${c} | ` +
              [c-2,c-1,c,c+1,c+2].map(cc => {
                const x = row[cc];
                if (x === null || x === undefined || x === '') return '.';
                if (typeof x === 'number') return String(x);
                return `"${String(x).slice(0,20)}"`;
              }).join(' | ')
            );
          }
        }
      }
    }
  }

  // 124 — V2 Extended, has Resets (look at full row context)
  {
    const data = readSheet(wb, '124');
    if (data) {
      console.log('\n--- 124 Reset entries (scan for "Reset"/"RESET") ---');
      for (let r = 0; r < data.length; r++) {
        const row = data[r] || [];
        for (let c = 0; c < row.length; c++) {
          const v = row[c];
          if (typeof v === 'string' && v.trim().toLowerCase() === 'reset') {
            console.log(
              `  r${r} c${c} | ` +
              [c-3,c-2,c-1,c,c+1,c+2,c+3].map(cc => {
                const x = row[cc];
                if (x === null || x === undefined || x === '') return '.';
                if (typeof x === 'number') return String(x);
                return `"${String(x).slice(0,20)}"`;
              }).join(' | ')
            );
          }
        }
      }
    }
  }
}

console.log('\n' + '═'.repeat(80));
console.log('FILE 2 — Shin Presupuesto Mensual 2024.xlsx');
console.log('═'.repeat(80));
{
  const wb = XLSX.readFile(FILES.file2);

  // Resumen sheet
  {
    const data = readSheet(wb, 'Resumen');
    if (data) dumpRange('Resumen', data, 0, 12, 0, 6);
  }

  // Each monthly sheet's Resumen final section (cols 20-21 normally, 21-22 for Dec)
  for (const sn of ['January', 'February', 'March', 'April', 'May', 'December']) {
    const data = readSheet(wb, sn);
    if (!data) continue;
    const startCol = sn === 'December' ? 21 : 20;
    dumpRange(`${sn} — Resumen final`, data, 0, 35, startCol, startCol + 2);
  }
}

console.log('\n' + '═'.repeat(80));
console.log('FILE 3 — Presupuesto Mensual 2025.xlsx');
console.log('═'.repeat(80));
{
  const wb = XLSX.readFile(FILES.file3);
  const data = readSheet(wb, 'Resumen');
  if (data) dumpRange('Resumen', data, 0, 40, 0, 5);
}

console.log('\n' + '═'.repeat(80));
console.log('FILE 4 — Presupuesto Mensual 2025 MEXICO.xlsx');
console.log('═'.repeat(80));
{
  const wb = XLSX.readFile(FILES.file4);
  const data = readSheet(wb, 'Resumen');
  if (data) {
    dumpRange('Resumen — totals (cols 0-3)', data, 0, 40, 0, 3);
    dumpRange('Resumen — accounts (cols 3-7)', data, 0, 40, 3, 7);
    dumpRange('Resumen — exchange rates (cols 27-30)', data, 0, 10, 27, 30);
  }
}
