# Variation % Mode — Bug Fix Plan

## Summary

Three related bugs in the Net Worth chart's "Show Variation (%)" mode stem from a single architectural issue: **variation percentages are pre-computed in the data hook using the first point of the filtered dataset as baseline, then passed to the EChart component as raw numbers**. The chart component has no awareness that these numbers represent percentages, and the baseline never updates when the user zooms/pans via the dataZoom minimap.

---

## Root Cause Analysis

### Bug 1: "By Currency" + Variation shows wrong values (tooltip says "0 COP" / "163 COP")

**Where it breaks**: `NetWorthEChart.tsx` — breakdown tooltip formatter (lines ~380-440)

**Root cause**: The breakdown tooltip formatter calls `formatBreakdownAmount(value, primaryCurrency)` which appends the currency code (e.g. `COP`). It has **no branch for `showVariation`** — it always formats as a currency amount. The total-mode formatter correctly checks `showVariation` and calls `formatTooltipValue` which returns `"X%"`, but the breakdown formatter was never updated for variation mode.

Additionally, when a currency's baseline value is 0 (USD/MXN had 0 in the earliest snapshots), the hook computes `((0 - 0) / |0|) * 100 = 0` (guarded by the `baseVal !== 0` check), so the tooltip shows "0 COP" instead of "N/A" or hiding the series.

### Bug 2: Baseline is first point in FULL dataset, not first VISIBLE point

**Where it breaks**: `useNetWorthChartData.ts` — variation calculation block (lines ~130-165)

**Root cause**: The hook computes variation using `processedSnapshots[0]` as baseline. Since Wave 4 changed the architecture to always fetch ALL data (`dateRange: 'all'`) and let the dataZoom handle windowing, `processedSnapshots[0]` is always the very first snapshot (Feb 2023). The hook has no knowledge of the current dataZoom window.

The correct behavior requires the **chart component** to compute variation dynamically based on the visible window, because only the chart knows the current `zoomRange.start` / `zoomRange.end`.

### Bug 3: Y-axis doesn't auto-scale to visible data

**Where it breaks**: `NetWorthEChart.tsx` — yAxis config

**Root cause**: ECharts DOES auto-scale by default when `dataZoom` is active — but only for the data within the visible window. The problem is that the variation values are pre-computed against the FULL dataset baseline, so even when zoomed to the last 3 months, the values are still "650%" to "720%" (relative to Feb 2023). If we fix Bug 2 (baseline = first visible point), the values within any window will naturally range from 0% to a small delta, and ECharts' default auto-scaling will show that tight range correctly.

**No explicit yAxis fix needed** — fixing Bug 2 fixes Bug 3 automatically.

---

## Architecture Decision: Where Should Variation Live?

### Current flow:
```
Hook (useNetWorthChartData) → pre-computes % → passes to EChart as `total` field
EChart receives data where `total` is already a percentage
```

### Problem with current flow:
The hook doesn't know the visible window. The dataZoom state lives in the EChart component.

### Correct flow:
```
Hook → passes RAW absolute values (no variation transform)
EChart → receives raw data + `showVariation` flag
EChart → on render/zoom, computes % relative to first VISIBLE point
EChart → feeds transformed data to the series
```

### Decision: **Move variation calculation INTO `NetWorthEChart.tsx`**

Reasons:
1. Only the chart knows the current `zoomRange` (start/end percentages)
2. ECharts' dataZoom works on indices — we can derive the first visible index from `zoomRange.start`
3. The tooltip formatter already has access to the full `data` array and `dataIndex`
4. This keeps the hook simple (just data fetching + currency conversion)

---

## The Algorithm: Window-Relative Variation

```typescript
// Inside NetWorthEChart, after receiving raw data:

// 1. Derive the first visible index from zoomRange
const firstVisibleIdx = Math.floor((zoomRange.start / 100) * (data.length - 1));
const clampedIdx = Math.max(0, Math.min(data.length - 1, firstVisibleIdx));

// 2. Get baseline value for each series
// Total mode: baseline = data[clampedIdx].total
// Breakdown mode: baseline per currency = currencyData[i].values[clampedIdx]

// 3. Transform data to percentages for the series
// For total: ((point.total - baseline) / |baseline|) * 100
// For breakdown currency C: ((values[i] - baselineC) / |baselineC|) * 100
// If baseline === 0: return null (ECharts skips null points gracefully)

// 4. Feed transformed data to series config
// 5. Tooltip formatter reads the transformed values and appends "%"
```

Key behaviors:
- When user zooms/pans, `zoomRange` state updates → `useMemo` recomputes → chart re-renders with new percentages
- First visible point always shows 0%
- Y-axis auto-scales to the actual visible range (which is now relative, e.g. -5% to +10%)
- Currencies with baseline 0 show as disconnected/hidden (null gaps)

---

## Task Breakdown

### Task 1: Remove variation pre-computation from the hook

**File**: `frontend/src/hooks/useNetWorthChartData.ts`

**Changes**:
- Remove the entire `if (showVariation && processedSnapshots.length > 0)` block
- The hook should ALWAYS return raw absolute values regardless of `showVariation`
- Keep the `showVariation` param in the interface (the widget still passes it to the chart)
- Remove `total_original` and `*_original` fields — no longer needed since raw values are always passed

**Verify**: Hook returns identical data whether `showVariation` is true or false. Existing tests for non-variation mode still pass.

---

### Task 2: Implement window-relative variation in the EChart component

**File**: `frontend/src/components/net-worth/NetWorthEChart.tsx`

**Changes**:
- Add a `useMemo` that derives `firstVisibleIndex` from `zoomRange.start` and `data.length`
- Add a `useMemo` that transforms `data` (and `currencyData`) into percentage values when `showVariation === true`:
  - Total mode: `transformedData[i].total = ((data[i].total - baseline) / |baseline|) * 100`
  - Breakdown mode: each currency's values array gets the same transform against its own baseline
  - Baseline = 0 → value becomes `null` (or `NaN` which ECharts treats as a gap)
- Use `transformedData` (or raw `data` when `!showVariation`) in the series config
- The `option` useMemo already depends on `zoomRange.start`/`zoomRange.end`, so it will recompute on zoom changes

**Verify**: 
- Toggle variation on → chart shows 0% at the left edge of the visible window
- Zoom/pan via minimap → percentages recalculate, first visible point resets to 0%
- Y-axis auto-scales to the visible percentage range

---

### Task 3: Fix breakdown tooltip formatter for variation mode

**File**: `frontend/src/components/net-worth/NetWorthEChart.tsx`

**Changes**:
- In the breakdown tooltip formatter (`isBreakdown` branch), check `showVariation`:
  - If true: format value as `"X.XX%"` instead of `formatBreakdownAmount(value, primaryCurrency)`
  - If true and value is null/NaN: show "N/A" for that currency row
  - Remove the native-value bracket suffix in variation mode (percentages don't have a "native" equivalent)
- Update the total-mode tooltip to handle the case where `datum.total` might be null (baseline-0 edge case)

**Verify**:
- "By Currency" + Variation → tooltip shows "USD: 12.34%" not "12 COP"
- Currency with 0 baseline → shows "N/A" instead of "0 COP" or "Infinity%"
- Total mode variation tooltip still shows "X.XX%" correctly

---

### Task 4: Handle edge cases for 0-baseline currencies in breakdown variation

**File**: `frontend/src/components/net-worth/NetWorthEChart.tsx`

**Changes**:
- When a currency's baseline is 0, its entire series should either:
  - Show as a gap (null values) until the first non-zero point, then use THAT as the baseline for subsequent points, OR
  - Be hidden entirely from the legend/chart in variation mode if ALL visible values are 0
- For the "first non-zero as baseline" approach: scan forward from `firstVisibleIdx` to find the first non-zero value for each currency, use that as the per-currency baseline
- Update legend to show "(from [date])" suffix when a currency's effective baseline differs from the window start

**Verify**:
- USD line doesn't show a flat 0% line for the period before the user had USD
- Once USD has a value, its variation starts from that point
- Tooltip for points before the currency existed shows "N/A"

---

## Verification Checklist

| Scenario | Expected |
|----------|----------|
| Total + Variation, zoomed to last 3 months | 0% at left edge, small range (e.g. -5% to +10%) |
| Total + Variation, full range | 0% at Feb 2023, large range to current |
| Breakdown + Variation | Each currency shows its own % relative to its own first visible value |
| Breakdown + Variation, USD before Feb 2024 | USD shows N/A or gap (baseline was 0) |
| Pan minimap left/right | Percentages recalculate, first visible = 0% |
| Zoom in tight (3 points visible) | Y-axis shows tight range, values readable |
| Toggle variation off | Chart reverts to absolute values immediately |
| Tooltip in breakdown + variation | Shows "USD: +5.23%" not "5 COP" |

---

## File Impact Summary

| File | Change Type |
|------|-------------|
| `useNetWorthChartData.ts` | Remove variation logic (simplification) |
| `NetWorthEChart.tsx` | Add variation computation + fix tooltip |
| `NetWorthTimelineWidget.tsx` | No changes needed (already passes `showVariation` to chart) |
