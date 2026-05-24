import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createElement } from 'react';
import { render, screen } from '../../../test/testUtils';
import NetWorthEChart, {
    type NetWorthEChartDatum,
} from '../NetWorthEChart';

/**
 * Smoke tests for {@link NetWorthEChart}. The full ECharts library
 * relies on a Canvas 2D context that jsdom does not provide, so we mock
 * `echarts-for-react/lib/core` with a thin stand-in that exposes the
 * `option` and `onEvents` props back to the test. This lets us assert
 * the option-building behavior, the click routing, and the height
 * forwarding without spinning up a real chart instance.
 */

interface CapturedProps {
    option?: unknown;
    onEvents?: Record<string, (params: unknown) => void>;
    style?: { height?: number; width?: string };
}

const captured: CapturedProps = {};

vi.mock('echarts-for-react/lib/core', () => {
    const Mock = (props: {
        option: unknown;
        onEvents?: Record<string, (params: unknown) => void>;
        style?: { height?: number; width?: string };
    }) => {
        captured.option = props.option;
        captured.onEvents = props.onEvents;
        captured.style = props.style;
        return createElement('div', {
            'data-testid': 'echarts-mock',
            style: props.style,
        });
    };
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
    }> = {},
) => {
    const onPointClick = overrides.onPointClick ?? vi.fn();
    render(
        <NetWorthEChart
            data={overrides.data ?? [buildDatum()]}
            primaryCurrency={overrides.primaryCurrency ?? 'USD'}
            showVariation={overrides.showVariation ?? false}
            height={overrides.height}
            onPointClick={onPointClick}
        />,
    );
    return { onPointClick };
};

describe('NetWorthEChart', () => {
    beforeEach(() => {
        // Reset the module-level capture between tests so a stale option
        // or onEvents reference from the previous render can't leak into
        // a test that depends on the current one.
        captured.option = undefined;
        captured.onEvents = undefined;
        captured.style = undefined;
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
        expect(html).toContain('2026-01-01');
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
            series: Array<{ data: Array<[string, number]> }>;
        };

        expect(option.xAxis.type).toBe('time');
        expect(option.series[0].data).toEqual([
            ['2026-01-01', 100],
            ['2026-02-01', 200],
        ]);
    });
});
