import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../../../test/testUtils';
import MonthlyTrend from '../MonthlyTrend';

vi.mock('../../../hooks/queries/useReportsQueries', () => ({
  useMonthlyTrendQuery: vi.fn(),
}));

vi.mock('../../../hooks/queries/useSettingsQuery', () => ({
  useSettingsQuery: vi.fn(() => ({ data: { primaryCurrency: 'USD' } })),
}));

vi.mock('../../../services/currencyService', () => ({
  currencyService: {
    convertBatch: vi.fn((requests: any[]) =>
      Promise.resolve(requests.map(r => ({ convertedAmount: r.amount * 0.05, rate: 0.05 })))
    ),
  },
}));

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
  ComposedChart: ({ children }: any) => <div data-testid="composed-chart">{children}</div>,
  Bar: ({ dataKey, name }: any) => <div data-testid={`bar-${dataKey}`}>{name}</div>,
  Line: ({ dataKey, name }: any) => <div data-testid={`line-${dataKey}`}>{name}</div>,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
}));

import { useMonthlyTrendQuery } from '../../../hooks/queries/useReportsQueries';

const mockQuery = vi.mocked(useMonthlyTrendQuery);

const mockData = {
  data: [
    { month: '2024-01', income: [{ currency: 'USD', amount: 5000 }], expenses: [{ currency: 'USD', amount: 3000 }] },
    { month: '2024-02', income: [{ currency: 'USD', amount: 4500 }], expenses: [{ currency: 'USD', amount: 3500 }] },
  ],
};

describe('MonthlyTrend', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading skeleton when fetching', () => {
    mockQuery.mockReturnValue({ data: undefined, isLoading: true } as any);

    render(<MonthlyTrend months={6} />);

    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('renders empty state when no data', async () => {
    mockQuery.mockReturnValue({ data: { data: [] }, isLoading: false } as any);

    render(<MonthlyTrend months={6} />);

    await waitFor(() => {
      expect(screen.getByText('No data available')).toBeInTheDocument();
    });
  });

  it('renders chart with income bar, expenses bar, and net line', async () => {
    mockQuery.mockReturnValue({ data: mockData, isLoading: false } as any);

    render(<MonthlyTrend months={6} />);

    await waitFor(() => {
      expect(screen.getByTestId('composed-chart')).toBeInTheDocument();
      expect(screen.getByTestId('bar-income')).toBeInTheDocument();
      expect(screen.getByTestId('bar-expenses')).toBeInTheDocument();
      expect(screen.getByTestId('line-net')).toBeInTheDocument();
    });
  });

  it('passes months to query hook', () => {
    mockQuery.mockReturnValue({ data: undefined, isLoading: true } as any);

    render(<MonthlyTrend months={12} />);

    expect(mockQuery).toHaveBeenCalledWith(12);
  });
});
