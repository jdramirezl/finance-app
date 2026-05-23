import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createElement, forwardRef, useImperativeHandle, type Ref } from 'react';
import { render, screen } from '../../../test/testUtils';
import userEvent from '@testing-library/user-event';
import NetWorthTimelineWidget from '../NetWorthTimelineWidget';
import type { NetWorthSnapshot } from '../../../services/netWorthSnapshotService';
import type { NetWorthEditModalHandle } from '../NetWorthEditModal';

/**
 * Tests for {@link NetWorthTimelineWidget}. The widget is a lightweight
 * orchestrator: it owns view-mode/date-range/variation state, hands the
 * shaping work to `useNetWorthChartData`, delegates rendering to
 * `NetWorthChart`/`ExchangeRateTrend`, and routes chart clicks into the
 * imperative edit modal.
 *
 * The hooks and child components are mocked so each test focuses on the
 * orchestration logic — what props the chart hook is called with, what
 * the tabs/controls switch, and how clicks resolve a snapshot for the
 * modal — instead of re-testing the chart and modal internals (which
 * have their own suites).
 */

const mocks = vi.hoisted(() => ({
  useSnapshotsQuery: vi.fn(),
  useSettingsQuery: vi.fn(),
  useNetWorthChartData: vi.fn(),
  modalOpen: vi.fn(),
  chartProps: vi.fn(),
}));

vi.mock('../../../hooks/queries/useNetWorthSnapshotQueries', () => ({
  useNetWorthSnapshotsQuery: () => mocks.useSnapshotsQuery(),
}));

vi.mock('../../../hooks/queries', () => ({
  useSettingsQuery: () => mocks.useSettingsQuery(),
}));

vi.mock('../../../hooks/useNetWorthChartData', () => ({
  useNetWorthChartData: (params: unknown) => mocks.useNetWorthChartData(params),
}));

vi.mock('../NetWorthChart', () => {
  const Mock = (props: {
    onPointClick: (datum: { snapshotId: string; fullDate: string }) => void;
  }) => {
    mocks.chartProps(props);
    return createElement(
      'button',
      {
        'data-testid': 'net-worth-chart-mock',
        type: 'button',
        onClick: () =>
          props.onPointClick({ snapshotId: 's1', fullDate: '2026-01-01' }),
      },
      'chart',
    );
  };
  return { default: Mock };
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

  it('renders the header, mode tabs, date range buttons, variation toggle and chart by default', () => {
    render(<NetWorthTimelineWidget />);

    expect(
      screen.getByRole('heading', { name: /net worth timeline/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^total$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /by currency/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^rates$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /30 days/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /6 months/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /1 year/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /all time/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/show variation/i)).toBeInTheDocument();
    expect(screen.getByTestId('net-worth-chart-mock')).toBeInTheDocument();
  });

  it('shows the rates panel and hides the chart controls when Rates tab is active', async () => {
    const user = userEvent.setup();
    render(<NetWorthTimelineWidget />);

    await user.click(screen.getByRole('button', { name: /^rates$/i }));

    expect(screen.getByTestId('exchange-rate-trend-mock')).toBeInTheDocument();
    expect(screen.queryByTestId('net-worth-chart-mock')).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/show variation/i)).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /6 months/i }),
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

  it('forwards the selected date range to useNetWorthChartData', async () => {
    const user = userEvent.setup();
    render(<NetWorthTimelineWidget />);

    await user.click(screen.getByRole('button', { name: /1 year/i }));

    expect(lastChartDataParams()).toEqual(
      expect.objectContaining({ dateRange: '1y' }),
    );
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
});
