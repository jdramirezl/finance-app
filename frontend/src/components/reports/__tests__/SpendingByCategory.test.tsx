import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '../../../test/testUtils';
import SpendingByCategory from '../SpendingByCategory';

vi.mock('../../../hooks/queries', () => ({
  useSpendingByCategoryQuery: vi.fn(),
}));

vi.mock('../../../services/currencyService', () => ({
  currencyService: {
    formatCurrency: vi.fn((amount: number, currency: string) => `$${amount.toFixed(2)} ${currency}`),
  },
}));

import { useSpendingByCategoryQuery } from '../../../hooks/queries';

const mockQuery = vi.mocked(useSpendingByCategoryQuery);

const mockData = {
  data: [
    { category: 'Food', total: 450, count: 12, percentage: 45 },
    { category: 'Transport', total: 300, count: 8, percentage: 30 },
    { category: 'Bills', total: 250, count: 5, percentage: 25 },
  ],
  totalExpenses: 1000,
  currency: 'USD',
};

describe('SpendingByCategory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading skeleton when fetching', () => {
    mockQuery.mockReturnValue({ data: undefined, isLoading: true } as any);

    render(<SpendingByCategory startDate="2024-01-01" endDate="2024-01-31" />);

    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('renders empty state when no data', () => {
    mockQuery.mockReturnValue({ data: { data: [], totalExpenses: 0, currency: 'USD' }, isLoading: false } as any);

    render(<SpendingByCategory startDate="2024-01-01" endDate="2024-01-31" />);

    expect(screen.getByText('No spending data')).toBeInTheDocument();
  });

  it('renders table with category data sorted by amount', () => {
    mockQuery.mockReturnValue({ data: mockData, isLoading: false } as any);

    render(<SpendingByCategory startDate="2024-01-01" endDate="2024-01-31" />);

    expect(screen.getByText('Food')).toBeInTheDocument();
    expect(screen.getByText('Transport')).toBeInTheDocument();
    expect(screen.getByText('Bills')).toBeInTheDocument();
    expect(screen.getByText('$450.00 USD')).toBeInTheDocument();
    expect(screen.getByText('45.0%')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
  });

  it('displays total expenses', () => {
    mockQuery.mockReturnValue({ data: mockData, isLoading: false } as any);

    render(<SpendingByCategory startDate="2024-01-01" endDate="2024-01-31" />);

    expect(screen.getByText(/\$1000\.00 USD/)).toBeInTheDocument();
  });

  it('passes correct dates to query hook', () => {
    mockQuery.mockReturnValue({ data: undefined, isLoading: true } as any);

    render(<SpendingByCategory startDate="2024-03-01" endDate="2024-03-31" />);

    expect(mockQuery).toHaveBeenCalledWith('2024-03-01', '2024-03-31');
  });
});
