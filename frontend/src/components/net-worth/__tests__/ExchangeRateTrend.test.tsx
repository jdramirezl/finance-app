import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createElement, type ReactNode } from 'react';
import { render, screen } from '../../../test/testUtils';
import userEvent from '@testing-library/user-event';
import ExchangeRateTrend from '../ExchangeRateTrend';

/**
 * Tests for {@link ExchangeRateTrend}. The component composes
 * `useQueries` from TanStack Query with the user's accounts/settings to
 * project per-currency exchange-rate history into a Recharts line chart.
 *
 * `useQueries` is mocked directly so each test can drive the loading,
 * empty, and populated states without orchestrating real promise
 * timings. Recharts primitives are stubbed with simple DOM elements so
 * the tests can assert on structure without depending on the chart's
 * SVG layout.
 */

const mocks = vi.hoisted(() => ({
  useQueriesMock: vi.fn(),
  useSettingsQueryMock: vi.fn(),
  useAccountsQueryMock: vi.fn(),
  getExchangeRateHistory: vi.fn(),
}));

vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual<typeof import('@tanstack/react-query')>(
    '@tanstack/react-query',
  );
  return {
    ...actual,
    useQueries: mocks.useQueriesMock,
  };
});

vi.mock('../../../hooks/queries', () => ({
  useSettingsQuery: () => mocks.useSettingsQueryMock(),
  useAccountsQuery: () => mocks.useAccountsQueryMock(),
}));

vi.mock('../../../services/currencyService', () => ({
  currencyService: {
    getExchangeRateHistory: mocks.getExchangeRateHistory,
    convert: vi.fn().mockResolvedValue(1),
  },
}));

vi.mock('recharts', () => {
  const Pass = ({ children }: { children?: ReactNode }) =>
    createElement('div', { 'data-testid': 'recharts-passthrough' }, children);
  const stub = (testId: string) => () =>
    createElement('div', { 'data-testid': testId });
  return {
    ResponsiveContainer: Pass,
    LineChart: Pass,
    Line: stub('recharts-line'),
    XAxis: stub('recharts-xaxis'),
    YAxis: stub('recharts-yaxis'),
    CartesianGrid: stub('recharts-grid'),
    Tooltip: stub('recharts-tooltip'),
    Legend: stub('recharts-legend'),
  };
});

interface TestAccount {
  id: string;
  name: string;
  color: string;
  currency: string;
  balance: number;
  type: 'normal';
}

const accounts: TestAccount[] = [
  { id: 'a1', name: 'USD Bank', color: '#000', currency: 'USD', balance: 100, type: 'normal' },
  { id: 'a2', name: 'EUR Bank', color: '#111', currency: 'EUR', balance: 200, type: 'normal' },
  { id: 'a3', name: 'MXN Bank', color: '#222', currency: 'MXN', balance: 300, type: 'normal' },
];

describe('ExchangeRateTrend', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useSettingsQueryMock.mockReturnValue({
      data: { primaryCurrency: 'USD' },
    });
    mocks.useAccountsQueryMock.mockReturnValue({ data: accounts });
    // Default: two non-loading queries with no entries — drives the
    // "collecting rate data" empty state.
    mocks.useQueriesMock.mockReturnValue([
      { isLoading: false, data: { data: [] } },
      { isLoading: false, data: { data: [] } },
    ]);
  });

  it('renders all four day-range buttons with 90d active by default', () => {
    render(<ExchangeRateTrend />);

    const button30 = screen.getByRole('button', { name: '30d' });
    const button90 = screen.getByRole('button', { name: '90d' });
    const button180 = screen.getByRole('button', { name: '180d' });
    const button365 = screen.getByRole('button', { name: '365d' });

    expect(button30).toBeInTheDocument();
    expect(button180).toBeInTheDocument();
    expect(button365).toBeInTheDocument();
    expect(button90).toHaveClass('bg-blue-500');
    expect(button30).not.toHaveClass('bg-blue-500');
  });

  it('updates the active range when a different button is clicked', async () => {
    const user = userEvent.setup();
    render(<ExchangeRateTrend />);

    const button30 = screen.getByRole('button', { name: '30d' });
    await user.click(button30);

    expect(button30).toHaveClass('bg-blue-500');
    expect(screen.getByRole('button', { name: '90d' })).not.toHaveClass(
      'bg-blue-500',
    );
  });

  it('shows the loading skeleton while any query is loading', () => {
    mocks.useQueriesMock.mockReturnValue([
      { isLoading: true, data: undefined },
      { isLoading: false, data: { data: [] } },
    ]);

    const { container } = render(<ExchangeRateTrend />);
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
    expect(screen.queryByText(/collecting rate data/i)).not.toBeInTheDocument();
  });

  it('shows the empty/collecting state when there is not enough data to plot', () => {
    render(<ExchangeRateTrend />);

    expect(screen.getByText(/collecting rate data/i)).toBeInTheDocument();
    expect(
      screen.getByText(/chart will populate over time/i),
    ).toBeInTheDocument();
    // No chart series should be rendered in the empty state.
    expect(screen.queryByTestId('recharts-line')).not.toBeInTheDocument();
  });

  it('renders one chart line per non-primary currency once data is available', () => {
    mocks.useQueriesMock.mockReturnValue([
      {
        isLoading: false,
        data: {
          data: [
            { date: '2026-01-01', rate: 1.0 },
            { date: '2026-01-02', rate: 1.05 },
            { date: '2026-01-03', rate: 0.98 },
          ],
        },
      },
      {
        isLoading: false,
        data: {
          data: [
            { date: '2026-01-01', rate: 18.0 },
            { date: '2026-01-02', rate: 18.5 },
          ],
        },
      },
    ]);

    render(<ExchangeRateTrend />);

    expect(screen.queryByText(/collecting rate data/i)).not.toBeInTheDocument();
    expect(screen.getAllByTestId('recharts-line')).toHaveLength(2);
  });

  it('excludes the primary currency from the rate queries', () => {
    render(<ExchangeRateTrend />);

    const calls = mocks.useQueriesMock.mock.calls;
    expect(calls.length).toBeGreaterThan(0);

    const lastConfig = calls[calls.length - 1][0] as {
      queries: Array<{ queryKey: unknown[] }>;
    };
    const requestedCurrencies = lastConfig.queries.map(
      (q) => q.queryKey[2] as string,
    );

    expect(requestedCurrencies).not.toContain('USD');
    expect(requestedCurrencies).toEqual(
      expect.arrayContaining(['EUR', 'MXN']),
    );
  });

  it('threads the current day range through every query key', async () => {
    const user = userEvent.setup();
    render(<ExchangeRateTrend />);

    await user.click(screen.getByRole('button', { name: '365d' }));

    const calls = mocks.useQueriesMock.mock.calls;
    const lastConfig = calls[calls.length - 1][0] as {
      queries: Array<{ queryKey: unknown[] }>;
    };
    const days = lastConfig.queries.map((q) => q.queryKey[4] as number);

    // Every query for the latest render uses the newly selected range.
    expect(days.every((d) => d === 365)).toBe(true);
  });

  it('renders nothing chart-related when the user has no foreign-currency accounts', () => {
    mocks.useAccountsQueryMock.mockReturnValue({
      data: [accounts[0]], // Only USD, same as primary
    });
    mocks.useQueriesMock.mockReturnValue([]);

    render(<ExchangeRateTrend />);

    // Range buttons still render so the user can configure once data arrives,
    // but no series and no loading skeleton.
    expect(screen.getByRole('button', { name: '90d' })).toBeInTheDocument();
    expect(screen.queryByTestId('recharts-line')).not.toBeInTheDocument();
  });
});
