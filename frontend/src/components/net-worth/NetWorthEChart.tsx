/**
 * NetWorthEChart
 *
 * ECharts-based net-worth timeline chart.
 *
 * Wave 1: line series with a dataZoom minimap.
 * Wave 2: crosshair `axisPointer`, enhanced tooltip with formatted date
 *         and delta-from-previous-point, pointer cursor on the series.
 * Wave 3: zoom-aware xAxis label formatter, conditional dot visibility
 *         driven by visible-point count, and per-point `itemStyle` to
 *         distinguish anchor (real snapshot) vs derived (interpolated)
 *         points by solid-vs-hollow rendering.
 * Wave 5: optional `viewMode='breakdown'` + `currencyData` props that
 *         render one colored line per currency with a legend and a
 *         multi-row tooltip (converted value plus native amount in
 *         brackets for foreign currencies). Replaces the old Recharts
 *         "By Currency" chart.
 *
 * Tree-shaking: only the modules registered in `echarts.use([...])`
 * below are pulled into the bundle. The component intentionally imports
 * `echarts/core` (and registers individual sub-modules) instead of the
 * full `echarts` barrel.
 *
 * Note on `echarts-for-react`: the default `echarts-for-react` entry
 * eagerly bundles the full `echarts` package via `import * as echarts
 * from 'echarts'`, which defeats tree-shaking. The `/lib/core` entry
 * skips that bundled echarts and expects the consumer to inject a
 * tree-shaken `echarts` namespace via the `echarts={echarts}` prop.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ReactEChartsCore from 'echarts-for-react/lib/core';
import * as echarts from 'echarts/core';
import { LineChart, type LineSeriesOption } from 'echarts/charts';
import {
    GridComponent,
    type GridComponentOption,
    TooltipComponent,
    type TooltipComponentOption,
    DataZoomComponent,
    type DataZoomComponentOption,
    LegendComponent,
    type LegendComponentOption,
    MarkLineComponent,
    type MarkLineComponentOption,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import type { ComposeOption } from 'echarts/core';
// `CallbackDataParams` is not surfaced on the `echarts/core` entry, but
// `import type` is erased by the compiler under `verbatimModuleSyntax`,
// so this does not pull the full echarts barrel into the runtime bundle.
import type { DefaultLabelFormatterCallbackParams as CallbackDataParams } from 'echarts';

// Register only the components this chart needs. `LegendComponent` is
// registered alongside the rest so breakdown mode can render the
// per-currency legend without pulling in the full echarts barrel.
// `MarkLineComponent` is registered now so a future wave can draw
// year-boundary marker lines on the time axis without a follow-up
// registration change; it has no runtime effect until a series sets a
// `markLine` config.
echarts.use([
    LineChart,
    GridComponent,
    TooltipComponent,
    DataZoomComponent,
    LegendComponent,
    MarkLineComponent,
    CanvasRenderer,
]);

// Local type composed from just the modules we registered. Using
// `EChartsOption` from the full `echarts` barrel would still work
// (types are erased), but composing only what we need keeps editor
// IntelliSense focused on this chart's actual shape.
type ChartOption = ComposeOption<
    | LineSeriesOption
    | GridComponentOption
    | TooltipComponentOption
    | DataZoomComponentOption
    | LegendComponentOption
    | MarkLineComponentOption
>;

export interface NetWorthEChartDatum {
    /** ISO date string (e.g. "2023-02-28"). Parsed by ECharts time axis. */
    date: string;
    /**
     * Net worth value in `primaryCurrency`. Always a raw absolute
     * amount — variation-mode formatting (window-relative percentage
     * vs the first visible point) is computed inside the chart in the
     * `option` `useMemo` so panning/zooming can re-anchor the
     * baseline. Producers (the data hook) MUST pass raw amounts here
     * regardless of the `showVariation` UI toggle.
     */
    total: number;
    /** Snapshot id, used to resolve the source snapshot on point click. */
    snapshotId: string;
    /** ISO date string carried through so the click consumer can fall back
     *  to date-matching when ids drift (legacy snapshots). */
    fullDate: string;
    /**
     * Whether this point is a real snapshot (anchor) or an interpolated
     * value (derived). Anchors render as solid filled circles, derived
     * points as hollow rings. Defaults to `true` (treated as an anchor)
     * when omitted so call sites that don't yet know about derivation can
     * keep working unchanged.
     */
    isAnchor?: boolean;
}

export interface NetWorthEChartProps {
    data: NetWorthEChartDatum[];
    /**
     * The user's configured primary currency (USD, MXN, COP, EUR, GBP).
     * Used for tooltip suffix and Y-axis formatting in normal mode.
     */
    primaryCurrency: string;
    /**
     * When true, the chart renders each datum as a window-relative
     * percentage against the FIRST VISIBLE point per the current
     * dataZoom range, and the Y-axis switches to percent formatting.
     * The transform happens inside this component (not the data hook)
     * so the baseline can re-anchor when the user pans or zooms.
     */
    showVariation: boolean;
    /** Called with the full datum of the clicked point. */
    onPointClick: (datum: NetWorthEChartDatum) => void;
    /** Pixel height of the chart container. Defaults to 288 (Tailwind h-72). */
    height?: number;
    /**
     * Optional controlled start percentage (0–100) for the dataZoom
     * slider. When the parent provides a `dataZoomStart`/`dataZoomEnd`
     * pair (e.g. from the range chips), the chart syncs its slider to
     * that window on mount and on prop change. Internal user-driven
     * drags still work — they update the chart's internal zoom state
     * but do not propagate back to the parent.
     */
    dataZoomStart?: number;
    /** Optional controlled end percentage (0–100) for the dataZoom slider. */
    dataZoomEnd?: number;
    /**
     * Wave 5: which logical view to render.
     *   - `'total'` (default): a single line of the aggregate net worth.
     *   - `'breakdown'`: one colored line per currency in `currencyData`.
     * Defaults to `'total'` so existing call sites that don't pass it
     * keep their original behavior unchanged.
     */
    viewMode?: 'total' | 'breakdown';
    /**
     * Wave 5: per-currency series data, required when
     * `viewMode === 'breakdown'`. Each entry produces one line on the
     * chart aligned to the same x-axis (snapshot dates) as `data`.
     *
     * - `values` are the per-snapshot amounts converted to
     *   `primaryCurrency` (so they're comparable on a single Y-axis).
     * - `nativeValues` are the original unconverted amounts in the
     *   currency's own denomination, surfaced in the tooltip's bracket
     *   suffix for foreign currencies (e.g. `[178,862 MXN]`).
     * - `color` is the line and legend swatch color.
     *
     * Both `values` and `nativeValues` MUST be the same length as
     * `data`; the index maps directly to the snapshot at `data[i]`.
     */
    currencyData?: CurrencySeriesData[];
}

/**
 * Wave 5: input shape for one currency's series in breakdown mode.
 * Exported so call sites can build the array with type safety.
 */
export interface CurrencySeriesData {
    /** ISO currency code (e.g. `"USD"`, `"MXN"`). Used as series name and legend label. */
    currency: string;
    /** Per-snapshot amounts converted to the chart's primary currency. */
    values: number[];
    /** Per-snapshot amounts in the currency's native denomination. */
    nativeValues: number[];
    /** Line and legend swatch color (e.g. `"#22c55e"`). */
    color: string;
}

const DEFAULT_HEIGHT = 288;

/** Tailwind blue-500 — the primary line + anchor-dot color. */
const PRIMARY_COLOR = '#3b82f6';
/** Tailwind green-400 — positive delta. */
const DELTA_UP_COLOR = '#4ade80';
/** Tailwind red-400 — negative delta. */
const DELTA_DOWN_COLOR = '#f87171';
/** Symbol size when dots are visible. Hidden by setting size to 0. */
const VISIBLE_SYMBOL_SIZE = 6;
/**
 * Above this visible-point count, hide individual dots — the line
 * becomes too dense for them to read as discrete markers and they
 * visually clutter the chart.
 *
 * Sits between the xAxis close-zoom (8) and sparse-mode (18)
 * thresholds (see {@link makeHierarchicalFormatter}). Dots and tick
 * labels tolerate crowding differently: a 6px dot occupies more
 * horizontal space than a "Jan" label and reads as visual noise
 * sooner, so we hide them earlier than the axis collapses to
 * year-only labels. The three thresholds (8 / 12 / 18) are tuned
 * independently rather than aligned to a single value because they
 * govern different visual channels.
 */
const DOT_VISIBILITY_THRESHOLD = 12;

/**
 * Module-level plain-object gradient. ECharts accepts this shape natively
 * and it is JSON-serializable, so React's `useMemo` deep-equal checks and
 * `echarts-for-react`'s shouldUpdate path can compare it cheaply. Using a
 * `new echarts.graphic.LinearGradient(...)` instance inside the option
 * literal would allocate a fresh class instance on every render and
 * defeat that comparison.
 */
const AREA_GRADIENT = {
    type: 'linear' as const,
    x: 0,
    y: 0,
    x2: 0,
    y2: 1,
    colorStops: [
        { offset: 0, color: 'rgba(59, 130, 246, 0.3)' },
        { offset: 1, color: 'rgba(59, 130, 246, 0.02)' },
    ],
};

const formatCurrencyAxisTick = (value: number): string => {
    if (Math.abs(value) >= 1_000_000) {
        return `${(value / 1_000_000).toFixed(0)}M`;
    }
    if (Math.abs(value) >= 1_000) {
        return `${(value / 1_000).toFixed(0)}K`;
    }
    return value.toString();
};

const formatPercentAxisTick = (value: number): string =>
    `${value.toFixed(0)}%`;

const formatTooltipValue = (
    value: number,
    showVariation: boolean,
    primaryCurrency: string,
): string => {
    if (showVariation) {
        return `${value.toFixed(2)}%`;
    }
    if (Math.abs(value) >= 1_000_000) {
        return `${(value / 1_000_000).toFixed(2)}M ${primaryCurrency}`;
    }
    return `${value.toLocaleString()} ${primaryCurrency}`;
};

/**
 * Format a currency amount for the breakdown-mode tooltip rows.
 *
 * Uses thousands-separator locale formatting with no decimals (e.g.
 * `"68,296,200 COP"`, `"178,862 MXN"`) to match the example layout
 * documented for the "By Currency" tooltip. Unlike
 * {@link formatTooltipValue}, this does NOT collapse to `K`/`M`
 * suffixes — multi-currency rows stack vertically and benefit from
 * showing the full digit grouping so the user can compare magnitudes
 * across currencies at a glance.
 *
 * Note on rounding: the breakdown formatter `Math.round`s before
 * locale-formatting because the converted-to-primary values are
 * floating-point (post FX-conversion), and stacking three rows of
 * "12,345,678.001234" would create needless visual jitter as the
 * exchange rate fluctuates. Total mode keeps `toLocaleString()`
 * directly on the integer net-worth amount because there's only one
 * row and the digit precision is already meaningful.
 */
const formatBreakdownAmount = (value: number, currency: string): string => {
    const rounded = Math.round(value);
    return `${rounded.toLocaleString('en-US')} ${currency}`;
};

/**
 * Format a delta amount for display in the tooltip. The leading sign is
 * added by the caller so it can color-code positive vs negative,
 * keeping this formatter independent of color logic.
 *
 * In variation mode the underlying values are percentages, so the delta
 * is the change in percentage points. We render it with a `%` suffix.
 *
 * Currency mode uses K/M suffixes and intentionally omits the currency
 * code — the headline value above the delta already shows the currency,
 * and repeating it makes the tooltip noisy.
 */
const formatDeltaValue = (delta: number, showVariation: boolean): string => {
    const abs = Math.abs(delta);
    if (showVariation) {
        return `${abs.toFixed(2)}%`;
    }
    if (abs >= 1_000_000) {
        return `${(abs / 1_000_000).toFixed(1)}M`;
    }
    if (abs >= 1_000) {
        return `${(abs / 1_000).toFixed(1)}K`;
    }
    return abs.toFixed(0);
};

/**
 * Format an ISO `YYYY-MM-DD` date string as `MMM d, yyyy` (e.g.
 * "Oct 31, 2025") for the tooltip header. Uses UTC throughout so a
 * snapshot dated `2025-10-31` is never accidentally shifted into the
 * previous calendar day by the user's local timezone offset (this site
 * stores snapshot dates as plain calendar dates without a clock time).
 *
 * Falls back to returning the input verbatim if it doesn't match the
 * ISO shape — preferable to throwing in a tooltip-render path.
 */
const formatTooltipDate = (isoDate: string): string => {
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(isoDate);
    if (!match) return isoDate;
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        timeZone: 'UTC',
    });
};

/**
 * Style map used by ECharts' rich-text formatter syntax
 * (`{styleName|text}`) for the hierarchical xAxis labels. Spread into
 * the `axisLabel.rich` slot so the styles are registered before the
 * formatter emits any tagged segments.
 *
 * `fontWeight` mirrors ECharts' `ZRFontWeight` literal so the rich
 * map drops directly into `axisLabel.rich` (typed as `Dictionary<
 * TextCommonOption>`) without a type assertion.
 */
type RichStyle = {
    color?: string;
    fontSize?: number;
    fontWeight?: 'normal' | 'bold' | 'bolder' | 'lighter' | number;
    lineHeight?: number;
    padding?: number[];
};

/**
 * Build a zoom-aware xAxis tick formatter that renders month and year
 * labels hierarchically using ECharts rich-text syntax
 * (`{styleName|text}\n{styleName|text}`). The year is dropped onto a
 * second line under January ticks to act as a soft section header,
 * giving the timeline a visual rhythm without requiring a second axis.
 *
 * Density tiers (driven by `visibleCount`):
 *   - ≤1        → "MMM d" + year on a second line for the single tick,
 *                 regardless of month. A solitary point with just
 *                 "Jun 15" loses its calendar context, so we always
 *                 surface the year alongside it.
 *   - ≤8        → "MMM d" (e.g. "Jan 31"); January ticks get a year
 *                 line below ("{month|Jan 31}\n{year|2025}").
 *   - 9–18      → "MMM"   (e.g. "Jan", "Feb"); January ticks get a
 *                 year line below ("{month|Jan}\n{year|2025}").
 *   - >18       → year-only labels at January ticks ("{year|2025}");
 *                 every other tick collapses to "" so the chart
 *                 stays readable when zoomed far out. When all data
 *                 falls in a single year, the axis still emits its
 *                 own January tick at the year boundary, so the year
 *                 label still surfaces — confirmed by tests.
 *
 * "All data in same year" is handled implicitly across every tier: if
 * the axis never places a tick on a January 1 boundary that doesn't
 * match the data's lone year, no spurious year label appears. The
 * year only renders at January positions, so a same-year range with
 * no January data simply omits it.
 *
 * Uses UTC throughout so ISO `YYYY-MM-DD` snapshots aren't displayed
 * under the previous day for users west of UTC. The chart's
 * `hideOverlap: true` on the axis config still applies to collapse any
 * duplicate-looking neighbors that survive.
 *
 * The returned `rich` map MUST be spread into `axisLabel.rich`;
 * without those style registrations the `{month|...}` / `{year|...}`
 * tags render as literal text.
 */
const makeHierarchicalFormatter = (
    visibleCount: number,
): {
    formatter: (value: string | number) => string;
    rich: Record<string, RichStyle>;
} => {
    const rich: Record<string, RichStyle> = {
        month: { color: '#9ca3af', fontSize: 11, lineHeight: 14 },
        year: {
            color: '#d1d5db',
            fontSize: 10,
            fontWeight: 'bold',
            lineHeight: 14,
        },
    };

    const formatter = (value: string | number): string => {
        // ECharts' time axis hands us a numeric timestamp; tests or
        // upstream wrappers occasionally pass an ISO string. Coerce
        // either into a single Date instance read in UTC.
        const timestamp =
            typeof value === 'number' ? value : Date.parse(String(value));
        if (!Number.isFinite(timestamp)) return '';
        const date = new Date(timestamp);
        const month = date.getUTCMonth(); // 0 = January
        const day = date.getUTCDate();
        const year = date.getUTCFullYear();
        const isJanuary = month === 0;

        const monthShort = date.toLocaleString('en-US', {
            month: 'short',
            timeZone: 'UTC',
        });

        // With only one data point in view (single-point dataset, or
        // extreme zoom-in on a larger one) there is no zoom rhythm to
        // establish, so always anchor the lone label with its year.
        // This branch sits before the density tiers because the same
        // `visibleCount === 1` value would otherwise fall through to
        // the close-zoom branch and emit just a bare "Jun 15" for
        // non-January dates.
        if (visibleCount <= 1) {
            const monthDay = `${monthShort} ${day}`;
            return `{month|${monthDay}}\n{year|${year}}`;
        }

        if (visibleCount > 18) {
            // Far zoom: only mark year boundaries, suppress the rest
            // so the axis doesn't crowd into an unreadable smear.
            // Returning the empty string (rather than a single space
            // or a truncated month) lets the axis' `hideOverlap`
            // collapse non-January ticks cleanly without leaving
            // ghost labels behind.
            //
            // Single-year datasets still hit this branch when the
            // axis happens to land a tick on the year's January 1
            // (the time-axis tick algorithm's natural boundary), so
            // the lone year label surfaces as expected — covered by
            // a dedicated regression test.
            return isJanuary ? `{year|${year}}` : '';
        }

        if (visibleCount > 8) {
            // Medium zoom: month abbreviation; January ticks stack a
            // year line beneath as a soft section break. When all
            // data is in one year, no year label appears at non-
            // January ticks — by construction this tier only emits a
            // year line at January boundaries, so a single-year range
            // with no January data shows month abbreviations only.
            return isJanuary
                ? `{month|${monthShort}}\n{year|${year}}`
                : `{month|${monthShort}}`;
        }

        // Close zoom: full "MMM d" for every tick; January still gets
        // the year underneath so the user can locate the snapshot in
        // calendar time at a glance.
        const monthDay = `${monthShort} ${day}`;
        return isJanuary
            ? `{month|${monthDay}}\n{year|${year}}`
            : `{month|${monthDay}}`;
    };

    return { formatter, rich };
};

/**
 * Shape of a `dataZoom` event payload. The slider control fires
 * `start`/`end` directly, while the inside-zoom (scroll/pinch) batches
 * its updates under `batch[]`. We accept either.
 */
interface DataZoomEventParams {
    start?: number;
    end?: number;
    batch?: Array<{ start?: number; end?: number }>;
}

const NetWorthEChart = ({
    data,
    primaryCurrency,
    showVariation,
    onPointClick,
    height = DEFAULT_HEIGHT,
    dataZoomStart,
    dataZoomEnd,
    viewMode = 'total',
    currencyData,
}: NetWorthEChartProps) => {
    // Ref to the echarts-for-react instance, exposed for programmatic
    // control via `getEchartsInstance().dispatchAction(...)` whenever
    // the parent commands a new zoom window through the controlled
    // `dataZoomStart`/`dataZoomEnd` props (range chips, custom date
    // picker, etc.). Using `dispatchAction` instead of just relying on
    // the option's `dataZoom.start/end` ensures the chart visibly snaps
    // to the new range even if the user has dragged the slider in the
    // interim.
    const chartRef = useRef<ReactEChartsCore>(null);

    // Track the user's current zoom range so we can:
    //   1) Echo it back into the option's `dataZoom.start/end` on
    //      re-render — otherwise ECharts' merge-on-setOption would
    //      reset the zoom to the static initial values every time the
    //      option object recomputes (e.g. when `data` changes).
    //   2) Derive `visibleCount`, which drives the smart-axis label
    //      format and conditional dot visibility.
    //
    // Initialized from the controlled props when supplied, falling back
    // to the full range otherwise.
    const [zoomRange, setZoomRange] = useState<{ start: number; end: number }>(
        () => ({
            start: dataZoomStart ?? 0,
            end: dataZoomEnd ?? 100,
        }),
    );

    // Sync internal state from the controlled props and dispatch the
    // dataZoom action so the chart visibly jumps to the requested
    // window. Both are required because:
    //   - State sync keeps `visibleCount` (and thus the smart axis +
    //     conditional dots) in line with what the chart is showing.
    //   - dispatchAction overrides any in-flight user drag so the chip
    //     selection feels authoritative.
    // The effect early-returns when either prop is undefined so the
    // chart can be used in uncontrolled mode without spurious dispatches.
    useEffect(() => {
        if (dataZoomStart === undefined || dataZoomEnd === undefined) return;
        setZoomRange((prev) =>
            prev.start === dataZoomStart && prev.end === dataZoomEnd
                ? prev
                : { start: dataZoomStart, end: dataZoomEnd },
        );
        chartRef.current?.getEchartsInstance().dispatchAction({
            type: 'dataZoom',
            dataZoomIndex: 0,
            start: dataZoomStart,
            end: dataZoomEnd,
        });
    }, [dataZoomStart, dataZoomEnd]);

    // Number of data points currently within the zoomed range. We use
    // the rounded fraction of `data.length` as a stand-in for "how
    // dense is the chart right now". Clamped to ≥1 to avoid an empty
    // axis formatter branch when the user drags the slider handles
    // together momentarily.
    const visibleCount = useMemo(() => {
        if (data.length === 0) return 0;
        const fraction = (zoomRange.end - zoomRange.start) / 100;
        return Math.max(1, Math.round(data.length * fraction));
    }, [data.length, zoomRange.start, zoomRange.end]);

    const symbolSize =
        visibleCount > DOT_VISIBILITY_THRESHOLD ? 0 : VISIBLE_SYMBOL_SIZE;

    // Compute the set of January-1 dates that fall strictly between the
    // first and last snapshot. Wired into the first series' `markLine`
    // below to render dashed vertical year-boundary guide lines on the
    // time axis. Empty when there is fewer than one full calendar year
    // of data (no boundary to mark) so the consumer can spread the
    // result into the option without an extra null check.
    //
    // Parsed via UTC so a snapshot dated `2025-12-31` in a `UTC-6`
    // browser doesn't get bumped into the previous calendar year and
    // skip the 2026 boundary that should appear right after it.
    const yearBoundaryDates = useMemo(() => {
        if (data.length < 2) return [];
        const firstYear = new Date(
            data[0].date + 'T00:00:00Z',
        ).getUTCFullYear();
        const lastYear = new Date(
            data[data.length - 1].date + 'T00:00:00Z',
        ).getUTCFullYear();
        const boundaries: string[] = [];
        for (let y = firstYear + 1; y <= lastYear; y++) {
            boundaries.push(`${y}-01-01`);
        }
        return boundaries;
    }, [data]);

    // Treat the chart as `breakdown` only when the caller actually
    // provides a non-empty `currencyData` array. An empty array (e.g.
    // a fresh account with no snapshots yet, or a snapshot whose
    // breakdown is `{}`) is not enough — we'd render an empty legend
    // and a chart with zero series, which is more confusing than the
    // total-mode fallback. The fallback also keeps the type narrowing
    // simple downstream: every code path that reads `currencyData`
    // inside this branch knows it has at least one entry.
    const isBreakdown =
        viewMode === 'breakdown' &&
        Array.isArray(currencyData) &&
        currencyData.length > 0;

    // Memoize the option object so that unchanged props don't cause
    // `echarts-for-react` to re-run setOption (which would fight against
    // user-driven dataZoom state). Recomputes when any input that
    // affects the visual encoding changes.
    const option = useMemo<ChartOption>(() => {
        const yAxisFormatter = showVariation
            ? formatPercentAxisTick
            : formatCurrencyAxisTick;
        const hierarchical = makeHierarchicalFormatter(visibleCount);

        // Window-relative variation transform.
        //
        // In variation mode, the chart re-anchors the percentage axis on
        // the FIRST VISIBLE data point per the current `zoomRange`. The
        // hook hands us raw absolute values; the percentage transform
        // happens here so panning/zooming the dataZoom slider re-derives
        // the baseline (only the chart owns the dataZoom state). When
        // `showVariation` is false this collapses to identity for total
        // mode and a passthrough for breakdown mode, preserving the
        // pre-Wave-6 behavior verified by the existing snapshot tests.
        //
        // Index math: `zoomRange.start` is a percentage (0–100) of the
        // x-axis TIME range (not the data array). We find the first
        // data point whose timestamp >= the visible start time.
        const firstVisibleIdx = (() => {
            if (data.length === 0) return 0;
            const timestamps = data.map(d => new Date(d.date + 'T00:00:00Z').getTime());
            const minTs = timestamps[0];
            const maxTs = timestamps[timestamps.length - 1];
            const span = maxTs - minTs;
            if (span === 0) return 0;
            const visibleStartTs = minTs + (zoomRange.start / 100) * span;
            // Find first index where timestamp >= visibleStartTs
            let idx = 0;
            for (let i = 0; i < timestamps.length; i++) {
                if (timestamps[i] >= visibleStartTs) { idx = i; break; }
                idx = i;
            }
            return idx;
        })();

        // Total-mode per-point values. Identity in normal mode;
        // percentage change vs the first visible total in variation
        // mode. A `null` entry renders as a gap in the rendered line —
        // produced when the visible-window baseline itself is zero,
        // since the percentage formula is undefined there.
        const totalSeriesValues: Array<number | null> = (() => {
            if (!showVariation) {
                return data.map((d) => d.total);
            }
            const baseline = data[firstVisibleIdx]?.total ?? 0;
            if (baseline === 0) {
                return data.map(() => null);
            }
            return data.map(
                (d) => ((d.total - baseline) / Math.abs(baseline)) * 100,
            );
        })();

        // Dashed vertical year-boundary lines, attached to the first
        // series only. Attaching to a single series keeps ECharts from
        // rendering N overlapping copies in breakdown mode (one per
        // currency line); `silent: true` keeps them out of tooltip and
        // hover hit-testing so they read as background guides. Computed
        // as `undefined` when there are no boundaries so the spread
        // below is a no-op on short ranges.
        const yearMarkLine: LineSeriesOption['markLine'] | undefined =
            yearBoundaryDates.length > 0
                ? {
                      silent: true,
                      symbol: 'none',
                      label: { show: false },
                      lineStyle: {
                          color: '#374151',
                          type: 'dashed',
                          width: 1,
                          opacity: 0.6,
                      },
                      // The xAxis is `type: 'time'`, so markLine xAxis
                      // values must be numeric timestamps — passing the
                      // raw `YYYY-01-01` strings places no marker.
                      data: yearBoundaryDates.map((d) => ({
                          xAxis: new Date(d + 'T00:00:00Z').getTime(),
                      })),
                  }
                : undefined;

        // Build the series list. Total mode renders the single
        // aggregate line with the area gradient; breakdown mode emits
        // one line per currency, sharing the same x-axis date positions
        // sourced from `data`.
        const series: LineSeriesOption[] = isBreakdown
            ? (currencyData ?? []).map((cd, seriesIdx) => {
                  // Variation mode: replace this currency's values with
                  // window-relative percentages. Each currency anchors
                  // on its OWN first non-zero value at or after
                  // `firstVisibleIdx` so a late-adopted currency (e.g.
                  // USD that only shows up half-way through the
                  // timeline) doesn't get pulled to a flat-zero
                  // baseline that produces meaningless `0%` lines.
                  // Pre-baseline indices and any currency whose visible
                  // window is entirely zero render as `null` gaps.
                  let seriesValues: Array<number | null>;
                  if (showVariation) {
                      let baselineIdx = firstVisibleIdx;
                      while (
                          baselineIdx < cd.values.length &&
                          cd.values[baselineIdx] === 0
                      ) {
                          baselineIdx++;
                      }
                      const baseline =
                          baselineIdx < cd.values.length
                              ? cd.values[baselineIdx]
                              : 0;
                      seriesValues = cd.values.map((v, i) => {
                          if (baseline === 0) return null;
                          if (i < baselineIdx) return null;
                          return ((v - baseline) / Math.abs(baseline)) * 100;
                      });
                  } else {
                      seriesValues = cd.values;
                  }

                  return {
                      // `name` is used both as the legend label and as
                      // `seriesName` in tooltip params, so the breakdown
                      // formatter can reverse-lookup the matching
                      // `currencyData` entry by name.
                      name: cd.currency,
                      type: 'line',
                      // Pair each value with the same date string ECharts
                      // already parses for total mode so the time axis lines
                      // every series up at identical x positions. In
                      // variation mode `null` is preserved as an explicit
                      // gap; in normal mode the legacy `?? 0` fallback is
                      // kept for parity with the previous behavior.
                      data: data.map((d, i) => {
                          const v = seriesValues[i];
                          const resolved = showVariation
                              ? v ?? null
                              : v ?? 0;
                          return [d.date, resolved];
                      }),
                      smooth: true,
                      symbol: 'circle',
                      symbolSize,
                      showSymbol: true,
                      lineStyle: { color: cd.color, width: 2 },
                      itemStyle: { color: cd.color },
                      // No areaStyle in breakdown mode — multiple stacked
                      // gradients quickly become unreadable, and the user
                      // request explicitly calls for plain colored lines.
                      cursor: 'pointer',
                      // Year-boundary guide lines live on the first series
                      // only to avoid duplicate overlapping lines.
                      ...(seriesIdx === 0 && yearMarkLine
                          ? { markLine: yearMarkLine }
                          : {}),
                  };
              })
            : [
                  {
                      type: 'line',
                      // Switch from raw [date, value] tuples to per-point
                      // objects so we can attach `itemStyle` overrides per
                      // data point. The series-level `itemStyle` (below)
                      // applies to anchors; derived points override the
                      // fill to render as hollow rings. In variation mode
                      // the value is the transformed percentage (or
                      // `null` for a baseline-zero gap).
                      data: data.map((d, i) => {
                          const isDerived = d.isAnchor === false;
                          const transformed = totalSeriesValues[i];
                          const value = showVariation
                              ? transformed ?? null
                              : d.total;
                          return {
                              value: [d.date, value],
                              itemStyle: isDerived
                                  ? {
                                        color: 'transparent',
                                        borderColor: PRIMARY_COLOR,
                                        borderWidth: 2,
                                    }
                                  : undefined,
                          };
                      }),
                      smooth: true,
                      symbol: 'circle',
                      // Wave 3: zoom-driven dot visibility. We don't
                      // distinguish "hidden" via `showSymbol: false`
                      // because that also disables hover symbols, which
                      // we want to keep — emphasis still expands the dot
                      // on hover even when `symbolSize: 0`.
                      symbolSize,
                      showSymbol: true,
                      lineStyle: { color: PRIMARY_COLOR, width: 2 },
                      areaStyle: { color: AREA_GRADIENT },
                      // Default (anchor) styling: solid filled circle in
                      // brand blue. Per-point overrides above flip this
                      // to a hollow ring for derived points.
                      itemStyle: {
                          color: PRIMARY_COLOR,
                          borderColor: PRIMARY_COLOR,
                          borderWidth: 0,
                      },
                      // Wave 2: pointer cursor on the series so the
                      // affordance for "click to edit" is immediately
                      // discoverable.
                      cursor: 'pointer',
                      // Year-boundary guide lines on the single total
                      // series. Spread is a no-op when `yearMarkLine`
                      // is `undefined` (short ranges).
                      ...(yearMarkLine ? { markLine: yearMarkLine } : {}),
                  },
              ];

        return {
            backgroundColor: 'transparent',
            // Reserve more headroom in breakdown mode for the legend
            // strip; total mode keeps the original tighter top margin
            // since there's no legend.
            grid: {
                top: isBreakdown ? 36 : 20,
                right: 20,
                bottom: 80, // room for the dataZoom slider
                left: 60,
                containLabel: true,
            },
            // Legend strip is only present in breakdown mode. We pass
            // `show: false` (rather than omitting the key) in total mode
            // so the option shape stays stable across renders and the
            // tests can assert on the toggle directly.
            legend: {
                show: isBreakdown,
                data: isBreakdown
                    ? (currencyData ?? []).map((cd) => cd.currency)
                    : [],
                top: 4,
                right: 20,
                textStyle: { color: '#9ca3af', fontSize: 12 },
                icon: 'circle',
                itemWidth: 10,
                itemHeight: 10,
            },
            xAxis: {
                type: 'time',
                min: data.length > 0 ? new Date(data[0].date + 'T00:00:00Z').getTime() : undefined,
                max: data.length > 0 ? new Date(data[data.length - 1].date + 'T00:00:00Z').getTime() : undefined,
                axisLabel: {
                    color: '#9ca3af',
                    fontSize: 11,
                    hideOverlap: true,
                    rich: hierarchical.rich,
                    formatter: hierarchical.formatter,
                },
                axisLine: { lineStyle: { color: '#374151' } },
                // Wave 2: vertical dashed crosshair that snaps to the
                // hovered point. Label is suppressed because the
                // tooltip already renders the formatted date.
                axisPointer: {
                    show: true,
                    type: 'line',
                    lineStyle: {
                        color: '#6b7280',
                        type: 'dashed',
                        width: 1,
                    },
                    label: { show: false },
                },
            },
            yAxis: {
                type: 'value',
                axisLabel: {
                    color: '#9ca3af',
                    fontSize: 11,
                    formatter: yAxisFormatter,
                },
                splitLine: {
                    lineStyle: { color: '#374151', type: 'dashed' },
                },
            },
            series,
            dataZoom: [
                {
                    type: 'slider',
                    xAxisIndex: 0,
                    bottom: 10,
                    height: 30,
                    borderColor: '#4b5563',
                    backgroundColor: '#1f2937',
                    dataBackground: {
                        lineStyle: { color: '#6b7280' },
                        areaStyle: { color: '#374151' },
                    },
                    selectedDataBackground: {
                        lineStyle: { color: PRIMARY_COLOR },
                        areaStyle: { color: 'rgba(59, 130, 246, 0.2)' },
                    },
                    fillerColor: 'rgba(59, 130, 246, 0.15)',
                    handleStyle: {
                        color: '#60a5fa',
                        borderColor: PRIMARY_COLOR,
                    },
                    textStyle: { color: '#9ca3af', fontSize: 10 },
                    // Echo the current zoom back into the option so the
                    // setOption merge doesn't snap the user back to the
                    // initial range. See `zoomRange` above.
                    start: zoomRange.start,
                    end: zoomRange.end,
                },
                {
                    // Inside-chart zoom (scroll/pinch) — paired with the
                    // slider so users can zoom from either control.
                    type: 'inside',
                    xAxisIndex: 0,
                    start: zoomRange.start,
                    end: zoomRange.end,
                },
            ],
            tooltip: {
                trigger: 'axis',
                backgroundColor: '#374151',
                borderColor: '#4b5563',
                textStyle: { color: '#f3f4f6', fontSize: 12 },
                formatter: isBreakdown
                    ? (params) => {
                          // Breakdown mode: render one row per series at
                          // the hovered dataIndex. ECharts always passes
                          // an array under `trigger: 'axis'`; we still
                          // defensively wrap a non-array param so a stub
                          // single-entry payload from a test doesn't
                          // throw.
                          const list = Array.isArray(params)
                              ? (params as CallbackDataParams[])
                              : [params as CallbackDataParams];
                          if (list.length === 0) return '';

                          const idx =
                              typeof list[0].dataIndex === 'number'
                                  ? list[0].dataIndex
                                  : -1;
                          const datum = idx >= 0 ? data[idx] : undefined;

                          // Resolve the date label from the resolved
                          // datum first, then fall back to the raw tuple
                          // header — matches the total-mode formatter so
                          // both paths show identical date formatting.
                          let dateLabel = '';
                          if (datum) {
                              dateLabel = formatTooltipDate(datum.date);
                          } else {
                              const rawDate =
                                  Array.isArray(list[0].value) &&
                                  typeof list[0].value[0] === 'string'
                                      ? list[0].value[0]
                                      : list[0].name || '';
                              dateLabel = rawDate
                                  ? formatTooltipDate(rawDate)
                                  : '';
                          }

                          // Build a row per series. We look up the
                          // matching `currencyData` entry by name (set
                          // as series.name above) so the native value
                          // bracket can be appended for foreign
                          // currencies. Skip rows with non-numeric or
                          // missing values defensively.
                          //
                          // In variation mode each row's value is the
                          // window-relative percentage emitted by the
                          // series transform above; rows with a `null`
                          // entry (pre-baseline or baseline-zero) get
                          // a literal `N/A` so the user sees that the
                          // line genuinely has no anchor at that point
                          // rather than a misleading `0%` or a
                          // currency-amount in percent's place.
                          const rows = list
                              .map((p) => {
                                  const seriesName = p.seriesName ?? '';
                                  if (!seriesName) return '';
                                  const rawValue = Array.isArray(p.value)
                                      ? p.value[1]
                                      : p.value;

                                  const marker =
                                      typeof p.marker === 'string'
                                          ? p.marker
                                          : '';

                                  if (showVariation) {
                                      // `null` reaches here as either
                                      // an explicit gap or a missing
                                      // value tuple; skip the
                                      // `Number(null) === 0` trap
                                      // before any numeric coercion.
                                      if (rawValue == null) {
                                          return `${marker}${seriesName}: N/A`;
                                      }
                                      const value =
                                          typeof rawValue === 'number'
                                              ? rawValue
                                              : Number(rawValue);
                                      if (!Number.isFinite(value)) {
                                          return `${marker}${seriesName}: N/A`;
                                      }
                                      // Explicit `+` for non-negative
                                      // values keeps the sign visually
                                      // consistent across rows so the
                                      // user can scan a column for
                                      // direction at a glance.
                                      const sign = value >= 0 ? '+' : '';
                                      return `${marker}${seriesName}: ${sign}${value.toFixed(2)}%`;
                                  }

                                  const value =
                                      typeof rawValue === 'number'
                                          ? rawValue
                                          : Number(rawValue);
                                  if (!Number.isFinite(value)) return '';

                                  const cd = currencyData?.find(
                                      (entry) =>
                                          entry.currency === seriesName,
                                  );
                                  const native =
                                      cd && idx >= 0
                                          ? cd.nativeValues[idx]
                                          : undefined;

                                  const converted = formatBreakdownAmount(
                                      value,
                                      primaryCurrency,
                                  );

                                  // Only foreign currencies get the
                                  // native amount in brackets — for the
                                  // primary currency the converted and
                                  // native values are identical, so the
                                  // bracket would be visual noise.
                                  const showNative =
                                      seriesName !== primaryCurrency &&
                                      typeof native === 'number' &&
                                      Number.isFinite(native);
                                  const nativeSuffix = showNative
                                      ? ` [${formatBreakdownAmount(
                                            native as number,
                                            seriesName,
                                        )}]`
                                      : '';

                                  return `${marker}${seriesName}: ${converted}${nativeSuffix}`;
                              })
                              .filter(Boolean);

                          return (
                              `<strong>${dateLabel}</strong><br/>` +
                              rows.join('<br/>')
                          );
                      }
                    : (params) => {
                          // Total-mode formatter (Wave 6: variation mode
                          // reads the window-relative transformed value
                          // out of `totalSeriesValues` rather than the
                          // raw `datum.total`, so the headline reflects
                          // the same baseline as the rendered series and
                          // the Y-axis):
                          // render the single-line value plus a
                          // delta-from-previous-point row for every
                          // datum after the first.
                          const list = Array.isArray(params)
                              ? (params as CallbackDataParams[])
                              : [params as CallbackDataParams];
                          const first = list[0];
                          if (!first) return '';

                          // Resolve the data point. Prefer dataIndex (set by
                          // ECharts on every series-trigger) so we can look
                          // up the previous datum for the delta line. Fall
                          // back to extracting the value tuple directly when
                          // dataIndex is unavailable (defensive — the test
                          // suite stubs synthetic params without it).
                          const idx =
                              typeof first.dataIndex === 'number'
                                  ? first.dataIndex
                                  : -1;
                          const datum = idx >= 0 ? data[idx] : undefined;

                          let numericValue: number;
                          let dateLabel: string;

                          if (datum) {
                              if (showVariation) {
                                  const transformed = totalSeriesValues[idx];
                                  if (transformed == null) {
                                      // Baseline-zero gap or pre-baseline
                                      // index — surface explicit `N/A`
                                      // rather than collapse to the
                                      // raw absolute amount the user
                                      // toggled away from.
                                      return (
                                          `<strong>${formatTooltipDate(datum.date)}</strong><br/>` +
                                          `N/A`
                                      );
                                  }
                                  numericValue = transformed;
                              } else {
                                  numericValue = datum.total;
                              }
                              dateLabel = formatTooltipDate(datum.date);
                          } else {
                              // Fallback path: unpack the tuple ECharts ships
                              // through `value`.
                              const rawValue = Array.isArray(first.value)
                                  ? first.value[1]
                                  : first.value;
                              numericValue =
                                  typeof rawValue === 'number'
                                      ? rawValue
                                      : Number(rawValue);
                              const rawDate =
                                  Array.isArray(first.value) &&
                                  typeof first.value[0] === 'string'
                                      ? first.value[0]
                                      : first.name || '';
                              dateLabel = rawDate
                                  ? formatTooltipDate(rawDate)
                                  : '';
                          }
                          if (!Number.isFinite(numericValue)) return '';

                          const formatted = formatTooltipValue(
                              numericValue,
                              showVariation,
                              primaryCurrency,
                          );

                          // Delta-from-previous: only show when we have both a
                          // resolved current datum and a non-zero index, so
                          // the headline ("first snapshot") never gets a
                          // misleading "+0" line. In variation mode the
                          // previous value is read from the transformed
                          // array so the delta is always "percentage
                          // points between two visible-window-relative
                          // percentages" — symmetric with the current
                          // headline.
                          let deltaHtml = '';
                          if (datum && idx > 0) {
                              const prev = data[idx - 1];
                              const prevValue = showVariation
                                  ? totalSeriesValues[idx - 1]
                                  : prev.total;
                              if (
                                  prevValue != null &&
                                  Number.isFinite(prevValue)
                              ) {
                                  const delta = numericValue - prevValue;
                                  const isUp = delta >= 0;
                                  const sign = isUp ? '+' : '-';
                                  const color = isUp
                                      ? DELTA_UP_COLOR
                                      : DELTA_DOWN_COLOR;
                                  const deltaFormatted = formatDeltaValue(
                                      delta,
                                      showVariation,
                                  );
                                  // In variation mode the headline IS
                                  // already a percentage, so the
                                  // parenthetical "% change of %" line
                                  // collapses to either Infinity (when
                                  // the previous value is 0%) or a
                                  // nested-percent figure that doesn't
                                  // add information. Drop it; the `pp`
                                  // delta carries the relevant signal
                                  // on its own.
                                  let pctSuffix = '';
                                  if (!showVariation) {
                                      const deltaPct =
                                          prevValue !== 0
                                              ? (delta /
                                                    Math.abs(prevValue)) *
                                                100
                                              : 0;
                                      const pctFormatted = `${
                                          isUp ? '+' : '-'
                                      }${Math.abs(deltaPct).toFixed(1)}%`;
                                      pctSuffix = ` (${pctFormatted})`;
                                  }
                                  deltaHtml =
                                      `<div style="color:${color};font-size:11px;` +
                                      `margin-top:2px;">` +
                                      `${sign}${deltaFormatted}${pctSuffix}` +
                                      `</div>`;
                              }
                          }

                          return (
                              `<strong>${dateLabel}</strong><br/>` +
                              `${formatted}${deltaHtml}`
                          );
                      },
            },
        };
    }, [
        data,
        primaryCurrency,
        showVariation,
        symbolSize,
        visibleCount,
        zoomRange.start,
        zoomRange.end,
        isBreakdown,
        currencyData,
        yearBoundaryDates,
    ]);

    // Stable click handler — only changes when the data array or the
    // consumer's onPointClick callback identity changes. Avoids re-binding
    // the event listener on every parent re-render.
    const handleClick = useCallback(
        (params: CallbackDataParams) => {
            if (params.componentType !== 'series') return;
            if (typeof params.dataIndex !== 'number') return;
            const datum = data[params.dataIndex];
            if (datum) onPointClick(datum);
        },
        [data, onPointClick],
    );

    // Wave 3: track the user's zoom so the option can echo it back and
    // so `visibleCount` can drive the smart axis + dot visibility.
    const handleDataZoom = useCallback((params: DataZoomEventParams) => {
        // The slider fires `params.start`/`params.end`, the inside-zoom
        // dispatches via `params.batch`. Take whichever is present;
        // fall back to the existing range when neither is provided so
        // we never collapse the chart to start === end.
        const batchEntry = params.batch?.[0];
        const start = params.start ?? batchEntry?.start;
        const end = params.end ?? batchEntry?.end;
        if (typeof start !== 'number' || typeof end !== 'number') return;
        setZoomRange((prev) =>
            prev.start === start && prev.end === end
                ? prev
                : { start, end },
        );
    }, []);

    const onEvents = useMemo(
        () => ({
            click: handleClick as (params: unknown) => void,
            datazoom: handleDataZoom as (params: unknown) => void,
        }),
        [handleClick, handleDataZoom],
    );

    return (
        <ReactEChartsCore
            ref={chartRef}
            echarts={echarts}
            option={option}
            notMerge={true}
            style={{ height, width: '100%' }}
            onEvents={onEvents}
            opts={{ renderer: 'canvas' }}
        />
    );
};

export default NetWorthEChart;
