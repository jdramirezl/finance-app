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
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import type { ComposeOption } from 'echarts/core';
// `CallbackDataParams` is not surfaced on the `echarts/core` entry, but
// `import type` is erased by the compiler under `verbatimModuleSyntax`,
// so this does not pull the full echarts barrel into the runtime bundle.
import type { DefaultLabelFormatterCallbackParams as CallbackDataParams } from 'echarts';

// Register only the components this chart needs. Subsequent waves can
// extend this list (e.g. LegendComponent for breakdown mode).
echarts.use([
    LineChart,
    GridComponent,
    TooltipComponent,
    DataZoomComponent,
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
>;

export interface NetWorthEChartDatum {
    /** ISO date string (e.g. "2023-02-28"). Parsed by ECharts time axis. */
    date: string;
    /**
     * In normal mode, net worth value in `primaryCurrency`. In variation
     * mode (`showVariation === true`), the percentage change from the
     * baseline as produced by `useNetWorthChartData`.
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
     * When true, the `total` field of each datum is interpreted as a
     * percentage and the axis/tooltip switch to percent formatting.
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
 * Format a delta amount for display in the tooltip. The leading sign is
 * added by the caller so it can color-code positive vs negative,
 * keeping this formatter independent of color logic.
 *
 * In variation mode the underlying values are percentages, so the delta
 * is naturally "percentage points". We render it with a `pp` suffix to
 * avoid ambiguity ("a 2% increase from 50% to 52%" reads as "+2pp").
 *
 * Currency mode uses K/M suffixes and intentionally omits the currency
 * code — the headline value above the delta already shows the currency,
 * and repeating it makes the tooltip noisy.
 */
const formatDeltaValue = (delta: number, showVariation: boolean): string => {
    const abs = Math.abs(delta);
    if (showVariation) {
        return `${abs.toFixed(2)}pp`;
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
 * Build a zoom-aware xAxis tick formatter. ECharts calls the formatter
 * once per tick with the tick's timestamp; we return a string sized to
 * how much horizontal space each tick gets, which depends on how many
 * data points are currently visible:
 *   - >20 visible → just the year ("2025")
 *   - 8–20       → month abbreviation ("Jan")
 *   - ≤8         → "MMM d" ("Jan 31")
 *
 * Uses UTC so ISO `YYYY-MM-DD` snapshots aren't displayed under the
 * previous day for users west of UTC. `hideOverlap: true` on the axis
 * config collapses any duplicate-looking neighbors that survive.
 */
const makeXAxisFormatter = (visibleCount: number) => {
    if (visibleCount > 20) {
        return (timestamp: number) =>
            String(new Date(timestamp).getUTCFullYear());
    }
    if (visibleCount > 8) {
        return (timestamp: number) =>
            new Date(timestamp).toLocaleString('en-US', {
                month: 'short',
                timeZone: 'UTC',
            });
    }
    return (timestamp: number) =>
        new Date(timestamp).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            timeZone: 'UTC',
        });
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

    // Memoize the option object so that unchanged props don't cause
    // `echarts-for-react` to re-run setOption (which would fight against
    // user-driven dataZoom state). Recomputes when any input that
    // affects the visual encoding changes.
    const option = useMemo<ChartOption>(() => {
        const yAxisFormatter = showVariation
            ? formatPercentAxisTick
            : formatCurrencyAxisTick;
        const xAxisFormatter = makeXAxisFormatter(visibleCount);

        return {
            backgroundColor: 'transparent',
            grid: {
                top: 20,
                right: 20,
                bottom: 80, // room for the dataZoom slider
                left: 60,
                containLabel: true,
            },
            xAxis: {
                type: 'time',
                axisLabel: {
                    color: '#9ca3af',
                    fontSize: 11,
                    hideOverlap: true,
                    formatter: xAxisFormatter,
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
            series: [
                {
                    type: 'line',
                    // Switch from raw [date, value] tuples to per-point
                    // objects so we can attach `itemStyle` overrides per
                    // data point. The series-level `itemStyle` (below)
                    // applies to anchors; derived points override the
                    // fill to render as hollow rings.
                    data: data.map((d) => {
                        const isDerived = d.isAnchor === false;
                        return {
                            value: [d.date, d.total],
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
                },
            ],
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
                formatter: (params) => {
                    // Axis-trigger tooltips receive an array of series
                    // entries at the hovered x value; for our single-line
                    // chart there's exactly one entry.
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
                        numericValue = datum.total;
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
                    // misleading "+0" line.
                    let deltaHtml = '';
                    if (datum && idx > 0) {
                        const prev = data[idx - 1];
                        const delta = numericValue - prev.total;
                        const isUp = delta >= 0;
                        const sign = isUp ? '+' : '-';
                        const color = isUp
                            ? DELTA_UP_COLOR
                            : DELTA_DOWN_COLOR;
                        const deltaFormatted = formatDeltaValue(
                            delta,
                            showVariation,
                        );
                        // Percent-change of the absolute amount; in
                        // variation mode we still report the
                        // percentage-of-percentage so the user sees a
                        // single consistent secondary metric.
                        const deltaPct =
                            prev.total !== 0
                                ? (delta / Math.abs(prev.total)) * 100
                                : 0;
                        const pctFormatted = `${isUp ? '+' : '-'}${Math.abs(
                            deltaPct,
                        ).toFixed(1)}%`;
                        deltaHtml =
                            `<div style="color:${color};font-size:11px;` +
                            `margin-top:2px;">` +
                            `${sign}${deltaFormatted} (${pctFormatted})` +
                            `</div>`;
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
            style={{ height, width: '100%' }}
            onEvents={onEvents}
            opts={{ renderer: 'canvas' }}
        />
    );
};

export default NetWorthEChart;
