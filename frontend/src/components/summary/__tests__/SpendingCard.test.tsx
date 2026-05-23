import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../../../test/testUtils';
import userEvent from '@testing-library/user-event';
import SpendingCard from '../SpendingCard';

const mockSummaryData = {
  today: { totals: [{ currency: 'USD', amount: 25 }] },
  thisWeek: { totals: [{ currency: 'USD', amount: 150 }] },
  lastWeek: { totals: [{ currency: 'USD', amount: 100 }] },
  thisMonth: { totals: [{ currency: 'USD', amount: 500 }] },
  lastMonth: { totals: [{ currency: 'USD', amount: 400 }] },
};

vi.mock('../../../hooks/queries', () => ({
  useSpendingSummaryQuery: vi.fn(),
}));

vi.mock('../../../services/currencyService', () => ({
  currencyService: {
    convertBatch: vi.fn().mockResolvedValue([]),
    formatCurrency: vi.fn((amount: number, currency: string) => `$${amount.toFixed(2)} ${currency}`),
  },
}));

import { useSpendingSummaryQuery } from '../../../hooks/queries';

const mockUseSpendingSummaryQuery = vi.mocked(useSpendingSummaryQuery);

describe('SpendingCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading skeleton when data is loading', () => {
    mockUseSpendingSummaryQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    } as any);

    render(<SpendingCard primaryCurrency="USD" />);

    // Skeleton has animate-pulse class
    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('shows spending totals after data loads', async () => {
    mockUseSpendingSummaryQuery.mockReturnValue({
      data: mockSummaryData,
      isLoading: false,
      isError: false,
    } as any);

    render(<SpendingCard primaryCurrency="USD" />);

    await waitFor(() => {
      expect(screen.getByText('$150.00 USD')).toBeInTheDocument();
    });
  });

  it('period toggle switches between today/week/month', async () => {
    mockUseSpendingSummaryQuery.mockReturnValue({
      data: mockSummaryData,
      isLoading: false,
      isError: false,
    } as any);

    const user = userEvent.setup();
    render(<SpendingCard primaryCurrency="USD" />);

    await waitFor(() => {
      expect(screen.getByText('$150.00 USD')).toBeInTheDocument();
    });

    await user.click(screen.getByText('This Month'));

    await waitFor(() => {
      expect(screen.getByText('$500.00 USD')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Today'));

    await waitFor(() => {
      expect(screen.getByText('$25.00 USD')).toBeInTheDocument();
    });
  });

  it('shows comparison percentage correctly', async () => {
    mockUseSpendingSummaryQuery.mockReturnValue({
      data: mockSummaryData,
      isLoading: false,
      isError: false,
    } as any);

    render(<SpendingCard primaryCurrency="USD" />);

    // Week view: 150 vs 100 = 50% increase
    await waitFor(() => {
      expect(screen.getByText(/50%/)).toBeInTheDocument();
    });
  });
});
