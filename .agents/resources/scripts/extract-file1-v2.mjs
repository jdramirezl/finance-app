// Extract movements from File 1 (Presupuesto mensual.xlsx) V2-format sheets.
// Scope: Jun-Dec 2023. NO database writes — JSON output only.
//
// Sheets covered:
//   623 - 1 (V1.5: income has Categoría)
//   623 - 2 (V2, columns shifted left — no leading null col)
//   823    (V2 with leading null col, multi-section)
//   9-1023 (V2 with leading null col + extra Fijos columns at 12-22)
//   1223   (V2 with leading null col, mixed 2023/2024 → keep only 2023)
//   12723  (V2 Extended: Section A summary skipped, Section B at row 37)

import xlsx from 'xlsx';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..', '..');
const XLSX_PATH = path.join(ROOT, '.agents/resources/Presupuesto mensual.xlsx');
const MAPPING_PATH = path.join(ROOT, '.agents/resources/scripts/account-mapping.json');
const OUTPUT_DIR = path.join(ROOT, '.agents/resources/output/file1');
const SOURCE_FILE = 'Presupuesto mensual.xlsx';

const mapping = JSON.parse(fs.readFileSync(MAPPING_PATH, 'utf-8'));
const medioMap = mapping.medio_to_account_mapping;
const existingAccounts = mapping.existing_accounts;

// ---------- helpers ----------

const RESET_PATTERNS = /^(reset|inicial|inicio\s*mes)\b/i;

function excelSerialToDate(serial) {
  if (typeof serial !== 'number' || !Number.isFinite(serial)) return null;
  if (serial < 30000 || serial > 60000) return null;
  // Excel epoch: 1899-12-30 (accounting for 1900 leap-year bug). 25569 = days from 1899-12-30 to 1970-01-01.
  const utcDays = Math.floor(serial - 25569);
  return new Date(utcDays * 86400 * 1000);
}

function dateToISO(d) {
  if (!d) return null;
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseDate(v) {
  if (typeof v === 'number') {
    const d = excelSerialToDate(v);
    if (!d) return null;
    if (d.getUTCFullYear() !== 2023) return null;
    return dateToISO(d);
  }
  if (typeof v === 'string') {
    const m = v.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m && m[1] === '2023') return `${m[1]}-${m[2]}-${m[3]}`;
  }
  return null;
}

function parseAmount(v) {
  if (typeof v !== 'number' || !Number.isFinite(v)) return null;
  const abs = Math.abs(v);
  if (abs === 0) return null;
  return abs;
}

function asTrimmedString(v) {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  return t || null;
}

function resolveMedio(medioRaw) {
  if (!medioRaw) {
    return { account_name: null, pocket_name: null, currency: 'COP', needs_review: true };
  }
  const trimmed = medioRaw.trim();

  let mapped = medioMap[trimmed];
  if (!mapped) {
    const found = Object.keys(medioMap).find(k => k.toLowerCase() === trimmed.toLowerCase());
    if (found) mapped = medioMap[found];
  }

  if (!mapped) {
    return { account_name: trimmed, pocket_name: null, currency: 'COP', needs_review: true };
  }

  const [acct, pocket] = mapped.split('::');
  const acctEntry = existingAccounts[acct];
  const currency = acctEntry ? acctEntry.currency : 'COP';
  return {
    account_name: acct,
    pocket_name: pocket || null,
    currency,
    needs_review: false,
  };
}

function isResetDescription(desc) {
  if (!desc) return false;
  return RESET_PATTERNS.test(desc.trim());
}

// ---------- sheet configs ----------
//
// dataStart: 0-indexed first row of data (after the header row).
// endRow: optional exclusive upper bound (used for 12723 to skip Section C).
// expCols/incCols: { date, amt, desc, cat?, medio }
// fixedGroups: only for 9-1023; each is { date, amt, cat }
// monthFilter: optional 1-12 to keep only that month (used for 12723 → Nov).

const SHEETS = [
  {
    name: '623 - 1',
    dataStart: 3,
    expCols: { date: 1, amt: 2, desc: 3, cat: 4, medio: 5 },
    incCols: { date: 7, amt: 8, desc: 9, cat: 10, medio: 11 },
  },
  {
    name: '623 - 2',
    dataStart: 2,
    expCols: { date: 0, amt: 1, desc: 2, cat: 3, medio: 4 },
    incCols: { date: 6, amt: 7, desc: 8, medio: 9 },
  },
  {
    name: '823',
    dataStart: 2,
    expCols: { date: 1, amt: 2, desc: 3, cat: 4, medio: 5 },
    incCols: { date: 7, amt: 8, desc: 9, medio: 10 },
  },
  {
    name: '9-1023',
    dataStart: 2,
    expCols: { date: 1, amt: 2, desc: 3, cat: 4, medio: 5 },
    incCols: { date: 7, amt: 8, desc: 9, medio: 10 },
    fixedGroups: [
      { date: 12, amt: 13, cat: 14 },
      { date: 16, amt: 17, cat: 18 },
      { date: 20, amt: 21, cat: 22 },
    ],
  },
  {
    name: '1223',
    dataStart: 2,
    expCols: { date: 1, amt: 2, desc: 3, cat: 4, medio: 5 },
    incCols: { date: 7, amt: 8, desc: 9, medio: 10 },
  },
  {
    name: '12723',
    dataStart: 38,
    endRow: 104, // Section C (Fijos) starts at row 104 — skip it
    expCols: { date: 0, amt: 1, desc: 2, cat: 3, medio: 4 },
    incCols: { date: 6, amt: 7, desc: 8, medio: 9 },
    monthFilter: 11, // Nov only — Dec is covered by 1223
  },
];

// ---------- core processor ----------

function buildMovement({ type, row, rowIdx, cols, sheetName, section, hasIncomeCategory }) {
  const date = parseDate(row[cols.date]);
  const amount = parseAmount(row[cols.amt]);
  if (!date || !amount) return null;

  const desc = asTrimmedString(row[cols.desc]);
  const category =
    type === 'expense' || hasIncomeCategory
      ? asTrimmedString(cols.cat != null ? row[cols.cat] : null)
      : null;
  const medio = asTrimmedString(row[cols.medio]);
  const acct = resolveMedio(medio);

  const mov = {
    type,
    amount,
    description: desc,
    date,
    category,
    account_name: acct.account_name,
    pocket_name: acct.pocket_name,
    currency: acct.currency,
    source_file: SOURCE_FILE,
    source_sheet: sheetName,
    source_section: section,
    source_row: rowIdx, // 0-indexed
    needs_review: acct.needs_review,
  };

  if (type === 'income' && isResetDescription(desc)) {
    mov.is_reset = true;
  }

  return mov;
}

function processSheet(ws, cfg) {
  const arr = xlsx.utils.sheet_to_json(ws, { header: 1, raw: true, defval: null });
  const out = [];
  const endRow = cfg.endRow ?? arr.length;
  const hasIncomeCategory = cfg.incCols.cat != null;

  for (let r = cfg.dataStart; r < endRow; r++) {
    const row = arr[r] || [];

    const expense = buildMovement({
      type: 'expense',
      row,
      rowIdx: r,
      cols: cfg.expCols,
      sheetName: cfg.name,
      section: 'Gastos',
      hasIncomeCategory: false,
    });
    if (expense && (!cfg.monthFilter || monthOf(expense.date) === cfg.monthFilter)) {
      out.push(expense);
    }

    const income = buildMovement({
      type: 'income',
      row,
      rowIdx: r,
      cols: cfg.incCols,
      sheetName: cfg.name,
      section: 'Ingresos',
      hasIncomeCategory,
    });
    if (income && (!cfg.monthFilter || monthOf(income.date) === cfg.monthFilter)) {
      out.push(income);
    }

    if (cfg.fixedGroups) {
      for (const fg of cfg.fixedGroups) {
        const fDate = parseDate(row[fg.date]);
        const fAmt = parseAmount(row[fg.amt]);
        const fCat = asTrimmedString(row[fg.cat]);
        if (!fDate || !fAmt || !fCat) continue;
        out.push({
          type: 'expense',
          amount: fAmt,
          description: fCat,
          date: fDate,
          category: fCat,
          account_name: 'Fixed Expense Payment',
          pocket_name: null,
          currency: 'COP',
          source_file: SOURCE_FILE,
          source_sheet: cfg.name,
          source_section: 'Fijos',
          source_row: r,
          needs_review: true,
        });
      }
    }
  }
  return out;
}

function monthOf(iso) {
  return parseInt(iso.slice(5, 7), 10);
}

// ---------- main ----------

function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const wb = xlsx.readFile(XLSX_PATH);

  const allByMonth = new Map();
  const perSheetCounts = {};

  for (const cfg of SHEETS) {
    const ws = wb.Sheets[cfg.name];
    if (!ws) {
      console.warn(`  skip — missing sheet: ${cfg.name}`);
      continue;
    }
    const movs = processSheet(ws, cfg);
    perSheetCounts[cfg.name] = movs.length;
    for (const m of movs) {
      const ym = m.date.slice(0, 7);
      if (!allByMonth.has(ym)) allByMonth.set(ym, []);
      allByMonth.get(ym).push(m);
    }
  }

  const months = [...allByMonth.keys()].sort();
  const summary = {};
  for (const ym of months) {
    const list = allByMonth.get(ym).sort(
      (a, b) =>
        a.date.localeCompare(b.date) ||
        a.source_sheet.localeCompare(b.source_sheet) ||
        a.source_row - b.source_row,
    );
    const file = path.join(OUTPUT_DIR, `movements-${ym}.json`);
    fs.writeFileSync(file, JSON.stringify(list, null, 2));

    const incomes = list.filter(m => m.type === 'income');
    const expenses = list.filter(m => m.type === 'expense');
    const incomeTotal = incomes.reduce((s, m) => s + m.amount, 0);
    const expenseTotal = expenses.reduce((s, m) => s + m.amount, 0);
    const resets = list.filter(m => m.is_reset).length;
    const needsReview = list.filter(m => m.needs_review).length;
    const fijos = list.filter(m => m.source_section === 'Fijos').length;

    summary[ym] = {
      total: list.length,
      income_count: incomes.length,
      expense_count: expenses.length,
      income_total: Math.round(incomeTotal),
      expense_total: Math.round(expenseTotal),
      reset_entries: resets,
      fijos_entries: fijos,
      needs_review: needsReview,
    };
  }

  // Per-sheet
  console.log('=== Per-sheet movement counts ===');
  for (const [name, n] of Object.entries(perSheetCounts)) {
    console.log(`  ${name.padEnd(10)} ${n}`);
  }

  // Per-month
  console.log('');
  console.log('=== Per-month summary ===');
  console.log(
    [
      'month   '.padEnd(10),
      'total'.padStart(6),
      'inc#'.padStart(5),
      'exp#'.padStart(5),
      'income (COP)'.padStart(16),
      'expense (COP)'.padStart(16),
      'resets'.padStart(7),
      'fijos'.padStart(6),
      'review'.padStart(7),
    ].join(' '),
  );
  let totalAll = 0;
  let incTotalAll = 0;
  let expTotalAll = 0;
  for (const ym of months) {
    const s = summary[ym];
    totalAll += s.total;
    incTotalAll += s.income_total;
    expTotalAll += s.expense_total;
    console.log(
      [
        ym.padEnd(10),
        String(s.total).padStart(6),
        String(s.income_count).padStart(5),
        String(s.expense_count).padStart(5),
        s.income_total.toLocaleString('en-US').padStart(16),
        s.expense_total.toLocaleString('en-US').padStart(16),
        String(s.reset_entries).padStart(7),
        String(s.fijos_entries).padStart(6),
        String(s.needs_review).padStart(7),
      ].join(' '),
    );
  }
  console.log(
    [
      'TOTAL   '.padEnd(10),
      String(totalAll).padStart(6),
      ''.padStart(5),
      ''.padStart(5),
      incTotalAll.toLocaleString('en-US').padStart(16),
      expTotalAll.toLocaleString('en-US').padStart(16),
    ].join(' '),
  );

  // Persist combined report
  const reportPath = path.join(OUTPUT_DIR, 'extraction-summary.json');
  fs.writeFileSync(
    reportPath,
    JSON.stringify(
      { source_file: SOURCE_FILE, generated_at: new Date().toISOString(), perSheetCounts, perMonth: summary },
      null,
      2,
    ),
  );
  console.log('');
  console.log(`Wrote summary: ${reportPath}`);
  console.log(`Wrote ${months.length} monthly files to ${OUTPUT_DIR}`);
}

main();
