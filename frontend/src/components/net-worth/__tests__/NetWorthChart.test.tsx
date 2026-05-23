import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createElement, isValidElement, type ReactNode } from 'react';
import { render, screen } from '../../../test/testUtils';
import userEvent from '@testing-library/user-event';
import NetWorthChart from '../NetWorthChart';
import type {
  NetWorthChartDatum,
  NetWorthTooltipFormatter,
} from '../../../hooks/useNetWorthChartData';

/**
 * Tests for {@link NetWorthChart}. The component is the rendering layer
 * for the net-worth timeline: it owns the Recharts line chart, axis
 * configuration, the custom dot, and the click handler.
 *
 * Recharts is mocked with thin wrappers so the tests can:
 *   - assert how many `Line` series are rendered and which props each gets,
 *   - exercise the inline `CustomDot` (which Recharts hands a runtime
 *     payload to) by feeding the dot prop a synthetic payload and
 *     rendering the result in the JSDOM tree.
 */

interface AnyProps {
  [key: string]: unknown;
  children?: ReactNode;
}

const SAMPLE_DOT_PROPS = {
  cx: 50,
  cy: 50,
  payload: {
    snapshotId: 'snap-test',
    date: 'Jan 1',
    fullDate: '2026-01-01',
    total: 1000,
  } as NetWorthChartDatum,
  value: 1000,
};

vi.mock('recharts', () => {
  const Pass = (props: AnyProps) =>
    createElement(
      'div',
      { 'data-testid': 'recharts-passthrough' },
      props.children,
    );

  const LineChartMock = (props: AnyProps) => {
    const data = props.data as unknown[] | undefined;
    return createElement(
      'div',
      {
        'data-testid': 'recharts-linechart',
        'data-points': Array.isArray(data) ? data.length : 0,
      },
      props.children,
    );
  };

  const Line = (props: AnyProps) => {
    // Realize the dot prop with a synthetic payload so the test can
    // click the resulting `CustomDot` element. Recharts itself does
    // this at render time with per-datum payloads, so this mirrors the
    // production call pattern closely enough to verify wiring.
    const dot = props.dot as
      | ReactNode
      | ((p: typeof SAMPLE_DOT_PROPS & { fill?: string }) => ReactNode);
    let dotEl: ReactNode = null;
    const sampleProps = { ...SAMPLE_DOT_PROPS, fill: props.stroke as string };

    if (typeof dot === 'function') {
      dotEl = (dot as (p: unknown) => ReactNode)(sampleProps);
    } else if (isValidElement(dot)) {
      // Cloning preserves the original component's defaults (e.g. `r`,
      // `strokeWidth`) while injecting the runtime payload. The component
      // type is `any` because we pass arbitrary runtime payload props that
      // have no static relationship to the original component's signature.
      const Cloned = dot.type as React.ComponentType<any>;
      // Newer @types/react widen `ReactElement.props` to `unknown`, so we
      // cast to a spreadable record before merging in the synthetic props.
      const dotProps = dot.props as Record<string, unknown>;
      dotEl = createElement(Cloned, { ...dotProps, ...sampleProps });
    }

    return createElement(
      'div',
      {
        'data-testid': 'recharts-line',
        'data-key': props.dataKey as string,
        'data-name': props.name as string,
        'data-stroke': props.stroke as string,
      },
      dotEl,
    );
  };

  const stub = (testId: string) => () =>
    createElement('div', { 'data-testid': testId });

  return {
    ResponsiveContainer: Pass,
    LineChart: LineChartMock,
    Line,
    XAxis: stub('recharts-xaxis'),
    YAxis: stub('recharts-yaxis'),
    CartesianGrid: stub('recharts-grid'),
    Tooltip: stub('recharts-tooltip'),
    Legend: stub('recharts-legend'),
  };
});

const buildDatum = (
  overrides: Partial<NetWorthChartDatum> = {},
): NetWorthChartDatum => ({
  date: 'Jan 1',
  fullDate: '2026-01-01',
  snapshotId: 's1',
  total: 1000,
  ...overrides,
});

const tooltipFormatter: NetWorthTooltipFormatter = (value, name) => [
  String(value),
  String(name),
];

describe('NetWorthChart', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the chart wrapper with the supplied data points', () => {
    render(
      <NetWorthChart
        chartData={[
          buildDatum({ snapshotId: 'a' }),
          buildDatum({ snapshotId: 'b' }),
        ]}
        currencies={[]}
        viewMode="total"
        showVariation={false}
        primaryCurrency="USD"
        tooltipFormatter={tooltipFormatter}
        onPointClick={vi.fn()}
      />,
    );

    const chart = screen.getByTestId('recharts-linechart');
    expect(chart).toHaveAttribute('data-points', '2');
  });

  it("renders a single 'Net Worth' line in total view mode", () => {
    render(
      <NetWorthChart
        chartData={[buildDatum()]}
        currencies={['USD', 'EUR']}
        viewMode="total"
        showVariation={false}
        primaryCurrency="USD"
        tooltipFormatter={tooltipFormatter}
        onPointClick={vi.fn()}
      />,
    );

    const lines = screen.getAllByTestId('recharts-line');
    expect(lines).toHaveLength(1);
    expect(lines[0]).toHaveAttribute('data-key', 'total');
    expect(lines[0]).toHaveAttribute('data-name', 'Net Worth');
  });

  it('renders one line per currency in breakdown mode with mapped colors', () => {
    render(
      <NetWorthChart
        chartData={[buildDatum()]}
        currencies={['USD', 'EUR', 'GBP']}
        viewMode="breakdown"
        showVariation={false}
        primaryCurrency="USD"
        tooltipFormatter={tooltipFormatter}
        onPointClick={vi.fn()}
      />,
    );

    const lines = screen.getAllByTestId('recharts-line');
    expect(lines).toHaveLength(3);
    expect(lines.map((l) => l.getAttribute('data-key'))).toEqual([
      'USD',
      'EUR',
      'GBP',
    ]);
    // Colors come from CURRENCY_LINE_COLORS in useNetWorthChartData.
    expect(lines[0]).toHaveAttribute('data-stroke', '#22c55e'); // USD
    expect(lines[1]).toHaveAttribute('data-stroke', '#3b82f6'); // EUR
    expect(lines[2]).toHaveAttribute('data-stroke', '#a855f7'); // GBP
  });

  it('falls back to the default color for unknown currencies', () => {
    render(
      <NetWorthChart
        chartData={[buildDatum()]}
        currencies={['XYZ']}
        viewMode="breakdown"
        showVariation={false}
        primaryCurrency="USD"
        tooltipFormatter={tooltipFormatter}
        onPointClick={vi.fn()}
      />,
    );

    const lines = screen.getAllByTestId('recharts-line');
    expect(lines).toHaveLength(1);
    expect(lines[0]).toHaveAttribute('data-stroke', '#8884d8');
  });

  it('invokes onPointClick with the datum payload when a dot is clicked', async () => {
    const user = userEvent.setup();
    const onPointClick = vi.fn();

    const { container } = render(
      <NetWorthChart
        chartData={[buildDatum()]}
        currencies={[]}
        viewMode="total"
        showVariation={false}
        primaryCurrency="USD"
        tooltipFormatter={tooltipFormatter}
        onPointClick={onPointClick}
      />,
    );

    const dot = container.querySelector('.cursor-pointer');
    expect(dot).not.toBeNull();
    await user.click(dot!);

    expect(onPointClick).toHaveBeenCalledTimes(1);
    expect(onPointClick).toHaveBeenCalledWith(
      expect.objectContaining({
        snapshotId: 'snap-test',
        fullDate: '2026-01-01',
      }),
    );
  });

  it('invokes onPointClick for a breakdown-mode dot with the mapped color', async () => {
    const user = userEvent.setup();
    const onPointClick = vi.fn();

    const { container } = render(
      <NetWorthChart
        chartData={[buildDatum()]}
        currencies={['USD']}
        viewMode="breakdown"
        showVariation={false}
        primaryCurrency="USD"
        tooltipFormatter={tooltipFormatter}
        onPointClick={onPointClick}
      />,
    );

    const dot = container.querySelector('.cursor-pointer');
    expect(dot).not.toBeNull();
    await user.click(dot!);

    expect(onPointClick).toHaveBeenCalledTimes(1);
    expect(onPointClick).toHaveBeenCalledWith(
      expect.objectContaining({ snapshotId: 'snap-test' }),
    );
  });

  it('does not crash when given empty chart data', () => {
    render(
      <NetWorthChart
        chartData={[]}
        currencies={[]}
        viewMode="total"
        showVariation={false}
        primaryCurrency="USD"
        tooltipFormatter={tooltipFormatter}
        onPointClick={vi.fn()}
      />,
    );

    const chart = screen.getByTestId('recharts-linechart');
    expect(chart).toHaveAttribute('data-points', '0');
  });

  it('renders the X/Y axes, legend and tooltip primitives', () => {
    render(
      <NetWorthChart
        chartData={[buildDatum()]}
        currencies={[]}
        viewMode="total"
        showVariation
        primaryCurrency="USD"
        tooltipFormatter={tooltipFormatter}
        onPointClick={vi.fn()}
      />,
    );

    expect(screen.getByTestId('recharts-xaxis')).toBeInTheDocument();
    expect(screen.getByTestId('recharts-yaxis')).toBeInTheDocument();
    expect(screen.getByTestId('recharts-legend')).toBeInTheDocument();
    expect(screen.getByTestId('recharts-tooltip')).toBeInTheDocument();
    expect(screen.getByTestId('recharts-grid')).toBeInTheDocument();
  });
});
