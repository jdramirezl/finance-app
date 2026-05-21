import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '../../../test/testUtils';
import MonthlyTrend from '../MonthlyTrend';

vi.mock('../../../hooks/queries/useReportsQueries', () => ({
  useMonthlyTrendQuery: vi.fn(),
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
    { month: '2024-01', income: 5000, expenses: 3000, net: 2000 },
    { month: '2024-02', income: 4500, expenses: 3500, net: 1000 },
    { month: '2024-03', income: 5200, expenses: 2800, net: 2400 },
  ],
  currency: 'USD',
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

  it('renders empty state when no data', () => {
    mockQuery.mockReturnValue({ data: { data: [], currency: 'USD' }, isLoading: false } as any);

    render(<MonthlyTrend months={6} />);

    expect(screen.getByText('No data available')).toBeInTheDocument();
  });

  it('renders chart with income bar, expenses bar, and net line', () => {
    mockQuery.mockReturnValue({ data: mockData, isLoading: false } as any);

    render(<MonthlyTrend months={6} />);

    expect(screen.getByTestId('composed-chart')).toBeInTheDocument();
    expect(screen.getByTestId('bar-income')).toBeInTheDocument();
    expect(screen.getByTestId('bar-expenses')).toBeInTheDocument();
    expect(screen.getByTestId('line-net')).toBeInTheDocument();
  });

  it('passes months to query hook', () => {
    mockQuery.mockReturnValue({ data: undefined, isLoading: true } as any);

    render(<MonthlyTrend months={12} />);

    expect(mockQuery).toHaveBeenCalledWith(12);
  });
});
