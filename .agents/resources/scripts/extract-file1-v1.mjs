// Extract movements from Presupuesto mensual.xlsx (File 1) for Jan–May 2023.
//
// Sheets: 123, 223, 323, 423, 523 - 1, 523 - 2
// V1 (no Medio): 123, 223, 323, 423, 523 - 1
// V1.5 (with Medio): 523 - 2
//
// Output: .agents/resources/output/file1/movements-2023-MM.json (one per month
// based on the parsed date, so cross-month entries route correctly and
// 523-1 + 523-2 naturally merge into movements-2023-05.json).
//
// NO database writes. JSON files only.

import XLSX from 'xlsx';
import { writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = join(__dirname, '..', '..', '..');

const INPUT_FILE = join(REPO_ROOT, '.agents/resources/Presupuesto mensual.xlsx');
const OUTPUT_DIR = join(REPO_ROOT, '.agents/resources/output/file1');
const SOURCE_FILE_NAME = 'Presupuesto mensual.xlsx';

const SHEETS = ['123', '223', '323', '423', '523 - 1', '523 - 2'];

const ACCOUNT_V1_DEFAULT = 'UNKNOWN (V1 - no medio)';
const ACCOUNT_V15_EMPTY = 'UNKNOWN (V1.5 - medio empty)';

mkdirSync(OUTPUT_DIR, { recursive: true });

// --- Helpers ---------------------------------------------------------------

function parseDate(cell) {
  if (cell === null || cell === undefined || cell === '') return null;

  if (typeof cell === 'number') {
    // Excel date serials are roughly 1..60000+ for normal dates.
    // 2020-01-01 = 43831, 2030-12-31 = 47848. Use a generous window.
    if (cell < 1 || cell > 60000) return null;
    const d = XLSX.SSF.parse_date_code(cell);
    if (!d || !d.y || !d.m || !d.d) return null;
    return `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`;
  }

  if (typeof cell === 'string') {
    const s = cell.trim();
    // ISO YYYY-MM-DD
    let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (m) {
      return `${m[1]}-${String(m[2]).padStart(2, '0')}-${String(m[3]).padStart(2, '0')}`;
    }
    // D/M/YYYY or DD/MM/YYYY
    m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (m) {
      return `${m[3]}-${String(m[2]).padStart(2, '0')}-${String(m[1]).padStart(2, '0')}`;
    }
  }

  // Date object
  if (cell instanceof Date && !isNaN(cell.getTime())) {
    const y = cell.getUTCFullYear();
    const mo = cell.getUTCMonth() + 1;
    const d = cell.getUTCDate();
    return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }

  return null;
}

function toAmount(cell) {
  if (cell === null || cell === undefined || cell === '') return null;
  if (typeof cell === 'number') return Number.isFinite(cell) ? cell : null;
  if (typeof cell === 'string') {
    // Strip thousands separators and currency symbols
    const cleaned = cell.replace(/[\s$,]/g, '').replace(/\.(?=\d{3}(\D|$))/g, '');
    const n = parseFloat(cleaned);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function toText(cell) {
  if (cell === null || cell === undefined) return '';
  return String(cell).trim();
}

function findHeaderRow(data) {
  // Row whose column B (index 1) is exactly "Fecha" (case-insensitive).
  const limit = Math.min(15, data.length);
  for (let i = 0; i < limit; i++) {
    const row = data[i] || [];
    const b = row[1];
    if (typeof b === 'string' && b.trim().toLowerCase() === 'fecha') return i;
  }
  return -1;
}

function detectMedio(headerRow) {
  return (headerRow || []).some(
    (c) => typeof c === 'string' && c.trim().toLowerCase() === 'medio',
  );
}

function getColumnMap(hasMedio) {
  if (hasMedio) {
    // 523 - 2 layout
    return {
      expense: { fecha: 1, amount: 2, desc: 3, cat: 4, medio: 5 },
      income: { fecha: 7, amount: 8, desc: 9, cat: 10, medio: 11 },
    };
  }
  // 123/223/323/423/523-1 layout
  return {
    expense: { fecha: 1, amount: 2, desc: 3, cat: 4, medio: null },
    income: { fecha: 6, amount: 7, desc: 8, cat: 9, medio: null },
  };
}

function extractSide({ data, dataStart, sheetName, cols, type, hasMedio }) {
  const out = [];
  const sectionLabel = type === 'expense' ? 'Gastos' : 'Ingresos';

  for (let i = dataStart; i < data.length; i++) {
    const row = data[i] || [];
    const fechaCell = row[cols.fecha];
    const amountCell = row[cols.amount];
    const descCell = row[cols.desc];
    const catCell = row[cols.cat];
    const medioCell = cols.medio !== null ? row[cols.medio] : null;

    const date = parseDate(fechaCell);
    const amount = toAmount(amountCell);

    // Filter rules:
    //   * date must parse and be in 2023
    //   * amount must be a positive finite number
    //   * skip rows where amount looks like a date serial pulled in by mistake
    //     (heuristic: amount ≥ 40000 AND ≤ 50000 AND no description/category)
    if (!date) continue;
    if (!date.startsWith('2023')) continue;
    if (amount === null || amount <= 0) continue;

    const description = toText(descCell);
    const category = toText(catCell) || null;

    // Suspicious: amount looks like a 2020-2030 date serial AND no other content
    if (amount >= 43000 && amount <= 48000 && !description && !category) {
      continue;
    }

    let accountName;
    if (hasMedio) {
      const medio = toText(medioCell);
      accountName = medio || ACCOUNT_V15_EMPTY;
    } else {
      accountName = ACCOUNT_V1_DEFAULT;
    }

    out.push({
      type,
      amount: Math.abs(amount),
      description,
      date,
      category,
      account_name: accountName,
      pocket_name: null,
      currency: 'COP',
      source_file: SOURCE_FILE_NAME,
      source_sheet: sheetName,
      source_section: sectionLabel,
      source_row: i, // 0-indexed row in the sheet
      needs_review: true,
    });
  }

  return out;
}

// --- Main ------------------------------------------------------------------

const wb = XLSX.readFile(INPUT_FILE);
const allMovements = [];
const sheetStats = {};

for (const sheetName of SHEETS) {
  const ws = wb.Sheets[sheetName];
  if (!ws) {
    console.warn(`[WARN] Sheet not found: ${sheetName}`);
    continue;
  }

  const data = XLSX.utils.sheet_to_json(ws, {
    header: 1,
    defval: '',
    raw: true,
  });

  const headerIdx = findHeaderRow(data);
  if (headerIdx < 0) {
    console.warn(`[WARN] No header row found in sheet: ${sheetName}`);
    continue;
  }

  const hasMedio = detectMedio(data[headerIdx]);
  const cols = getColumnMap(hasMedio);
  const dataStart = headerIdx + 1;

  const expenses = extractSide({
    data,
    dataStart,
    sheetName,
    cols: cols.expense,
    type: 'expense',
    hasMedio,
  });
  const incomes = extractSide({
    data,
    dataStart,
    sheetName,
    cols: cols.income,
    type: 'income',
    hasMedio,
  });

  sheetStats[sheetName] = {
    headerRow: headerIdx,
    hasMedio,
    expenseCount: expenses.length,
    incomeCount: incomes.length,
  };

  allMovements.push(...expenses, ...incomes);
}

// --- Group by month, dedupe, sort -----------------------------------------

const byMonth = {};
for (const m of allMovements) {
  const ym = m.date.slice(0, 7); // YYYY-MM
  (byMonth[ym] ||= []).push(m);
}

for (const ym of Object.keys(byMonth)) {
  // Sort by date, then sheet, then source row for stable ordering
  byMonth[ym].sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    if (a.source_sheet !== b.source_sheet) return a.source_sheet.localeCompare(b.source_sheet);
    return a.source_row - b.source_row;
  });

  // Dedupe by (date + amount + description + section + account_name)
  const seen = new Set();
  byMonth[ym] = byMonth[ym].filter((m) => {
    const key = `${m.date}|${m.amount}|${m.description}|${m.source_section}|${m.account_name}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// --- Write JSON files -----------------------------------------------------

const writtenFiles = [];
for (const ym of Object.keys(byMonth).sort()) {
  const filePath = join(OUTPUT_DIR, `movements-${ym}.json`);
  writeFileSync(filePath, JSON.stringify(byMonth[ym], null, 2));
  writtenFiles.push({ ym, filePath, count: byMonth[ym].length });
}

// --- Report ---------------------------------------------------------------

console.log('\n=== Per-sheet extraction stats ===');
for (const [sheet, s] of Object.entries(sheetStats)) {
  console.log(
    `  ${sheet.padEnd(10)} header@row=${s.headerRow}  medio=${s.hasMedio}  ` +
      `expenses=${s.expenseCount}  incomes=${s.incomeCount}`,
  );
}

console.log('\n=== Per-month output ===');
const fmt = new Intl.NumberFormat('en-US');
let grandExp = 0;
let grandInc = 0;
let grandCount = 0;
for (const { ym, count } of writtenFiles) {
  const arr = byMonth[ym];
  const expenses = arr.filter((m) => m.type === 'expense');
  const incomes = arr.filter((m) => m.type === 'income');
  const expSum = expenses.reduce((s, m) => s + m.amount, 0);
  const incSum = incomes.reduce((s, m) => s + m.amount, 0);
  grandExp += expSum;
  grandInc += incSum;
  grandCount += count;
  console.log(
    `  movements-${ym}.json  total=${count}  ` +
      `expenses=${expenses.length} (${fmt.format(expSum)} COP)  ` +
      `incomes=${incomes.length} (${fmt.format(incSum)} COP)`,
  );
}

console.log('\n=== Totals ===');
console.log(`  movements: ${grandCount}`);
console.log(`  expenses : ${fmt.format(grandExp)} COP`);
console.log(`  incomes  : ${fmt.format(grandInc)} COP`);
console.log(`  net      : ${fmt.format(grandInc - grandExp)} COP`);
console.log(`  output   : ${OUTPUT_DIR}`);
