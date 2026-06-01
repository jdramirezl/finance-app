import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '../../../test/testUtils';
import userEvent from '@testing-library/user-event';
import MovementList from '../MovementList';
import type { Movement } from '../../../types';

const mockAccounts = [
  { id: 'acc1', name: 'Checking', color: '#000', currency: 'USD', balance: 1000, type: 'normal' as const },
  { id: 'acc2', name: 'Savings', color: '#00f', currency: 'USD', balance: 5000, type: 'normal' as const },
];

const mockPockets = [
  { id: 'pkt1', name: 'General', accountId: 'acc1', balance: 500, type: 'normal' as const, currency: 'USD' as const },
  { id: 'pkt2', name: 'Emergency', accountId: 'acc2', balance: 3000, type: 'normal' as const, currency: 'USD' as const },
];

const mockReminders = [
  {
    id: 'rm1',
    userId: 'u1',
    title: 'Internet bill',
    amount: 50,
    dueDate: '2026-01-15',
    isPaid: true,
    recurrence: { type: 'monthly' as const, interval: 1, endType: 'never' as const },
    linkedMovementId: 'mov1',
    createdAt: '2026-01-15T00:00:00Z',
    updatedAt: '2026-01-15T00:00:00Z',
  },
];

vi.mock('../../../hooks/queries', () => ({
  useAccountsQuery: () => ({ data: mockAccounts }),
  usePocketsQuery: () => ({ data: mockPockets }),
  useRemindersQuery: () => ({ data: mockReminders }),
}));

// Replace SelectableValue with a passthrough — its real implementation needs
// SelectionProvider, which is irrelevant to this list-level test surface.
vi.mock('../../ui/SelectableValue', () => ({
  default: ({ children, value }: { children?: React.ReactNode; value: number }) => (
    <div data-testid="selectable-value" data-value={value}>
      {children}
    </div>
  ),
}));

// Replace InlineEditableAmount with a simple read-only span; the inline edit
// flow is covered by its own component tests.
vi.mock('../../ui/InlineEditableAmount', () => ({
  default: ({ amount }: { amount: number }) => (
    <span data-testid="amount">{amount}</span>
  ),
}));

const buildMovement = (overrides: Partial<Movement> = {}): Movement => ({
  id: 'mov1',
  type: 'EgresoNormal',
  accountId: 'acc1',
  pocketId: 'pkt1',
  amount: 100,
  notes: 'Coffee',
  displayedDate: '2026-01-15T00:00:00.000Z',
  createdAt: '2026-01-15T00:00:00.000Z',
  isPending: false,
  isOrphaned: false,
  ...overrides,
});

const defaultProps = {
  movements: [] as Movement[],
  sortField: 'displayedDate' as const,
  sortOrder: 'desc' as const,
  setSortField: vi.fn(),
  setSortOrder: vi.fn(),
  selectedMovementIds: new Set<string>(),
  toggleSelection: vi.fn(),
  onEdit: vi.fn(),
  onDelete: vi.fn(),
  onApplyPending: vi.fn(),
  onUpdateAmount: vi.fn().mockResolvedValue(undefined),
  deletingId: null,
  applyingId: null,
};

describe('MovementList', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders empty state when there are no movements', () => {
    render(<MovementList {...defaultProps} />);
    expect(screen.getByText(/no movements found/i)).toBeInTheDocument();
  });

  it('renders movement rows with their account and pocket names', () => {
    const movements = [buildMovement({ id: 'm1', notes: 'Coffee' })];
    render(<MovementList {...defaultProps} movements={movements} />);

    expect(screen.getByText('Coffee')).toBeInTheDocument();
    expect(screen.getByText('Checking')).toBeInTheDocument();
    expect(screen.getByText('General')).toBeInTheDocument();
  });

  it('shows the linked reminder badge for movements with a matching reminder', () => {
    // The mocked reminder is linked to movement id "mov1"
    const movements = [buildMovement({ id: 'mov1' })];
    render(<MovementList {...defaultProps} movements={movements} />);

    expect(screen.getByText('Internet bill')).toBeInTheDocument();
  });

  it('shows the Pending badge for pending movements', () => {
    const movements = [buildMovement({ id: 'm1', isPending: true })];
    render(<MovementList {...defaultProps} movements={movements} />);

    expect(screen.getByText('Pending')).toBeInTheDocument();
  });

  it('toggles sort order when clicking the active sort field button', async () => {
    const user = userEvent.setup();
    const setSortField = vi.fn();
    const setSortOrder = vi.fn();
    const movements = [buildMovement()];

    render(
      <MovementList
        {...defaultProps}
        movements={movements}
        sortField="displayedDate"
        sortOrder="desc"
        setSortField={setSortField}
        setSortOrder={setSortOrder}
      />,
    );

    await user.click(screen.getByRole('button', { name: /^date/i }));
    expect(setSortOrder).toHaveBeenCalledWith('asc');
    expect(setSortField).not.toHaveBeenCalled();
  });

  it('switches sort field and resets order when clicking a different sort button', async () => {
    const user = userEvent.setup();
    const setSortField = vi.fn();
    const setSortOrder = vi.fn();
    const movements = [buildMovement()];

    render(
      <MovementList
        {...defaultProps}
        movements={movements}
        sortField="displayedDate"
        sortOrder="desc"
        setSortField={setSortField}
        setSortOrder={setSortOrder}
      />,
    );

    await user.click(screen.getByRole('button', { name: /^amount/i }));
    expect(setSortField).toHaveBeenCalledWith('amount');
    expect(setSortOrder).toHaveBeenCalledWith('asc');
  });

  it('calls toggleSelection when the row checkbox is clicked', async () => {
    const user = userEvent.setup();
    const toggleSelection = vi.fn();
    const movements = [buildMovement({ id: 'm1' })];

    render(
      <MovementList
        {...defaultProps}
        movements={movements}
        toggleSelection={toggleSelection}
      />,
    );

    await user.click(screen.getByRole('checkbox', { name: /select movement/i }));
    expect(toggleSelection).toHaveBeenCalledWith('m1');
  });

  it('calls onEdit with the movement when the edit button is clicked', async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    const movement = buildMovement({ id: 'm1' });

    render(<MovementList {...defaultProps} movements={[movement]} onEdit={onEdit} />);

    await user.click(screen.getByRole('button', { name: /edit movement/i }));
    expect(onEdit).toHaveBeenCalledWith(movement);
  });

  it('calls onDelete with the movement id when the delete button is clicked', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    const movements = [buildMovement({ id: 'm1' })];

    render(<MovementList {...defaultProps} movements={movements} onDelete={onDelete} />);

    await user.click(screen.getByRole('button', { name: /delete movement/i }));
    expect(onDelete).toHaveBeenCalledWith('m1');
  });

  it('renders the Apply button only for pending movements', () => {
    const movements = [
      buildMovement({ id: 'm1', isPending: false, notes: 'Applied' }),
      buildMovement({ id: 'm2', isPending: true, notes: 'Pending' }),
    ];
    render(<MovementList {...defaultProps} movements={movements} />);

    const applyButtons = screen.getAllByRole('button', { name: /apply pending movement/i });
    expect(applyButtons).toHaveLength(1);
  });

  it('calls onApplyPending when the apply button is clicked', async () => {
    const user = userEvent.setup();
    const onApplyPending = vi.fn();
    const movements = [buildMovement({ id: 'm1', isPending: true })];

    render(
      <MovementList
        {...defaultProps}
        movements={movements}
        onApplyPending={onApplyPending}
      />,
    );

    await user.click(screen.getByRole('button', { name: /apply pending movement/i }));
    expect(onApplyPending).toHaveBeenCalledWith('m1');
  });

  it('renders the floating selection stats bar when items are selected', () => {
    const movements = [
      buildMovement({ id: 'm1', amount: 100, type: 'EgresoNormal' }),
      buildMovement({ id: 'm2', amount: 50, type: 'IngresoNormal' }),
    ];
    const selected = new Set<string>(['m1', 'm2']);

    render(
      <MovementList
        {...defaultProps}
        movements={movements}
        selectedMovementIds={selected}
      />,
    );

    expect(screen.getByText('Selected')).toBeInTheDocument();
    expect(screen.getByText('Sum')).toBeInTheDocument();
    expect(screen.getByText('Average')).toBeInTheDocument();
  });

  it('does not render the floating stats bar when nothing is selected', () => {
    const movements = [buildMovement({ id: 'm1' })];
    render(<MovementList {...defaultProps} movements={movements} />);

    expect(screen.queryByText('Selected')).not.toBeInTheDocument();
  });

  it('marks the row as selected when its id is in selectedMovementIds', () => {
    const movements = [buildMovement({ id: 'm1' })];
    const selected = new Set<string>(['m1']);

    render(
      <MovementList
        {...defaultProps}
        movements={movements}
        selectedMovementIds={selected}
      />,
    );

    expect(screen.getByRole('checkbox', { name: /select movement/i })).toBeChecked();
  });

  describe('Transfer pair grouping', () => {
    const transferPairId = 'pair-abc-123';

    const transferExpense = buildMovement({
      id: 'tx-exp',
      type: 'EgresoNormal',
      accountId: 'acc1',
      pocketId: 'pkt1',
      amount: 500,
      notes: 'Transfer to savings',
      transferPairId,
    });

    const transferIncome = buildMovement({
      id: 'tx-inc',
      type: 'IngresoNormal',
      accountId: 'acc2',
      pocketId: 'pkt2',
      amount: 500,
      notes: 'Transfer to savings',
      transferPairId,
    });

    it('renders a combined transfer card when both pair movements are present', () => {
      render(
        <MovementList
          {...defaultProps}
          movements={[transferExpense, transferIncome]}
        />,
      );

      expect(screen.getByText(/General.*→.*Emergency/)).toBeInTheDocument();
      expect(screen.getByText('Transfer')).toBeInTheDocument();
    });

    it('renders only one card for a transfer pair (not two rows)', () => {
      render(
        <MovementList
          {...defaultProps}
          movements={[transferExpense, transferIncome]}
        />,
      );

      // Should have exactly one checkbox (the combined card), not two
      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes).toHaveLength(1);
    });

    it('renders a normal row with Transfer badge when pair is not on the page', () => {
      // Only the expense is present (income is on another page)
      render(
        <MovementList
          {...defaultProps}
          movements={[transferExpense]}
        />,
      );

      // Should render as a normal MovementRow with a Transfer badge
      expect(screen.getByText('Transfer to savings')).toBeInTheDocument();
      expect(screen.getByText('Transfer')).toBeInTheDocument();
      expect(screen.getByText('Checking')).toBeInTheDocument();
    });

    it('shows source account name when accounts differ', () => {
      render(
        <MovementList
          {...defaultProps}
          movements={[transferExpense, transferIncome]}
        />,
      );

      // Since accounts differ, should show account names in parentheses
      expect(screen.getByText(/General \(Checking\).*→.*Emergency \(Savings\)/)).toBeInTheDocument();
    });

    it('calls onDelete with expense id when delete is clicked on transfer card', async () => {
      const user = userEvent.setup();
      const onDelete = vi.fn();

      render(
        <MovementList
          {...defaultProps}
          movements={[transferExpense, transferIncome]}
          onDelete={onDelete}
        />,
      );

      await user.click(screen.getByRole('button', { name: /delete transfer/i }));
      expect(onDelete).toHaveBeenCalledWith('tx-exp');
    });

    it('calls onEdit with expense movement when edit is clicked on transfer card', async () => {
      const user = userEvent.setup();
      const onEdit = vi.fn();

      render(
        <MovementList
          {...defaultProps}
          movements={[transferExpense, transferIncome]}
          onEdit={onEdit}
        />,
      );

      await user.click(screen.getByRole('button', { name: /edit transfer/i }));
      expect(onEdit).toHaveBeenCalledWith(transferExpense);
    });
  });
});
