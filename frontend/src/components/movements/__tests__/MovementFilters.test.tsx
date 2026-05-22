import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '../../../test/testUtils';
import userEvent from '@testing-library/user-event';
import MovementFilters from '../MovementFilters';
import { MOVEMENT_TYPE_FILTER_ALL } from '../MovementTypeSelect';
import type { Movement } from '../../../types';

const mockAccounts = [
  { id: 'acc1', name: 'Checking', color: '#000', currency: 'USD', balance: 1000, type: 'normal' as const },
  { id: 'acc2', name: 'Savings', color: '#111', currency: 'USD', balance: 5000, type: 'normal' as const },
];

const mockPockets = [
  { id: 'pkt1', name: 'General', accountId: 'acc1', balance: 500, type: 'normal' as const, currency: 'USD' as const },
  { id: 'pkt2', name: 'Reserve', accountId: 'acc2', balance: 3000, type: 'normal' as const, currency: 'USD' as const },
];

vi.mock('../../../hooks/queries', () => ({
  useAccountsQuery: () => ({ data: mockAccounts }),
  usePocketsQuery: () => ({ data: mockPockets }),
}));

const buildSetters = () => ({
  setAccount: vi.fn(),
  setPocket: vi.fn(),
  setType: vi.fn(),
  setDateRange: vi.fn(),
  setDateFrom: vi.fn(),
  setDateTo: vi.fn(),
  setSearch: vi.fn(),
  setMinAmount: vi.fn(),
  setMaxAmount: vi.fn(),
  setShowPending: vi.fn(),
  setCategory: vi.fn(),
  setTags: vi.fn(),
});

const defaultFilters = {
  account: 'all',
  pocket: 'all',
  type: MOVEMENT_TYPE_FILTER_ALL,
  dateRange: 'all' as const,
  dateFrom: '',
  dateTo: '',
  search: '',
  minAmount: '',
  maxAmount: '',
  showPending: 'all' as const,
  category: 'all',
  tags: [] as string[],
};

const baseProps = (overrides: Record<string, unknown> = {}) => ({
  showFilters: true,
  setShowFilters: vi.fn(),
  movements: [] as Movement[],
  filters: defaultFilters,
  setFilters: buildSetters(),
  ...overrides,
});

describe('MovementFilters', () => {
  beforeEach(() => vi.clearAllMocks());

  it('always renders the search input and filter toggle', () => {
    render(<MovementFilters {...baseProps({ showFilters: false })} />);

    expect(screen.getByPlaceholderText(/search movements/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /filters/i })).toBeInTheDocument();
  });

  it('hides the expanded filter panel when showFilters is false', () => {
    render(<MovementFilters {...baseProps({ showFilters: false })} />);

    // Status select is only rendered inside the expanded panel
    expect(screen.queryByLabelText(/status/i)).not.toBeInTheDocument();
  });

  it('shows the expanded filter panel when showFilters is true', () => {
    render(<MovementFilters {...baseProps()} />);

    expect(screen.getByLabelText(/status/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^account$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^pocket$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/date range/i)).toBeInTheDocument();
  });

  it('toggles the panel when the Filters button is clicked', async () => {
    const user = userEvent.setup();
    const setShowFilters = vi.fn();
    render(<MovementFilters {...baseProps({ showFilters: false, setShowFilters })} />);

    await user.click(screen.getByRole('button', { name: /filters/i }));
    expect(setShowFilters).toHaveBeenCalledWith(true);
  });

  it('forwards search input changes to setSearch', async () => {
    const user = userEvent.setup();
    const setters = buildSetters();
    render(<MovementFilters {...baseProps({ setFilters: setters })} />);

    await user.type(screen.getByPlaceholderText(/search movements/i), 'rent');

    // Component is controlled — each keystroke fires setSearch with the
    // incremental value from the input event (last keystroke value: "t")
    expect(setters.setSearch).toHaveBeenCalled();
    const calls = setters.setSearch.mock.calls;
    expect(calls[calls.length - 1][0]).toBe('t');
  });

  it('updates the account filter when an account is selected', async () => {
    const user = userEvent.setup();
    const setters = buildSetters();
    render(<MovementFilters {...baseProps({ setFilters: setters })} />);

    await user.selectOptions(screen.getByLabelText(/^account$/i), 'acc1');
    expect(setters.setAccount).toHaveBeenCalledWith('acc1');
  });

  it('updates the date range filter', async () => {
    const user = userEvent.setup();
    const setters = buildSetters();
    render(<MovementFilters {...baseProps({ setFilters: setters })} />);

    await user.selectOptions(screen.getByLabelText(/date range/i), '7days');
    expect(setters.setDateRange).toHaveBeenCalledWith('7days');
  });

  it('shows custom date inputs only when dateRange is custom', () => {
    const { rerender } = render(<MovementFilters {...baseProps()} />);
    expect(screen.queryByLabelText(/^from/i)).not.toBeInTheDocument();

    rerender(
      <MovementFilters
        {...baseProps({
          filters: { ...defaultFilters, dateRange: 'custom' as const },
        })}
      />,
    );

    expect(screen.getByLabelText(/^from/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^to/i)).toBeInTheDocument();
  });

  it('updates min and max amount filters', async () => {
    const user = userEvent.setup();
    const setters = buildSetters();
    render(<MovementFilters {...baseProps({ setFilters: setters })} />);

    await user.type(screen.getByLabelText(/min amount/i), '5');
    expect(setters.setMinAmount).toHaveBeenCalledWith('5');

    await user.type(screen.getByLabelText(/max amount/i), '9');
    expect(setters.setMaxAmount).toHaveBeenCalledWith('9');
  });

  it('renders an active filter count badge when filters are applied', () => {
    render(
      <MovementFilters
        {...baseProps({
          filters: { ...defaultFilters, account: 'acc1', search: 'rent' },
        })}
      />,
    );

    // Two filters active — the count is rendered inside the Filters toggle
    // (anchored to start-of-string so we don't pick up "Clear all filters").
    expect(screen.getByRole('button', { name: /^filters/i })).toHaveTextContent('2');
  });

  it('clears all filters when the clear-all button is clicked', async () => {
    const user = userEvent.setup();
    const setters = buildSetters();
    render(
      <MovementFilters
        {...baseProps({
          setFilters: setters,
          filters: { ...defaultFilters, account: 'acc1', search: 'rent' },
        })}
      />,
    );

    await user.click(screen.getByRole('button', { name: /clear all filters/i }));

    expect(setters.setAccount).toHaveBeenCalledWith('all');
    expect(setters.setSearch).toHaveBeenCalledWith('');
    expect(setters.setType).toHaveBeenCalledWith(MOVEMENT_TYPE_FILTER_ALL);
    expect(setters.setTags).toHaveBeenCalledWith([]);
  });

  it('does not render the clear-all button when no filters are active', () => {
    render(<MovementFilters {...baseProps()} />);
    expect(screen.queryByRole('button', { name: /clear all filters/i })).not.toBeInTheDocument();
  });

  it('renders tag chips collected from movements and toggles selection', async () => {
    const user = userEvent.setup();
    const setters = buildSetters();
    const movements: Movement[] = [
      {
        id: 'm1',
        type: 'EgresoNormal',
        accountId: 'acc1',
        pocketId: 'pkt1',
        amount: 50,
        displayedDate: '2026-01-15T00:00:00.000Z',
        createdAt: '2026-01-15T00:00:00.000Z',
        tags: ['groceries', 'weekly'],
      },
    ];

    render(<MovementFilters {...baseProps({ movements, setFilters: setters })} />);

    expect(screen.getByRole('button', { name: 'groceries' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'weekly' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'groceries' }));
    expect(setters.setTags).toHaveBeenCalledWith(['groceries']);
  });
});
