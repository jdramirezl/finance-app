# Hierarchical Axis Labeling — Coder Tasks

Reference: `.agents/tasks/hierarchical-axis-research.md`
Target file: `frontend/src/components/net-worth/NetWorthEChart.tsx`

---

### Task 1: Replace makeXAxisFormatter with hierarchical rich-text formatter

**File**: `frontend/src/components/net-worth/NetWorthEChart.tsx`
**What**: Replace the existing `makeXAxisFormatter` function with a new `makeHierarchicalFormatter` that returns both a formatter function and a `rich` style map. The formatter uses `visibleCount` thresholds (≤8, 9–18, >18) and renders year labels below month labels at January boundaries using ECharts `{styleName|text}\n{styleName|text}` rich-text syntax. Update the `xAxis.axisLabel` config in the option builder to spread the returned `rich` object alongside the formatter.
**Verify**: `npm run build` passes. At full zoom-out with multi-year data, January ticks show month + year on two lines; non-January ticks show month only. At close zoom, full dates appear with year below at January boundaries.
**Depends on**: none

---

### Task 2: Register MarkLineComponent and compute year boundary dates

**File**: `frontend/src/components/net-worth/NetWorthEChart.tsx`
**What**: Import `MarkLineComponent` from `echarts/components`, add it to the `echarts.use([...])` registration array, and add a `MarkLineComponentOption` to the `ComposeOption` union. Add a `yearBoundaryDates` useMemo that derives `YYYY-01-01` strings for every year boundary spanned by `data` (from firstYear+1 to lastYear). Returns empty array if data has fewer than 2 points or all points are in the same year.
**Verify**: `npm run build` passes. No visual change yet (markLine data not wired to series).
**Depends on**: none

---

### Task 3: Add markLine year separators to the chart series

**File**: `frontend/src/components/net-worth/NetWorthEChart.tsx`
**What**: Wire `yearBoundaryDates` into the first series (total mode) and the first series (breakdown mode) as a `markLine` config: `silent: true`, `symbol: 'none'`, `label: { show: false }`, dashed gray lines (`color: '#374151'`, `opacity: 0.6`). Each boundary becomes `{ xAxis: dateString }`.
**Verify**: `npm run build` passes. With data spanning 2+ years, dashed vertical lines appear at January 1st of each intermediate year. Lines disappear when all data is within a single year.
**Depends on**: Task 2

---

### Task 4: Handle edge cases and tune thresholds

**File**: `frontend/src/components/net-worth/NetWorthEChart.tsx`
**What**: In the hierarchical formatter from Task 1, handle: (1) single data point — return full date with year always shown, (2) all data in same year — never render the year-boundary second line (already implicit but add a guard comment), (3) in sparse mode (>18), return empty string for non-January ticks so `hideOverlap` collapses them cleanly. Adjust the threshold from `> 20` to `> 18` to match the research recommendation (aligning both the formatter and the existing `DOT_VISIBILITY_THRESHOLD` neighborhood).
**Verify**: `npm run build` passes. Single-point chart shows full date with year. Multi-year chart at max zoom-out shows only year labels at January positions with no stray month labels.
**Depends on**: Task 1
