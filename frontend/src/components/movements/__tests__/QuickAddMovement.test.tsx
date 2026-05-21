import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../../../test/testUtils';
import userEvent from '@testing-library/user-event';
import QuickAddMovement from '../QuickAddMovement';

const mockMutateAsync = vi.fn();

vi.mock('../../../hooks/queries/useMovementMutations', () => ({
  useMovementMutations: () => ({
    createMovement: { mutateAsync: mockMutateAsync, isPending: false },
  }),
}));

vi.mock('../../../hooks/queries', () => ({
  useAccountsQuery: () => ({
    data: [{ id: 'acc1', name: 'Checking', color: '#000', currency: 'USD', balance: 1000, type: 'normal' }],
  }),
  usePocketsQuery: () => ({
    data: [{ id: 'pkt1', name: 'General', accountId: 'acc1', balance: 1000, type: 'normal' }],
  }),
  useSettingsQuery: () => ({
    data: { primaryCurrency: 'USD', dateFormat: 'MMM d, yyyy', movementsPerPage: 50, reminderAdvanceDays: 7, defaultCurrencyForNewAccounts: 'USD' },
  }),
}));

vi.mock('../../../store/useLastUsedPocket', () => ({
  resolveLastUsedPocket: () => ({ accountId: 'acc1', pocketId: 'pkt1' }),
  toSimpleType: (t: string) => (t.startsWith('Ingreso') ? 'income' : 'expense'),
}));

describe('QuickAddMovement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMutateAsync.mockResolvedValue(undefined);
  });

  it('renders with type toggle showing expense and income', () => {
    render(<QuickAddMovement variant="inline" />);
    expect(screen.getByText('Expense')).toBeInTheDocument();
    expect(screen.getByText('Income')).toBeInTheDocument();
  });

  it('switches type when clicking income toggle', async () => {
    const user = userEvent.setup();
    render(<QuickAddMovement variant="inline" />);

    const incomeBtn = screen.getByText('Income');
    await user.click(incomeBtn);

    expect(incomeBtn).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('Expense')).toHaveAttribute('aria-pressed', 'false');
  });

  it('submits with valid amount and calls mutation', async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    render(<QuickAddMovement variant="inline" onSuccess={onSuccess} />);

    const amountInput = screen.getByLabelText('Quick add amount');
    await user.type(amountInput, '42.50');
    await user.click(screen.getByLabelText('Submit quick add'));

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'EgresoNormal',
          accountId: 'acc1',
          pocketId: 'pkt1',
          amount: 42.5,
        }),
      );
    });
    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
  });

  it('does not submit when amount is empty', async () => {
    const user = userEvent.setup();
    render(<QuickAddMovement variant="inline" />);

    await user.click(screen.getByLabelText('Submit quick add'));

    expect(mockMutateAsync).not.toHaveBeenCalled();
  });

  it('calls onExpandToFull with current state when clicking More', async () => {
    const user = userEvent.setup();
    const onExpand = vi.fn();
    render(<QuickAddMovement variant="inline" onExpandToFull={onExpand} />);

    const amountInput = screen.getByLabelText('Quick add amount');
    await user.type(amountInput, '10');
    await user.click(screen.getByText('More'));

    expect(onExpand).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 10, type: 'EgresoNormal' }),
    );
  });

  it('displays error when mutation fails', async () => {
    mockMutateAsync.mockRejectedValueOnce(new Error('Network error'));
    const user = userEvent.setup();
    render(<QuickAddMovement variant="inline" />);

    const amountInput = screen.getByLabelText('Quick add amount');
    await user.type(amountInput, '5');
    await user.click(screen.getByLabelText('Submit quick add'));

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
  });
});
