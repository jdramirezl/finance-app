import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../../../test/testUtils';
import SpendingByCategory from '../SpendingByCategory';

vi.mock('../../../hooks/queries', () => ({
  useSpendingByCategoryQuery: vi.fn(),
}));

vi.mock('../../../hooks/queries/useSettingsQuery', () => ({
  useSettingsQuery: vi.fn(() => ({ data: { primaryCurrency: 'USD' } })),
}));

vi.mock('../../../services/currencyService', () => ({
  currencyService: {
    formatCurrency: vi.fn((amount: number, currency: string) => `$${amount.toFixed(2)} ${currency}`),
    convertBatch: vi.fn((requests: any[]) =>
      Promise.resolve(requests.map(r => ({ convertedAmount: r.amount * 0.05, rate: 0.05 })))
    ),
  },
}));

import { useSpendingByCategoryQuery } from '../../../hooks/queries';

const mockQuery = vi.mocked(useSpendingByCategoryQuery);

const mockData = {
  data: [
    { category: 'Food', totals: [{ currency: 'USD', amount: 450 }], count: 12, percentage: 45 },
    { category: 'Transport', totals: [{ currency: 'USD', amount: 300 }], count: 8, percentage: 30 },
    { category: 'Bills', totals: [{ currency: 'USD', amount: 250 }], count: 5, percentage: 25 },
  ],
  totalExpenses: [{ currency: 'USD', amount: 1000 }],
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

  it('renders empty state when no data', async () => {
    mockQuery.mockReturnValue({ data: { data: [], totalExpenses: [] }, isLoading: false } as any);

    render(<SpendingByCategory startDate="2024-01-01" endDate="2024-01-31" />);

    await waitFor(() => {
      expect(screen.getByText('No spending data')).toBeInTheDocument();
    });
  });

  it('renders table with category data after conversion', async () => {
    mockQuery.mockReturnValue({ data: mockData, isLoading: false } as any);

    render(<SpendingByCategory startDate="2024-01-01" endDate="2024-01-31" />);

    await waitFor(() => {
      expect(screen.getByText('Food')).toBeInTheDocument();
      expect(screen.getByText('Transport')).toBeInTheDocument();
      expect(screen.getByText('Bills')).toBeInTheDocument();
    });
  });

  it('passes correct dates to query hook', () => {
    mockQuery.mockReturnValue({ data: undefined, isLoading: true } as any);

    render(<SpendingByCategory startDate="2024-03-01" endDate="2024-03-31" />);

    expect(mockQuery).toHaveBeenCalledWith('2024-03-01', '2024-03-31');
  });
});
