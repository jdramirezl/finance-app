import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createElement, forwardRef, useImperativeHandle, type Ref } from 'react';
import { render, screen, fireEvent } from '../../../test/testUtils';
import userEvent from '@testing-library/user-event';
import NetWorthTimelineWidget, {
  calculateZoomRange,
} from '../NetWorthTimelineWidget';
import type { NetWorthSnapshot } from '../../../services/netWorthSnapshotService';
import type { NetWorthEditModalHandle } from '../NetWorthEditModal';

/**
 * Tests for {@link NetWorthTimelineWidget}. The widget is a lightweight
 * orchestrator: it owns the view-mode + range chip + variation state,
 * hands the shaping work to `useNetWorthChartData`, delegates rendering
 * to `NetWorthEChart`/`ExchangeRateTrend`, and routes chart clicks into
 * the imperative edit modal. Wave 4 swapped the date-range buttons for
 * chip-based controls that drive the chart's dataZoom rather than
 * filtering the dataset, so these tests assert on the chip wiring and
 * the dataZoomStart/End props handed to the underlying ECharts
 * component. Wave 5 retired the Recharts-based "By Currency" chart, so
 * `NetWorthEChart` is now used for both Total and Breakdown views and
 * receives a `currencyData` prop in the latter.
 *
 * The hooks and child components are mocked so each test focuses on the
 * orchestration logic instead of re-testing the chart and modal
 * internals (which have their own suites).
 */

const mocks = vi.hoisted(() => ({
  useSnapshotsQuery: vi.fn(),
  useSettingsQuery: vi.fn(),
  useNetWorthChartData: vi.fn(),
  modalOpen: vi.fn(),
  echartProps: vi.fn(),
}));

vi.mock('../../../hooks/queries/useNetWorthSnapshotQueries', () => ({
  useNetWorthSnapshotsQuery: () => mocks.useSnapshotsQuery(),
}));

vi.mock('../../../hooks/queries', () => ({
  useSettingsQuery: () => mocks.useSettingsQuery(),
}));

vi.mock('../../../hooks/useNetWorthChartData', async (importOriginal) => {
  // Preserve `CURRENCY_LINE_COLORS` and any other re-exports the widget
  // imports alongside the hook itself — only the hook function is
  // stubbed so we can assert the params it was called with.
  const actual =
    await importOriginal<typeof import('../../../hooks/useNetWorthChartData')>();
  return {
    ...actual,
    useNetWorthChartData: (params: unknown) => mocks.useNetWorthChartData(params),
  };
});

vi.mock('../NetWorthEChart', () => {
  // Wave 5: the widget now renders NetWorthEChart for both Total and
  // Breakdown modes, branching on `viewMode`/`currencyData`. The mock
  // surfaces the props the orchestration tests care about as
  // `data-*` attributes for cheap querying, and forwards every prop to
  // `mocks.echartProps` so the prop-wiring tests can assert against the
  // full call history.
  type CurrencySeries = {
    currency: string;
    values: number[];
    nativeValues: number[];
    color: string;
  };
  const Mock = (props: {
    onPointClick: (datum: {
      snapshotId: string;
      fullDate: string;
    }) => void;
    dataZoomStart?: number;
    dataZoomEnd?: number;
    viewMode?: 'total' | 'breakdown';
    currencyData?: CurrencySeries[];
  }) => {
    mocks.echartProps(props);
    return createElement(
      'button',
      {
        'data-testid': 'net-worth-chart-mock',
        'data-chart-impl': 'echarts',
        'data-view-mode': props.viewMode ?? 'total',
        'data-currency-count':
          props.currencyData != null
            ? String(props.currencyData.length)
            : '',
        'data-zoom-start':
          props.dataZoomStart != null ? String(props.dataZoomStart) : '',
        'data-zoom-end':
          props.dataZoomEnd != null ? String(props.dataZoomEnd) : '',
        type: 'button',
        onClick: () =>
          props.onPointClick({
            snapshotId: 's1',
            fullDate: '2026-01-01',
          }),
      },
      'chart',
    );
  };
  return {
    default: Mock,
  };
});

vi.mock('../NetWorthEditModal', () => {
  const Mock = forwardRef((_: unknown, ref: Ref<NetWorthEditModalHandle>) => {
    useImperativeHandle(
      ref,
      () => ({
        open: (snapshot) => mocks.modalOpen(snapshot),
      }),
      [],
    );
    return null;
  });
  Mock.displayName = 'NetWorthEditModalMock';
  return { default: Mock };
});

vi.mock('../ExchangeRateTrend', () => {
  const Mock = () =>
    createElement(
      'div',
      { 'data-testid': 'exchange-rate-trend-mock' },
      'rates',
    );
  return { default: Mock };
});

const buildSnapshot = (
  overrides: Partial<NetWorthSnapshot> = {},
): NetWorthSnapshot => ({
  id: 's1',
  userId: 'u1',
  snapshotDate: '2026-01-01',
  totalNetWorth: 100,
  baseCurrency: 'USD',
  breakdown: { USD: 100 },
  createdAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

const lastChartDataParams = () => {
  const calls = mocks.useNetWorthChartData.mock.calls;
  return calls.at(-1)?.[0] as Record<string, unknown> | undefined;
};

const lastEChartProps = () => {
  const calls = mocks.echartProps.mock.calls;
  return calls.at(-1)?.[0] as
    | {
        dataZoomStart?: number;
        dataZoomEnd?: number;
        viewMode?: 'total' | 'breakdown';
        currencyData?: Array<{
          currency: string;
          values: number[];
          nativeValues: number[];
          color: string;
        }>;
      }
    | undefined;
};

/**
 * Build a 24-snapshot history spread one month apart. Used by the
 * range-chip tests so the index-based zoom math (last 12 / last 24)
 * has enough data to produce non-trivial percentages.
 */
const buildMonthlyChartData = (count: number) =>
  Array.from({ length: count }, (_, i) => {
    const month = String((i % 12) + 1).padStart(2, '0');
    const year = 2024 + Math.floor(i / 12);
    const fullDate = `${year}-${month}-01`;
    return {
      date: `Mon ${i + 1}`,
      fullDate,
      snapshotId: `s${i + 1}`,
      total: 100 + i,
    };
  });

describe('NetWorthTimelineWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useSnapshotsQuery.mockReturnValue({
      data: [buildSnapshot()],
      isLoading: false,
    });
    mocks.useSettingsQuery.mockReturnValue({
      data: { primaryCurrency: 'USD' },
    });
    mocks.useNetWorthChartData.mockReturnValue({
      chartData: [
        {
          date: 'Jan 1',
          fullDate: '2026-01-01',
          snapshotId: 's1',
          total: 100,
        },
      ],
      currencies: ['USD'],
      tooltipFormatter: vi.fn(),
    });
  });

  it('renders the loading skeleton while snapshots are loading', () => {
    mocks.useSnapshotsQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
    });

    const { container } = render(<NetWorthTimelineWidget />);

    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: /net worth timeline/i }),
    ).not.toBeInTheDocument();
  });

  it('renders the empty state when there are no snapshots', () => {
    mocks.useSnapshotsQuery.mockReturnValue({ data: [], isLoading: false });

    render(<NetWorthTimelineWidget />);

    expect(screen.getByText(/no net worth data yet/i)).toBeInTheDocument();
    expect(
      screen.getByText(/snapshots will appear here once you start tracking/i),
    ).toBeInTheDocument();
    expect(screen.queryByTestId('net-worth-chart-mock')).not.toBeInTheDocument();
  });

  it('renders the header, mode tabs, range chips, variation toggle and chart by default', () => {
    render(<NetWorthTimelineWidget />);

    expect(
      screen.getByRole('heading', { name: /net worth timeline/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^total$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /by currency/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^rates$/i })).toBeInTheDocument();
    // The new chips replaced the old date-range buttons.
    expect(screen.getByRole('button', { name: '1Y' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '2Y' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'All' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Custom' })).toBeInTheDocument();
    expect(screen.getByLabelText(/show variation/i)).toBeInTheDocument();
    expect(screen.getByTestId('net-worth-chart-mock')).toBeInTheDocument();
  });

  it('does not render the legacy click-to-edit instruction text', () => {
    render(<NetWorthTimelineWidget />);

    // Instruction text was removed in Wave 4 — the click-to-edit
    // affordance is still wired through the chart's onPointClick.
    expect(
      screen.queryByText(/click any point on the chart/i),
    ).not.toBeInTheDocument();
  });

  it('always asks the data hook for the full snapshot history regardless of selected chip', async () => {
    const user = userEvent.setup();
    render(<NetWorthTimelineWidget />);

    expect(lastChartDataParams()).toEqual(
      expect.objectContaining({ dateRange: 'all' }),
    );

    await user.click(screen.getByRole('button', { name: '2Y' }));

    expect(lastChartDataParams()).toEqual(
      expect.objectContaining({ dateRange: 'all' }),
    );
  });

  it('shows the rates panel and hides the chart controls when Rates tab is active', async () => {
    const user = userEvent.setup();
    render(<NetWorthTimelineWidget />);

    await user.click(screen.getByRole('button', { name: /^rates$/i }));

    expect(screen.getByTestId('exchange-rate-trend-mock')).toBeInTheDocument();
    expect(screen.queryByTestId('net-worth-chart-mock')).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/show variation/i)).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: '1Y' }),
    ).not.toBeInTheDocument();
  });

  it('switches the chart data viewMode when By Currency is clicked', async () => {
    const user = userEvent.setup();
    render(<NetWorthTimelineWidget />);

    await user.click(screen.getByRole('button', { name: /by currency/i }));

    expect(lastChartDataParams()).toEqual(
      expect.objectContaining({ viewMode: 'breakdown' }),
    );
  });

  it('forwards dataZoomStart/End to the EChart for the active range chip', async () => {
    // 24 monthly snapshots = enough range for meaningful 1Y / 2Y math.
    mocks.useNetWorthChartData.mockReturnValue({
      chartData: buildMonthlyChartData(24),
      currencies: ['USD'],
      tooltipFormatter: vi.fn(),
    });

    const user = userEvent.setup();
    render(<NetWorthTimelineWidget />);

    // Default chip is `1Y` -> last 12 of 24 points -> roughly mid-range.
    const onMount = lastEChartProps();
    expect(onMount?.dataZoomStart).toBeGreaterThan(40);
    expect(onMount?.dataZoomStart).toBeLessThan(60);
    expect(onMount?.dataZoomEnd).toBe(100);

    await user.click(screen.getByRole('button', { name: 'All' }));
    expect(lastEChartProps()).toMatchObject({
      dataZoomStart: 0,
      dataZoomEnd: 100,
    });

    await user.click(screen.getByRole('button', { name: '2Y' }));
    // Last 24 of 24 points -> full range.
    expect(lastEChartProps()).toMatchObject({
      dataZoomStart: 0,
      dataZoomEnd: 100,
    });
  });

  it('opens the custom date popover when the Custom chip is clicked', async () => {
    const user = userEvent.setup();
    render(<NetWorthTimelineWidget />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Custom' }));

    expect(
      screen.getByRole('dialog', { name: /custom date range/i }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('From')).toBeInTheDocument();
    expect(screen.getByLabelText('To')).toBeInTheDocument();
  });

  it('applies a custom date range and forwards the resulting zoom percentages', async () => {
    mocks.useNetWorthChartData.mockReturnValue({
      chartData: buildMonthlyChartData(24),
      currencies: ['USD'],
      tooltipFormatter: vi.fn(),
    });

    const user = userEvent.setup();
    render(<NetWorthTimelineWidget />);

    await user.click(screen.getByRole('button', { name: 'Custom' }));

    // fireEvent.change drives React's controlled-input update path —
    // userEvent.type doesn't reliably set `<input type="month">` values
    // in jsdom.
    fireEvent.change(screen.getByLabelText('From'), {
      target: { value: '2025-01' },
    });
    fireEvent.change(screen.getByLabelText('To'), {
      target: { value: '2025-06' },
    });

    await user.click(screen.getByRole('button', { name: 'Apply' }));

    // After Apply, the popover closes and the chart receives a
    // narrowed zoom window inside the data extent.
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    const props = lastEChartProps();
    expect(props?.dataZoomStart).toBeGreaterThan(0);
    expect(props?.dataZoomEnd).toBeLessThan(100);
    expect(props?.dataZoomStart).toBeLessThan(props?.dataZoomEnd ?? 0);
  });

  it('toggles the showVariation flag when the variation checkbox is clicked', async () => {
    const user = userEvent.setup();
    render(<NetWorthTimelineWidget />);

    await user.click(screen.getByLabelText(/show variation/i));

    expect(lastChartDataParams()).toEqual(
      expect.objectContaining({ showVariation: true }),
    );
  });

  it('opens the edit modal with the matching snapshot when a chart point is clicked', async () => {
    const snapshot = buildSnapshot();
    mocks.useSnapshotsQuery.mockReturnValue({
      data: [snapshot],
      isLoading: false,
    });

    const user = userEvent.setup();
    render(<NetWorthTimelineWidget />);

    await user.click(screen.getByTestId('net-worth-chart-mock'));

    expect(mocks.modalOpen).toHaveBeenCalledTimes(1);
    expect(mocks.modalOpen).toHaveBeenCalledWith(snapshot);
  });

  it('falls back to matching by snapshotDate when the id does not match', async () => {
    const legacy = buildSnapshot({ id: 'legacy', snapshotDate: '2026-01-01' });
    mocks.useSnapshotsQuery.mockReturnValue({
      data: [legacy],
      isLoading: false,
    });

    const user = userEvent.setup();
    render(<NetWorthTimelineWidget />);

    await user.click(screen.getByTestId('net-worth-chart-mock'));

    // Click sends snapshotId 's1' which does not match 'legacy', so the
    // widget falls back to matching the click's fullDate against
    // snapshotDate.
    expect(mocks.modalOpen).toHaveBeenCalledWith(legacy);
  });

  it('does not open the edit modal when no snapshot matches the click', async () => {
    mocks.useSnapshotsQuery.mockReturnValue({
      data: [buildSnapshot({ id: 'other', snapshotDate: '2030-01-01' })],
      isLoading: false,
    });

    const user = userEvent.setup();
    render(<NetWorthTimelineWidget />);

    await user.click(screen.getByTestId('net-worth-chart-mock'));

    expect(mocks.modalOpen).not.toHaveBeenCalled();
  });

  it('shows the latest snapshot summary in total mode', () => {
    render(<NetWorthTimelineWidget />);

    expect(screen.getByText(/latest snapshot:/i)).toBeInTheDocument();
    expect(screen.getByText(/2026-01-01/)).toBeInTheDocument();
  });

  it('hides the latest snapshot summary in breakdown mode', async () => {
    const user = userEvent.setup();
    render(<NetWorthTimelineWidget />);

    await user.click(screen.getByRole('button', { name: /by currency/i }));

    expect(screen.queryByText(/latest snapshot:/i)).not.toBeInTheDocument();
  });

  it('falls back to USD primaryCurrency when no settings data is loaded', () => {
    mocks.useSettingsQuery.mockReturnValue({ data: undefined });

    render(<NetWorthTimelineWidget />);

    expect(lastChartDataParams()).toEqual(
      expect.objectContaining({ primaryCurrency: 'USD' }),
    );
  });

  it('renders the ECharts implementation in total mode with viewMode=total', () => {
    render(<NetWorthTimelineWidget />);

    const chart = screen.getByTestId('net-worth-chart-mock');
    expect(chart).toHaveAttribute('data-chart-impl', 'echarts');
    expect(chart).toHaveAttribute('data-view-mode', 'total');
    expect(mocks.echartProps).toHaveBeenCalled();
    expect(mocks.echartProps).toHaveBeenLastCalledWith(
      expect.objectContaining({
        viewMode: 'total',
        // Total mode does not pass per-currency series data — the
        // single aggregate line is sourced from `data` alone.
        currencyData: undefined,
      }),
    );
  });

  it('renders the ECharts implementation in breakdown mode with viewMode=breakdown and currencyData', async () => {
    // Provide a multi-currency hook payload so the widget has values to
    // forward into the breakdown `currencyData`.
    mocks.useNetWorthChartData.mockReturnValue({
      chartData: [
        {
          date: 'Jan 1',
          fullDate: '2026-01-01',
          snapshotId: 's1',
          total: 100,
          USD: 60,
          USD_native: 50,
          MXN: 40,
          MXN_native: 800,
        },
      ],
      currencies: ['USD', 'MXN'],
      tooltipFormatter: vi.fn(),
    });

    const user = userEvent.setup();
    render(<NetWorthTimelineWidget />);

    await user.click(screen.getByRole('button', { name: /by currency/i }));

    const chart = screen.getByTestId('net-worth-chart-mock');
    expect(chart).toHaveAttribute('data-chart-impl', 'echarts');
    expect(chart).toHaveAttribute('data-view-mode', 'breakdown');
    expect(chart).toHaveAttribute('data-currency-count', '2');

    // The widget should reshape the chartData rows into a per-currency
    // array. Each entry's `values` come from `chartData[i][currency]`,
    // `nativeValues` come from `chartData[i][${currency}_native]`, and
    // the color is sourced from the shared `CURRENCY_LINE_COLORS` map.
    const props = lastEChartProps();
    expect(props?.currencyData).toEqual([
      expect.objectContaining({
        currency: 'USD',
        values: [60],
        nativeValues: [50],
        color: '#22c55e',
      }),
      expect.objectContaining({
        currency: 'MXN',
        values: [40],
        nativeValues: [800],
        color: '#f97316',
      }),
    ]);
  });

  it('forwards primaryCurrency and showVariation to NetWorthEChart in total mode', async () => {
    mocks.useSettingsQuery.mockReturnValue({
      data: { primaryCurrency: 'COP' },
    });
    const user = userEvent.setup();
    render(<NetWorthTimelineWidget />);

    // Default state: showVariation off
    expect(mocks.echartProps).toHaveBeenLastCalledWith(
      expect.objectContaining({
        primaryCurrency: 'COP',
        showVariation: false,
      }),
    );

    await user.click(screen.getByLabelText(/show variation/i));

    expect(mocks.echartProps).toHaveBeenLastCalledWith(
      expect.objectContaining({
        primaryCurrency: 'COP',
        showVariation: true,
      }),
    );
  });
});

describe('calculateZoomRange', () => {
  // Pure helper exposed by the widget so the percentage math can be
  // exercised independently of the rendering pipeline.

  const monthlyTimestamps = (count: number): number[] =>
    Array.from({ length: count }, (_, i) =>
      Date.UTC(2024, i, 1, 0, 0, 0),
    );

  it('returns the full range for empty data', () => {
    expect(calculateZoomRange([], '1y')).toEqual({ start: 0, end: 100 });
  });

  it('returns the full range for the "all" preset', () => {
    expect(calculateZoomRange(monthlyTimestamps(24), 'all')).toEqual({
      start: 0,
      end: 100,
    });
  });

  it('returns the full range when the time span is zero (single point)', () => {
    expect(calculateZoomRange([Date.UTC(2025, 0, 1)], '1y')).toEqual({
      start: 0,
      end: 100,
    });
  });

  it('zooms to the last 12 points for the "1y" preset on a 24-point dataset', () => {
    const result = calculateZoomRange(monthlyTimestamps(24), '1y');
    expect(result.end).toBe(100);
    // Start should land somewhere mid-range — the 12th of 24 points.
    expect(result.start).toBeGreaterThan(40);
    expect(result.start).toBeLessThan(60);
  });

  it('zooms to the last 24 points for the "2y" preset on a 24-point dataset', () => {
    expect(calculateZoomRange(monthlyTimestamps(24), '2y')).toEqual({
      start: 0,
      end: 100,
    });
  });

  it('clamps the "1y" window to the full range when fewer than 12 points exist', () => {
    expect(calculateZoomRange(monthlyTimestamps(6), '1y')).toEqual({
      start: 0,
      end: 100,
    });
  });

  it('returns the full range for "custom" without both From and To set', () => {
    const ts = monthlyTimestamps(24);
    expect(calculateZoomRange(ts, 'custom', '2024-06')).toEqual({
      start: 0,
      end: 100,
    });
    expect(calculateZoomRange(ts, 'custom', undefined, '2024-12')).toEqual({
      start: 0,
      end: 100,
    });
  });

  it('produces a narrowed range for a valid custom From/To inside the data extent', () => {
    const ts = monthlyTimestamps(24); // Jan 2024 .. Dec 2025
    const result = calculateZoomRange(ts, 'custom', '2025-01', '2025-06');
    expect(result.start).toBeGreaterThan(0);
    expect(result.end).toBeLessThan(100);
    expect(result.start).toBeLessThan(result.end);
  });

  it('clamps custom From/To percentages outside the data extent to [0, 100]', () => {
    const ts = monthlyTimestamps(24); // Jan 2024 .. Dec 2025
    const result = calculateZoomRange(ts, 'custom', '2020-01', '2030-12');
    expect(result.start).toBe(0);
    expect(result.end).toBe(100);
  });

  it('returns the full range when From >= To', () => {
    const ts = monthlyTimestamps(24);
    expect(calculateZoomRange(ts, 'custom', '2025-06', '2025-01')).toEqual({
      start: 0,
      end: 100,
    });
  });
});
