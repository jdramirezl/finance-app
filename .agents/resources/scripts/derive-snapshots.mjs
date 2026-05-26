#!/usr/bin/env node
/**
 * Derive missing monthly net worth snapshots via proportional interpolation.
 *
 * Algorithm: For each gap between two known anchors, compute raw monthly net
 * flows (income - expense, excluding "reset" movements), then scale them so
 * the cumulative running total ends exactly at the next anchor.
 *
 * Reads:
 *   .agents/resources/output/{file1,file2,file3,file4}/movements-*.json
 *
 * Writes (NO database writes):
 *   .agents/resources/output/snapshots/derived-snapshots.json
 *   .agents/resources/output/snapshots/all-snapshots-combined.json
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = resolve(__dirname, '..', '..', '..');
const OUTPUT_DIR = join(REPO_ROOT, '.agents', 'resources', 'output');
const SNAPSHOTS_DIR = join(OUTPUT_DIR, 'snapshots');

// Anchors (Jan 2023 skipped per user request, Apr 2024 dropped as duplicate of Mar 2024).
const ANCHORS = [
  { date: '2023-02-28', value: 25991162 },
  { date: '2023-11-30', value: 36752896 },
  { date: '2023-12-31', value: 45386025 },
  { date: '2024-01-31', value: 49577895 },
  { date: '2024-02-29', value: 56798848 },
  { date: '2024-03-31', value: 60699264 },
  { date: '2024-05-31', value: 66586733 },
  { date: '2024-12-31', value: 89981035 },
  { date: '2025-08-31', value: 122166763 },
  { date: '2025-11-30', value: 150030925 },
];

function pad2(n) { return String(n).padStart(2, '0'); }

function endOfMonth(year, month) {
  // month is 1-indexed. Day 0 of next month = last day of current month.
  const d = new Date(Date.UTC(year, month, 0));
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}

function parseDate(s) {
  const [y, m, d] = s.split('-').map(Number);
  return { year: y, month: m, day: d };
}

/**
 * Months strictly after anchorStart through anchorEnd (inclusive of the end-anchor month).
 * Example: ('2024-03-31', '2024-05-31') -> [Apr 2024, May 2024]
 */
function getGapMonths(anchorStartDate, anchorEndDate) {
  const s = parseDate(anchorStartDate);
  const e = parseDate(anchorEndDate);
  const months = [];
  let y = s.year;
  let m = s.month + 1;
  if (m > 12) { y += 1; m = 1; }
  while (y < e.year || (y === e.year && m <= e.month)) {
    months.push({ year: y, month: m });
    m += 1;
    if (m > 12) { y += 1; m = 1; }
  }
  return months;
}

function movementFilePath(year, month) {
  const mm = pad2(month);
  if (year === 2023) return join(OUTPUT_DIR, 'file1', `movements-2023-${mm}.json`);
  if (year === 2024) return join(OUTPUT_DIR, 'file2', `movements-2024-${mm}.json`);
  if (year === 2025 && month <= 9) return join(OUTPUT_DIR, 'file3', `movements-2025-${mm}.json`);
  if (year === 2025 && month === 10) return join(OUTPUT_DIR, 'file4', 'movements-october.json');
  if (year === 2025 && month === 11) return join(OUTPUT_DIR, 'file4', 'movements-november.json');
  return null;
}

function computeNetFlow(year, month) {
  const path = movementFilePath(year, month);
  const result = {
    year, month,
    income: 0,
    expense: 0,
    netFlow: 0,
    movementCount: 0,
    excludedReset: 0,
    fileFound: false,
  };
  if (!path || !existsSync(path)) return result;
  result.fileFound = true;
  const data = JSON.parse(readFileSync(path, 'utf-8'));
  for (const mv of data) {
    const desc = (mv.description || '').toLowerCase();
    if (desc.includes('reset')) {
      result.excludedReset += 1;
      continue;
    }
    if (mv.type === 'income') {
      result.income += Number(mv.amount) || 0;
    } else if (mv.type === 'expense') {
      result.expense += Number(mv.amount) || 0;
    }
  }
  result.netFlow = result.income - result.expense;
  result.movementCount = data.length;
  return result;
}

// ---------------------------------------------------------------------------
// Main derivation loop
// ---------------------------------------------------------------------------

const derivedSnapshots = [];
const gapReports = [];

for (let i = 0; i < ANCHORS.length - 1; i += 1) {
  const anchorStart = ANCHORS[i];
  const anchorEnd = ANCHORS[i + 1];
  const gapMonths = getGapMonths(anchorStart.date, anchorEnd.date);

  // If anchors are consecutive months, no derivation needed.
  if (gapMonths.length <= 1) continue;

  const flows = gapMonths.map((gm) => computeNetFlow(gm.year, gm.month));
  const totalRawFlow = flows.reduce((sum, f) => sum + f.netFlow, 0);
  const actualDelta = anchorEnd.value - anchorStart.value;
  const scaleFactor = totalRawFlow !== 0 ? actualDelta / totalRawFlow : null;
  const evenSplit = actualDelta / flows.length;

  const gapLabel = `${anchorStart.date} to ${anchorEnd.date}`;
  let runningValue = anchorStart.value;

  const gapEntries = [];

  for (let j = 0; j < flows.length; j += 1) {
    const f = flows[j];
    const isLastMonth = j === flows.length - 1;
    const scaledFlow = scaleFactor !== null ? f.netFlow * scaleFactor : evenSplit;

    if (isLastMonth) {
      // Force exact match to absorb any floating-point residual.
      runningValue = anchorEnd.value;
      gapEntries.push({
        ...f,
        scaledFlow,
        runningValue,
        isAnchorEnd: true,
      });
      continue;
    }

    runningValue += scaledFlow;
    const date = endOfMonth(f.year, f.month);

    const snapshot = {
      date,
      total_value: Math.round(runningValue),
      currency: 'COP',
      confidence: 'derived',
      method: 'proportional_interpolation',
      gap: gapLabel,
      scale_factor: scaleFactor !== null ? Number(scaleFactor.toFixed(4)) : null,
      raw_monthly_flow: Math.round(f.netFlow),
      scaled_monthly_flow: Math.round(scaledFlow),
    };
    derivedSnapshots.push(snapshot);
    gapEntries.push({
      ...f,
      scaledFlow,
      runningValue,
      isAnchorEnd: false,
    });
  }

  gapReports.push({
    gapLabel,
    anchorStart,
    anchorEnd,
    actualDelta,
    totalRawFlow,
    scaleFactor,
    monthCount: flows.length,
    entries: gapEntries,
  });
}

// ---------------------------------------------------------------------------
// Write outputs
// ---------------------------------------------------------------------------

if (!existsSync(SNAPSHOTS_DIR)) mkdirSync(SNAPSHOTS_DIR, { recursive: true });

writeFileSync(
  join(SNAPSHOTS_DIR, 'derived-snapshots.json'),
  `${JSON.stringify(derivedSnapshots, null, 2)}\n`,
);

const combined = [
  ...ANCHORS.map((a) => ({
    date: a.date,
    total_value: a.value,
    currency: 'COP',
    source: 'anchor',
  })),
  ...derivedSnapshots.map((s) => ({
    date: s.date,
    total_value: s.total_value,
    currency: s.currency,
    source: 'derived',
    method: s.method,
    gap: s.gap,
    scale_factor: s.scale_factor,
    raw_monthly_flow: s.raw_monthly_flow,
    scaled_monthly_flow: s.scaled_monthly_flow,
  })),
].sort((a, b) => a.date.localeCompare(b.date));

writeFileSync(
  join(SNAPSHOTS_DIR, 'all-snapshots-combined.json'),
  `${JSON.stringify(combined, null, 2)}\n`,
);

// ---------------------------------------------------------------------------
// Console report: per-gap summary + full timeline table
// ---------------------------------------------------------------------------

function fmtCop(n) {
  return new Intl.NumberFormat('en-US').format(Math.round(n));
}

function fmtSigned(n) {
  const s = fmtCop(Math.abs(n));
  return n < 0 ? `-${s}` : `+${s}`;
}

console.log('\n=== Per-Gap Summary ===\n');
for (const g of gapReports) {
  console.log(`Gap: ${g.gapLabel}  (${g.monthCount} months)`);
  console.log(`  Start anchor: ${fmtCop(g.anchorStart.value)} COP`);
  console.log(`  End   anchor: ${fmtCop(g.anchorEnd.value)} COP`);
  console.log(`  Actual delta:    ${fmtSigned(g.actualDelta)} COP`);
  console.log(`  Total raw flow:  ${fmtSigned(g.totalRawFlow)} COP`);
  console.log(`  Scale factor:    ${g.scaleFactor === null ? 'null (even split)' : g.scaleFactor.toFixed(4)}`);
  console.log('');
  console.log('  Month       | File? | Movements | Reset excl. | Income           | Expense          | Raw net flow      | Scaled flow       | Running value');
  console.log('  ------------|-------|-----------|-------------|------------------|------------------|-------------------|-------------------|------------------');
  for (const e of g.entries) {
    const monthStr = `${e.year}-${pad2(e.month)}`;
    const fileMarker = e.fileFound ? ' yes ' : ' NO  ';
    const tag = e.isAnchorEnd ? ' [anchor]' : '';
    console.log(
      `  ${monthStr}     |${fileMarker}| ${String(e.movementCount).padStart(9)} | ${String(e.excludedReset).padStart(11)} | ${fmtCop(e.income).padStart(16)} | ${fmtCop(e.expense).padStart(16)} | ${fmtSigned(e.netFlow).padStart(17)} | ${fmtSigned(e.scaledFlow).padStart(17)} | ${fmtCop(e.runningValue).padStart(16)}${tag}`,
    );
  }
  console.log('');
}

console.log('\n=== Full Timeline (Feb 2023 – Nov 2025) ===\n');
console.log('Date        | Source   | Total value (COP)   | Method                          | Gap                            | Scale  | Raw flow            | Scaled flow');
console.log('------------|----------|---------------------|---------------------------------|--------------------------------|--------|---------------------|--------------------');
for (const row of combined) {
  const method = row.method ?? '';
  const gap = row.gap ?? '';
  const scale = row.scale_factor != null ? row.scale_factor.toFixed(4) : '';
  const raw = row.raw_monthly_flow != null ? fmtSigned(row.raw_monthly_flow) : '';
  const scaled = row.scaled_monthly_flow != null ? fmtSigned(row.scaled_monthly_flow) : '';
  console.log(
    `${row.date}  | ${row.source.padEnd(8)} | ${fmtCop(row.total_value).padStart(19)} | ${method.padEnd(31)} | ${gap.padEnd(30)} | ${scale.padStart(6)} | ${raw.padStart(19)} | ${scaled.padStart(19)}`,
  );
}

console.log(`\nTotals: ${ANCHORS.length} anchors, ${derivedSnapshots.length} derived, ${combined.length} months in timeline`);
console.log(`\nOutput files:`);
console.log(`  ${join(SNAPSHOTS_DIR, 'derived-snapshots.json')}`);
console.log(`  ${join(SNAPSHOTS_DIR, 'all-snapshots-combined.json')}`);

// Sanity: verify each gap's last derived month + anchor_end matches via running totals.
let sanityOk = true;
for (const g of gapReports) {
  const finalRunning = g.entries[g.entries.length - 1].runningValue;
  if (finalRunning !== g.anchorEnd.value) {
    console.log(`SANITY FAIL: ${g.gapLabel} final running ${finalRunning} != anchor ${g.anchorEnd.value}`);
    sanityOk = false;
  }
}
console.log(`\nSanity check (running total hits each end-anchor): ${sanityOk ? 'PASS' : 'FAIL'}`);
