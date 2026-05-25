import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createElement, forwardRef, useImperativeHandle, type Ref } from 'react';
import { render, screen, act } from '../../../test/testUtils';
import NetWorthEChart, {
    type NetWorthEChartDatum,
    type CurrencySeriesData,
} from '../NetWorthEChart';

/**
 * Smoke tests for {@link NetWorthEChart}. The full ECharts library
 * relies on a Canvas 2D context that jsdom does not provide, so we mock
 * `echarts-for-react/lib/core` with a thin stand-in that exposes the
 * `option` and `onEvents` props back to the test, plus a captured
 * `dispatchAction` spy on a fake ECharts instance returned by
 * `getEchartsInstance()`. This lets us assert the option-building
 * behavior, the click routing, the height forwarding, and the
 * programmatic `dataZoom` dispatch without spinning up a real chart.
 */

interface CapturedProps {
    option?: unknown;
    onEvents?: Record<string, (params: unknown) => void>;
    style?: { height?: number; width?: string };
}

const captured: CapturedProps = {};
const dispatchAction = vi.fn();

interface MockHandle {
    getEchartsInstance: () => { dispatchAction: typeof dispatchAction };
}

vi.mock('echarts-for-react/lib/core', () => {
    // forwardRef so the component-under-test can attach its ref and
    // call `getEchartsInstance()`. The fake instance exposes only the
    // `dispatchAction` method we exercise from the dataZoom effect.
    const Mock = forwardRef(
        (
            props: {
                option: unknown;
                onEvents?: Record<string, (params: unknown) => void>;
                style?: { height?: number; width?: string };
            },
            ref: Ref<MockHandle>,
        ) => {
            captured.option = props.option;
            captured.onEvents = props.onEvents;
            captured.style = props.style;
            useImperativeHandle(
                ref,
                () => ({
                    getEchartsInstance: () => ({ dispatchAction }),
                }),
                [],
            );
            return createElement('div', {
                'data-testid': 'echarts-mock',
                style: props.style,
            });
        },
    );
    Mock.displayName = 'ReactEChartsCoreMock';
    return { default: Mock };
});

const buildDatum = (
    overrides: Partial<NetWorthEChartDatum> = {},
): NetWorthEChartDatum => ({
    date: '2026-01-01',
    total: 1_000_000,
    snapshotId: 's1',
    fullDate: '2026-01-01',
    ...overrides,
});

const renderChart = (
    overrides: Partial<{
        data: NetWorthEChartDatum[];
        primaryCurrency: string;
        showVariation: boolean;
        height: number;
        onPointClick: (datum: NetWorthEChartDatum) => void;
        dataZoomStart: number;
        dataZoomEnd: number;
        viewMode: 'total' | 'breakdown';
        currencyData: CurrencySeriesData[];
    }> = {},
) => {
    const onPointClick = overrides.onPointClick ?? vi.fn();
    const result = render(
        <NetWorthEChart
            data={overrides.data ?? [buildDatum()]}
            primaryCurrency={overrides.primaryCurrency ?? 'USD'}
            showVariation={overrides.showVariation ?? false}
            height={overrides.height}
            onPointClick={onPointClick}
            dataZoomStart={overrides.dataZoomStart}
            dataZoomEnd={overrides.dataZoomEnd}
            viewMode={overrides.viewMode}
            currencyData={overrides.currencyData}
        />,
    );
    return { onPointClick, ...result };
};

describe('NetWorthEChart', () => {
    beforeEach(() => {
        // Reset the module-level capture between tests so a stale option
        // or onEvents reference from the previous render can't leak into
        // a test that depends on the current one.
        captured.option = undefined;
        captured.onEvents = undefined;
        captured.style = undefined;
        dispatchAction.mockReset();
    });

    it('renders without crashing on empty data', () => {
        renderChart({ data: [] });

        expect(screen.getByTestId('echarts-mock')).toBeInTheDocument();
        expect(captured.option).toBeDefined();
    });

    it('applies the default height of 288 when not specified', () => {
        renderChart();

        expect(captured.style?.height).toBe(288);
        expect(captured.style?.width).toBe('100%');
    });

    it('honors a custom height prop', () => {
        renderChart({ height: 400 });

        expect(captured.style?.height).toBe(400);
    });

    it('routes click events on series points to onPointClick with the matching datum', () => {
        const datum = buildDatum({ snapshotId: 'abc-123' });
        const { onPointClick } = renderChart({ data: [datum] });

        captured.onEvents?.click({
            componentType: 'series',
            dataIndex: 0,
        });

        expect(onPointClick).toHaveBeenCalledTimes(1);
        expect(onPointClick).toHaveBeenCalledWith(datum);
    });

    it('ignores click events that are not on a series', () => {
        const { onPointClick } = renderChart();

        captured.onEvents?.click({
            componentType: 'xAxis',
            dataIndex: 0,
        });

        expect(onPointClick).not.toHaveBeenCalled();
    });

    it('ignores click events with an out-of-range dataIndex', () => {
        const { onPointClick } = renderChart({ data: [buildDatum()] });

        captured.onEvents?.click({
            componentType: 'series',
            dataIndex: 99,
        });

        expect(onPointClick).not.toHaveBeenCalled();
    });

    it('uses currency formatting in the tooltip when showVariation is false', () => {
        renderChart({
            data: [buildDatum({ total: 2_500_000 })],
            primaryCurrency: 'COP',
            showVariation: false,
        });

        const option = captured.option as {
            tooltip: {
                formatter: (
                    params: Array<{ value: [string, number]; name: string }>,
                ) => string;
            };
        };

        const html = option.tooltip.formatter([
            { value: ['2026-01-01', 2_500_000], name: '2026-01-01' },
        ]);

        expect(html).toContain('2.50M COP');
        // Wave 2 reformats the tooltip header from the raw ISO string
        // to a UTC-safe `MMM d, yyyy` display ("Jan 1, 2026"). The
        // original ISO is no longer surfaced.
        expect(html).toContain('Jan 1, 2026');
    });

    it('uses percentage formatting in the tooltip when showVariation is true', () => {
        renderChart({
            data: [buildDatum({ total: 25.4 })],
            primaryCurrency: 'COP',
            showVariation: true,
        });

        const option = captured.option as {
            tooltip: {
                formatter: (
                    params: Array<{ value: [string, number]; name: string }>,
                ) => string;
            };
            yAxis: { axisLabel: { formatter: (v: number) => string } };
        };

        const html = option.tooltip.formatter([
            { value: ['2026-01-01', 25.4], name: '2026-01-01' },
        ]);

        expect(html).toContain('25.40%');
        expect(html).not.toContain('COP');

        // Y-axis tick formatter should also be the percent variant
        expect(option.yAxis.axisLabel.formatter(50)).toBe('50%');
    });

    it('emits [date, value] tuples on the time axis series data', () => {
        renderChart({
            data: [
                buildDatum({ date: '2026-01-01', total: 100 }),
                buildDatum({ date: '2026-02-01', total: 200, snapshotId: 's2' }),
            ],
        });

        const option = captured.option as {
            xAxis: { type: string };
            series: Array<{
                data: Array<{
                    value: [string, number];
                    itemStyle?: unknown;
                }>;
            }>;
        };

        expect(option.xAxis.type).toBe('time');
        // Wave 3 swapped raw [date, value] tuples for per-point objects
        // so anchor/derived points can carry their own itemStyle. The
        // value tuple is preserved on `value`; anchors get an undefined
        // itemStyle (the series-level style applies).
        expect(option.series[0].data.map((d) => d.value)).toEqual([
            ['2026-01-01', 100],
            ['2026-02-01', 200],
        ]);
        expect(option.series[0].data[0].itemStyle).toBeUndefined();
    });

    it('defaults dataZoom slider to the full range when no start/end is provided', () => {
        renderChart();

        const option = captured.option as {
            dataZoom: Array<{ type: string; start?: number; end?: number }>;
        };

        const slider = option.dataZoom.find((dz) => dz.type === 'slider');
        expect(slider?.start).toBe(0);
        expect(slider?.end).toBe(100);
    });

    it('forwards dataZoomStart/End to the slider config in the option', () => {
        renderChart({ dataZoomStart: 60, dataZoomEnd: 100 });

        const option = captured.option as {
            dataZoom: Array<{ type: string; start?: number; end?: number }>;
        };

        const slider = option.dataZoom.find((dz) => dz.type === 'slider');
        expect(slider?.start).toBe(60);
        expect(slider?.end).toBe(100);
    });

    it('dispatches a dataZoom action on mount when start/end are provided', () => {
        renderChart({ dataZoomStart: 25, dataZoomEnd: 75 });

        expect(dispatchAction).toHaveBeenCalledWith({
            type: 'dataZoom',
            dataZoomIndex: 0,
            start: 25,
            end: 75,
        });
    });

    it('does not dispatch a dataZoom action when start/end are absent', () => {
        renderChart();

        expect(dispatchAction).not.toHaveBeenCalled();
    });

    it('re-dispatches the dataZoom action when start/end change', () => {
        const { rerender } = renderChart({ dataZoomStart: 0, dataZoomEnd: 100 });

        expect(dispatchAction).toHaveBeenCalledWith({
            type: 'dataZoom',
            dataZoomIndex: 0,
            start: 0,
            end: 100,
        });

        dispatchAction.mockReset();

        rerender(
            <NetWorthEChart
                data={[buildDatum()]}
                primaryCurrency="USD"
                showVariation={false}
                onPointClick={vi.fn()}
                dataZoomStart={50}
                dataZoomEnd={100}
            />,
        );

        expect(dispatchAction).toHaveBeenCalledWith({
            type: 'dataZoom',
            dataZoomIndex: 0,
            start: 50,
            end: 100,
        });
    });

    // -----------------------------------------------------------------
    // Wave 2: crosshair, enhanced tooltip, cursor pointer
    // -----------------------------------------------------------------

    it('configures a dashed vertical crosshair on the xAxis (Wave 2)', () => {
        renderChart();
        const option = captured.option as {
            xAxis: {
                axisPointer?: {
                    show?: boolean;
                    type?: string;
                    lineStyle?: { type?: string; color?: string };
                    label?: { show?: boolean };
                };
            };
        };
        expect(option.xAxis.axisPointer).toEqual(
            expect.objectContaining({
                show: true,
                type: 'line',
                lineStyle: expect.objectContaining({ type: 'dashed' }),
                label: expect.objectContaining({ show: false }),
            }),
        );
    });

    it('sets cursor: pointer on the series for the click affordance (Wave 2)', () => {
        renderChart();
        const option = captured.option as {
            series: Array<{ cursor?: string }>;
        };
        expect(option.series[0].cursor).toBe('pointer');
    });

    it('renders a green positive-delta line in the tooltip with absolute value and percent change (Wave 2)', () => {
        renderChart({
            data: [
                buildDatum({ date: '2026-01-01', total: 1_000_000 }),
                buildDatum({
                    date: '2026-02-01',
                    total: 1_217_000,
                    snapshotId: 's2',
                }),
            ],
            primaryCurrency: 'USD',
        });

        const option = captured.option as {
            tooltip: {
                formatter: (
                    params: Array<{
                        value: [string, number];
                        dataIndex: number;
                        name: string;
                    }>,
                ) => string;
            };
        };

        const html = option.tooltip.formatter([
            {
                value: ['2026-02-01', 1_217_000],
                dataIndex: 1,
                name: '2026-02-01',
            },
        ]);

        // 1_217_000 - 1_000_000 = 217_000 → "217.0K" (below the M
        // threshold) prefixed with the up-sign, and 21.7% change.
        expect(html).toContain('+217.0K');
        expect(html).toContain('+21.7%');
        // Tailwind green-400 — the up-direction color.
        expect(html).toContain('#4ade80');
    });

    it('renders a red negative-delta line in the tooltip on a drop (Wave 2)', () => {
        renderChart({
            data: [
                buildDatum({ date: '2026-01-01', total: 1_000_000 }),
                buildDatum({
                    date: '2026-02-01',
                    total: 970_000,
                    snapshotId: 's2',
                }),
            ],
            primaryCurrency: 'USD',
        });

        const option = captured.option as {
            tooltip: {
                formatter: (
                    params: Array<{
                        value: [string, number];
                        dataIndex: number;
                        name: string;
                    }>,
                ) => string;
            };
        };

        const html = option.tooltip.formatter([
            {
                value: ['2026-02-01', 970_000],
                dataIndex: 1,
                name: '2026-02-01',
            },
        ]);

        // 970k - 1M = -30k → "30.0K" rendered with a leading minus sign.
        expect(html).toContain('-30.0K');
        expect(html).toContain('-3.0%');
        // Tailwind red-400 — the down-direction color.
        expect(html).toContain('#f87171');
    });

    it('omits the delta line for the first data point (Wave 2)', () => {
        renderChart({
            data: [
                buildDatum({ date: '2026-01-01', total: 1_000_000 }),
                buildDatum({
                    date: '2026-02-01',
                    total: 1_217_000,
                    snapshotId: 's2',
                }),
            ],
        });

        const option = captured.option as {
            tooltip: {
                formatter: (
                    params: Array<{
                        value: [string, number];
                        dataIndex: number;
                        name: string;
                    }>,
                ) => string;
            };
        };

        const html = option.tooltip.formatter([
            {
                value: ['2026-01-01', 1_000_000],
                dataIndex: 0,
                name: '2026-01-01',
            },
        ]);

        // Neither up nor down color should appear — there's no
        // previous point to compare against.
        expect(html).not.toContain('#4ade80');
        expect(html).not.toContain('#f87171');
    });

    it('uses pp suffix for delta in variation mode without leaking the currency code (Wave 2)', () => {
        renderChart({
            data: [
                buildDatum({ date: '2026-01-01', total: 5 }),
                buildDatum({
                    date: '2026-02-01',
                    total: 17.5,
                    snapshotId: 's2',
                }),
            ],
            primaryCurrency: 'COP',
            showVariation: true,
        });

        const option = captured.option as {
            tooltip: {
                formatter: (
                    params: Array<{
                        value: [string, number];
                        dataIndex: number;
                        name: string;
                    }>,
                ) => string;
            };
        };

        const html = option.tooltip.formatter([
            {
                value: ['2026-02-01', 17.5],
                dataIndex: 1,
                name: '2026-02-01',
            },
        ]);

        // 17.5 - 5 = 12.5 percentage points.
        expect(html).toContain('12.50pp');
        // Variation-mode delta should not surface the currency code.
        expect(html).not.toContain('COP');
    });

    // -----------------------------------------------------------------
    // Wave 3: smart axis labels, conditional dot visibility, anchor vs derived
    // -----------------------------------------------------------------

    it('renders derived points with a hollow ring itemStyle override (Wave 3)', () => {
        renderChart({
            data: [
                buildDatum({ isAnchor: true, total: 100 }),
                buildDatum({
                    isAnchor: false,
                    total: 150,
                    snapshotId: 's2',
                    date: '2026-02-01',
                }),
            ],
        });

        const option = captured.option as {
            series: Array<{
                data: Array<{
                    value: [string, number];
                    itemStyle?: {
                        color?: string;
                        borderColor?: string;
                        borderWidth?: number;
                    };
                }>;
            }>;
        };

        // Anchor: undefined per-point style → series-level solid fill applies.
        expect(option.series[0].data[0].itemStyle).toBeUndefined();
        // Derived: transparent fill + blue-500 stroke renders as a hollow ring.
        expect(option.series[0].data[1].itemStyle).toEqual({
            color: 'transparent',
            borderColor: '#3b82f6',
            borderWidth: 2,
        });
    });

    it('treats an omitted isAnchor as an anchor (default solid fill) (Wave 3)', () => {
        renderChart({
            data: [
                {
                    date: '2026-01-01',
                    total: 100,
                    snapshotId: 's1',
                    fullDate: '2026-01-01',
                    // isAnchor intentionally omitted
                },
            ],
        });

        const option = captured.option as {
            series: Array<{
                data: Array<{ itemStyle?: unknown }>;
                itemStyle: { color: string };
            }>;
        };

        expect(option.series[0].data[0].itemStyle).toBeUndefined();
        // Series default — solid blue-500 fill (Tailwind blue-500).
        expect(option.series[0].itemStyle.color).toBe('#3b82f6');
    });

    it('hides dots when more than 12 points are visible (Wave 3)', () => {
        const data = Array.from({ length: 30 }, (_, i) =>
            buildDatum({
                date: `2024-${String((i % 12) + 1).padStart(2, '0')}-01`,
                total: 100 + i,
                snapshotId: `s${i}`,
            }),
        );
        renderChart({ data });

        const option = captured.option as {
            series: Array<{ symbolSize: number }>;
        };
        // Default zoom is 0–100, so all 30 points are visible → dots hidden.
        expect(option.series[0].symbolSize).toBe(0);
    });

    it('shows dots when 12 or fewer points are visible after zoom (Wave 3)', () => {
        const data = Array.from({ length: 30 }, (_, i) =>
            buildDatum({
                date: `2024-${String((i % 12) + 1).padStart(2, '0')}-01`,
                total: 100 + i,
                snapshotId: `s${i}`,
            }),
        );
        renderChart({ data });

        // Simulate the user zooming the slider to the last 30%
        // (~9 points) — below the 12-point threshold.
        act(() => {
            captured.onEvents?.datazoom?.({ start: 70, end: 100 });
        });

        const option = captured.option as {
            series: Array<{ symbolSize: number }>;
        };
        expect(option.series[0].symbolSize).toBe(6);
    });

    it('formats xAxis ticks as the year when more than 20 points are visible (Wave 3)', () => {
        const data = Array.from({ length: 30 }, (_, i) =>
            buildDatum({
                date: `2024-${String((i % 12) + 1).padStart(2, '0')}-01`,
                total: 100 + i,
                snapshotId: `s${i}`,
            }),
        );
        renderChart({ data });

        const option = captured.option as {
            xAxis: { axisLabel: { formatter: (v: number) => string } };
        };
        // `Date.UTC` keeps the assertion deterministic regardless of
        // the host machine's timezone.
        const ts = Date.UTC(2024, 5, 15);
        expect(option.xAxis.axisLabel.formatter(ts)).toBe('2024');
    });

    it('formats xAxis ticks as a month abbreviation when 9–20 points are visible (Wave 3)', () => {
        const data = Array.from({ length: 30 }, (_, i) =>
            buildDatum({
                date: `2024-${String((i % 12) + 1).padStart(2, '0')}-01`,
                total: 100 + i,
                snapshotId: `s${i}`,
            }),
        );
        renderChart({ data });

        // Zoom to the last 50% → 15 points (in the 9–20 band).
        act(() => {
            captured.onEvents?.datazoom?.({ start: 50, end: 100 });
        });

        const option = captured.option as {
            xAxis: { axisLabel: { formatter: (v: number) => string } };
        };
        const ts = Date.UTC(2024, 5, 15);
        expect(option.xAxis.axisLabel.formatter(ts)).toBe('Jun');
    });

    it('formats xAxis ticks as "MMM d" when 8 or fewer points are visible (Wave 3)', () => {
        const data = Array.from({ length: 30 }, (_, i) =>
            buildDatum({
                date: `2024-${String((i % 12) + 1).padStart(2, '0')}-01`,
                total: 100 + i,
                snapshotId: `s${i}`,
            }),
        );
        renderChart({ data });

        // Zoom in tightly to the last ~10% → 3 points.
        act(() => {
            captured.onEvents?.datazoom?.({ start: 90, end: 100 });
        });

        const option = captured.option as {
            xAxis: { axisLabel: { formatter: (v: number) => string } };
        };
        const ts = Date.UTC(2024, 5, 15);
        expect(option.xAxis.axisLabel.formatter(ts)).toBe('Jun 15');
    });

    it('handles batched datazoom events from the inside-zoom (scroll/pinch) (Wave 3)', () => {
        const data = Array.from({ length: 30 }, (_, i) =>
            buildDatum({
                date: `2024-${String((i % 12) + 1).padStart(2, '0')}-01`,
                total: 100 + i,
                snapshotId: `s${i}`,
            }),
        );
        renderChart({ data });

        // Inside-zoom dispatches its updates batched under `batch[]`
        // rather than directly on `start`/`end`.
        act(() => {
            captured.onEvents?.datazoom?.({
                batch: [{ start: 60, end: 90 }],
            });
        });

        const option = captured.option as {
            series: Array<{ symbolSize: number }>;
        };
        // 30 * 0.30 = 9 points → dots show.
        expect(option.series[0].symbolSize).toBe(6);
    });

    // -----------------------------------------------------------------
    // Wave 5: multi-series "By Currency" breakdown
    // -----------------------------------------------------------------

    /**
     * Build a deterministic two-snapshot history shared by the
     * breakdown tests. The first snapshot is a Jan 1 / Feb 1 pair so
     * the date label assertions work in any host timezone (UTC parsing
     * keeps the calendar day stable).
     */
    const buildBreakdownData = (): NetWorthEChartDatum[] => [
        buildDatum({
            date: '2025-10-31',
            total: 190_000_000,
            snapshotId: 'snap-1',
            fullDate: '2025-10-31',
        }),
        buildDatum({
            date: '2025-11-30',
            total: 200_000_000,
            snapshotId: 'snap-2',
            fullDate: '2025-11-30',
        }),
    ];

    /**
     * Mirror of the example breakdown layout from the user-facing
     * tooltip spec — three currencies (one primary, two foreign) with
     * rounded values that match the documented format. Used by every
     * tooltip-format test so the assertions can quote the exact
     * strings the spec calls for.
     */
    const buildBreakdownCurrencyData = (): CurrencySeriesData[] => [
        {
            currency: 'COP',
            values: [60_000_000, 68_296_200],
            nativeValues: [60_000_000, 68_296_200],
            color: '#eab308',
        },
        {
            currency: 'MXN',
            values: [35_000_000, 37_979_123],
            nativeValues: [165_000, 178_862],
            color: '#f97316',
        },
        {
            currency: 'USD',
            values: [80_000_000, 83_755_602],
            nativeValues: [21_500, 22_744],
            color: '#22c55e',
        },
    ];

    it('emits one line series per currency in breakdown mode (Wave 5)', () => {
        renderChart({
            data: buildBreakdownData(),
            primaryCurrency: 'COP',
            viewMode: 'breakdown',
            currencyData: buildBreakdownCurrencyData(),
        });

        const option = captured.option as {
            series: Array<{
                name?: string;
                type: string;
                lineStyle?: { color?: string };
                itemStyle?: { color?: string };
                areaStyle?: unknown;
                data: Array<unknown>;
            }>;
        };

        // One series per currency — three lines stacked on the same
        // time axis, in the order the caller provided.
        expect(option.series).toHaveLength(3);
        expect(option.series.map((s) => s.name)).toEqual([
            'COP',
            'MXN',
            'USD',
        ]);
        expect(option.series.every((s) => s.type === 'line')).toBe(true);

        // Each series picks up its color from the corresponding
        // currencyData entry — both line and dot color match.
        expect(option.series[0].lineStyle?.color).toBe('#eab308');
        expect(option.series[0].itemStyle?.color).toBe('#eab308');
        expect(option.series[1].lineStyle?.color).toBe('#f97316');
        expect(option.series[2].lineStyle?.color).toBe('#22c55e');

        // Plain colored lines per the spec — stacked area gradients
        // would be unreadable with three currencies overlapping.
        expect(option.series.every((s) => s.areaStyle === undefined)).toBe(
            true,
        );

        // Series data must align row-by-row with the input snapshots.
        // Each row is [date, value], where `value` comes from
        // `currencyData[i].values[idx]`.
        expect(option.series[0].data).toEqual([
            ['2025-10-31', 60_000_000],
            ['2025-11-30', 68_296_200],
        ]);
        expect(option.series[1].data).toEqual([
            ['2025-10-31', 35_000_000],
            ['2025-11-30', 37_979_123],
        ]);
        expect(option.series[2].data).toEqual([
            ['2025-10-31', 80_000_000],
            ['2025-11-30', 83_755_602],
        ]);
    });

    it('shows the legend with currency names in breakdown mode (Wave 5)', () => {
        renderChart({
            data: buildBreakdownData(),
            primaryCurrency: 'COP',
            viewMode: 'breakdown',
            currencyData: buildBreakdownCurrencyData(),
        });

        const option = captured.option as {
            legend: { show: boolean; data: string[] };
        };

        expect(option.legend.show).toBe(true);
        expect(option.legend.data).toEqual(['COP', 'MXN', 'USD']);
    });

    it('hides the legend in total mode (Wave 5)', () => {
        renderChart({
            data: [buildDatum()],
            viewMode: 'total',
        });

        const option = captured.option as {
            legend: { show: boolean; data: string[] };
        };

        // Even though the legend object is always emitted (so the
        // option shape is stable), `show: false` keeps it hidden in
        // total mode.
        expect(option.legend.show).toBe(false);
        expect(option.legend.data).toEqual([]);
    });

    it('falls back to the total-mode single-line series when breakdown is requested without currencyData (Wave 5)', () => {
        renderChart({
            data: [buildDatum()],
            viewMode: 'breakdown',
            // currencyData intentionally omitted
        });

        const option = captured.option as {
            series: Array<{ areaStyle?: unknown }>;
            legend: { show: boolean };
        };

        // No per-currency data → render the single aggregate line
        // with the gradient fill and no legend, matching the total
        // mode default.
        expect(option.series).toHaveLength(1);
        expect(option.series[0].areaStyle).toBeDefined();
        expect(option.legend.show).toBe(false);
    });

    it('falls back to total-mode rendering when breakdown is requested with an empty currencyData array (Wave 5)', () => {
        // A user with no snapshots-with-breakdown can produce an empty
        // currencies list, which the widget translates into an empty
        // currencyData array. The chart must guard against this so the
        // user sees the total line instead of an empty legend over a
        // chart with zero series.
        renderChart({
            data: [buildDatum()],
            viewMode: 'breakdown',
            currencyData: [],
        });

        const option = captured.option as {
            series: Array<{ areaStyle?: unknown }>;
            legend: { show: boolean; data: string[] };
        };

        expect(option.series).toHaveLength(1);
        expect(option.series[0].areaStyle).toBeDefined();
        expect(option.legend.show).toBe(false);
        expect(option.legend.data).toEqual([]);
    });

    it('renders one tooltip row per currency with the formatted date header (Wave 5)', () => {
        renderChart({
            data: buildBreakdownData(),
            primaryCurrency: 'COP',
            viewMode: 'breakdown',
            currencyData: buildBreakdownCurrencyData(),
        });

        const option = captured.option as {
            tooltip: {
                formatter: (
                    params: Array<{
                        seriesName: string;
                        value: [string, number];
                        dataIndex: number;
                        marker: string;
                    }>,
                ) => string;
            };
        };

        // Synthesise the params shape ECharts hands the formatter for
        // an axis-trigger hover at index 1 (the second snapshot).
        const html = option.tooltip.formatter([
            {
                seriesName: 'COP',
                value: ['2025-11-30', 68_296_200],
                dataIndex: 1,
                marker: '<span style="color:#eab308;">●</span>',
            },
            {
                seriesName: 'MXN',
                value: ['2025-11-30', 37_979_123],
                dataIndex: 1,
                marker: '<span style="color:#f97316;">●</span>',
            },
            {
                seriesName: 'USD',
                value: ['2025-11-30', 83_755_602],
                dataIndex: 1,
                marker: '<span style="color:#22c55e;">●</span>',
            },
        ]);

        // Header is the resolved datum's date (2025-11-30) formatted
        // as `MMM d, yyyy` — matches the total-mode formatter.
        expect(html).toContain('Nov 30, 2025');

        // Primary currency: converted only, no native bracket — the
        // converted value already IS the native value when the line is
        // the user's primary currency.
        expect(html).toContain('COP: 68,296,200 COP');
        expect(html).not.toMatch(/COP: 68,296,200 COP \[/);

        // Foreign currencies: converted-to-primary value followed by
        // `[native]` in the currency's own denomination.
        expect(html).toContain('MXN: 37,979,123 COP [178,862 MXN]');
        expect(html).toContain('USD: 83,755,602 COP [22,744 USD]');

        // Each row carries the colored marker from ECharts so the
        // legend swatch is visually tied to the row.
        expect(html).toContain('color:#eab308');
        expect(html).toContain('color:#f97316');
        expect(html).toContain('color:#22c55e');
    });

    it('omits the native bracket suffix only for the primary currency, even when listed last (Wave 5)', () => {
        // Reorder the currency list so the primary currency isn't the
        // first row — the bracket suppression must key on the series
        // name vs primaryCurrency, not its position.
        const reordered: CurrencySeriesData[] = [
            {
                currency: 'USD',
                values: [83_755_602],
                nativeValues: [22_744],
                color: '#22c55e',
            },
            {
                currency: 'MXN',
                values: [37_979_123],
                nativeValues: [178_862],
                color: '#f97316',
            },
            {
                currency: 'COP',
                values: [68_296_200],
                nativeValues: [68_296_200],
                color: '#eab308',
            },
        ];

        renderChart({
            data: [
                buildDatum({
                    date: '2025-11-30',
                    total: 190_000_000,
                    fullDate: '2025-11-30',
                }),
            ],
            primaryCurrency: 'COP',
            viewMode: 'breakdown',
            currencyData: reordered,
        });

        const option = captured.option as {
            tooltip: {
                formatter: (
                    params: Array<{
                        seriesName: string;
                        value: [string, number];
                        dataIndex: number;
                        marker: string;
                    }>,
                ) => string;
            };
        };

        const html = option.tooltip.formatter([
            {
                seriesName: 'USD',
                value: ['2025-11-30', 83_755_602],
                dataIndex: 0,
                marker: '',
            },
            {
                seriesName: 'MXN',
                value: ['2025-11-30', 37_979_123],
                dataIndex: 0,
                marker: '',
            },
            {
                seriesName: 'COP',
                value: ['2025-11-30', 68_296_200],
                dataIndex: 0,
                marker: '',
            },
        ]);

        // Primary currency row never gets a bracket, regardless of
        // position in the list.
        expect(html).toContain('COP: 68,296,200 COP');
        expect(html).not.toMatch(/COP: 68,296,200 COP \[/);

        // Foreign rows still get the native bracket.
        expect(html).toContain('USD: 83,755,602 COP [22,744 USD]');
        expect(html).toContain('MXN: 37,979,123 COP [178,862 MXN]');
    });

    it('does not render the total-mode delta line in the breakdown tooltip (Wave 5)', () => {
        renderChart({
            data: buildBreakdownData(),
            primaryCurrency: 'COP',
            viewMode: 'breakdown',
            currencyData: buildBreakdownCurrencyData(),
        });

        const option = captured.option as {
            tooltip: {
                formatter: (
                    params: Array<{
                        seriesName: string;
                        value: [string, number];
                        dataIndex: number;
                        marker: string;
                    }>,
                ) => string;
            };
        };

        const html = option.tooltip.formatter([
            {
                seriesName: 'COP',
                value: ['2025-11-30', 68_296_200],
                dataIndex: 1,
                marker: '',
            },
        ]);

        // The breakdown formatter intentionally drops the total-mode
        // delta-from-previous block — three lines moving in different
        // directions can't be summarised by a single delta number.
        expect(html).not.toContain('#4ade80'); // up-color
        expect(html).not.toContain('#f87171'); // down-color
    });

    it('routes click events to onPointClick with the matching datum in breakdown mode (Wave 5)', () => {
        const data = buildBreakdownData();
        const { onPointClick } = renderChart({
            data,
            primaryCurrency: 'COP',
            viewMode: 'breakdown',
            currencyData: buildBreakdownCurrencyData(),
        });

        // Clicks on any breakdown series share the same x-axis index,
        // so resolving via `data[dataIndex]` still surfaces the right
        // snapshot regardless of which series received the click.
        captured.onEvents?.click({
            componentType: 'series',
            seriesIndex: 1,
            dataIndex: 0,
        });

        expect(onPointClick).toHaveBeenCalledTimes(1);
        expect(onPointClick).toHaveBeenCalledWith(data[0]);
    });
});
