/**
 * NetWorthEChart
 *
 * ECharts-based replacement for the Recharts net-worth timeline chart.
 * Wave 1 of the rebuild: renders a single line series with a dataZoom
 * minimap slider for range selection. Subsequent waves layer on
 * crosshair tooltips, conditional dot visibility, multi-currency mode,
 * and a fully redesigned controls row.
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

import { useCallback, useMemo } from 'react';
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
}

const DEFAULT_HEIGHT = 288;

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

const NetWorthEChart = ({
    data,
    primaryCurrency,
    showVariation,
    onPointClick,
    height = DEFAULT_HEIGHT,
}: NetWorthEChartProps) => {
    // Memoize the option object so that unchanged props don't cause
    // `echarts-for-react` to re-run setOption (which would fight against
    // user-driven dataZoom state). Recomputes when data, primaryCurrency,
    // or showVariation change — exactly when the chart's visual encoding
    // changes.
    const option = useMemo<ChartOption>(() => {
        const yAxisFormatter = showVariation
            ? formatPercentAxisTick
            : formatCurrencyAxisTick;

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
                axisLabel: { color: '#9ca3af', fontSize: 11 },
                axisLine: { lineStyle: { color: '#374151' } },
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
                    // [date, value] tuples for the time x-axis. ECharts
                    // parses the ISO string directly.
                    data: data.map((d) => [d.date, d.total]),
                    smooth: true,
                    symbol: 'circle',
                    // Hidden by default; Wave 3 adds conditional dot
                    // logic driven by zoom level.
                    symbolSize: 0,
                    lineStyle: { color: '#3b82f6', width: 2 },
                    areaStyle: { color: AREA_GRADIENT },
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
                        lineStyle: { color: '#3b82f6' },
                        areaStyle: { color: 'rgba(59, 130, 246, 0.2)' },
                    },
                    fillerColor: 'rgba(59, 130, 246, 0.15)',
                    handleStyle: {
                        color: '#60a5fa',
                        borderColor: '#3b82f6',
                    },
                    textStyle: { color: '#9ca3af', fontSize: 10 },
                    start: 0,
                    end: 100,
                },
                {
                    // Inside-chart zoom (scroll/pinch) — paired with the
                    // slider so users can zoom from either control.
                    type: 'inside',
                    xAxisIndex: 0,
                },
            ],
            tooltip: {
                trigger: 'axis',
                backgroundColor: '#374151',
                borderColor: '#4b5563',
                textStyle: { color: '#f3f4f6', fontSize: 12 },
                formatter: (params) => {
                    // axis-trigger tooltips receive an array of series
                    // entries at the hovered x value; for our single-line
                    // chart there's exactly one entry.
                    const list = Array.isArray(params)
                        ? (params as CallbackDataParams[])
                        : [params as CallbackDataParams];
                    const first = list[0];
                    if (!first) return '';

                    // For [date, value] tuples ECharts passes the tuple
                    // through as `value`; pull index 1 for the numeric.
                    const rawValue = Array.isArray(first.value)
                        ? first.value[1]
                        : first.value;
                    const numericValue =
                        typeof rawValue === 'number'
                            ? rawValue
                            : Number(rawValue);
                    if (!Number.isFinite(numericValue)) return '';

                    const formatted = formatTooltipValue(
                        numericValue,
                        showVariation,
                        primaryCurrency,
                    );
                    // For time axes, ECharts formats `name` itself; fall
                    // back to the raw date string from the tuple if
                    // unavailable.
                    const label =
                        first.name ||
                        (Array.isArray(first.value)
                            ? String(first.value[0])
                            : '');
                    return `<strong>${label}</strong><br/>${formatted}`;
                },
            },
        };
    }, [data, primaryCurrency, showVariation]);

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

    const onEvents = useMemo(
        () => ({
            click: handleClick as (params: unknown) => void,
        }),
        [handleClick],
    );

    return (
        <ReactEChartsCore
            echarts={echarts}
            option={option}
            style={{ height, width: '100%' }}
            onEvents={onEvents}
            opts={{ renderer: 'canvas' }}
        />
    );
};

export default NetWorthEChart;
