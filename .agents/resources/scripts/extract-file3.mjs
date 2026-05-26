#!/usr/bin/env node
// Extract movements from Presupuesto Mensual 2025.xlsx into per-month JSON files.
// NO DATABASE WRITES — outputs JSON only to .agents/resources/output/file3/.
//
// Layout (4 sections side-by-side, NO Categoria column):
//   Gastos         cols 0-3  : Date | Amount | Description | Account
//   Ingresos       cols 5-8  : Date | Amount | Description | Account
//   Gastos Fijos   cols 10-13: Date | Amount | Description | FixedExpenseName
//   Ingresos Fijos cols 15-18: Date | Amount | Description | FixedExpenseName
//
// Output format per movement (snake_case):
//   { type, amount, description, date, category, account_name, pocket_name,
//     currency, source_file, source_sheet, source_section, source_row,
//     needs_review, is_orphaned, fixed_expense_name }

import { mkdirSync, writeFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

import {
  loadWorkbook,
  getSheetData,
  loadMapping,
  resolveAccount,
  parseExcelDate,
  isValidAmount,
} from './shared.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const RESOURCES_DIR = join(__dirname, '..');
const SOURCE_FILE = 'Presupuesto Mensual 2025.xlsx';
const SOURCE_PATH = join(RESOURCES_DIR, SOURCE_FILE);
const OUTPUT_DIR = join(RESOURCES_DIR, 'output', 'file3');

// Sheets to extract. September is partial — flagged via PARTIAL_SHEETS below.
const SHEETS = [
  ['January', 1],
  ['February', 2],
  ['March', 3],
  ['April', 4],
  ['May', 5],
  ['June', 6],
  ['July', 7],
  ['August', 8],
  ['September', 9],
];

// Sheets where every entry must be flagged needs_review (sparse / transitional).
const PARTIAL_SHEETS = new Set(['September']);

// Section configuration: 4 sections × 4 columns each, separated by single empty cols.
const SECTIONS = [
  { name: 'Gastos', type: 'expense', isFixed: false, fecha: 0, amount: 1, notas: 2, medio: 3 },
  { name: 'Ingresos', type: 'income', isFixed: false, fecha: 5, amount: 6, notas: 7, medio: 8 },
  { name: 'Gastos Fijos', type: 'expense', isFixed: true, fecha: 10, amount: 11, notas: 12, medio: 13 },
  { name: 'Ingresos Fijos', type: 'income', isFixed: true, fecha: 15, amount: 16, notas: 17, medio: 18 },
];

// ─── Helpers ────────────────────────────────────────────────────────────────

function cellString(cell) {
  if (cell === undefined || cell === null) return '';
  if (typeof cell === 'string') return cell.trim();
  return String(cell).trim();
}

function isSectionRowEmpty(row, cfg) {
  const cols = [cfg.fecha, cfg.amount, cfg.notas, cfg.medio];
  return cols.every((c) => {
    const v = row[c];
    return v === undefined || v === null || v === '';
  });
}

/**
 * Parse and validate a date cell. Falls back to inheritance / month default.
 * Filters out dates outside the target year (2025).
 */
function resolveDate(rawCell, sheetMonth, lastDate) {
  let parsed = parseExcelDate(rawCell);
  if (parsed) {
    // Reject any stray year that isn't 2025.
    if (!parsed.startsWith('2025-')) {
      parsed = null;
    }
  }
  if (parsed) return { date: parsed, fallback: false };
  if (lastDate) return { date: lastDate, fallback: true };
  // Last resort: first of the month.
  return {
    date: `2025-${String(sheetMonth).padStart(2, '0')}-01`,
    fallback: true,
  };
}

// ─── Sheet processing ───────────────────────────────────────────────────────

function processSheet(workbook, sheetName, sheetMonth, mapping) {
  const data = getSheetData(workbook, sheetName);
  if (!data.length) return [];

  const isPartial = PARTIAL_SHEETS.has(sheetName);
  const movements = [];

  for (const cfg of SECTIONS) {
    let lastDate = null;
    let consecutiveEmpty = 0;
    // Some sheets (e.g. June Ingresos) have ~10 blank rows before data starts,
    // and the workbook templates extend to row 1000. A generous run-of-empties
    // threshold avoids stopping early while still bounding work.
    const STOP_AFTER = 80;

    // Data rows start at row 3 (rows 0-2 are blank/header/blank).
    for (let r = 3; r < data.length; r++) {
      const row = data[r] || [];
      if (isSectionRowEmpty(row, cfg)) {
        consecutiveEmpty++;
        if (consecutiveEmpty >= STOP_AFTER) break;
        continue;
      }
      consecutiveEmpty = 0;

      const amountRaw = row[cfg.amount];
      if (!isValidAmount(amountRaw)) {
        // Skip rows with no usable amount or where the amount column holds a date serial.
        continue;
      }
      const amount = amountRaw;

      const { date, fallback } = resolveDate(row[cfg.fecha], sheetMonth, lastDate);
      if (!fallback) lastDate = date;

      const notas = cellString(row[cfg.notas]);
      const medio = cellString(row[cfg.medio]);

      const movement = {
        type: cfg.type,
        amount,
        description: '',
        date,
        category: null,
        account_name: 'UNKNOWN',
        pocket_name: null,
        currency: 'COP',
        source_file: SOURCE_FILE,
        source_sheet: sheetName,
        source_section: cfg.name,
        source_row: r,
        needs_review: false,
        is_orphaned: false,
        fixed_expense_name: null,
      };

      if (cfg.isFixed) {
        // Gastos Fijos / Ingresos Fijos:
        //   medio column holds the fixed expense name (CELULAR, GYM, …).
        //   When missing (e.g. September), fall back to description.
        const fixedName = medio || notas;
        movement.fixed_expense_name = fixedName || null;
        movement.is_orphaned = true;
        movement.account_name = null;
        movement.pocket_name = null;
        movement.description = notas || medio || '(fixed expense)';
        // Flag for review when the fixed-expense name is missing.
        if (!medio) movement.needs_review = true;
      } else {
        // Gastos / Ingresos: medio column holds the account name.
        const resolved = resolveAccount(medio, mapping);
        movement.account_name = resolved.account_name;
        movement.pocket_name = resolved.pocket_name;
        if (resolved.currency) movement.currency = resolved.currency;
        if (resolved.needs_review) movement.needs_review = true;
        if (resolved.is_orphaned) {
          movement.is_orphaned = true;
          if (resolved.fixed_expense_name) {
            movement.fixed_expense_name = resolved.fixed_expense_name;
          }
        }
        movement.description = notas || medio || '(no description)';
      }

      // Partial sheets (September) need every entry flagged regardless.
      if (isPartial) movement.needs_review = true;

      movements.push(movement);
    }
  }

  return movements;
}

// ─── Main ───────────────────────────────────────────────────────────────────

function main() {
  if (!existsSync(SOURCE_PATH)) {
    console.error(`Source file not found: ${SOURCE_PATH}`);
    process.exit(1);
  }
  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  console.log(`Loading ${SOURCE_FILE}...`);
  const wb = loadWorkbook(SOURCE_PATH);
  const mapping = loadMapping();

  const summary = [];
  let grandTotal = 0;

  console.log('');
  for (const [sheetName, monthNum] of SHEETS) {
    const ws = wb.Sheets[sheetName];
    if (!ws) {
      console.warn(`  WARN: sheet "${sheetName}" not found, skipping`);
      continue;
    }

    const movements = processSheet(wb, sheetName, monthNum, mapping);

    // Per-section breakdown
    const bySection = {};
    for (const m of movements) {
      bySection[m.source_section] = (bySection[m.source_section] || 0) + 1;
    }

    const totalIncome = movements
      .filter((m) => m.type === 'income')
      .reduce((s, m) => s + m.amount, 0);
    const totalExpense = movements
      .filter((m) => m.type === 'expense')
      .reduce((s, m) => s + m.amount, 0);
    const needsReview = movements.filter((m) => m.needs_review).length;
    const orphaned = movements.filter((m) => m.is_orphaned).length;

    const fileName = `movements-2025-${String(monthNum).padStart(2, '0')}.json`;
    const filePath = join(OUTPUT_DIR, fileName);
    writeFileSync(filePath, JSON.stringify(movements, null, 2));

    summary.push({
      sheet: sheetName,
      file: fileName,
      count: movements.length,
      bySection,
      income: totalIncome,
      expense: totalExpense,
      needsReview,
      orphaned,
    });
    grandTotal += movements.length;

    console.log(
      `  ${sheetName.padEnd(10)} → ${String(movements.length).padStart(4)} mov ` +
        `| G:${String(bySection['Gastos'] || 0).padStart(3)} ` +
        `I:${String(bySection['Ingresos'] || 0).padStart(3)} ` +
        `GF:${String(bySection['Gastos Fijos'] || 0).padStart(3)} ` +
        `IF:${String(bySection['Ingresos Fijos'] || 0).padStart(3)} ` +
        `| income: ${String(Math.round(totalIncome)).padStart(12)} ` +
        `| expense: ${String(Math.round(totalExpense)).padStart(11)} ` +
        `| review: ${String(needsReview).padStart(3)} ` +
        `| orphan: ${String(orphaned).padStart(3)} ` +
        `→ ${fileName}`,
    );
  }

  // Summary footer
  console.log('\n' + '─'.repeat(80));
  console.log(`Total movements (Jan–Sep 2025): ${grandTotal}`);
  const totalIncome = summary.reduce((s, m) => s + m.income, 0);
  const totalExpense = summary.reduce((s, m) => s + m.expense, 0);
  const totalReview = summary.reduce((s, m) => s + m.needsReview, 0);
  const totalOrphaned = summary.reduce((s, m) => s + m.orphaned, 0);
  console.log(`Total income:  ${Math.round(totalIncome).toLocaleString('en-US')} COP`);
  console.log(`Total expense: ${Math.round(totalExpense).toLocaleString('en-US')} COP`);
  console.log(`Needs review:  ${totalReview} movements`);
  console.log(`Orphaned (fixed expenses): ${totalOrphaned} movements`);
  console.log(`Output directory: ${OUTPUT_DIR}`);
}

main();
