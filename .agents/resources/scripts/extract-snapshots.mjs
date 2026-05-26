#!/usr/bin/env node
/**
 * Extract net worth snapshots from all 4 historical Excel files.
 *
 * NO DATABASE WRITES. Outputs JSON only.
 *
 * Sources & confidence:
 *
 *   File 1: Presupuesto mensual.xlsx (2023 + early 2024, COP)
 *     - Sheets 123 / 223: V1 "Saldo final" cell                  → low confidence
 *         (single-account tracker, not full net worth)
 *     - Sheet 1223 "Reset" entries (opening of Dec 2023)         → medium confidence
 *         → snapshot dated 2023-11-30
 *     - Sheet 124 "Reset" entries (opening of Jan 2024)          → medium confidence
 *         → snapshot dated 2023-12-31 (main + fixed expense pockets)
 *
 *   File 2: Shin Presupuesto Mensual 2024.xlsx (2024, COP)
 *     - Monthly sheets Jan–May "Resumen final" section           → high confidence
 *         → snapshots dated end-of-month for Jan/Feb/Mar/Apr/May
 *     - Resumen sheet year-end total                              → high confidence
 *         → snapshot dated 2024-12-31
 *
 *   File 3: Presupuesto Mensual 2025.xlsx (Jan–Aug 2025, COP)
 *     - Resumen sheet cumulative total                            → high confidence
 *         → snapshot dated 2025-08-31
 *
 *   File 4: Presupuesto Mensual 2025 MEXICO.xlsx (Oct–Nov 2025)
 *     - Resumen sheet multi-currency totals                       → high confidence
 *         → snapshot dated 2025-11-30 with USD/MXN exchange rates
 *
 * Output: .agents/resources/output/snapshots/snapshots-all.json
 *   Single file, array of snapshots sorted by date.
 *
 * Snapshot shape:
 *   {
 *     date: "YYYY-MM-DD",
 *     total_value: number,             // in `currency`
 *     currency: "COP" | "MXN" | "USD",
 *     breakdown: {
 *       accounts: [{ name, value, currency, kind? }],
 *       exchange_rates: null | { USD_to_COP: number, MXN_to_COP: number },
 *       per_currency_totals?: { COP: number, MXN: number, USD: number }
 *     },
 *     source_file: string,
 *     source_sheet: string,
 *     confidence: "high" | "medium" | "low",
 *     notes: string
 *   }
 */

import XLSX from 'xlsx';
import { mkdirSync, writeFileSync, readFileSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const RESOURCES_DIR = resolve(__dirname, '..');
const OUTPUT_DIR = join(RESOURCES_DIR, 'output', 'snapshots');
const OUTPUT_FILE = join(OUTPUT_DIR, 'snapshots-all.json');
const MAPPING_PATH = join(__dirname, 'account-mapping.json');

const FILES = {
  file1: {
    path: join(RESOURCES_DIR, 'Presupuesto mensual.xlsx'),
    name: 'Presupuesto mensual.xlsx',
  },
  file2: {
    path: join(RESOURCES_DIR, 'Shin Presupuesto Mensual 2024.xlsx'),
    name: 'Shin Presupuesto Mensual 2024.xlsx',
  },
  file3: {
    path: join(RESOURCES_DIR, 'Presupuesto Mensual 2025.xlsx'),
    name: 'Presupuesto Mensual 2025.xlsx',
  },
  file4: {
    path: join(RESOURCES_DIR, 'Presupuesto Mensual 2025 MEXICO.xlsx'),
    name: 'Presupuesto Mensual 2025 MEXICO.xlsx',
  },
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function readSheet(wb, sheetName) {
  const ws = wb.Sheets[sheetName];
  if (!ws) return null;
  return XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, raw: true });
}

function isFiniteNumber(v) {
  return typeof v === 'number' && Number.isFinite(v);
}

/**
 * Round to 2 decimal places to avoid float artifacts in the output.
 * Keeps everything human-readable while still preserving the original
 * 2-cent precision of the source spreadsheets.
 */
function round2(v) {
  if (typeof v !== 'number' || !Number.isFinite(v)) return v;
  return Math.round(v * 100) / 100;
}

/** Load fixed-expense names so we can flag those rows in the breakdown. */
function loadFixedExpenseNames() {
  const cfg = JSON.parse(readFileSync(MAPPING_PATH, 'utf8'));
  const list = cfg.fixed_expense_handling?.known_fixed_expenses || [];
  return new Set(list.map((s) => s.toUpperCase()));
}

const FIXED_EXPENSE_NAMES = loadFixedExpenseNames();

function isFixedExpenseName(name) {
  if (!name || typeof name !== 'string') return false;
  return FIXED_EXPENSE_NAMES.has(name.trim().toUpperCase());
}

// ─── File 1 — Presupuesto mensual.xlsx (2023) ───────────────────────────────

/**
 * V1 sheets (123, 223) have:
 *   row 0: col 2="Saldo inicial", col 3=value
 *   row 1: col 2="Saldo final",   col 3=value
 *
 * These represent ONE account (the user's spending tracker), not full net
 * worth. We emit them with confidence:"low".
 */
function extractFile1V1Saldos(wb) {
  const snapshots = [];
  const cfgList = [
    { sheet: '123', date: '2023-01-31' },
    { sheet: '223', date: '2023-02-28' },
    // 323 has empty Saldo cells — skip
  ];
  for (const { sheet, date } of cfgList) {
    const data = readSheet(wb, sheet);
    if (!data) continue;
    const row = data[1] || [];
    const value = row[3];
    if (!isFiniteNumber(value) || value <= 0) {
      console.warn(`  [file1/${sheet}] no usable Saldo final value — skipped`);
      continue;
    }
    snapshots.push({
      date,
      total_value: round2(value),
      currency: 'COP',
      breakdown: {
        accounts: [
          {
            name: 'Saldo final (single tracker)',
            value: round2(value),
            currency: 'COP',
          },
        ],
        exchange_rates: null,
      },
      source_file: FILES.file1.name,
      source_sheet: sheet,
      confidence: 'low',
      notes:
        'V1 sheet "Saldo final" tracks only the user\'s main spending account, ' +
        'not full net worth. Use as rough early-2023 reference only.',
    });
  }
  return snapshots;
}

/**
 * Find every "Reset" cell in a sheet and pair it with the amount + medio.
 *
 * Two layouts are supported:
 *
 *   Variation A — main account Resets (e.g. 1223 income column):
 *     [ date, amount, "Reset", medio ]
 *     amount is at c-1, medio is at c+1
 *
 *   Variation B — fixed-expense Resets (e.g. 124 fijos block):
 *     [ date, amount, medio, "Reset" ]
 *     amount is at c-2, medio is at c-1
 *
 * Detection rule:
 *   - If the cell immediately left of "Reset" is a finite number → Variation A
 *   - If the cell immediately left of "Reset" is a non-empty string → Variation B
 *
 * Returns: [{ row, col, amount, medio }]
 */
function findResetEntries(data) {
  const entries = [];
  for (let r = 0; r < data.length; r++) {
    const row = data[r] || [];
    for (let c = 0; c < row.length; c++) {
      const v = row[c];
      if (typeof v !== 'string') continue;
      if (v.trim().toLowerCase() !== 'reset') continue;

      const left1 = row[c - 1];
      const left2 = row[c - 2];
      const right1 = row[c + 1];

      let amount = null;
      let medio = null;

      if (isFiniteNumber(left1)) {
        // Variation A: amount immediately left, medio immediately right.
        amount = left1;
        if (typeof right1 === 'string' && right1.trim() &&
            right1.trim().toLowerCase() !== 'reset') {
          medio = right1.trim();
        }
      } else if (typeof left1 === 'string' && left1.trim() &&
                 left1.trim().toLowerCase() !== 'reset') {
        // Variation B: medio immediately left, amount two cells left.
        medio = left1.trim();
        if (isFiniteNumber(left2)) {
          amount = left2;
        }
      }

      if (amount !== null && amount !== 0 && medio) {
        entries.push({ row: r, col: c, amount, medio });
      }
    }
  }
  return entries;
}

function extractFile1ResetSnapshot(wb, sheetName, snapshotDate, notes) {
  const data = readSheet(wb, sheetName);
  if (!data) {
    console.warn(`  [file1/${sheetName}] sheet not found`);
    return null;
  }
  const entries = findResetEntries(data);
  if (entries.length === 0) {
    console.warn(`  [file1/${sheetName}] no Reset entries found`);
    return null;
  }

  const accounts = entries.map((e) => ({
    name: e.medio,
    value: round2(e.amount),
    currency: 'COP',
    kind: isFixedExpenseName(e.medio) ? 'fixed_expense_pocket' : 'account_pocket',
  }));
  const total = accounts.reduce((s, a) => s + a.value, 0);

  return {
    date: snapshotDate,
    total_value: round2(total),
    currency: 'COP',
    breakdown: { accounts, exchange_rates: null },
    source_file: FILES.file1.name,
    source_sheet: sheetName,
    confidence: 'medium',
    notes,
  };
}

function extractFile1(wb) {
  const out = [];
  out.push(...extractFile1V1Saldos(wb));

  const nov2023 = extractFile1ResetSnapshot(
    wb,
    '1223',
    '2023-11-30',
    'Sum of "Reset" entries dated 2023-12-07 in the Dec 2023 sheet ' +
      '(opening balances = closing balances of Nov 2023). 9 main-account pockets only ' +
      '(no fixed-expense Resets present in 1223), so total may understate by ~2-3M COP.',
  );
  if (nov2023) out.push(nov2023);

  const dec2023 = extractFile1ResetSnapshot(
    wb,
    '124',
    '2023-12-31',
    'Sum of "Reset" entries in the Jan 2024 sheet (opening balances = closing balances ' +
      'of Dec 2023). Includes both main account pockets and fixed-expense category pockets ' +
      '(CELULAR, GYM, SEGURO, etc.). Note: the Reset cells are mis-dated 2023-12-07 in the ' +
      'spreadsheet but actually represent end-of-Dec-2023 state per the value progression.',
  );
  if (dec2023) out.push(dec2023);

  return out;
}

// ─── File 2 — Shin Presupuesto Mensual 2024.xlsx ────────────────────────────

/**
 * Each Jan–May monthly sheet has a "Resumen final" section at cols 20-21:
 *   row 1 col 20: "Resumen final" header
 *   row 3 col 20: "Totales", col 21: total value
 *   rows 4-N col 20: top-level account name, col 21: value
 *
 * Stop reading top-level accounts when we hit an empty row (typically row 8-10)
 * since the rows after that are sub-pocket breakdowns that would double-count.
 */
function extractFile2MonthlyResumenFinal(wb) {
  const snapshots = [];
  const monthCfgs = [
    { sheet: 'January',  date: '2024-01-31' },
    { sheet: 'February', date: '2024-02-29' },
    { sheet: 'March',    date: '2024-03-31' },
    { sheet: 'April',    date: '2024-04-30' },
    { sheet: 'May',      date: '2024-05-31' },
  ];

  for (const { sheet, date } of monthCfgs) {
    const data = readSheet(wb, sheet);
    if (!data) {
      console.warn(`  [file2/${sheet}] sheet not found`);
      continue;
    }

    // Find "Totales" cell anywhere in cols 18-25, rows 0-15
    let totalRow = null;
    let totalCol = null;
    for (let r = 0; r < Math.min(15, data.length); r++) {
      const row = data[r] || [];
      for (let c = 18; c <= 25 && c < row.length; c++) {
        if (typeof row[c] === 'string' && row[c].trim().toLowerCase() === 'totales') {
          totalRow = r;
          totalCol = c;
          break;
        }
      }
      if (totalRow !== null) break;
    }

    if (totalRow === null) {
      console.warn(`  [file2/${sheet}] "Totales" cell not found in cols 18-25`);
      continue;
    }

    const totalValue = (data[totalRow] || [])[totalCol + 1];
    if (!isFiniteNumber(totalValue)) {
      console.warn(`  [file2/${sheet}] Totales value missing/non-numeric`);
      continue;
    }

    // Read top-level account rows immediately below "Totales".
    // Stop on first empty row OR when we see a known sub-section header
    // (Bolsillos / Otros / Efectivo / Bancolombia / Inversiones).
    const subSectionHeaders = new Set([
      'bolsillos', 'otros', 'efectivo', 'bancolombia', 'inversiones', 'fijos',
    ]);
    const accounts = [];
    for (let r = totalRow + 1; r < Math.min(totalRow + 12, data.length); r++) {
      const row = data[r] || [];
      const name = row[totalCol];
      const value = row[totalCol + 1];

      const nameStr = typeof name === 'string' ? name.trim() : '';
      const isEmpty = !nameStr && (value === null || value === undefined || value === '');
      if (isEmpty) break;

      // Sub-section header row: name set, value empty.
      if (nameStr && (value === null || value === undefined || value === '')) {
        if (subSectionHeaders.has(nameStr.toLowerCase())) break;
        // Otherwise fall through (e.g. label row we want to keep)
      }

      if (nameStr && isFiniteNumber(value)) {
        accounts.push({ name: nameStr, value: round2(value), currency: 'COP' });
      }
    }

    snapshots.push({
      date,
      total_value: round2(totalValue),
      currency: 'COP',
      breakdown: { accounts, exchange_rates: null },
      source_file: FILES.file2.name,
      source_sheet: sheet,
      confidence: 'high',
      notes:
        `End-of-month "Resumen final" section. ${accounts.length} top-level account groups; ` +
        'sub-pocket breakdown rows ignored to avoid double-counting.',
    });
  }
  return snapshots;
}

/**
 * Resumen sheet — year-end 2024 dashboard.
 *   row 1 col 1: "Totales", col 2: 89,981,035.17
 *   rows 2-7 col 1: top-level account names, col 2: values
 */
function extractFile2YearEnd(wb) {
  const data = readSheet(wb, 'Resumen');
  if (!data) {
    console.warn('  [file2/Resumen] sheet not found');
    return null;
  }
  const totalRow = data[1] || [];
  if (!(typeof totalRow[1] === 'string' && totalRow[1].trim().toLowerCase() === 'totales')) {
    console.warn('  [file2/Resumen] row 1 col 1 not "Totales" — skipping');
    return null;
  }
  const total = totalRow[2];
  if (!isFiniteNumber(total)) {
    console.warn('  [file2/Resumen] Totales value missing');
    return null;
  }

  const accounts = [];
  for (let r = 2; r <= 8 && r < data.length; r++) {
    const row = data[r] || [];
    const name = row[1];
    const value = row[2];
    if (typeof name === 'string' && name.trim() && isFiniteNumber(value)) {
      accounts.push({ name: name.trim(), value: round2(value), currency: 'COP' });
    } else if ((!name || name === '') && (!value || value === '')) {
      break;
    }
  }

  return {
    date: '2024-12-31',
    total_value: round2(total),
    currency: 'COP',
    breakdown: { accounts, exchange_rates: null },
    source_file: FILES.file2.name,
    source_sheet: 'Resumen',
    confidence: 'high',
    notes: 'Year-end 2024 dashboard total. Per-account breakdown is the top-level Resumen list.',
  };
}

function extractFile2(wb) {
  const out = [];
  out.push(...extractFile2MonthlyResumenFinal(wb));
  const ye = extractFile2YearEnd(wb);
  if (ye) out.push(ye);
  return out;
}

// ─── File 3 — Presupuesto Mensual 2025.xlsx (Jan–Aug 2025, COP) ─────────────

/**
 * Resumen layout:
 *   row 1: col 0="H", col 1="Totales", col 2=122,166,762.60
 *   rows 2-7: col 1=account name (Inversiones, Dolares, Bancolombia, Efectivo, Otros, Nubank), col 2=value
 *
 * After row 7 the sheet drops into per-pocket detail blocks (also tagged "H" or "h"
 * in col 0). We only need the top-level groups for the snapshot breakdown.
 */
function extractFile3(wb) {
  const data = readSheet(wb, 'Resumen');
  if (!data) {
    console.warn('  [file3/Resumen] sheet not found');
    return [];
  }

  const totalRow = data[1] || [];
  if (!(typeof totalRow[1] === 'string' && totalRow[1].trim().toLowerCase() === 'totales')) {
    console.warn('  [file3/Resumen] row 1 col 1 not "Totales" — skipping');
    return [];
  }
  const total = totalRow[2];
  if (!isFiniteNumber(total)) {
    console.warn('  [file3/Resumen] Totales value missing');
    return [];
  }

  const accounts = [];
  for (let r = 2; r <= 8 && r < data.length; r++) {
    const row = data[r] || [];
    const flag = row[0];
    const name = row[1];
    const value = row[2];

    // Stop when we hit the next "H"-flagged sub-section (Otros/Nubank/etc. detail).
    if (typeof flag === 'string' && flag.trim().toUpperCase() === 'H') break;

    if (typeof name === 'string' && name.trim() && isFiniteNumber(value)) {
      accounts.push({ name: name.trim(), value: round2(value), currency: 'COP' });
    } else if ((!name || name === '') && (!value || value === '')) {
      break;
    }
  }

  return [
    {
      date: '2025-08-31',
      total_value: round2(total),
      currency: 'COP',
      breakdown: { accounts, exchange_rates: null },
      source_file: FILES.file3.name,
      source_sheet: 'Resumen',
      confidence: 'high',
      notes:
        'Resumen sheet cumulative total covering Jan–Aug 2025 (last active month). ' +
        'Snapshot dated end of August.',
    },
  ];
}

// ─── File 4 — Mexico (Oct–Nov 2025, multi-currency) ─────────────────────────

/**
 * Resumen layout (cols 0-2):
 *   row 1: col 1="Totales", col 2=150,030,925.4 (total in COP equivalent)
 *   row 2: col 1="COP",     col 2=58,145,100   (COP holdings, native)
 *   row 3: col 1="MXN",     col 2=1,448,291.467 (MXN holdings converted to COP)
 *   row 4: col 1="USD",     col 2=90,437,533.96 (USD holdings converted to COP)
 *
 *   row 7:  col 1="Total COP", col 2=58,145,100
 *   rows 8-10: COP account list (Bancolombia, Efectivo, Nubank)
 *
 *   row 12: col 1="Total MXN", col 2=6,818.3   (native MXN)
 *   rows 13-14: MXN account list (Banco Mexico, Efectivo)
 *
 *   row 16: col 1="Total USD", col 2=24,578.18 (native USD)
 *   rows 17-18: USD account list (Inversiones, Efectivo)
 *
 * Exchange rates at row 2, cols 28-29:
 *   row 1: col 28="usd", col 29="mxn"
 *   row 2: col 28=3679.58606, col 29=212.4124
 *
 * Per-pocket breakdown at cols 3-7 (Nubank MX, Banamex, Nubank, Bancolombia,
 * Inversiones blocks). We capture the top-level totals from cols 1-2; the
 * detailed pocket list is parsed from cols 3-7 for the breakdown.accounts list.
 */
function extractFile4(wb) {
  const data = readSheet(wb, 'Resumen');
  if (!data) {
    console.warn('  [file4/Resumen] sheet not found');
    return [];
  }

  // Top totals
  const totalCellRow = data[1] || [];
  const totalCellLabel = totalCellRow[1];
  const totalCellValue = totalCellRow[2];
  if (!(typeof totalCellLabel === 'string' && totalCellLabel.trim().toLowerCase() === 'totales')) {
    console.warn('  [file4/Resumen] row 1 col 1 not "Totales" — skipping');
    return [];
  }
  if (!isFiniteNumber(totalCellValue)) {
    console.warn('  [file4/Resumen] Totales value missing');
    return [];
  }

  const totalCOPEq = totalCellValue;

  // Read the 3 currency lines (rows 2-4 cols 1-2)
  const perCurrencyTotalsCOPEq = {};
  for (let r = 2; r <= 4 && r < data.length; r++) {
    const row = data[r] || [];
    const label = row[1];
    const value = row[2];
    if (typeof label === 'string' && isFiniteNumber(value)) {
      perCurrencyTotalsCOPEq[label.trim().toUpperCase()] = round2(value);
    }
  }

  // Find "Total COP" / "Total MXN" / "Total USD" lines and the native-currency
  // totals + per-account breakdowns underneath.
  function findNativeTotal(label) {
    for (let r = 5; r < Math.min(25, data.length); r++) {
      const row = data[r] || [];
      const cell = row[1];
      if (typeof cell === 'string' && cell.trim().toLowerCase() === label.toLowerCase()) {
        return { row: r, value: row[2] };
      }
    }
    return null;
  }

  const nativeCOP = findNativeTotal('Total COP');
  const nativeMXN = findNativeTotal('Total MXN');
  const nativeUSD = findNativeTotal('Total USD');

  function readNativeBreakdown(start, currency) {
    if (!start) return [];
    const out = [];
    for (let r = start.row + 1; r < Math.min(start.row + 6, data.length); r++) {
      const row = data[r] || [];
      const name = row[1];
      const value = row[2];
      if (!name || name === '') break;
      if (typeof name === 'string' && name.trim().toLowerCase().startsWith('total ')) break;
      if (typeof name === 'string' && isFiniteNumber(value)) {
        out.push({ name: name.trim(), value: round2(value), currency });
      }
    }
    return out;
  }

  const copAccounts = readNativeBreakdown(nativeCOP, 'COP');
  const mxnAccounts = readNativeBreakdown(nativeMXN, 'MXN');
  const usdAccounts = readNativeBreakdown(nativeUSD, 'USD');

  // Exchange rates (row 2, cols 28-29)
  const ratesRow = data[2] || [];
  const usdRate = ratesRow[28];
  const mxnRate = ratesRow[29];

  const allAccounts = [...copAccounts, ...mxnAccounts, ...usdAccounts];

  return [
    {
      date: '2025-11-30',
      total_value: round2(totalCOPEq),
      currency: 'COP',
      breakdown: {
        accounts: allAccounts,
        per_currency_totals: {
          COP: nativeCOP && isFiniteNumber(nativeCOP.value) ? round2(nativeCOP.value) : null,
          MXN: nativeMXN && isFiniteNumber(nativeMXN.value) ? round2(nativeMXN.value) : null,
          USD: nativeUSD && isFiniteNumber(nativeUSD.value) ? round2(nativeUSD.value) : null,
        },
        per_currency_in_cop: {
          COP: perCurrencyTotalsCOPEq.COP ?? null,
          MXN: perCurrencyTotalsCOPEq.MXN ?? null,
          USD: perCurrencyTotalsCOPEq.USD ?? null,
        },
        exchange_rates: {
          USD_to_COP: isFiniteNumber(usdRate) ? round2(usdRate) : null,
          MXN_to_COP: isFiniteNumber(mxnRate) ? round2(mxnRate) : null,
        },
      },
      source_file: FILES.file4.name,
      source_sheet: 'Resumen',
      confidence: 'high',
      notes:
        'Mexico transition file. Total expressed as COP equivalent. ' +
        'breakdown.accounts shows native-currency balances grouped by currency. ' +
        'per_currency_totals = native; per_currency_in_cop = converted at the stored rates.',
    },
  ];
}

// ─── Main ───────────────────────────────────────────────────────────────────

function compareDates(a, b) {
  if (a.date < b.date) return -1;
  if (a.date > b.date) return 1;
  return 0;
}

function formatNumberCompact(n) {
  if (typeof n !== 'number' || !Number.isFinite(n)) return String(n);
  return n.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

function main() {
  mkdirSync(OUTPUT_DIR, { recursive: true });

  const allSnapshots = [];

  console.log('Loading File 1 (Presupuesto mensual.xlsx)...');
  const wb1 = XLSX.readFile(FILES.file1.path);
  allSnapshots.push(...extractFile1(wb1));

  console.log('Loading File 2 (Shin Presupuesto Mensual 2024.xlsx)...');
  const wb2 = XLSX.readFile(FILES.file2.path);
  allSnapshots.push(...extractFile2(wb2));

  console.log('Loading File 3 (Presupuesto Mensual 2025.xlsx)...');
  const wb3 = XLSX.readFile(FILES.file3.path);
  allSnapshots.push(...extractFile3(wb3));

  console.log('Loading File 4 (Presupuesto Mensual 2025 MEXICO.xlsx)...');
  const wb4 = XLSX.readFile(FILES.file4.path);
  allSnapshots.push(...extractFile4(wb4));

  allSnapshots.sort(compareDates);

  writeFileSync(OUTPUT_FILE, JSON.stringify(allSnapshots, null, 2));

  // ─── Print timeline ───────────────────────────────────────────────────────
  console.log('\n' + '═'.repeat(98));
  console.log(`Timeline of ${allSnapshots.length} snapshots:`);
  console.log('═'.repeat(98));
  console.log(
    [
      'Date'.padEnd(12),
      'Total'.padStart(18),
      'Cur'.padEnd(4),
      'Conf'.padEnd(7),
      'Source',
    ].join(' │ '),
  );
  console.log('─'.repeat(98));

  for (const s of allSnapshots) {
    const total = formatNumberCompact(s.total_value).padStart(18);
    const date = s.date.padEnd(12);
    const cur = (s.currency || '').padEnd(4);
    const conf = (s.confidence || '').padEnd(7);
    const src = `${s.source_file} → ${s.source_sheet}`;
    console.log(`${date} │ ${total} │ ${cur} │ ${conf} │ ${src}`);
  }

  console.log('─'.repeat(98));

  // Confidence summary
  const byConf = allSnapshots.reduce((acc, s) => {
    acc[s.confidence] = (acc[s.confidence] || 0) + 1;
    return acc;
  }, {});
  const confLine = Object.entries(byConf)
    .map(([k, v]) => `${k}=${v}`)
    .join('  ');
  console.log(`Confidence: ${confLine}`);
  console.log(`Output: ${OUTPUT_FILE}`);
}

main();
