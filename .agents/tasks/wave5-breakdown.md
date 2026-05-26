# Wave 5: By Currency Migration + Cleanup

## Summary

Migrate "By Currency" (breakdown) mode from Recharts to ECharts, delete the old `NetWorthChart.tsx`, clean up the data hook, and update exports. Two coder tasks, sequential (Task 2 depends on Task 1).

---

## Dependency Analysis

### What imports `NetWorthChart.tsx`?
- `NetWorthTimelineWidget.tsx` — direct import, renders it for `viewMode === 'breakdown'`
- `index.ts` — re-exports it
- `__tests__/NetWorthChart.test.tsx` — test file (deleted with the component)
- `SummaryPage.tsx` — imports only `NetWorthTimelineWidget`, not `NetWorthChart` directly

### What from `useNetWorthChartData.ts` is still needed after deletion?

**KEEP** (used by `NetWorthTimelineWidget` and the new EChart):
- `useNetWorthChartData` hook itself (produces `chartData`, `currencies`)
- `NetWorthViewMode` type (used by widget's state)
- `NetWorthChartDatum` type (used by widget's `handlePointClick` and data mapping)
- `CURRENCY_LINE_COLORS` — move to EChart or keep in hook for shared access

**DELETE** (only used by old Recharts chart):
- `NetWorthTooltipFormatter` type — only consumed by `NetWorthChart.tsx`
- `NET_WORTH_TOTAL_LINE_NAME` constant — only used in tooltip formatter logic
- `CHART_CURRENCY_FORMAT_OPTIONS` constant — only used by old chart's YAxis and tooltip
- `tooltipFormatter` return value from the hook — ECharts builds its own tooltip
- `NetWorthDateRange` type — still used? Only by `filterByRange` internal to the hook, and the widget passes `'all'` always now. Can simplify but not urgent.
- Recharts `TooltipProps` import

**SIMPLIFY**:
- The hook's `tooltipFormatter` computation can be removed entirely (ECharts handles its own tooltip)
- The `filterByRange` function is still called but always with `'all'` — can be inlined or kept for future use

---

## Task 1: Add multi-series "By Currency" support to `NetWorthEChart`

**Goal**: Extend `NetWorthEChart` to accept multiple currency series and render them as colored lines with a legend and multi-series tooltip.

### Files to modify

| File | Action | ~Lines |
|------|--------|--------|
| `frontend/src/components/net-worth/NetWorthEChart.tsx` | Modify | +120 |
| `frontend/src/components/net-worth/NetWorthTimelineWidget.tsx` | Modify | +30, -15 |
| `frontend/src/components/net-worth/__tests__/NetWorthEChart.test.tsx` | Modify | +80 |

### What the coder needs to know

**New props for `NetWorthEChart`**:
```typescript
export interface NetWorthEChartDatum {
  date: string;
  total: number;
  snapshotId: string;
  fullDate: string;
  isAnchor?: boolean;
  // NEW: per-currency values (converted to primary currency)
  currencies?: Record<string, number>;
  // NEW: native (unconverted) values for tooltip display
  nativeValues?: Record<string, number>;
}

export interface NetWorthEChartProps {
  data: NetWorthEChartDatum[];
  primaryCurrency: string;
  showVariation: boolean;
  onPointClick: (datum: NetWorthEChartDatum) => void;
  height?: number;
  dataZoomStart?: number;
  dataZoomEnd?: number;
  // NEW:
  viewMode: 'total' | 'breakdown';
  currencies?: string[];  // which currency lines to render
}
```

**ECharts changes needed**:
1. Register `LegendComponent` in `echarts.use([...])` — needed for the currency legend
2. When `viewMode === 'breakdown'`:
   - Generate one `series` entry per currency (instead of single total line)
   - Each series uses color from `CURRENCY_LINE_COLORS` map (import or inline)
   - Series data: `data.map(d => [d.date, d.currencies?.[currency] ?? 0])`
   - Show legend at top
3. Tooltip formatter for breakdown mode:
   - Show date header
   - For each currency series at the hovered point: show converted value + native value in brackets
   - Example: `"USD: 45,000,000 COP [12,500 USD]"`
4. When `viewMode === 'total'`: existing behavior unchanged (single blue line, no legend)

**Color map** (same as current Recharts):
```typescript
const CURRENCY_LINE_COLORS: Record<string, string> = {
  USD: '#22c55e',
  EUR: '#3b82f6',
  GBP: '#a855f7',
  MXN: '#f97316',
  COP: '#eab308',
};
```

**Widget changes** (`NetWorthTimelineWidget.tsx`):
1. Update `echartData` mapping to include `currencies` and `nativeValues` fields from `chartData`
2. Replace the `NetWorthChart` render branch with `NetWorthEChart` passing `viewMode="breakdown"` and `currencies={currencies}`
3. Remove the `NetWorthChart` import
4. Remove `tooltipFormatter` from the `useNetWorthChartData` destructure (no longer needed)

**How `chartData` maps to the new datum shape**:
```typescript
// Current chartData in breakdown mode has shape:
// { date: "Jan 1", fullDate: "2026-01-01", snapshotId: "s1", total: 100000, USD: 45000000, USD_native: 12500, MXN: 30000000, MXN_native: 1500000 }

// Map to EChart datum:
const echartData = chartData.map(d => ({
  date: d.fullDate,
  total: d.total ?? 0,
  snapshotId: d.snapshotId,
  fullDate: d.fullDate,
  currencies: Object.fromEntries(
    currencies.map(c => [c, (d[c] as number) ?? 0])
  ),
  nativeValues: Object.fromEntries(
    currencies.map(c => [c, (d[`${c}_native`] as number) ?? 0])
  ),
}));
```

### Verification
- `npm run test -- --run frontend/src/components/net-worth/__tests__/NetWorthEChart.test.tsx`
- `npm run test -- --run frontend/src/components/net-worth/__tests__/NetWorthTimelineWidget.test.tsx`
- Manual: switch to "By Currency" tab, verify multiple colored lines appear with legend
- Manual: hover to see tooltip with converted + native values
- Manual: "Total" tab still works as before

---

## Task 2: Delete old Recharts chart + clean up hook + update exports

**Goal**: Remove `NetWorthChart.tsx`, strip Recharts-only logic from the hook, update exports and tests.

### Files to modify/delete

| File | Action | ~Lines |
|------|--------|--------|
| `frontend/src/components/net-worth/NetWorthChart.tsx` | **DELETE** | -130 |
| `frontend/src/components/net-worth/__tests__/NetWorthChart.test.tsx` | **DELETE** | -250 |
| `frontend/src/components/net-worth/index.ts` | Modify | -1 |
| `frontend/src/hooks/useNetWorthChartData.ts` | Modify | -60 |
| `frontend/src/hooks/__tests__/useNetWorthChartData.test.ts` | Modify | -20 |

### What the coder needs to know

**`index.ts` change**:
Remove line: `export { default as NetWorthChart } from './NetWorthChart';`

**`useNetWorthChartData.ts` cleanup**:
1. Remove `import type { TooltipProps } from 'recharts';`
2. Remove `NET_WORTH_TOTAL_LINE_NAME` export
3. Remove `CHART_CURRENCY_FORMAT_OPTIONS` export
4. Remove `NetWorthTooltipFormatter` type export
5. Remove `tooltipFormatter` from `UseNetWorthChartDataResult` interface
6. Remove the entire `tooltipFormatter` useMemo block (~40 lines)
7. Remove `tooltipFormatter` from the return object
8. Keep: `useNetWorthChartData`, `NetWorthViewMode`, `NetWorthDateRange`, `NetWorthChartDatum`, `CURRENCY_LINE_COLORS`, `filterByRange`, all the chart data computation logic

**`useNetWorthChartData.test.ts` cleanup**:
- Remove any assertions on `tooltipFormatter` in the result
- Keep all other tests (they test chartData computation which is still used)

**`NetWorthTimelineWidget.test.tsx`**:
- Remove the mock for `NetWorthChart` (the `vi.mock('../NetWorthChart', ...)` block)
- Remove any test that specifically asserts `data-chart-impl: 'recharts'`
- Update tests that click the breakdown chart to use the EChart mock instead

**Check `hooks/index.ts`**:
- Line `export * from './useNetWorthChartData';` stays (still exports useful types)
- Verify no other file imports the removed exports (`NET_WORTH_TOTAL_LINE_NAME`, `CHART_CURRENCY_FORMAT_OPTIONS`, `NetWorthTooltipFormatter`)

### Verification
- `npm run build` — no TypeScript errors, no dangling imports
- `npm run test -- --run frontend/src/hooks/__tests__/useNetWorthChartData.test.ts`
- `npm run test -- --run frontend/src/components/net-worth/__tests__/NetWorthTimelineWidget.test.tsx`
- `npm run test -- --run frontend/src/components/net-worth/__tests__/NetWorthEChart.test.tsx`
- Grep for `NetWorthChart` and `recharts` in `frontend/src/components/net-worth/` — should only appear in test mocks for EChart (if any) and nowhere in production code
- Grep for `CHART_CURRENCY_FORMAT_OPTIONS`, `NET_WORTH_TOTAL_LINE_NAME`, `NetWorthTooltipFormatter` — zero hits

---

## Execution Plan

| Order | Task | Agent scope | Depends on |
|-------|------|-------------|------------|
| 1 | Multi-series EChart + widget wiring | 3 files | None |
| 2 | Delete old chart + hook cleanup + exports | 5 files | Task 1 complete |

**Recommendation**: 2 sequential coder agents. Task 1 is the creative work (new ECharts series logic). Task 2 is mechanical deletion. Don't parallelize — Task 2 removes the import that Task 1 replaces.

---

## Risk Notes

- `CURRENCY_LINE_COLORS` is currently exported from the hook and used by `NetWorthChart.tsx`. After deletion, it's only used by the new EChart code. Can either keep it in the hook (cleaner separation) or move it into `NetWorthEChart.tsx`. Recommend keeping in hook since it's domain data, not chart-library-specific.
- The `formatCurrencyAmount` import in the hook is only used by the tooltip formatter. After removing the formatter, check if it's still needed (it's not — remove it).
- `date-fns` imports (`format`, `parseISO`, `subDays`, `subMonths`, `subYears`) are used by `filterByRange` which is still called. Keep them.
