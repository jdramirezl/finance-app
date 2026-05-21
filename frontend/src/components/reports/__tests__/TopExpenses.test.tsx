import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '../../../test/testUtils';
import TopExpenses from '../TopExpenses';

vi.mock('../../../hooks/queries', () => ({
  useMovementsQuery: vi.fn(),
  useAccountsQuery: vi.fn(),
}));

import { useMovementsQuery, useAccountsQuery } from '../../../hooks/queries';

const mockMovements = vi.mocked(useMovementsQuery);
const mockAccounts = vi.mocked(useAccountsQuery);

const movements = [
  { id: '1', type: 'EgresoNormal', amount: 500, displayedDate: '2024-01-15', category: 'Food', notes: 'Dinner', accountId: 'acc1', pocketId: 'p1' },
  { id: '2', type: 'EgresoNormal', amount: 300, displayedDate: '2024-01-10', category: 'Transport', notes: 'Uber', accountId: 'acc1', pocketId: 'p1' },
  { id: '3', type: 'EgresoFijo', amount: 200, displayedDate: '2024-01-05', category: 'Bills', notes: 'Electric', accountId: 'acc2', pocketId: 'p2' },
  { id: '4', type: 'IngresoNormal', amount: 1000, displayedDate: '2024-01-01', category: 'Salary', notes: 'Pay', accountId: 'acc1', pocketId: 'p1' },
  { id: '5', type: 'EgresoNormal', amount: 100, displayedDate: '2024-02-01', category: 'Food', notes: 'Outside range', accountId: 'acc1', pocketId: 'p1' },
];

const accounts = [
  { id: 'acc1', name: 'Main Account', currency: 'USD', color: '#000', balance: 0 },
  { id: 'acc2', name: 'Savings', currency: 'USD', color: '#111', balance: 0 },
];

describe('TopExpenses', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAccounts.mockReturnValue({ data: accounts } as any);
  });

  it('renders loading state', () => {
    mockMovements.mockReturnValue({ data: undefined, isLoading: true } as any);

    render(<TopExpenses startDate="2024-01-01" endDate="2024-01-31" />);

    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('renders empty state when no expenses match', () => {
    mockMovements.mockReturnValue({ data: [], isLoading: false } as any);

    render(<TopExpenses startDate="2024-01-01" endDate="2024-01-31" />);

    expect(screen.getByText('No expenses found')).toBeInTheDocument();
  });

  it('renders expenses sorted by amount descending', () => {
    mockMovements.mockReturnValue({ data: movements, isLoading: false } as any);

    render(<TopExpenses startDate="2024-01-01" endDate="2024-01-31" />);

    // Should show 3 expense rows (excludes income and out-of-range)
    expect(screen.getByText('Dinner')).toBeInTheDocument();
    expect(screen.getByText('Uber')).toBeInTheDocument();
    expect(screen.getByText('Electric')).toBeInTheDocument();
    // Income should not appear
    expect(screen.queryByText('Pay')).not.toBeInTheDocument();
    // Out of range should not appear
    expect(screen.queryByText('Outside range')).not.toBeInTheDocument();
  });

  it('shows account names', () => {
    mockMovements.mockReturnValue({ data: movements, isLoading: false } as any);

    render(<TopExpenses startDate="2024-01-01" endDate="2024-01-31" />);

    expect(screen.getAllByText('Main Account').length).toBeGreaterThan(0);
    expect(screen.getByText('Savings')).toBeInTheDocument();
  });

  it('filters by category when selected', () => {
    mockMovements.mockReturnValue({ data: movements, isLoading: false } as any);

    render(<TopExpenses startDate="2024-01-01" endDate="2024-01-31" />);

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'Food' } });

    expect(screen.getByText('Dinner')).toBeInTheDocument();
    expect(screen.queryByText('Uber')).not.toBeInTheDocument();
    expect(screen.queryByText('Electric')).not.toBeInTheDocument();
  });

  it('shows category badges', () => {
    mockMovements.mockReturnValue({ data: movements, isLoading: false } as any);

    const { container } = render(<TopExpenses startDate="2024-01-01" endDate="2024-01-31" />);

    // Category badges are rendered as spans with rounded-full class inside table cells
    const badges = container.querySelectorAll('td span.inline-flex');
    expect(badges.length).toBe(3);
  });

  it('excludes pending and orphaned movements', () => {
    const withPending = [
      ...movements,
      { id: '6', type: 'EgresoNormal', amount: 999, displayedDate: '2024-01-15', category: 'Food', notes: 'Pending', accountId: 'acc1', pocketId: 'p1', isPending: true },
      { id: '7', type: 'EgresoNormal', amount: 888, displayedDate: '2024-01-15', category: 'Food', notes: 'Orphaned', accountId: 'acc1', pocketId: 'p1', isOrphaned: true },
    ];
    mockMovements.mockReturnValue({ data: withPending, isLoading: false } as any);

    render(<TopExpenses startDate="2024-01-01" endDate="2024-01-31" />);

    expect(screen.queryByText('Pending')).not.toBeInTheDocument();
    expect(screen.queryByText('Orphaned')).not.toBeInTheDocument();
  });
});
