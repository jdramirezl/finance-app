import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '../../../test/testUtils';
import CategoryTrend from '../CategoryTrend';

vi.mock('../../../hooks/queries/useReportsQueries', () => ({
  useCategoryTrendQuery: vi.fn(),
}));

import { useCategoryTrendQuery } from '../../../hooks/queries/useReportsQueries';

const mockQuery = vi.mocked(useCategoryTrendQuery);

const mockResponse = {
  data: [
    { month: '2024-01', total: 120, count: 4 },
    { month: '2024-02', total: 95, count: 3 },
    { month: '2024-03', total: 200, count: 6 },
  ],
  category: 'Food',
  currency: 'USD',
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

  it('renders empty state when no data', () => {
    mockQuery.mockReturnValue({ data: { data: [], category: 'Food', currency: 'USD' }, isLoading: false } as any);

    render(<CategoryTrend />);

    expect(screen.getByText('No data available')).toBeInTheDocument();
    expect(screen.getByText(/No spending found for Food/)).toBeInTheDocument();
  });

  it('renders category selector with all predefined categories', () => {
    mockQuery.mockReturnValue({ data: mockResponse, isLoading: false } as any);

    render(<CategoryTrend />);

    const select = screen.getByRole('combobox');
    expect(select).toBeInTheDocument();
    expect(select).toHaveValue('Food');
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

  it('renders chart container when data is available', () => {
    mockQuery.mockReturnValue({ data: mockResponse, isLoading: false } as any);

    const { container } = render(<CategoryTrend />);

    // Recharts renders inside a ResponsiveContainer
    expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument();
  });
});
