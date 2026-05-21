import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../../../test/testUtils';
import CategoryTrend from '../CategoryTrend';

vi.mock('../../../hooks/queries/useReportsQueries', () => ({
  useCategoryTrendQuery: vi.fn(),
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

import { useCategoryTrendQuery } from '../../../hooks/queries/useReportsQueries';

const mockQuery = vi.mocked(useCategoryTrendQuery);

const mockResponse = {
  data: [
    { month: '2024-01', totals: [{ currency: 'USD', amount: 120 }], count: 4 },
    { month: '2024-02', totals: [{ currency: 'USD', amount: 95 }], count: 3 },
    { month: '2024-03', totals: [{ currency: 'USD', amount: 200 }], count: 6 },
  ],
  category: 'Food',
};

describe('CategoryTrend', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state', () => {
    mockQuery.mockReturnValue({ data: undefined, isLoading: true } as any);

    render(<CategoryTrend />);

    const skeleton = document.querySelector('.animate-pulse');
    expect(skeleton).toBeInTheDocument();
  });

  it('renders empty state when no data', async () => {
    mockQuery.mockReturnValue({ data: { data: [], category: 'Food' }, isLoading: false } as any);

    render(<CategoryTrend />);

    await waitFor(() => {
      expect(screen.getByText('No data available')).toBeInTheDocument();
      expect(screen.getByText(/No spending found for Food/)).toBeInTheDocument();
    });
  });

  it('renders category selector with all predefined categories', async () => {
    mockQuery.mockReturnValue({ data: mockResponse, isLoading: false } as any);

    render(<CategoryTrend />);

    await waitFor(() => {
      const select = screen.getByRole('combobox');
      expect(select).toBeInTheDocument();
      expect(select).toHaveValue('Food');
    });
  });

  it('calls query with selected category and default months', () => {
    mockQuery.mockReturnValue({ data: mockResponse, isLoading: false } as any);

    render(<CategoryTrend />);

    expect(mockQuery).toHaveBeenCalledWith('Food', 6);
  });

  it('changes category on select', () => {
    mockQuery.mockReturnValue({ data: mockResponse, isLoading: false } as any);

    render(<CategoryTrend />);

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'Transport' } });

    expect(mockQuery).toHaveBeenCalledWith('Transport', 6);
  });

  it('toggles month selector', () => {
    mockQuery.mockReturnValue({ data: mockResponse, isLoading: false } as any);

    render(<CategoryTrend />);

    fireEvent.click(screen.getByText('12mo'));

    expect(mockQuery).toHaveBeenCalledWith('Food', 12);
  });

  it('renders chart container when data is available', async () => {
    mockQuery.mockReturnValue({ data: mockResponse, isLoading: false } as any);

    const { container } = render(<CategoryTrend />);

    await waitFor(() => {
      expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument();
    });
  });
});
