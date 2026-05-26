#!/usr/bin/env node
/**
 * validate-all.mjs
 *
 * READ-ONLY validation/summary for everything under
 * .agents/resources/output/. Walks file1/, file2/, file3/, file4/, snapshots/
 * (whichever exist) and produces a single markdown report at
 * .agents/resources/output/VALIDATION-REPORT.md.
 *
 * NO database writes. NO mutations to source JSON. Read-only.
 */

import { readdirSync, readFileSync, statSync, writeFileSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const OUTPUT_DIR = resolve(__dirname, '..', 'output');
const REPORT_PATH = join(OUTPUT_DIR, 'VALIDATION-REPORT.md');

const SUBDIRS = ['file1', 'file2', 'file3', 'file4'];
const SNAPSHOTS_DIR = 'snapshots';

const EXPECTED_START = { year: 2023, month: 1 };
const EXPECTED_END = { year: 2025, month: 11 };

const LARGE_AMOUNT_THRESHOLD = 100_000_000; // > 100M COP flagged

// ---------------------------------------------------------------------------
// Filesystem helpers
// ---------------------------------------------------------------------------

function dirExists(path) {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
}

function fileExists(path) {
  try {
    return statSync(path).isFile();
  } catch {
    return false;
  }
}

function listJsonFiles(dirPath) {
  if (!dirExists(dirPath)) return [];
  return readdirSync(dirPath)
    .filter((name) => name.toLowerCase().endsWith('.json'))
    .sort();
}

function readJson(filePath) {
  try {
    return JSON.parse(readFileSync(filePath, 'utf8'));
  } catch (err) {
    return { __error: err.message };
  }
}

function fileSize(filePath) {
  try {
    return statSync(filePath).size;
  } catch {
    return 0;
  }
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatNumber(n) {
  if (typeof n !== 'number' || !Number.isFinite(n)) return String(n);
  return n.toLocaleString('en-US');
}

// ---------------------------------------------------------------------------
// Filename → month/year detection
// ---------------------------------------------------------------------------

const MONTH_FILE_RE = /movements-(\d{4})-(\d{2})\.json$/i;
const NAMED_MONTH_FILE_RE = /movements-([a-zA-Z]+)\.json$/i;

const MONTH_NAME_TO_NUM = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
  july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
  enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6,
  julio: 7, agosto: 8, septiembre: 9, octubre: 10, noviembre: 11, diciembre: 12,
};

/** File names that are extraction metadata, not monthly movements. */
const SUMMARY_FILENAMES = new Set([
  'extraction-summary.json',
  'validation-report.json',
]);

function parseMonthFromFilename(filename) {
  const ymMatch = filename.match(MONTH_FILE_RE);
  if (ymMatch) {
    const year = Number(ymMatch[1]);
    const month = Number(ymMatch[2]);
    if (!Number.isInteger(year) || !Number.isInteger(month)) return null;
    if (month < 1 || month > 12) return null;
    return { year, month, key: `${ymMatch[1]}-${ymMatch[2]}`, source: 'filename-ym' };
  }
  // movements-<MonthName>.json — year unknown until we read the data
  const namedMatch = filename.match(NAMED_MONTH_FILE_RE);
  if (namedMatch) {
    const monthNum = MONTH_NAME_TO_NUM[namedMatch[1].toLowerCase()];
    if (!monthNum) return null;
    return { year: null, month: monthNum, key: null, source: 'filename-named' };
  }
  return null;
}

/**
 * Look at a movements array and pick the dominant YYYY-MM month from the
 * `date` fields. Used when the filename doesn't carry the year (file4-style
 * `movements-october.json`).
 */
function inferMonthFromMovements(movements) {
  const monthCounts = new Map();
  for (const mv of movements) {
    if (!mv || typeof mv !== 'object') continue;
    const d = mv.date;
    if (typeof d !== 'string' || d.length < 7) continue;
    const ym = d.slice(0, 7);
    monthCounts.set(ym, (monthCounts.get(ym) ?? 0) + 1);
  }
  if (monthCounts.size === 0) return null;
  let best = null;
  let bestCount = -1;
  for (const [ym, count] of monthCounts.entries()) {
    if (count > bestCount) {
      best = ym;
      bestCount = count;
    }
  }
  return best;
}

function expectedMonths(start, end) {
  const out = [];
  let y = start.year;
  let m = start.month;
  while (y < end.year || (y === end.year && m <= end.month)) {
    out.push(`${y}-${String(m).padStart(2, '0')}`);
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Movement aggregation
// ---------------------------------------------------------------------------

function summarizeMovements(movements, sourceLabel) {
  let income = 0;
  let expense = 0;
  let incomeCount = 0;
  let expenseCount = 0;
  let needsReview = 0;
  let orphaned = 0;
  let unknownAccount = 0;
  let nullAccount = 0;
  let nullDate = 0;
  let largeAmount = 0;
  const accountCounts = new Map();
  const dupKeys = new Map(); // date|amount|description -> count
  const monthsTouched = new Set();
  const dateMin = { value: null };
  const dateMax = { value: null };
  const largeAmountSamples = [];

  for (const mv of movements) {
    if (!mv || typeof mv !== 'object') continue;
    const amount = typeof mv.amount === 'number' ? mv.amount : Number(mv.amount) || 0;

    if (mv.type === 'income') {
      income += amount;
      incomeCount += 1;
    } else if (mv.type === 'expense') {
      expense += amount;
      expenseCount += 1;
    }

    if (mv.needs_review) needsReview += 1;
    if (mv.is_orphaned) orphaned += 1;
    if (mv.account_name === 'UNKNOWN') unknownAccount += 1;
    if (mv.account_name === null || mv.account_name === undefined) nullAccount += 1;
    if (mv.date == null) {
      nullDate += 1;
    } else {
      if (dateMin.value === null || mv.date < dateMin.value) dateMin.value = mv.date;
      if (dateMax.value === null || mv.date > dateMax.value) dateMax.value = mv.date;
      const monthKey = mv.date.slice(0, 7);
      monthsTouched.add(monthKey);
    }

    if (Math.abs(amount) > LARGE_AMOUNT_THRESHOLD) {
      largeAmount += 1;
      if (largeAmountSamples.length < 10) {
        largeAmountSamples.push({
          source: sourceLabel,
          amount,
          date: mv.date,
          description: mv.description,
          account_name: mv.account_name,
          source_sheet: mv.source_sheet,
          source_row: mv.source_row,
        });
      }
    }

    // Use a special bucket for null/undefined account_name so the user can
    // distinguish "UNKNOWN" (placeholder string) from a missing field.
    const acc =
      mv.account_name === null || mv.account_name === undefined
        ? '(null account_name)'
        : mv.account_name;
    accountCounts.set(acc, (accountCounts.get(acc) ?? 0) + 1);

    const dupKey = `${mv.date ?? ''}|${amount}|${(mv.description ?? '').trim().toLowerCase()}`;
    dupKeys.set(dupKey, (dupKeys.get(dupKey) ?? 0) + 1);
  }

  const duplicates = [];
  for (const [key, count] of dupKeys.entries()) {
    if (count > 1) duplicates.push({ key, count });
  }

  return {
    total: movements.length,
    income,
    expense,
    incomeCount,
    expenseCount,
    needsReview,
    orphaned,
    unknownAccount,
    nullAccount,
    nullDate,
    largeAmount,
    largeAmountSamples,
    accountCounts,
    duplicates,
    monthsTouched,
    dateMin: dateMin.value,
    dateMax: dateMax.value,
  };
}

function mergeAccountCounts(target, source) {
  for (const [acc, count] of source.entries()) {
    target.set(acc, (target.get(acc) ?? 0) + count);
  }
}

// ---------------------------------------------------------------------------
// Main walk
// ---------------------------------------------------------------------------

function collectFromSubdir(subdir) {
  const dirPath = join(OUTPUT_DIR, subdir);
  if (!dirExists(dirPath)) {
    return { exists: false, subdir, files: [], byMonth: {}, summary: null, extractionSummary: null };
  }

  const files = listJsonFiles(dirPath);
  const byMonth = {}; // monthKey -> { file, subdir, summary }
  const summary = {
    totalFiles: 0,
    totalMovements: 0,
    income: 0,
    expense: 0,
    incomeCount: 0,
    expenseCount: 0,
    needsReview: 0,
    orphaned: 0,
    unknownAccount: 0,
    nullAccount: 0,
    nullDate: 0,
    largeAmount: 0,
    largeAmountSamples: [],
    accountCounts: new Map(),
    duplicates: [],
    monthsTouched: new Set(),
    dateMin: null,
    dateMax: null,
  };

  let extractionSummary = null;

  for (const filename of files) {
    const filePath = join(dirPath, filename);
    const size = fileSize(filePath);

    if (SUMMARY_FILENAMES.has(filename)) {
      extractionSummary = { filename, size, content: readJson(filePath) };
      continue;
    }

    const monthInfo = parseMonthFromFilename(filename);
    if (!monthInfo) {
      // Unknown JSON in subdir — still record it for inventory
      byMonth[`__other:${filename}`] = {
        file: filename,
        size,
        subdir,
        monthKey: null,
        movementsCount: 0,
        note: 'Non-month JSON (skipped from per-month rollups)',
      };
      continue;
    }

    const data = readJson(filePath);
    if (data && data.__error) {
      byMonth[monthInfo.key ?? `__error:${filename}`] = {
        file: filename,
        size,
        subdir,
        monthKey: monthInfo.key,
        movementsCount: 0,
        error: data.__error,
      };
      continue;
    }

    const movements = Array.isArray(data) ? data : [];

    // For named-month files (file4 style), infer the year from movement dates.
    let resolvedKey = monthInfo.key;
    let monthKeySource = monthInfo.source;
    if (!resolvedKey) {
      const inferred = inferMonthFromMovements(movements);
      if (inferred) {
        resolvedKey = inferred;
        monthKeySource = 'inferred-from-data';
      }
    }

    if (!resolvedKey) {
      byMonth[`__other:${filename}`] = {
        file: filename,
        size,
        subdir,
        monthKey: null,
        movementsCount: movements.length,
        note: 'Could not determine month (no parseable dates)',
      };
      continue;
    }

    const monthSummary = summarizeMovements(movements, `${subdir}/${filename}`);

    summary.totalFiles += 1;
    summary.totalMovements += monthSummary.total;
    summary.income += monthSummary.income;
    summary.expense += monthSummary.expense;
    summary.incomeCount += monthSummary.incomeCount;
    summary.expenseCount += monthSummary.expenseCount;
    summary.needsReview += monthSummary.needsReview;
    summary.orphaned += monthSummary.orphaned;
    summary.unknownAccount += monthSummary.unknownAccount;
    summary.nullAccount += monthSummary.nullAccount;
    summary.nullDate += monthSummary.nullDate;
    summary.largeAmount += monthSummary.largeAmount;
    summary.largeAmountSamples.push(...monthSummary.largeAmountSamples);
    mergeAccountCounts(summary.accountCounts, monthSummary.accountCounts);
    summary.duplicates.push(
      ...monthSummary.duplicates.map((d) => ({ ...d, source: `${subdir}/${filename}` })),
    );
    for (const m of monthSummary.monthsTouched) summary.monthsTouched.add(m);

    if (monthSummary.dateMin && (!summary.dateMin || monthSummary.dateMin < summary.dateMin)) {
      summary.dateMin = monthSummary.dateMin;
    }
    if (monthSummary.dateMax && (!summary.dateMax || monthSummary.dateMax > summary.dateMax)) {
      summary.dateMax = monthSummary.dateMax;
    }

    byMonth[resolvedKey] = {
      file: filename,
      size,
      subdir,
      monthKey: resolvedKey,
      monthKeySource,
      movementsCount: monthSummary.total,
      summary: monthSummary,
    };
  }

  return { exists: true, subdir, files, byMonth, summary, extractionSummary };
}

function collectSnapshots() {
  const dirPath = join(OUTPUT_DIR, SNAPSHOTS_DIR);
  if (!dirExists(dirPath)) {
    return { exists: false, files: [], snapshots: [] };
  }

  const files = listJsonFiles(dirPath);
  const snapshots = [];
  for (const filename of files) {
    const filePath = join(dirPath, filename);
    const size = fileSize(filePath);
    const data = readJson(filePath);
    if (data && data.__error) {
      snapshots.push({ file: filename, size, error: data.__error });
      continue;
    }
    const list = Array.isArray(data) ? data : [data];
    for (const snap of list) {
      if (!snap || typeof snap !== 'object') continue;
      snapshots.push({
        file: filename,
        size,
        date: snap.date ?? null,
        total_value: snap.total_value ?? null,
        currency: snap.currency ?? null,
        derived: snap.derived ?? null,
        source: snap.source ?? null,
        confidence: snap.confidence ?? null,
        accountCount: Array.isArray(snap?.breakdown?.accounts) ? snap.breakdown.accounts.length : 0,
      });
    }
  }
  return { exists: true, files, snapshots };
}

// ---------------------------------------------------------------------------
// Markdown rendering
// ---------------------------------------------------------------------------

function renderHeader(now) {
  return [
    '# Validation Report — Extracted Finance Data',
    '',
    `**Generated**: ${now.toISOString()}`,
    `**Output directory**: \`.agents/resources/output/\``,
    '',
    '> Read-only summary of every JSON file produced by the Excel extraction',
    '> scripts. Use this report to decide whether the data looks correct',
    '> before any database upload.',
    '',
  ].join('\n');
}

function renderInventorySection(perDir, snapshots) {
  const lines = ['## 1. File Inventory', ''];

  for (const subdir of SUBDIRS) {
    const data = perDir[subdir];
    lines.push(`### \`${subdir}/\``);
    if (!data.exists) {
      lines.push('');
      lines.push('_Directory not found — not yet extracted._');
      lines.push('');
      continue;
    }
    if (data.files.length === 0) {
      lines.push('');
      lines.push('_Directory exists but contains no JSON files._');
      lines.push('');
      continue;
    }

    lines.push('');
    lines.push('| File | Size | Movements | Notes |');
    lines.push('|------|-----:|----------:|-------|');
    for (const filename of data.files) {
      if (SUMMARY_FILENAMES.has(filename)) {
        lines.push(
          `| \`${filename}\` | ${formatBytes(data.extractionSummary?.size ?? 0)} | — | extraction summary metadata |`,
        );
        continue;
      }
      const monthInfo = parseMonthFromFilename(filename);
      // Find the entry for this filename — month key may have been resolved
      // from the data itself (named-month files), so search by file rather
      // than only by parseMonthFromFilename's key.
      let entry = null;
      if (monthInfo?.key) entry = data.byMonth[monthInfo.key];
      if (!entry) {
        for (const value of Object.values(data.byMonth)) {
          if (value.file === filename) {
            entry = value;
            break;
          }
        }
      }
      if (!entry) {
        lines.push(`| \`${filename}\` | — | — | (skipped) |`);
        continue;
      }
      const noteParts = [];
      if (entry.error) noteParts.push(`parse error: ${entry.error}`);
      if (entry.note) noteParts.push(entry.note);
      if (entry.monthKeySource === 'inferred-from-data') {
        noteParts.push(`month inferred from data → ${entry.monthKey}`);
      }
      const note = noteParts.join('; ');
      lines.push(
        `| \`${filename}\` | ${formatBytes(entry.size)} | ${formatNumber(entry.movementsCount)} | ${note} |`,
      );
    }
    lines.push('');
  }

  lines.push('### `snapshots/`');
  if (!snapshots.exists) {
    lines.push('');
    lines.push('_Directory not found — not yet extracted._');
    lines.push('');
  } else if (snapshots.files.length === 0) {
    lines.push('');
    lines.push('_Directory exists but contains no JSON files._');
    lines.push('');
  } else {
    lines.push('');
    lines.push('| File | Size | Snapshots |');
    lines.push('|------|-----:|----------:|');
    const byFile = new Map();
    for (const s of snapshots.snapshots) {
      const cur = byFile.get(s.file) ?? { size: s.size, count: 0 };
      cur.count += 1;
      byFile.set(s.file, cur);
    }
    for (const [filename, info] of byFile.entries()) {
      lines.push(`| \`${filename}\` | ${formatBytes(info.size)} | ${formatNumber(info.count)} |`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

function renderTimelineSection(allMonthEntries) {
  const lines = ['## 2. Timeline Coverage', ''];
  const expected = expectedMonths(EXPECTED_START, EXPECTED_END);
  const present = new Map(); // monthKey -> [{subdir, file}]
  for (const entry of allMonthEntries) {
    if (!entry.monthKey) continue;
    if (!present.has(entry.monthKey)) present.set(entry.monthKey, []);
    present.get(entry.monthKey).push({ subdir: entry.subdir, file: entry.file });
  }

  const missing = expected.filter((m) => !present.has(m));
  const extra = [...present.keys()].filter((m) => !expected.includes(m)).sort();

  lines.push(`**Expected range**: ${expected[0]} → ${expected[expected.length - 1]} (${expected.length} months)`);
  lines.push(`**Months with data**: ${present.size}`);
  lines.push(`**Missing months**: ${missing.length}`);
  if (missing.length > 0) {
    lines.push('');
    lines.push('| Missing Month |');
    lines.push('|---------------|');
    for (const m of missing) lines.push(`| ${m} |`);
  }
  if (extra.length > 0) {
    lines.push('');
    lines.push(`**Unexpected months (outside expected range)**: ${extra.length}`);
    lines.push('');
    lines.push('| Month | Source |');
    lines.push('|-------|--------|');
    for (const m of extra) {
      const sources = present.get(m).map((s) => `${s.subdir}/${s.file}`).join(', ');
      lines.push(`| ${m} | ${sources} |`);
    }
  }
  lines.push('');
  return lines.join('\n');
}

function renderPerMonthTable(allMonthEntries) {
  const lines = ['## 3. Per-Month Summary', ''];
  if (allMonthEntries.length === 0) {
    lines.push('_No monthly movement files found._');
    lines.push('');
    return lines.join('\n');
  }

  lines.push('| Month | Source | Movements | Income | Expense | Net | Needs Review |');
  lines.push('|-------|--------|----------:|-------:|--------:|----:|-------------:|');

  const sorted = [...allMonthEntries]
    .filter((e) => e.monthKey)
    .sort((a, b) => a.monthKey.localeCompare(b.monthKey));

  for (const entry of sorted) {
    const s = entry.summary;
    if (!s) {
      lines.push(`| ${entry.monthKey} | ${entry.subdir}/${entry.file} | — | — | — | — | — |`);
      continue;
    }
    const net = s.income - s.expense;
    lines.push(
      `| ${entry.monthKey} | ${entry.subdir}/${entry.file} | ${formatNumber(s.total)} | ${formatNumber(s.income)} | ${formatNumber(s.expense)} | ${formatNumber(net)} | ${formatNumber(s.needsReview)} |`,
    );
  }
  lines.push('');
  return lines.join('\n');
}

function renderAccountDistribution(globalAccountCounts) {
  const lines = ['## 4. Account Distribution', ''];
  if (globalAccountCounts.size === 0) {
    lines.push('_No accounts found._');
    lines.push('');
    return lines.join('\n');
  }
  const sorted = [...globalAccountCounts.entries()].sort((a, b) => b[1] - a[1]);
  lines.push('| Account | Movements |');
  lines.push('|---------|----------:|');
  for (const [acc, count] of sorted) {
    lines.push(`| ${acc} | ${formatNumber(count)} |`);
  }
  lines.push('');
  return lines.join('\n');
}

function renderQualityFlags(perDir, allMonthEntries) {
  const lines = ['## 5. Data Quality Flags', ''];

  const totals = {
    needsReview: 0,
    orphaned: 0,
    unknownAccount: 0,
    nullAccount: 0,
    nullDate: 0,
    largeAmount: 0,
    duplicates: [],
    largeSamples: [],
  };

  for (const subdir of SUBDIRS) {
    const data = perDir[subdir];
    if (!data.exists || !data.summary) continue;
    totals.needsReview += data.summary.needsReview;
    totals.orphaned += data.summary.orphaned;
    totals.unknownAccount += data.summary.unknownAccount;
    totals.nullAccount += data.summary.nullAccount;
    totals.nullDate += data.summary.nullDate;
    totals.largeAmount += data.summary.largeAmount;
    totals.duplicates.push(...data.summary.duplicates);
    totals.largeSamples.push(...data.summary.largeAmountSamples);
  }

  lines.push('| Flag | Count |');
  lines.push('|------|------:|');
  lines.push(`| \`needs_review: true\` | ${formatNumber(totals.needsReview)} |`);
  lines.push(`| \`is_orphaned: true\` | ${formatNumber(totals.orphaned)} |`);
  lines.push(`| \`account_name: "UNKNOWN"\` (literal placeholder) | ${formatNumber(totals.unknownAccount)} |`);
  lines.push(`| \`account_name\` is null/missing | ${formatNumber(totals.nullAccount)} |`);
  lines.push(`| Null \`date\` | ${formatNumber(totals.nullDate)} |`);
  lines.push(`| Amount > ${formatNumber(LARGE_AMOUNT_THRESHOLD)} COP | ${formatNumber(totals.largeAmount)} |`);
  lines.push(`| Duplicate keys (date+amount+description) | ${formatNumber(totals.duplicates.length)} |`);
  lines.push('');
  lines.push(
    '> Both `UNKNOWN` and null `account_name` indicate the source row could not be mapped — they need cleanup before upload.',
  );
  lines.push('');

  if (totals.duplicates.length > 0) {
    lines.push('### Duplicate samples (first 10)');
    lines.push('');
    lines.push('| Source | Key (date \\| amount \\| description) | Occurrences |');
    lines.push('|--------|-------------------------------------|------------:|');
    for (const dup of totals.duplicates.slice(0, 10)) {
      const safeKey = dup.key.replace(/\|/g, ' \\| ');
      lines.push(`| ${dup.source} | ${safeKey} | ${dup.count} |`);
    }
    if (totals.duplicates.length > 10) {
      lines.push('');
      lines.push(`_…and ${totals.duplicates.length - 10} more duplicate keys not shown._`);
    }
    lines.push('');
  }

  if (totals.largeSamples.length > 0) {
    lines.push('### Suspiciously large amount samples (first 10)');
    lines.push('');
    lines.push('| Source | Date | Amount | Description | Account | Sheet:Row |');
    lines.push('|--------|------|-------:|-------------|---------|-----------|');
    for (const s of totals.largeSamples.slice(0, 10)) {
      const desc = (s.description ?? '').toString().replace(/\|/g, '/').slice(0, 60);
      lines.push(
        `| ${s.source} | ${s.date ?? '—'} | ${formatNumber(s.amount)} | ${desc} | ${s.account_name ?? '—'} | ${s.source_sheet ?? '—'}:${s.source_row ?? '—'} |`,
      );
    }
    lines.push('');
  }

  return lines.join('\n');
}

function renderOverlapSection(allMonthEntries) {
  const lines = ['## 6. Overlap Detection', ''];
  const byMonth = new Map();
  for (const entry of allMonthEntries) {
    if (!entry.monthKey) continue;
    if (!byMonth.has(entry.monthKey)) byMonth.set(entry.monthKey, []);
    byMonth.get(entry.monthKey).push(entry);
  }

  const overlaps = [];
  for (const [monthKey, entries] of byMonth.entries()) {
    if (entries.length > 1) overlaps.push({ monthKey, entries });
  }
  overlaps.sort((a, b) => a.monthKey.localeCompare(b.monthKey));

  if (overlaps.length === 0) {
    lines.push('No month appears in more than one source directory. ✓');
    lines.push('');
    return lines.join('\n');
  }

  lines.push(`**${overlaps.length} month(s) have data from multiple source files:**`);
  lines.push('');
  lines.push('| Month | Sources | Total Movements |');
  lines.push('|-------|---------|----------------:|');
  for (const o of overlaps) {
    const sources = o.entries
      .map((e) => `${e.subdir}/${e.file} (${formatNumber(e.movementsCount)})`)
      .join(', ');
    const total = o.entries.reduce((acc, e) => acc + (e.movementsCount ?? 0), 0);
    lines.push(`| ${o.monthKey} | ${sources} | ${formatNumber(total)} |`);
  }
  lines.push('');
  return lines.join('\n');
}

function renderSnapshotsSection(snapshots) {
  const lines = ['## 7. Snapshot Timeline', ''];
  if (!snapshots.exists) {
    lines.push('_`snapshots/` directory not found — not yet extracted._');
    lines.push('');
    return lines.join('\n');
  }
  const valid = snapshots.snapshots.filter((s) => !s.error && s.date);
  if (valid.length === 0) {
    lines.push('_No snapshot records found._');
    lines.push('');
    return lines.join('\n');
  }

  valid.sort((a, b) => String(a.date).localeCompare(String(b.date)));

  lines.push('| Date | Total Value | Currency | Accounts | Confidence | Source File |');
  lines.push('|------|------------:|----------|---------:|------------|-------------|');
  for (const s of valid) {
    const conf = s.confidence ?? (s.derived === true ? 'derived' : s.derived === false ? 'reported' : '—');
    lines.push(
      `| ${s.date ?? '—'} | ${formatNumber(s.total_value ?? 0)} | ${s.currency ?? '—'} | ${formatNumber(s.accountCount ?? 0)} | ${conf} | ${s.file} |`,
    );
  }
  lines.push('');
  return lines.join('\n');
}

function renderGrandTotals(perDir, snapshots, allMonthEntries) {
  const lines = ['## 8. Grand Totals', ''];

  let totalMovements = 0;
  let totalIncome = 0;
  let totalExpense = 0;
  let earliest = null;
  let latest = null;

  for (const subdir of SUBDIRS) {
    const data = perDir[subdir];
    if (!data.exists || !data.summary) continue;
    totalMovements += data.summary.totalMovements;
    totalIncome += data.summary.income;
    totalExpense += data.summary.expense;
    if (data.summary.dateMin && (!earliest || data.summary.dateMin < earliest)) {
      earliest = data.summary.dateMin;
    }
    if (data.summary.dateMax && (!latest || data.summary.dateMax > latest)) {
      latest = data.summary.dateMax;
    }
  }

  const totalSnapshots = snapshots.exists
    ? snapshots.snapshots.filter((s) => !s.error).length
    : 0;
  const monthsCovered = new Set(allMonthEntries.filter((e) => e.monthKey).map((e) => e.monthKey)).size;

  lines.push('| Metric | Value |');
  lines.push('|--------|------:|');
  lines.push(`| Total movements extracted | ${formatNumber(totalMovements)} |`);
  lines.push(`| Total income (COP, raw amounts) | ${formatNumber(totalIncome)} |`);
  lines.push(`| Total expenses (COP, raw amounts) | ${formatNumber(totalExpense)} |`);
  lines.push(`| Net (income − expense) | ${formatNumber(totalIncome - totalExpense)} |`);
  lines.push(`| Total snapshots | ${formatNumber(totalSnapshots)} |`);
  lines.push(`| Months covered | ${formatNumber(monthsCovered)} |`);
  lines.push(`| Date range | ${earliest ?? '—'} → ${latest ?? '—'} |`);
  lines.push('');
  lines.push(
    '> **Note**: totals sum raw `amount` values across all currencies as-is (no FX conversion). Inspect the per-account distribution for non-COP entries when interpreting these numbers.',
  );
  lines.push('');
  return lines.join('\n');
}

function renderExtractionSummariesSection(perDir) {
  const lines = ['## 9. Extraction Summaries (raw)', ''];
  let any = false;
  for (const subdir of SUBDIRS) {
    const data = perDir[subdir];
    if (!data.exists || !data.extractionSummary) continue;
    any = true;
    lines.push(`### \`${subdir}/extraction-summary.json\``);
    lines.push('');
    lines.push('```json');
    lines.push(JSON.stringify(data.extractionSummary.content, null, 2));
    lines.push('```');
    lines.push('');
  }
  if (!any) {
    lines.push('_No `extraction-summary.json` files found._');
    lines.push('');
  }
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

function main() {
  if (!dirExists(OUTPUT_DIR)) {
    console.error(`[validate-all] output directory not found: ${OUTPUT_DIR}`);
    process.exit(1);
  }

  const perDir = {};
  for (const subdir of SUBDIRS) {
    perDir[subdir] = collectFromSubdir(subdir);
  }
  const snapshots = collectSnapshots();

  const allMonthEntries = [];
  for (const subdir of SUBDIRS) {
    const data = perDir[subdir];
    if (!data.exists) continue;
    for (const [key, entry] of Object.entries(data.byMonth)) {
      if (key.startsWith('__other:')) continue;
      allMonthEntries.push(entry);
    }
  }

  const globalAccountCounts = new Map();
  for (const subdir of SUBDIRS) {
    const data = perDir[subdir];
    if (!data.exists || !data.summary) continue;
    mergeAccountCounts(globalAccountCounts, data.summary.accountCounts);
  }

  const now = new Date();
  const sections = [
    renderHeader(now),
    renderInventorySection(perDir, snapshots),
    renderTimelineSection(allMonthEntries),
    renderPerMonthTable(allMonthEntries),
    renderAccountDistribution(globalAccountCounts),
    renderQualityFlags(perDir, allMonthEntries),
    renderOverlapSection(allMonthEntries),
    renderSnapshotsSection(snapshots),
    renderGrandTotals(perDir, snapshots, allMonthEntries),
    renderExtractionSummariesSection(perDir),
  ];

  const report = sections.join('\n');
  writeFileSync(REPORT_PATH, report, 'utf8');

  // Console summary so the user sees a heartbeat in the terminal too.
  let totalMovements = 0;
  for (const subdir of SUBDIRS) {
    const data = perDir[subdir];
    if (data.exists && data.summary) totalMovements += data.summary.totalMovements;
  }
  const totalSnapshots = snapshots.exists
    ? snapshots.snapshots.filter((s) => !s.error).length
    : 0;

  console.log(`[validate-all] wrote ${REPORT_PATH}`);
  console.log(
    `[validate-all] subdirs present: ${SUBDIRS.filter((s) => perDir[s].exists).join(', ') || '(none)'}` +
      `${snapshots.exists ? ', snapshots' : ''}`,
  );
  console.log(`[validate-all] total movements: ${formatNumber(totalMovements)}`);
  console.log(`[validate-all] total snapshots: ${formatNumber(totalSnapshots)}`);
}

main();
