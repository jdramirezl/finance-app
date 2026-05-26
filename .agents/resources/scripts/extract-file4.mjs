#!/usr/bin/env node
// Extract movements from Presupuesto Mensual 2025 MEXICO.xlsx into per-month JSON files.
// NO DATABASE WRITES — outputs JSON only.
//
// File 4 specifics:
//   - Multi-currency (MXN primary, COP, USD) — currency from medio prefix.
//   - 4 sections per month sheet, 4 columns each (Date | Amount | Description | Account/Category).
//   - Section column offsets: Gastos=0, Ingresos=5, Gastos Fijos=10, Ingresos Fijos=15.
//   - Sheets to process: October (sparse, Oct 30-31) and November (full month).
//   - Boundary: nothing after 2025-11-30 (December onwards is empty).
//
// Output format (per movement):
//   { type, amount, description, date, category, account_name, pocket_name,
//     currency, source_file, source_sheet, source_section, source_row,
//     needs_review, is_orphaned, fixed_expense_name }

import {
  loadWorkbook,
  getSheetData,
  parseExcelDate,
  loadMapping,
  resolveAccount,
  determineCurrency,
  formatMovement,
  isValidAmount,
  PATHS,
} from './shared.mjs';
import { mkdirSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SOURCE_FILE = 'Presupuesto Mensual 2025 MEXICO.xlsx';
const SOURCE_PATH = join(PATHS.RESOURCES_DIR, SOURCE_FILE);
const OUTPUT_DIR = join(PATHS.OUTPUT_DIR, 'file4');

// Months to extract — others are empty/init-only.
const SHEETS = [
  { sheet: 'October', file: 'movements-october.json' },
  { sheet: 'November', file: 'movements-november.json' },
];

// Column offsets per section. Each section uses 4 columns:
//   offset+0 = date, offset+1 = amount, offset+2 = description, offset+3 = medio/category.
const SECTIONS = [
  { name: 'Gastos',         offset: 0,  type: 'expense', isFixed: false },
  { name: 'Ingresos',       offset: 5,  type: 'income',  isFixed: false },
  { name: 'Gastos Fijos',   offset: 10, type: 'expense', isFixed: true  },
  { name: 'Ingresos Fijos', offset: 15, type: 'income',  isFixed: true  },
];

// Hard date boundaries.
const MIN_DATE = '2025-10-01';
const MAX_DATE = '2025-11-30';

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Normalize a medio cell value: trim and collapse internal whitespace runs. */
function normalizeMedio(value) {
  if (value === null || value === undefined) return '';
  return String(value).replace(/\s+/g, ' ').trim();
}

/** Strict numeric coerce for amount cells, rejecting Excel date serials. */
function parseAmount(value) {
  if (value === '' || value === null || value === undefined) return null;
  const num = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(num)) return null;
  if (num <= 0) return null;
  // Reject Excel date serials accidentally placed in the amount column.
  if (num > 40000 && num < 50000) return null;
  return num;
}

/** Read a section row at (rowIndex, section.offset). Returns null when the row's section is empty. */
function readSectionRow(row, offset) {
  const dateCell = row[offset];
  const amountCell = row[offset + 1];
  const descCell = row[offset + 2];
  const medioCell = row[offset + 3];
  const allEmpty = [dateCell, amountCell, descCell, medioCell].every(
    v => v === '' || v === null || v === undefined,
  );
  if (allEmpty) return null;
  return { dateCell, amountCell, descCell, medioCell };
}

/**
 * Convert a Spanish-quincena description into stable form. Keeps the original mostly
 * intact; we just trim and collapse whitespace.
 */
function cleanDescription(value) {
  if (value === '' || value === null || value === undefined) return '';
  return String(value).replace(/\s+/g, ' ').trim();
}

/** Determine if a date string falls within the allowed window [MIN_DATE, MAX_DATE]. */
function isDateInRange(iso) {
  if (!iso) return false;
  return iso >= MIN_DATE && iso <= MAX_DATE;
}

// ─── Section processing ────────────────────────────────────────────────────

function processSheet(sheetName, sheetData, mapping) {
  const movements = [];
  const skipped = []; // { reason, source_row, raw }
  const skipPockets = new Set(
    (mapping.ignore_rules?.skip_pockets || []).map(s => s.replace(/\s+/g, ' ').trim()),
  );

  // Iterate every data row (rows 0/2 are empty, row 1 is headers; data starts at row 3).
  // Sections are independent — we never stop early; we walk all rows and check each section.
  for (let r = 3; r < sheetData.length; r++) {
    const row = sheetData[r] || [];
    for (const section of SECTIONS) {
      const cells = readSectionRow(row, section.offset);
      if (!cells) continue;

      const amount = parseAmount(cells.amountCell);
      if (amount === null) {
        // No usable amount — but still log non-empty rows for visibility.
        // Skip silently when amount is 0 / empty (these are blank or marker rows).
        const hasContent =
          cells.dateCell !== '' || cells.descCell !== '' || cells.medioCell !== '';
        if (hasContent && cells.amountCell !== '' && cells.amountCell !== 0) {
          skipped.push({
            reason: 'invalid_amount',
            source_row: r,
            source_section: section.name,
            raw: { ...cells },
          });
        }
        // Special-case: zero-amount entries (GYM, CREMAS, VERO quincenas) per plan.
        if (cells.amountCell === 0) {
          // Fall through and include the zero-amount entry. We need to keep these.
        } else {
          continue;
        }
      }

      const finalAmount = amount === null ? 0 : amount;

      const isoDate = parseExcelDate(cells.dateCell);
      const description = cleanDescription(cells.descCell);
      const medioRaw = cells.medioCell;
      const medioNormalized = normalizeMedio(medioRaw);

      // Skip rows whose medio is in the ignore list (only for non-fixed sections).
      if (!section.isFixed && medioNormalized && skipPockets.has(medioNormalized)) {
        skipped.push({
          reason: 'ignored_pocket',
          source_row: r,
          source_section: section.name,
          medio: medioNormalized,
          amount: finalAmount,
          description,
        });
        continue;
      }

      // Date validation — reject anything outside the Oct 1 – Nov 30 window.
      let needsReview = false;
      let dateForOutput = isoDate;
      if (isoDate && !isDateInRange(isoDate)) {
        skipped.push({
          reason: 'date_out_of_range',
          source_row: r,
          source_section: section.name,
          date: isoDate,
          amount: finalAmount,
          description,
        });
        continue;
      }
      if (!isoDate) {
        // Null date is allowed but flagged for review per plan.
        needsReview = true;
        dateForOutput = null;
      }

      // Build movement.
      let movement;
      if (section.isFixed) {
        // Gastos Fijos / Ingresos Fijos:
        //   - "medio" cell is actually the fixed expense name (TRANSPORTE, RENTA, etc.)
        //   - All fixed expenses are MXN per plan.
        //   - is_orphaned = true (no real account/pocket to attach to).
        const fixedName = medioNormalized || '';
        // Some uber rides have null category — flag for review.
        const fixedNeedsReview = !fixedName;

        movement = formatMovement({
          type: section.type,
          amount: finalAmount,
          description: description || (fixedName ? `(${fixedName})` : '(fixed expense)'),
          date: dateForOutput,
          category: null,
          account_name: null,
          pocket_name: null,
          currency: 'MXN',
          source_file: SOURCE_FILE,
          source_sheet: sheetName,
          source_section: section.name,
          source_row: r,
          needs_review: needsReview || fixedNeedsReview,
          is_orphaned: true,
          fixed_expense_name: fixedName || null,
        });
      } else {
        // Gastos / Ingresos:
        //   - medio prefix determines currency
        //   - resolveAccount maps medio to {account_name, pocket_name}
        let accountName = 'UNKNOWN';
        let pocketName = null;
        let currency;
        let isOrphaned = false;
        let resolvedNeedsReview = false;

        if (!medioNormalized) {
          // Null medio — currency unknown, account unknown, flag for review.
          accountName = 'UNKNOWN';
          pocketName = null;
          currency = 'UNKNOWN';
          resolvedNeedsReview = true;
        } else {
          const resolved = resolveAccount(medioNormalized, mapping);
          if (resolved.account_name === 'UNKNOWN') {
            // Unmapped medio — flag for review but try prefix-based currency.
            accountName = 'UNKNOWN';
            pocketName = null;
            currency = determineCurrency(medioNormalized, mapping);
            resolvedNeedsReview = true;
          } else if (resolved.account_name === 'FIXED_EXPENSE') {
            // Should not happen for non-fixed sections but be defensive.
            accountName = null;
            pocketName = null;
            currency = 'MXN';
            isOrphaned = true;
          } else {
            accountName = resolved.account_name;
            pocketName = resolved.pocket_name;
            // Prefer prefix-based currency (it accounts for [NuMX] vs [Nu] correctly),
            // fall back to resolved.currency, fall back to MXN (file default).
            currency = determineCurrency(medioNormalized, mapping)
              || resolved.currency
              || 'MXN';
          }
        }

        movement = formatMovement({
          type: section.type,
          amount: finalAmount,
          description: description || medioNormalized || '(no description)',
          date: dateForOutput,
          category: null,
          account_name: accountName,
          pocket_name: pocketName,
          currency,
          source_file: SOURCE_FILE,
          source_sheet: sheetName,
          source_section: section.name,
          source_row: r,
          needs_review: needsReview || resolvedNeedsReview,
          is_orphaned: isOrphaned,
          fixed_expense_name: null,
        });
      }

      movements.push(movement);
    }
  }

  return { movements, skipped };
}

// ─── Reporting ─────────────────────────────────────────────────────────────

function summarize(movements) {
  const bySection = {};
  const byCurrency = {};
  const byType = { income: 0, expense: 0 };
  const totalsByCurrency = {};
  let needsReview = 0;
  let orphaned = 0;
  let nullDates = 0;

  for (const m of movements) {
    bySection[m.source_section] = (bySection[m.source_section] || 0) + 1;
    byCurrency[m.currency] = (byCurrency[m.currency] || 0) + 1;
    byType[m.type] = (byType[m.type] || 0) + 1;
    totalsByCurrency[m.currency] =
      (totalsByCurrency[m.currency] || 0) + (m.type === 'income' ? m.amount : -m.amount);
    if (m.needs_review) needsReview++;
    if (m.is_orphaned) orphaned++;
    if (m.date === null) nullDates++;
  }

  return {
    count: movements.length,
    by_section: bySection,
    by_currency: byCurrency,
    by_type: byType,
    net_by_currency: totalsByCurrency,
    needs_review: needsReview,
    orphaned,
    null_dates: nullDates,
  };
}

function fmtNum(n) {
  return Number(n.toFixed(2)).toLocaleString('en-US');
}

function printSummary(label, summary, totalAmounts) {
  console.log(`\n${label}`);
  console.log('  count:        ' + summary.count);
  console.log('  by_section:   ' + JSON.stringify(summary.by_section));
  console.log('  by_currency:  ' + JSON.stringify(summary.by_currency));
  console.log('  by_type:      ' + JSON.stringify(summary.by_type));
  console.log('  needs_review: ' + summary.needs_review);
  console.log('  orphaned:     ' + summary.orphaned);
  console.log('  null_dates:   ' + summary.null_dates);
  console.log('  totals (income / expense / net):');
  for (const [cur, totals] of Object.entries(totalAmounts)) {
    console.log(
      `    ${cur.padEnd(8)} income: ${fmtNum(totals.income).padStart(15)}` +
      `  expense: ${fmtNum(totals.expense).padStart(15)}` +
      `  net: ${fmtNum(totals.income - totals.expense).padStart(15)}`,
    );
  }
}

function totalsByCurrency(movements) {
  const out = {};
  for (const m of movements) {
    if (!out[m.currency]) out[m.currency] = { income: 0, expense: 0 };
    if (m.type === 'income') out[m.currency].income += m.amount;
    else out[m.currency].expense += m.amount;
  }
  return out;
}

// ─── Main ──────────────────────────────────────────────────────────────────

function main() {
  mkdirSync(OUTPUT_DIR, { recursive: true });

  console.log(`Loading ${SOURCE_FILE}...`);
  const wb = loadWorkbook(SOURCE_PATH);
  const mapping = loadMapping();

  const allMovements = [];
  const allSkipped = [];
  const perSheetSummaries = {};

  for (const { sheet, file } of SHEETS) {
    const data = getSheetData(wb, sheet);
    if (!data.length) {
      console.warn(`  WARN: sheet "${sheet}" not found or empty`);
      continue;
    }
    const { movements, skipped } = processSheet(sheet, data, mapping);

    const filePath = join(OUTPUT_DIR, file);
    writeFileSync(filePath, JSON.stringify(movements, null, 2));

    perSheetSummaries[sheet] = summarize(movements);
    perSheetSummaries[sheet].file = file;
    perSheetSummaries[sheet].totals = totalsByCurrency(movements);

    allMovements.push(...movements);
    allSkipped.push(...skipped.map(s => ({ ...s, source_sheet: sheet })));

    console.log(`  ${sheet.padEnd(10)} → ${String(movements.length).padStart(4)} movements → ${file}`);
    if (skipped.length) {
      console.log(`    skipped:  ${skipped.length} rows (see validation report)`);
    }
  }

  // Write validation report.
  const validationReport = {
    source_file: SOURCE_FILE,
    extracted_at: new Date().toISOString(),
    boundary: { min_date: MIN_DATE, max_date: MAX_DATE },
    total_movements: allMovements.length,
    per_sheet: perSheetSummaries,
    overall: summarize(allMovements),
    overall_totals: totalsByCurrency(allMovements),
    skipped: allSkipped,
    needs_review_movements: allMovements
      .filter(m => m.needs_review)
      .map(m => ({
        source_sheet: m.source_sheet,
        source_section: m.source_section,
        source_row: m.source_row,
        type: m.type,
        amount: m.amount,
        currency: m.currency,
        description: m.description,
        date: m.date,
        account_name: m.account_name,
        pocket_name: m.pocket_name,
        fixed_expense_name: m.fixed_expense_name,
      })),
  };
  writeFileSync(
    join(OUTPUT_DIR, 'validation-report.json'),
    JSON.stringify(validationReport, null, 2),
  );

  // ─── Final summary ───────────────────────────────────────────────────────
  console.log('\n' + '─'.repeat(80));
  console.log('SUMMARY — File 4 (Presupuesto Mensual 2025 MEXICO.xlsx)');
  console.log('─'.repeat(80));

  for (const sheet of Object.keys(perSheetSummaries)) {
    printSummary(`${sheet}`, perSheetSummaries[sheet], perSheetSummaries[sheet].totals);
  }

  console.log('\nOVERALL');
  printSummary('  combined', summarize(allMovements), totalsByCurrency(allMovements));

  console.log('\nSkipped rows: ' + allSkipped.length);
  for (const s of allSkipped) {
    console.log(
      `  - [${s.source_sheet}/${s.source_section}] row ${s.source_row}: ${s.reason}` +
      (s.description ? ` — "${s.description}"` : '') +
      (s.amount !== undefined ? ` (amount: ${s.amount})` : '') +
      (s.medio ? ` [medio: ${s.medio}]` : ''),
    );
  }

  console.log('\nOutput directory: ' + OUTPUT_DIR);
}

main();
