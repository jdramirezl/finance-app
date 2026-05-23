import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../../../test/testUtils';
import LiquidityConsumptionCard from '../LiquidityConsumptionCard';

vi.mock('../../../hooks/queries', () => ({
  useSpendingSummaryQuery: vi.fn(),
}));

vi.mock('../../../services/currencyService', () => ({
  currencyService: {
    convertBatch: vi.fn(),
    formatCurrency: vi.fn((amount: number, currency: string) => `$${amount.toFixed(2)} ${currency}`),
  },
}));

import { useSpendingSummaryQuery } from '../../../hooks/queries';
import { currencyService } from '../../../services/currencyService';

const mockUseSpendingSummaryQuery = vi.mocked(useSpendingSummaryQuery);
const mockConvertBatch = vi.mocked(currencyService.convertBatch);

const makeSummary = (overrides: Partial<{
  today: number;
  thisWeek: number;
  lastWeek: number;
  thisMonth: number;
  lastMonth: number;
}> = {}) => ({
  today: { totals: [{ currency: 'USD', amount: overrides.today ?? 0 }] },
  thisWeek: { totals: [{ currency: 'USD', amount: overrides.thisWeek ?? 0 }] },
  lastWeek: { totals: [{ currency: 'USD', amount: overrides.lastWeek ?? 0 }] },
  thisMonth: { totals: [{ currency: 'USD', amount: overrides.thisMonth ?? 0 }] },
  lastMonth: { totals: [{ currency: 'USD', amount: overrides.lastMonth ?? 0 }] },
});

describe('LiquidityConsumptionCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockConvertBatch.mockResolvedValue([]);
  });

  it('renders the loading skeleton while data is loading', () => {
    mockUseSpendingSummaryQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    } as unknown as ReturnType<typeof useSpendingSummaryQuery>);

    render(<LiquidityConsumptionCard primaryCurrency="USD" />);

    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
    // Title is not rendered yet during loading
    expect(screen.queryByText(/Liquidity Consumption/i)).not.toBeInTheDocument();
  });

  it('renders the loading skeleton when data is loaded but totals are still being computed', () => {
    // Data ready, but the async conversion has not resolved yet
    mockUseSpendingSummaryQuery.mockReturnValue({
      data: makeSummary({ today: 25, thisWeek: 150, lastWeek: 100 }),
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useSpendingSummaryQuery>);

    // Make convertBatch hang to keep totals null
    mockConvertBatch.mockImplementation(() => new Promise(() => {}));

    render(<LiquidityConsumptionCard primaryCurrency="USD" />);

    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('renders today and this-week totals after data loads', async () => {
    mockUseSpendingSummaryQuery.mockReturnValue({
      data: makeSummary({ today: 25, thisWeek: 150, lastWeek: 100 }),
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useSpendingSummaryQuery>);

    render(<LiquidityConsumptionCard primaryCurrency="USD" />);

    expect(await screen.findByText(/Liquidity Consumption/i)).toBeInTheDocument();
    expect(screen.getByText('Spend Today')).toBeInTheDocument();
    expect(screen.getByText('Spend This Week')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText('$25.00 USD')).toBeInTheDocument();
    });
    expect(screen.getByText('$150.00 USD')).toBeInTheDocument();
  });

  it('shows a positive percent change when this week exceeds last week', async () => {
    mockUseSpendingSummaryQuery.mockReturnValue({
      data: makeSummary({ today: 10, thisWeek: 150, lastWeek: 100 }),
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useSpendingSummaryQuery>);

    render(<LiquidityConsumptionCard primaryCurrency="USD" />);

    // 150 vs 100 = +50%
    await waitFor(() => {
      expect(screen.getByText(/\+50%/)).toBeInTheDocument();
    });
    expect(screen.getByText(/relative to previous 7-day average/i)).toBeInTheDocument();
  });

  it('shows a negative percent change when this week is below last week', async () => {
    mockUseSpendingSummaryQuery.mockReturnValue({
      data: makeSummary({ today: 5, thisWeek: 80, lastWeek: 100 }),
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useSpendingSummaryQuery>);

    render(<LiquidityConsumptionCard primaryCurrency="USD" />);

    // 80 vs 100 = -20%
    await waitFor(() => {
      expect(screen.getByText(/-20%/)).toBeInTheDocument();
    });
  });

  it('does not render a percent change when last week is zero', async () => {
    mockUseSpendingSummaryQuery.mockReturnValue({
      data: makeSummary({ today: 10, thisWeek: 50, lastWeek: 0 }),
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useSpendingSummaryQuery>);

    render(<LiquidityConsumptionCard primaryCurrency="USD" />);

    // Wait for the card to finish rendering
    await screen.findByText(/Liquidity Consumption/i);
    expect(screen.queryByText(/relative to previous 7-day average/i)).not.toBeInTheDocument();
  });

  it('renders a 7-bar mini chart based on the weekly distribution', async () => {
    mockUseSpendingSummaryQuery.mockReturnValue({
      data: makeSummary({ today: 10, thisWeek: 70, lastWeek: 60 }),
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useSpendingSummaryQuery>);

    const { container } = render(<LiquidityConsumptionCard primaryCurrency="USD" />);

    await screen.findByText(/Liquidity Consumption/i);
    // Bars are rendered as div siblings in the mini chart container
    const bars = container.querySelectorAll('div[title]');
    expect(bars.length).toBe(7);
  });

  it('converts non-primary-currency totals via currencyService.convertBatch', async () => {
    mockUseSpendingSummaryQuery.mockReturnValue({
      data: {
        today: { totals: [{ currency: 'USD', amount: 10 }, { currency: 'MXN', amount: 200 }] },
        thisWeek: { totals: [{ currency: 'USD', amount: 100 }] },
        lastWeek: { totals: [{ currency: 'USD', amount: 100 }] },
        thisMonth: { totals: [] },
        lastMonth: { totals: [] },
      },
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useSpendingSummaryQuery>);

    mockConvertBatch.mockResolvedValue([
      // `BatchConversionResult` only carries the converted amount and rate;
      // the input fields (amount/from/to) live on the request side.
      { convertedAmount: 11, rate: 0.055 },
    ]);

    render(<LiquidityConsumptionCard primaryCurrency="USD" />);

    await waitFor(() => {
      // 10 USD + 11 USD-converted = 21
      expect(screen.getByText('$21.00 USD')).toBeInTheDocument();
    });

    expect(mockConvertBatch).toHaveBeenCalledWith([
      { amount: 200, from: 'MXN', to: 'USD' },
    ]);
  });

  it('skips conversion when the period has no totals at all', async () => {
    mockUseSpendingSummaryQuery.mockReturnValue({
      data: {
        today: { totals: [] },
        thisWeek: { totals: [{ currency: 'USD', amount: 100 }] },
        lastWeek: { totals: [{ currency: 'USD', amount: 100 }] },
        thisMonth: { totals: [] },
        lastMonth: { totals: [] },
      },
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useSpendingSummaryQuery>);

    render(<LiquidityConsumptionCard primaryCurrency="USD" />);

    await waitFor(() => {
      // Today has no totals -> 0
      expect(screen.getByText('$0.00 USD')).toBeInTheDocument();
    });
  });
});
