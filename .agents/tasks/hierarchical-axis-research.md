# Hierarchical/Adaptive Axis Labeling in ECharts

## Summary

The current net worth chart uses a `time` type xAxis with a simple `makeXAxisFormatter` that switches between three formats based on `visibleCount`. This works but lacks hierarchical context (no year boundary markers, no multi-level labeling). ECharts does NOT have built-in hierarchical time axis labeling — we need a custom formatter. The recommended approach is to stay with `type: 'time'` and replace the formatter with a zoom-aware function that uses rich text to render two-level labels (month + year boundary markers).

---

## 1. Current Implementation Analysis

### What exists

In `NetWorthEChart.tsx`, the axis labeling system consists of:

**State tracking:**
```typescript
const [zoomRange, setZoomRange] = useState<{ start: number; end: number }>(...);
```
Updated by the `datazoom` event handler (`handleDataZoom`), which fires on slider drag or inside-zoom (scroll/pinch).

**Visible count derivation:**
```typescript
const visibleCount = useMemo(() => {
    const fraction = (zoomRange.end - zoomRange.start) / 100;
    return Math.max(1, Math.round(data.length * fraction));
}, [data.length, zoomRange.start, zoomRange.end]);
```

**The formatter factory:**
```typescript
const makeXAxisFormatter = (visibleCount: number) => {
    if (visibleCount > 20) {
        return (timestamp: number) => String(new Date(timestamp).getUTCFullYear());
    }
    if (visibleCount > 8) {
        return (timestamp: number) =>
            new Date(timestamp).toLocaleString('en-US', { month: 'short', timeZone: 'UTC' });
    }
    return (timestamp: number) =>
        new Date(timestamp).toLocaleString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
};
```

**Axis config:**
```typescript
xAxis: {
    type: 'time',
    axisLabel: {
        color: '#9ca3af',
        fontSize: 11,
        hideOverlap: true,
        formatter: xAxisFormatter,
    },
    ...
}
```

### What's wrong

1. **No hierarchical context**: When showing months ("Jan", "Feb"), there's no year indicator. The user can't tell if "Jan" is 2024 or 2025.
2. **Abrupt transitions**: The formatter switches between three discrete modes with no boundary markers at transitions.
3. **Year-only mode is too sparse**: At >20 points, showing only years means many ticks show the same "2024" label repeatedly (ECharts `hideOverlap` hides duplicates, but the remaining labels are unevenly spaced).
4. **No visual year separators**: No vertical lines or styling changes at year boundaries to help orient the user.

---

## 2. ECharts Capabilities for This Use Case

### 2.1 `time` axis vs `category` axis

| Feature | `type: 'time'` | `type: 'category'` |
|---------|----------------|---------------------|
| Auto tick placement | ✅ ECharts picks nice intervals | ❌ One tick per data point |
| Handles irregular spacing | ✅ Proportional to actual dates | ❌ Equal spacing regardless of gaps |
| `hideOverlap` | ✅ Works well | ✅ Works |
| Custom formatter | ✅ Receives timestamp (number) | ✅ Receives category string + index |
| Data format | `[date, value]` tuples | Separate `xAxis.data` array |
| DataZoom behavior | ✅ Smooth, proportional | ⚠️ Snaps to data points |

**Verdict: Stay with `type: 'time'`**. The chart already uses it, it handles irregular snapshot spacing correctly, and the formatter receives a timestamp which is easy to work with. Switching to `category` would regress the proportional spacing behavior.

### 2.2 Built-in hierarchical support

**ECharts does NOT have built-in hierarchical/multi-level time axis labeling.** Unlike Highcharts (which has `dateTimeLabelFormats` with automatic level switching), ECharts requires manual implementation via:

1. **Custom `axisLabel.formatter`** — the primary mechanism
2. **Rich text in axis labels** — for multi-style labels
3. **Multiple xAxis instances** — for true two-row labels (heavyweight)

### 2.3 Rich text in axis labels

ECharts supports rich text formatting in axis label formatters. The formatter can return a string with `{styleName|text}` syntax:

```typescript
axisLabel: {
    formatter: (timestamp: number) => {
        const d = new Date(timestamp);
        if (d.getUTCMonth() === 0) {
            return `{month|Jan}\n{year|${d.getUTCFullYear()}}`;
        }
        return `{month|${monthName}}`;
    },
    rich: {
        month: { color: '#9ca3af', fontSize: 11 },
        year: { color: '#e5e7eb', fontSize: 10, fontWeight: 'bold' },
    },
}
```

**Key constraint**: Rich text in axis labels works, but `\n` for newlines in axis labels is supported. This enables two-line labels where the year appears below the month at January boundaries.

### 2.4 markLine for year boundary lines

`markLine` is bound to a **series**, not to the axis. For vertical lines at year boundaries on a time axis:

```typescript
series: [{
    ...,
    markLine: {
        silent: true,
        symbol: 'none',
        lineStyle: { color: '#4b5563', type: 'dashed', width: 1 },
        data: yearBoundaries.map(dateStr => [
            { xAxis: dateStr, yAxis: 'min' },
            { xAxis: dateStr, yAxis: 'max' },
        ]),
    },
}]
```

Alternatively, `xAxis.splitLine` with a custom `interval` function can draw lines at specific ticks, but it only draws at tick positions that ECharts auto-generates — not at arbitrary dates.

### 2.5 Hiding labels (returning empty string)

When the formatter returns `''` (empty string), ECharts still reserves space for that tick. To truly hide a label, return `''` and rely on `hideOverlap: true` to collapse the empty space. In practice, for a `time` axis, ECharts auto-selects which ticks to show, so the formatter is called only for ticks that ECharts already decided to display.

**Important**: With `type: 'time'`, ECharts controls which timestamps get labels. The formatter doesn't decide *which* labels to show — it decides *how* to format the ones ECharts chose. This is different from `category` where every data point is a potential tick.

---

## 3. Recommended Approach

### Strategy: Zoom-aware formatter with rich text + markLine year separators

Stay with `type: 'time'`. Replace `makeXAxisFormatter` with a hierarchical formatter that:
1. Uses `visibleCount` to determine the primary unit
2. Detects year boundaries and renders them with distinct styling
3. Uses rich text for two-level labels at boundary points

### Code sketch

```typescript
/**
 * Build a hierarchical xAxis formatter. Returns a formatter function
 * and a `rich` style map for the axisLabel config.
 *
 * Levels:
 *   ≤8 visible:  "Jan 31" (full date), year shown at Jan 1 boundaries
 *   9-18 visible: "Jan", "Feb" (month), year shown at January
 *   >18 visible:  year only at January boundaries, skip others
 */
const makeHierarchicalFormatter = (visibleCount: number) => {
    const rich = {
        primary: { color: '#9ca3af', fontSize: 11 },
        boundary: { color: '#d1d5db', fontSize: 10, fontWeight: 'bold' as const },
    };

    const formatter = (timestamp: number): string => {
        const d = new Date(timestamp);
        const month = d.getUTCMonth(); // 0-indexed
        const day = d.getUTCDate();
        const year = d.getUTCFullYear();
        const monthStr = d.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' });

        if (visibleCount <= 8) {
            // Full date mode: "Jan 31" with year below at January
            const label = `${monthStr} ${day}`;
            if (month === 0 && day <= 15) {
                return `{primary|${label}}\n{boundary|${year}}`;
            }
            return `{primary|${label}}`;
        }

        if (visibleCount <= 18) {
            // Month mode: "Jan" with year below at January
            if (month === 0) {
                return `{primary|${monthStr}}\n{boundary|${year}}`;
            }
            return `{primary|${monthStr}}`;
        }

        // Sparse mode: only show year labels
        // ECharts time axis will auto-pick tick positions;
        // we show the year for any tick that falls in January,
        // and abbreviated year for others to avoid blank axis
        if (month === 0) {
            return `{boundary|${year}}`;
        }
        // For non-January ticks at this zoom level, show nothing
        // (ECharts hideOverlap will handle the rest)
        return '';
    };

    return { formatter, rich };
};
```

### Integration into the option builder

```typescript
const { formatter: xAxisFormatter, rich: xAxisRich } = makeHierarchicalFormatter(visibleCount);

// In the option:
xAxis: {
    type: 'time',
    axisLabel: {
        color: '#9ca3af',
        fontSize: 11,
        hideOverlap: true,
        formatter: xAxisFormatter,
        rich: xAxisRich,
    },
    ...
}
```

### Year boundary markLines

Compute year boundaries from the visible data range and add them to the first series:

```typescript
const yearBoundaryDates = useMemo(() => {
    if (data.length < 2) return [];
    const firstYear = new Date(data[0].date).getUTCFullYear();
    const lastYear = new Date(data[data.length - 1].date).getUTCFullYear();
    const boundaries: string[] = [];
    for (let y = firstYear + 1; y <= lastYear; y++) {
        boundaries.push(`${y}-01-01`);
    }
    return boundaries;
}, [data]);

// In the first series:
markLine: {
    silent: true,
    symbol: 'none',
    label: { show: false },
    lineStyle: {
        color: '#374151',
        type: 'dashed',
        width: 1,
        opacity: 0.6,
    },
    data: yearBoundaryDates.map(d => ({ xAxis: d })),
}
```

**Note**: For `markLine` with `type: 'time'` axis, using `{ xAxis: '2025-01-01' }` as a single-point entry draws a vertical line at that x position. The two-point syntax (`[{xAxis, yAxis: 0}, {xAxis, yAxis: 'max'}]`) is needed only for category axes.

---

## 4. Edge Cases

### Single year of data
- All points in 2024: no year boundaries exist, no boundary markers shown
- Month labels work normally at medium zoom, full dates at close zoom
- The formatter gracefully degrades — no January boundary = no year label

### All data in same month
- Very close zoom: shows "Jan 15", "Jan 22", etc.
- No month boundaries to mark
- Works fine with the full-date mode (≤8 points)

### Data spanning many years (5+)
- At full zoom-out (>18 visible): only year labels at January ticks
- ECharts `hideOverlap` prevents crowding
- markLine separators help visually distinguish years

### Sparse data (few points spread over years)
- `visibleCount` may be low even at full zoom-out
- E.g., 6 snapshots over 3 years → full-date mode with year boundaries
- This is correct behavior — few points means space for detailed labels

### Year boundary falls between data points
- markLine at "2025-01-01" still renders correctly on a time axis even if no data point exists at that exact date
- The formatter only runs on ticks ECharts generates, so if no tick lands on January, no year label appears — but the markLine still shows the boundary

### First data point is in January
- The first label will show the year boundary marker
- This is desirable — it establishes the year context immediately

---

## 5. Recommendation: Stay with `time` axis + custom formatter

### Why NOT switch to `category`

1. **Already using `time`**: The chart already works with `type: 'time'` and `[date, value]` tuples
2. **Proportional spacing**: Time axis correctly spaces irregular snapshots (e.g., 3 snapshots in January, none in February, 2 in March)
3. **DataZoom behavior**: Time axis gives smooth proportional zooming; category would snap to discrete points
4. **Auto tick selection**: ECharts picks sensible tick positions on time axes, avoiding the need to manually decide which labels to show/hide

### Why NOT use a second xAxis for the year row

1. **Complexity**: Requires a hidden series bound to the second axis, manual positioning, and careful sync with dataZoom
2. **Fragile**: Two axes must stay aligned during zoom/resize
3. **Overkill**: Rich text `\n` in the formatter achieves the two-level effect with zero extra components

### Final recommendation

**Use the single `time` axis with a hierarchical rich-text formatter + markLine year separators.** This is:
- Minimal code change (replace one function, add `rich` config and `markLine`)
- Leverages ECharts' built-in tick selection and `hideOverlap`
- Provides clear hierarchical context at all zoom levels
- Handles all edge cases gracefully

### Implementation checklist

1. Replace `makeXAxisFormatter` with `makeHierarchicalFormatter`
2. Add `rich` property to `axisLabel` config
3. Compute `yearBoundaryDates` from data
4. Add `markLine` to the first series (total mode) or all series (breakdown mode)
5. Import `MarkLineComponent` from `echarts/components` and register it
6. Test at various zoom levels with data spanning 1 year, 2-3 years, and 5+ years

---

## Sources

- ⚠️ External link — [ECharts Rich Text Documentation](https://echarts.apache.org/handbook/en/how-to/label/rich-text) — accessed 2026-05-25
- ⚠️ External link — [ECharts Axis Concepts](https://echarts.apache.org/handbook/en/concepts/axis) — accessed 2026-05-25
- ⚠️ External link — [SO: Vertical markLine on time axis](https://stackoverflow.com/questions/64101579/echarts-unable-to-create-a-vertical-marker-line-on-time-axis-xaxis) — accessed 2026-05-25
- ⚠️ External link — [SO: Multi-level x-axis in ECharts](https://stackoverflow.com/questions/54747934/how-to-set-multi-level-x-axis-in-echarts) — accessed 2026-05-25
- ⚠️ External link — [SO: Using time type on X axis](https://stackoverflow.com/questions/49763076/using-time-type-on-x-axis-of-echarts-for-timeseries-graphing) — accessed 2026-05-25
- Local source — `frontend/src/components/net-worth/NetWorthEChart.tsx` (branch `feature/net-worth-echarts-wave-1`)
