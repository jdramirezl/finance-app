#!/usr/bin/env node
// Extract movements from Shin Presupuesto Mensual 2024.xlsx into per-month JSON files.
// NO DATABASE WRITES — outputs JSON only.
//
// Output format per movement (snake_case, per user spec):
//   { type, amount, description, date, category, account_name, pocket_name,
//     currency, source_file, source_sheet, source_section, source_row,
//     needs_review, is_orphaned, fixed_expense_name }

import XLSX from 'xlsx';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const RESOURCES_DIR = join(__dirname, '..');
const SOURCE_FILE = 'Shin Presupuesto Mensual 2024.xlsx';
const SOURCE_PATH = join(RESOURCES_DIR, SOURCE_FILE);
const MAPPING_PATH = join(__dirname, 'account-mapping.json');
const OUTPUT_DIR = join(RESOURCES_DIR, 'output', 'file2');

const SHEETS = [
  ['January', 1],   ['February', 2],  ['March', 3],     ['April', 4],
  ['May', 5],       ['June', 6],      ['July', 7],      ['August', 8],
  ['September', 9], ['October', 10],  ['November', 11], ['December', 12],
];

// ─── Helpers ────────────────────────────────────────────────────────────────

function loadMapping() {
  const raw = JSON.parse(readFileSync(MAPPING_PATH, 'utf8'));
  return raw;
}

function caseInsensitiveLookup(map, key) {
  if (!key || typeof key !== 'string') return null;
  const trimmed = key.trim();
  if (Object.prototype.hasOwnProperty.call(map, trimmed)) return map[trimmed];
  const lower = trimmed.toLowerCase();
  for (const [k, v] of Object.entries(map)) {
    if (k.startsWith('_')) continue;
    if (k.toLowerCase() === lower) return v;
  }
  return null;
}

function resolveAccount(medioRaw, mapping) {
  // Returns { account_name, pocket_name, currency, resolved }
  if (!medioRaw || (typeof medioRaw === 'string' && medioRaw.trim() === '')) {
    return { account_name: null, pocket_name: null, currency: 'COP', resolved: false };
  }
  const medio = String(medioRaw).trim();
  const mapped = caseInsensitiveLookup(mapping.medio_to_account_mapping, medio);
  if (!mapped) {
    return { account_name: null, pocket_name: null, currency: 'COP', resolved: false };
  }
  let accountName, pocketName;
  if (mapped.includes('::')) {
    const idx = mapped.indexOf('::');
    accountName = mapped.slice(0, idx);
    pocketName = mapped.slice(idx + 2);
  } else {
    accountName = mapped;
    pocketName = null;
  }
  // Currency lookup
  let currency = 'COP';
  if (mapping.existing_accounts[accountName]) {
    currency = mapping.existing_accounts[accountName].currency || 'COP';
  } else {
    // Legacy accounts
    const legacy = mapping.legacy_accounts_to_create.find(a => a.name === accountName);
    if (legacy && legacy.currency) currency = legacy.currency;
  }
  return { account_name: accountName, pocket_name: pocketName, currency, resolved: true };
}

function excelSerialToISO(serial) {
  // Excel epoch quirks: serial 25569 corresponds to 1970-01-01.
  // Use UTC to avoid timezone shifts.
  const ms = Math.round((serial - 25569) * 86400 * 1000);
  const d = new Date(ms);
  if (isNaN(d.getTime())) return null;
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function isLikelyDateSerial(value) {
  // Excel date serials for the years 2010–2030 fall roughly between 40179 and 47848.
  // Use a wide tolerant range.
  return typeof value === 'number' && value > 40000 && value < 50000;
}

function parseDateCell(cell) {
  if (cell === '' || cell === null || cell === undefined) return null;
  if (typeof cell === 'number' && isLikelyDateSerial(cell)) {
    return excelSerialToISO(cell);
  }
  if (cell instanceof Date) {
    const y = cell.getUTCFullYear();
    const m = String(cell.getUTCMonth() + 1).padStart(2, '0');
    const day = String(cell.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
  return null;
}

function parseAmountCell(cell) {
  // Returns positive number or null. Filters out date-serial typos and zeros are kept (Reset can be 0).
  if (cell === '' || cell === null || cell === undefined) return null;
  if (typeof cell !== 'number') {
    // Some cells might be strings like "6/24" – ignore
    return null;
  }
  // Filter out date serials accidentally entered in the amount column
  if (isLikelyDateSerial(cell)) return null;
  return Math.abs(cell);
}

function cellString(cell) {
  if (cell === undefined || cell === null) return '';
  if (typeof cell === 'string') return cell.trim();
  return String(cell).trim();
}

// ─── Section column layouts ─────────────────────────────────────────────────

function sectionColumns(baseCol) {
  return {
    'Gastos': {
      type: 'expense',
      isFixed: false,
      fecha: baseCol + 0,
      amount: baseCol + 1,
      notas: baseCol + 2,
      categoria: baseCol + 3,
      medio: baseCol + 4,
    },
    'Ingresos': {
      type: 'income',
      isFixed: false,
      fecha: baseCol + 6,
      amount: baseCol + 7,
      notas: baseCol + 8,
      categoria: null,
      medio: baseCol + 9,
    },
    'Gastos Fijos': {
      type: 'expense',
      isFixed: true,
      fecha: baseCol + 11,
      amount: baseCol + 12,
      notas: baseCol + 13,
      categoria: null,
      medio: baseCol + 14,
    },
    'Ingresos Fijos': {
      type: 'income',
      isFixed: true,
      fecha: baseCol + 16,
      amount: baseCol + 17,
      notas: baseCol + 18,
      categoria: null,
      medio: baseCol + 19,
    },
  };
}

function isSectionRowEmpty(row, cfg) {
  const cols = [cfg.fecha, cfg.amount, cfg.notas, cfg.medio];
  if (cfg.categoria !== null) cols.push(cfg.categoria);
  return cols.every(c => {
    const v = row[c];
    return v === undefined || v === null || v === '';
  });
}

// ─── Sheet processing ───────────────────────────────────────────────────────

function processSheet(ws, sheetName, sheetMonth, baseCol, mapping) {
  const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: true });
  const sections = sectionColumns(baseCol);
  const movements = [];

  for (const [sectionName, cfg] of Object.entries(sections)) {
    let lastDate = null;
    let consecutiveEmpty = 0;
    const STOP_AFTER = 5;
    // Data rows start at row index 3 (after empty row 0, header row 1, column header row 2)
    // For December the column shift does not affect row indices.
    for (let r = 3; r < data.length; r++) {
      const row = data[r] || [];
      if (isSectionRowEmpty(row, cfg)) {
        consecutiveEmpty++;
        if (consecutiveEmpty >= STOP_AFTER) break;
        continue;
      }
      consecutiveEmpty = 0;

      const amount = parseAmountCell(row[cfg.amount]);
      if (amount === null || amount === 0) {
        // Skip rows with no usable amount (also skips rows where amount cell holds a stray date serial)
        continue;
      }

      let date = parseDateCell(row[cfg.fecha]);
      if (date) {
        lastDate = date;
      } else {
        date = lastDate; // inherit from previous row in same section
      }
      // If still no date, fall back to first day of the month
      if (!date) {
        date = `2024-${String(sheetMonth).padStart(2, '0')}-01`;
      }

      const notas = cellString(row[cfg.notas]);
      const medio = cellString(row[cfg.medio]);
      const categoria = cfg.categoria !== null ? cellString(row[cfg.categoria]) : '';

      const movement = {
        type: cfg.type,
        amount,
        description: '',
        date,
        category: categoria || null,
        account_name: 'UNKNOWN',
        pocket_name: null,
        currency: 'COP',
        source_file: SOURCE_FILE,
        source_sheet: sheetName,
        source_section: sectionName,
        source_row: r,
        needs_review: false,
        is_orphaned: false,
        fixed_expense_name: null,
      };

      if (cfg.isFixed) {
        // Gastos Fijos / Ingresos Fijos:
        //   Medio = fixed expense name (CELULAR, GYM, etc.)
        //   Early months (Jan-May) may have empty Medio — fall back to Notas
        const fixedName = medio || notas;
        movement.fixed_expense_name = fixedName || null;
        movement.is_orphaned = true;
        movement.account_name = null;
        movement.pocket_name = null;
        movement.description = notas || medio || '(fixed expense)';
        movement.needs_review = !medio; // medio empty → needs review
      } else {
        // Gastos / Ingresos:
        const resolved = resolveAccount(medio, mapping);
        if (resolved.resolved) {
          movement.account_name = resolved.account_name;
          movement.pocket_name = resolved.pocket_name;
          movement.currency = resolved.currency;
          movement.is_orphaned = false;
          movement.needs_review = false;
        } else if (medio) {
          // Medio present but unmapped → unknown account, flag for review
          movement.account_name = 'UNKNOWN';
          movement.pocket_name = null;
          movement.currency = 'COP';
          movement.is_orphaned = false;
          movement.needs_review = true;
        } else {
          // Medio empty → unknown account
          movement.account_name = 'UNKNOWN';
          movement.pocket_name = null;
          movement.currency = 'COP';
          movement.is_orphaned = false;
          movement.needs_review = true;
        }
        movement.description = notas || medio || '(no description)';
      }

      movements.push(movement);
    }
  }

  return movements;
}

// ─── Main ───────────────────────────────────────────────────────────────────

function main() {
  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  console.log(`Loading ${SOURCE_FILE}...`);
  const wb = XLSX.readFile(SOURCE_PATH);
  const mapping = loadMapping();

  const summary = [];
  let grandTotal = 0;

  for (const [sheetName, monthNum] of SHEETS) {
    const ws = wb.Sheets[sheetName];
    if (!ws) {
      console.warn(`  WARN: sheet "${sheetName}" not found`);
      continue;
    }
    const baseCol = sheetName === 'December' ? 1 : 0;
    const movements = processSheet(ws, sheetName, monthNum, baseCol, mapping);

    // Per-month stats
    const totalIncome = movements.filter(m => m.type === 'income').reduce((s, m) => s + m.amount, 0);
    const totalExpense = movements.filter(m => m.type === 'expense').reduce((s, m) => s + m.amount, 0);
    const needsReview = movements.filter(m => m.needs_review).length;
    const orphaned = movements.filter(m => m.is_orphaned).length;

    // Write file
    const fileName = `movements-2024-${String(monthNum).padStart(2, '0')}.json`;
    const filePath = join(OUTPUT_DIR, fileName);
    writeFileSync(filePath, JSON.stringify(movements, null, 2));

    summary.push({
      sheet: sheetName,
      file: fileName,
      count: movements.length,
      income: totalIncome,
      expense: totalExpense,
      needsReview,
      orphaned,
    });
    grandTotal += movements.length;
    console.log(
      `  ${sheetName.padEnd(10)} → ${String(movements.length).padStart(4)} mov ` +
      `| income: ${String(Math.round(totalIncome)).padStart(12)} ` +
      `| expense: ${String(Math.round(totalExpense)).padStart(12)} ` +
      `| review: ${String(needsReview).padStart(3)} ` +
      `| orphan: ${String(orphaned).padStart(3)} ` +
      `→ ${fileName}`
    );
  }

  // Print summary footer
  console.log('\n' + '─'.repeat(80));
  console.log(`Total movements across 2024: ${grandTotal}`);
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
