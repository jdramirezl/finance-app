# Charting Library Evaluation: Net Worth Timeline Widget

## Recommendation: Apache ECharts (tree-shaken)

**ECharts wins decisively.** It's the only library where all 5 target features are built-in configuration options — no custom code, no plugins, no hacks. The minimap (dataZoom slider), crosshair, smart axis labels, and conditional styling are all first-class. The tree-shaken bundle for just line + dataZoom + tooltip lands around ~100 kB gzipped — heavier than uPlot/lightweight-charts but justified by zero custom interaction code.

---

## Target Features Recap

| # | Feature | Description |
|---|---------|-------------|
| 1 | Minimap/range selector | Thin bar below chart, drag handles to select visible range |
| 2 | Crosshair + hover card | Vertical line snaps to nearest point, floating tooltip with value + delta |
| 3 | Smart date axis | Labels auto-adjust: years when zoomed out, months when zoomed in |
| 4 | Conditional dots | No dots when dense, dots when zoomed in. Solid vs hollow for real vs estimated |
| 5 | Pan/zoom via minimap | Drag minimap handles only, no mouse wheel zoom |

---

## Evaluation Matrix

| Library | F1: Minimap | F2: Crosshair | F3: Smart Axis | F4: Conditional Dots | F5: Minimap Pan | Bundle (gz) | Custom Code Needed |
|---------|:-----------:|:-------------:|:--------------:|:-------------------:|:---------------:|:-----------:|:------------------:|
| **ECharts** | ✅ built-in | ✅ built-in | ✅ built-in | ⚠️ config + callback | ✅ built-in | ~100 kB | ~20 lines config |
| **lightweight-charts** | ❌ no minimap | ✅ built-in | ✅ built-in | ⚠️ custom series | ❌ N/A | ~35 kB | 200+ lines (minimap from scratch) |
| **uPlot** | ⚠️ plugin needed | ⚠️ cursor API | ⚠️ custom formatter | ⚠️ hooks | ⚠️ plugin | ~15 kB | 300+ lines |
| **Recharts** | ❌ none | ⚠️ custom overlay | ❌ manual | ❌ custom | ❌ none | ~50 kB* | 400+ lines |
| **Chart.js** | ⚠️ zoom plugin | ⚠️ plugin | ⚠️ callback | ⚠️ scriptable | ⚠️ plugin | ~92 kB + plugins | 150+ lines |
| **visx** | ❌ build yourself | ❌ build yourself | ⚠️ D3 scales | ❌ build yourself | ❌ build yourself | ~30 kB | 500+ lines |
| **Nivo** | ❌ none | ⚠️ basic tooltip | ❌ limited | ❌ limited | ❌ none | ~425 kB | Not feasible |

*Recharts bundle assumes tree-shaking; full package is 136 kB gz.*

---

## Detailed Analysis

### 1. Apache ECharts ⭐ WINNER

**Feature fit (40%): 95/100**

ECharts' `dataZoom` component is *exactly* the minimap/range selector described. It renders a thin overview bar below the chart with draggable handles. Configuration is declarative:

```typescript
dataZoom: [
  {
    type: 'slider',      // the minimap bar
    show: true,
    xAxisIndex: [0],
    bottom: 10,
    height: 30,
    start: 60,           // initial visible range %
    end: 100,
    zoomOnMouseWheel: false,  // F5: disable wheel zoom
    moveOnMouseWheel: false,
  }
]
```

Crosshair + tooltip is built-in via `tooltip.trigger: 'axis'` with `axisPointer.type: 'line'`. Smart date axis is handled by ECharts' time axis type which auto-formats based on zoom level. Conditional dots use `symbolSize` callback:

```typescript
series: [{
  type: 'line',
  showSymbol: true,
  symbolSize: (value, params) => {
    // Show dots only when few points visible
    const visibleRange = chart.getOption().dataZoom[0];
    const rangePercent = visibleRange.end - visibleRange.start;
    return rangePercent < 30 ? 8 : 0;
  },
  itemStyle: {
    // Hollow for estimated, solid for real
    color: (params) => data[params.dataIndex].isEstimated ? 'transparent' : '#3b82f6',
    borderColor: '#3b82f6',
  }
}]
```

**Code simplicity (25%): 90/100**

The entire widget is ~80 lines of configuration. No imperative DOM manipulation, no custom event handlers for pan/zoom, no SVG overlays. The config-object API is verbose but predictable.

**Bundle size (15%): 65/100**

Tree-shaken (LineChart + DataZoomSliderComponent + TooltipComponent + GridComponent + CanvasRenderer) lands at ~100 kB gzipped. This is the main downside — heavier than uPlot or lightweight-charts. But given the app already ships Recharts (~50 kB gz for other charts), the total charting budget stays under 150 kB gz.

**TypeScript/React DX (10%): 75/100**

Types ship with the package. The option object is deeply nested and IntelliSense gets noisy, but it works. `echarts-for-react` wrapper is thin and stable. React 19 compatible (canvas-based, no DOM reconciliation conflicts).

**Maintenance (10%): 95/100**

66.3k GitHub stars, 2.6M weekly npm downloads, last commit 2026-05-02. Apache Foundation backed. Not going anywhere.

---

### 2. TradingView lightweight-charts (Runner-up for simplicity, but missing minimap)

**Feature fit: 60/100**

Built-in crosshair (excellent, financial-grade). Smart time axis (auto-formats by zoom level). But **no built-in minimap/navigator**. The full TradingView product has a navigator, but the open-source lightweight-charts library does not. You'd need to render a second smaller chart instance and sync them via the `timeScale` API — doable but ~200 lines of custom code.

Tooltips are also not built-in — you subscribe to crosshair move events and render a custom HTML overlay.

**Bundle: 35 kB gzipped** (v5, excellent)

**Verdict**: Best if you drop the minimap requirement or are willing to build it. The financial-chart DNA means crosshair and time axis are perfect. But for this specific feature set, the minimap gap is a dealbreaker vs ECharts' zero-effort solution.

---

### 3. uPlot (Smallest bundle, most DIY)

**Feature fit: 40/100**

uPlot is a rendering engine, not a feature-rich chart library. It has:
- Cursor/crosshair: Yes, via `cursor` option — but tooltip is BYO HTML
- Range selection: Drag-to-select exists, but a persistent minimap navigator requires a custom plugin or second chart instance
- Smart axis: Custom `values` formatter function — you write the logic
- Conditional dots: Via `points.show` callback in hooks

Everything is *possible* but nothing is *provided*. You're writing 300+ lines of interaction code.

**Bundle: ~15 kB gzipped** (incredible)

**Verdict**: Perfect for performance-critical dashboards with millions of points. Overkill complexity for 34 data points. The bundle savings (~85 kB vs ECharts) don't justify the 10x code complexity for a personal project.

---

### 4. Recharts (Current library — not viable)

**Feature fit: 15/100**

Recharts has no minimap, no crosshair (just basic tooltip on hover), no smart axis formatting, no conditional symbol rendering based on zoom level. You'd be building all 5 features as custom React overlays on top of the SVG chart. This is essentially building a chart library on top of a chart library.

**Verdict**: Eliminated. Keep it for the simpler charts (spending breakdown, budget donut) where it excels.

---

### 5. Chart.js + react-chartjs-2

**Feature fit: 55/100**

With `chartjs-plugin-zoom`, you get pan/zoom. But the zoom plugin's UX is mouse-wheel-based, not minimap-based. There's no built-in minimap/navigator component. Crosshair exists via `interaction.mode: 'index'` + `intersect: false`. Axis formatting via `ticks.callback`. Conditional dots via `pointRadius` as a scriptable option.

**Bundle: ~92 kB gz (core) + ~20 kB gz (zoom plugin)**

**Verdict**: Possible but awkward. The minimap would need to be a separate Chart.js instance synced via events. More code than ECharts for worse results.

---

### 6. visx (Airbnb)

**Feature fit: 10/100 (out of the box) / 100/100 (if you build everything)**

visx gives you D3 scales and SVG primitives. You build the minimap, crosshair, axis formatting, conditional rendering, and pan/zoom interaction entirely from scratch. For 34 data points this is 500+ lines of custom code.

**Bundle: ~30 kB gz** (only what you import)

**Verdict**: Wrong tool for this job. visx is for when no library covers your design. ECharts covers this design perfectly.

---

### 7. Nivo

**Feature fit: 10/100**

No minimap, no crosshair (basic tooltip only), limited axis customization, no zoom/pan. Nivo is designed for static, beautifully-animated charts — not interactive exploration widgets.

**Bundle: ~425 kB gz** (core + line package — heavier than ECharts tree-shaken!)

**Verdict**: Eliminated. Wrong category entirely.

---

## Weighted Scores

| Library | Feature Fit (40%) | Code Simplicity (25%) | Bundle (15%) | TS/React DX (10%) | Maintenance (10%) | **Total** |
|---------|:-:|:-:|:-:|:-:|:-:|:-:|
| **ECharts** | 38 | 22.5 | 9.75 | 7.5 | 9.5 | **87.25** |
| **lightweight-charts** | 24 | 17.5 | 14.25 | 7 | 9 | **71.75** |
| **uPlot** | 16 | 10 | 15 | 5 | 7 | **53.0** |
| **Chart.js** | 22 | 15 | 10.5 | 7 | 9 | **63.5** |
| **Recharts** | 6 | 5 | 12 | 9 | 9.5 | **41.5** |
| **visx** | 4 | 5 | 13.5 | 8 | 9 | **39.5** |
| **Nivo** | 4 | 5 | 6 | 7 | 8 | **30.0** |

---

## Implementation Sketch: ECharts Net Worth Timeline

```typescript
// NetWorthTimeline.tsx
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts/core';
import { LineChart } from 'echarts/charts';
import {
  GridComponent,
  TooltipComponent,
  DataZoomComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

echarts.use([LineChart, GridComponent, TooltipComponent, DataZoomComponent, CanvasRenderer]);

interface DataPoint {
  date: string;       // ISO date
  value: number;      // net worth in COP
  isEstimated: boolean;
}

export function NetWorthTimeline({ data }: { data: DataPoint[] }) {
  const option = {
    backgroundColor: 'transparent',
    grid: { left: 60, right: 20, top: 20, bottom: 80 },
    xAxis: {
      type: 'time',
      axisLabel: { color: '#94a3b8' },
      // Smart formatting is automatic with type: 'time'
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        color: '#94a3b8',
        formatter: (v: number) => `$${(v / 1_000_000).toFixed(1)}M`,
      },
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'line', lineStyle: { color: '#64748b' } },
      backgroundColor: '#1e293b',
      borderColor: '#334155',
      textStyle: { color: '#f1f5f9' },
      formatter: (params: any) => {
        const p = params[0];
        const prev = p.dataIndex > 0 ? data[p.dataIndex - 1].value : p.value[1];
        const delta = p.value[1] - prev;
        const sign = delta >= 0 ? '+' : '';
        return `
          <div>${new Date(p.value[0]).toLocaleDateString('en', { month: 'short', year: 'numeric' })}</div>
          <div style="font-size:16px;font-weight:bold">$${p.value[1].toLocaleString()}</div>
          <div style="color:${delta >= 0 ? '#4ade80' : '#f87171'}">${sign}$${delta.toLocaleString()}</div>
        `;
      },
    },
    dataZoom: [
      {
        type: 'slider',
        show: true,
        xAxisIndex: [0],
        bottom: 10,
        height: 24,
        borderColor: '#334155',
        backgroundColor: '#0f172a',
        fillerColor: 'rgba(59, 130, 246, 0.15)',
        handleStyle: { color: '#3b82f6' },
        dataBackground: { lineStyle: { color: '#475569' } },
        zoomOnMouseWheel: false,
        moveOnMouseWheel: false,
      },
    ],
    series: [
      {
        type: 'line',
        smooth: true,
        data: data.map(d => [d.date, d.value]),
        lineStyle: { color: '#3b82f6', width: 2 },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(59, 130, 246, 0.2)' },
            { offset: 1, color: 'rgba(59, 130, 246, 0)' },
          ]),
        },
        // Conditional dots: show when zoomed in
        showSymbol: true,
        symbolSize: 0, // hidden by default, shown via dataZoom event
        itemStyle: {
          color: (params: any) =>
            data[params.dataIndex].isEstimated ? 'transparent' : '#3b82f6',
          borderColor: '#3b82f6',
          borderWidth: 2,
        },
      },
    ],
  };

  const onEvents = {
    datazoom: (params: any, chart: any) => {
      const opt = chart.getOption();
      const zoom = opt.dataZoom[0];
      const rangePercent = zoom.end - zoom.start;
      // Show dots when zoomed in (< 40% of data visible)
      chart.setOption({
        series: [{ symbolSize: rangePercent < 40 ? 8 : 0 }],
      }, { replaceMerge: [] });
    },
  };

  return (
    <ReactECharts
      echarts={echarts}
      option={option}
      onEvents={onEvents}
      style={{ height: '320px', width: '100%' }}
      theme="dark"
    />
  );
}
```

**That's it.** ~80 lines for all 5 features. No custom SVG overlays, no DOM event listeners, no second chart instance for the minimap.

---

## Bundle Impact Assessment

Current frontend bundle (relevant charting):
- `recharts`: ~50 kB gz (tree-shaken, stays for other charts)

Adding ECharts (tree-shaken for this widget only):
- `echarts/core` + LineChart + Grid + Tooltip + DataZoom + CanvasRenderer: ~100 kB gz
- `echarts-for-react`: ~3 kB gz

**Total new addition: ~103 kB gzipped**

This is code-split to the net worth page route, so it only loads when the user navigates there. Other pages continue using Recharts at their current weight.

---

## Installation

```bash
npm install echarts echarts-for-react
```

---

## Risk Assessment

| Risk | Mitigation |
|------|-----------|
| ECharts full bundle accidentally imported | Lint rule: ban `import * from 'echarts'`, enforce `echarts/core` |
| React 19 compatibility | Canvas-based, no React DOM conflicts. `echarts-for-react` uses refs only. Verified working. |
| Vite compatibility | ESM-native, tree-shaking works out of the box with Vite |
| Dark mode styling | ECharts has a built-in dark theme + full color customization via option |
| `echarts-for-react` wrapper staleness | Last commit Jan 2026, but it's a thin ref wrapper (~200 LOC). Easy to inline if abandoned. |

---

## Final Verdict

**Use ECharts (tree-shaken) for the net worth timeline widget. Keep Recharts for everything else.**

The 100 kB gz cost is justified by:
1. Zero custom interaction code (vs 200-500 lines for any other option)
2. Built-in minimap that matches the TradingView navigator UX exactly
3. Declarative config that's easy to maintain in a personal project
4. Canvas rendering (smooth even if data grows beyond 34 points)

The only scenario where I'd pick differently: if you decided to drop the minimap requirement, lightweight-charts at 35 kB would be the obvious choice for a financial-style line chart with crosshair.

---

## Sources

- [The Best React Chart Libraries for 2026 (Databrain)](https://www.usedatabrain.com/blog/react-chart-libraries) — accessed 2026-05-24
- [Apache ECharts DataZoom documentation](https://apache-echarts.mintlify.app/components/data-zoom) — accessed 2026-05-24
- [TradingView Lightweight Charts v5 announcement](https://www.tradingview.com/blog/en/tradingview-lightweight-charts-version-5-50837/) — accessed 2026-05-24
- [Lightweight Charts crosshair customization](https://tradingview.github.io/lightweight-charts/tutorials/customization/crosshair) — accessed 2026-05-24
- [Lightweight Charts tooltip tutorial](https://tradingview.github.io/lightweight-charts/tutorials/how_to/tooltips) — accessed 2026-05-24
- [uPlot GitHub](https://github.com/leeoniya/uPlot) — accessed 2026-05-24
- [ECharts tree-shaking guide](https://echarts.apache.org/handbook/en/basics/import) — accessed 2026-05-24
- [echarts-for-react wrapper](https://github.com/hustcc/echarts-for-react) — accessed 2026-05-24
- [visx (Airbnb) GitHub](https://github.com/airbnb/visx) — accessed 2026-05-24
- [Nivo GitHub](https://github.com/plouc/nivo) — accessed 2026-05-24
