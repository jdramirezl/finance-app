/**
 * Shared utilities for Excel → JSON extraction scripts.
 *
 * CRITICAL: This module produces JSON files only. NO database writes.
 *
 * Used by per-file extraction scripts that walk monthly sheets in the
 * historical Excel workbooks under .agents/resources/ and emit:
 *   - movements (income/expense rows)
 *   - net worth snapshots (Resumen-style summary tabs)
 *
 * All output goes to .agents/resources/output/{filename}.
 */

import XLSX from 'xlsx';
import { mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/** Resolved path to .agents/resources (one level up from scripts/). */
const RESOURCES_DIR = resolve(__dirname, '..');

/** Output directory for emitted JSON. */
const OUTPUT_DIR = join(RESOURCES_DIR, 'output');

/** Path to the canonical mapping config. */
const MAPPING_PATH = join(__dirname, 'account-mapping.json');

/**
 * Reasonable date sanity bounds. Excel serial dates outside these are treated
 * as either non-dates or noise (e.g. user typing 2030+ as a placeholder).
 *  - 36526 ≈ 2000-01-01
 *  - 47848 ≈ 2030-12-31
 */
const MIN_VALID_SERIAL = 36526;
const MAX_VALID_SERIAL = 47848;

/**
 * Convert an Excel cell value to an ISO date string (YYYY-MM-DD).
 *
 * @param {*} value - cell value from xlsx (number serial, string, Date, or empty)
 * @returns {string|null} ISO YYYY-MM-DD or null when the value is missing /
 *                       unparseable / out-of-range.
 */
export function parseExcelDate(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  // Native Date instances (xlsx with cellDates: true)
  if (value instanceof Date) {
    if (isNaN(value.getTime())) return null;
    const year = value.getFullYear();
    if (year < 2000 || year > 2030) {
      console.warn(`[parseExcelDate] out-of-range Date ignored: ${value.toISOString()}`);
      return null;
    }
    return toIsoDate(year, value.getMonth() + 1, value.getDate());
  }

  // Excel serial numbers
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return null;
    if (value < MIN_VALID_SERIAL || value > MAX_VALID_SERIAL) {
      // Likely a monetary amount or out-of-range placeholder
      if (value > 40000 && value <= MAX_VALID_SERIAL) {
        // shouldn't be reached, defensive
        return null;
      }
      if (value > MAX_VALID_SERIAL) {
        console.warn(`[parseExcelDate] serial > 2030 ignored: ${value}`);
      }
      return null;
    }
    const parsed = XLSX.SSF.parse_date_code(value);
    if (!parsed) return null;
    return toIsoDate(parsed.y, parsed.m, parsed.d);
  }

  // String dates: try direct ISO, then JS Date parsing
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;

    // Already ISO?
    const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
      const y = Number(isoMatch[1]);
      const m = Number(isoMatch[2]);
      const d = Number(isoMatch[3]);
      if (y < 2000 || y > 2030) {
        console.warn(`[parseExcelDate] out-of-range string date ignored: ${trimmed}`);
        return null;
      }
      return toIsoDate(y, m, d);
    }

    // DD/MM/YYYY or D/M/YYYY (Spanish locale common in these files)
    const slashMatch = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
    if (slashMatch) {
      const d = Number(slashMatch[1]);
      const m = Number(slashMatch[2]);
      let y = Number(slashMatch[3]);
      if (y < 100) y += 2000;
      if (y < 2000 || y > 2030) {
        console.warn(`[parseExcelDate] out-of-range slash date ignored: ${trimmed}`);
        return null;
      }
      return toIsoDate(y, m, d);
    }

    // Last resort: JS Date parse
    const parsed = new Date(trimmed);
    if (!isNaN(parsed.getTime())) {
      const year = parsed.getFullYear();
      if (year < 2000 || year > 2030) {
        console.warn(`[parseExcelDate] out-of-range parsed date ignored: ${trimmed}`);
        return null;
      }
      return toIsoDate(year, parsed.getMonth() + 1, parsed.getDate());
    }

    return null;
  }

  return null;
}

/**
 * Format a (year, month, day) tuple as ISO YYYY-MM-DD with zero-padding.
 * @param {number} y
 * @param {number} m
 * @param {number} d
 * @returns {string}
 */
function toIsoDate(y, m, d) {
  const mm = String(m).padStart(2, '0');
  const dd = String(d).padStart(2, '0');
  return `${y}-${mm}-${dd}`;
}

/**
 * Load and return the account-mapping.json config.
 * Cached on first call so repeated lookups are cheap inside loops.
 *
 * @returns {object} parsed mapping config
 */
let _mappingCache = null;
export function loadMapping() {
  if (_mappingCache) return _mappingCache;
  const raw = readFileSync(MAPPING_PATH, 'utf8');
  _mappingCache = JSON.parse(raw);
  return _mappingCache;
}

/**
 * Normalize a Medio string for case-insensitive lookup:
 *  - trim
 *  - collapse runs of whitespace to a single space
 *  - lowercase
 *
 * @param {string} value
 * @returns {string}
 */
function normalizeKey(value) {
  return String(value)
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/**
 * Resolve a Medio cell value to an account/pocket pair using the mapping.
 *
 * Resolution order:
 *   1. Exact match in `medio_to_account_mapping`
 *   2. Trimmed + double-space-collapsed exact match
 *   3. Case-insensitive match (with normalization)
 *   4. Known fixed expense name → orphaned fixed-expense placeholder
 *   5. Unknown → needs_review placeholder
 *
 * @param {string} medioValue - raw cell value
 * @param {object} mapping - result of loadMapping()
 * @returns {{
 *   account_name: string,
 *   pocket_name: string|null,
 *   currency?: string,
 *   needs_review?: boolean,
 *   is_orphaned?: boolean,
 *   fixed_expense_name?: string
 * }}
 */
export function resolveAccount(medioValue, mapping) {
  if (medioValue === null || medioValue === undefined || medioValue === '') {
    return { account_name: 'UNKNOWN', pocket_name: null, needs_review: true };
  }

  const raw = String(medioValue);
  const trimmed = raw.replace(/\s+/g, ' ').trim();
  const direct = mapping.medio_to_account_mapping || {};

  // 1. exact match (raw)
  let matched = direct[raw];
  // 2. trimmed/normalized whitespace
  if (!matched) matched = direct[trimmed];

  // 3. case-insensitive match
  if (!matched) {
    const target = normalizeKey(raw);
    for (const [key, val] of Object.entries(direct)) {
      if (key === '_comment') continue;
      if (normalizeKey(key) === target) {
        matched = val;
        break;
      }
    }
  }

  if (matched) {
    const [account_name, pocket_name = null] = matched.split('::');
    const currency = inferCurrencyForAccount(account_name, mapping);
    return {
      account_name,
      pocket_name,
      ...(currency ? { currency } : {}),
    };
  }

  // 4. fixed expense fallback (orphaned with metadata)
  const fixedList = mapping.fixed_expense_handling?.known_fixed_expenses || [];
  const upper = trimmed.toUpperCase();
  if (fixedList.some((name) => name.toUpperCase() === upper)) {
    return {
      account_name: 'FIXED_EXPENSE',
      pocket_name: null,
      fixed_expense_name: trimmed,
      is_orphaned: true,
    };
  }

  // 5. unknown
  return {
    account_name: 'UNKNOWN',
    pocket_name: null,
    needs_review: true,
  };
}

/**
 * Look up the currency for an account by checking existing_accounts and
 * legacy_accounts_to_create in the mapping.
 *
 * @param {string} accountName
 * @param {object} mapping
 * @returns {string|null}
 */
function inferCurrencyForAccount(accountName, mapping) {
  if (!accountName) return null;
  const existing = mapping.existing_accounts?.[accountName];
  if (existing?.currency) return existing.currency;
  const legacy = (mapping.legacy_accounts_to_create || []).find(
    (acc) => acc.name === accountName,
  );
  if (legacy?.currency) return legacy.currency;
  return null;
}

/**
 * Determine the currency of a Medio value by inspecting its prefix.
 * Falls back to 'COP' when no prefix matches (the original Colombia workbook
 * is COP by default).
 *
 * @param {string} medioValue
 * @param {object} mapping
 * @returns {string} ISO currency code
 */
export function determineCurrency(medioValue, mapping) {
  if (medioValue === null || medioValue === undefined || medioValue === '') {
    return 'COP';
  }
  const raw = String(medioValue).trim();
  const prefixes = mapping.currency_from_prefix || {};
  for (const [prefix, currency] of Object.entries(prefixes)) {
    if (prefix === '_comment') continue;
    if (raw.startsWith(prefix)) return currency;
  }
  return 'COP';
}

/**
 * Build a standardized movement record.
 *
 * Required fields are passed through; optional fields default to safe values
 * so downstream consumers always see the same shape.
 *
 * @param {object} data
 * @param {'income'|'expense'} data.type
 * @param {number} data.amount
 * @param {string} [data.description]
 * @param {string|null} data.date - ISO YYYY-MM-DD
 * @param {string} [data.category]
 * @param {string} [data.account_name]
 * @param {string|null} [data.pocket_name]
 * @param {string} [data.currency]
 * @param {string} [data.source_file]
 * @param {string} [data.source_sheet]
 * @param {string} [data.source_section]
 * @param {number} [data.source_row]
 * @param {boolean} [data.needs_review]
 * @param {boolean} [data.is_orphaned]
 * @param {string} [data.fixed_expense_name]
 * @returns {object} normalized movement
 */
export function formatMovement(data) {
  return {
    type: data.type,
    amount: typeof data.amount === 'number' ? data.amount : Number(data.amount) || 0,
    description: data.description ?? '',
    date: data.date ?? null,
    category: data.category ?? null,
    account_name: data.account_name ?? 'UNKNOWN',
    pocket_name: data.pocket_name ?? null,
    currency: data.currency ?? 'COP',
    source_file: data.source_file ?? null,
    source_sheet: data.source_sheet ?? null,
    source_section: data.source_section ?? null,
    source_row: data.source_row ?? null,
    needs_review: Boolean(data.needs_review),
    is_orphaned: Boolean(data.is_orphaned),
    fixed_expense_name: data.fixed_expense_name ?? null,
  };
}

/**
 * Build a standardized net worth snapshot record.
 *
 * @param {object} data
 * @param {string} data.date - ISO YYYY-MM-DD
 * @param {number} data.total_value
 * @param {string} [data.currency]
 * @param {Array<{
 *   account_name: string,
 *   pocket_name?: string|null,
 *   value: number,
 *   currency?: string
 * }>} [data.accounts]
 * @returns {object} normalized snapshot
 */
export function formatSnapshot(data) {
  return {
    date: data.date,
    total_value: typeof data.total_value === 'number'
      ? data.total_value
      : Number(data.total_value) || 0,
    currency: data.currency ?? 'COP',
    breakdown: {
      accounts: Array.isArray(data.accounts) ? data.accounts : [],
    },
  };
}

/**
 * Write JSON output to .agents/resources/output/{filename} with pretty-print.
 * Creates the output directory if missing.
 *
 * @param {string} filename - basename only, e.g. "file1-movements.json"
 * @param {*} data - JSON-serializable payload
 * @returns {string} absolute path of the written file
 */
export function writeOutput(filename, data) {
  mkdirSync(OUTPUT_DIR, { recursive: true });
  const target = join(OUTPUT_DIR, filename);
  writeFileSync(target, JSON.stringify(data, null, 2), 'utf8');
  return target;
}

/**
 * Load an Excel workbook from disk.
 *
 * @param {string} filepath - absolute or relative path to the .xlsx file
 * @returns {import('xlsx').WorkBook}
 */
export function loadWorkbook(filepath) {
  return XLSX.readFile(filepath, { cellDates: false });
}

/**
 * Get a sheet's contents as an array-of-arrays (header: 1).
 * Returns an empty array when the sheet does not exist.
 *
 * @param {import('xlsx').WorkBook} workbook
 * @param {string} sheetName
 * @returns {Array<Array<*>>}
 */
export function getSheetData(workbook, sheetName) {
  const ws = workbook.Sheets[sheetName];
  if (!ws) return [];
  return XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: true });
}

/**
 * Test whether a value is a valid monetary amount:
 *   - finite number
 *   - strictly greater than zero
 *   - not in the Excel-date-serial range (40000–50000)
 *
 * @param {*} value
 * @returns {boolean}
 */
export function isValidAmount(value) {
  if (typeof value !== 'number') return false;
  if (!Number.isFinite(value)) return false;
  if (value <= 0) return false;
  // Reject likely Excel date serials so we don't treat a date column as money.
  if (value > 40000 && value < 50000) return false;
  return true;
}

/** Re-export commonly needed paths so scripts don't have to re-derive them. */
export const PATHS = Object.freeze({
  RESOURCES_DIR,
  OUTPUT_DIR,
  MAPPING_PATH,
});
