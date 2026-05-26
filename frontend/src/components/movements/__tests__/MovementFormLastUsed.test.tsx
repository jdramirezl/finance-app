import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '../../../test/testUtils';
import MovementForm from '../MovementForm';
import type { MovementFormProps } from '../MovementForm';

const mockAccounts = [
  { id: 'acc1', name: 'Checking', color: '#000', currency: 'USD', balance: 1000, type: 'normal' as const },
  { id: 'acc2', name: 'Savings', color: '#111', currency: 'USD', balance: 5000, type: 'normal' as const },
];

const mockPockets = [
  { id: 'pkt1', name: 'Daily', accountId: 'acc1', balance: 500, type: 'normal' as const },
  { id: 'pkt2', name: 'Reserve', accountId: 'acc2', balance: 3000, type: 'normal' as const },
];

const resolveMock = vi.fn();
const getLastTypeMock = vi.fn();

vi.mock('../../../hooks/queries', () => ({
  useAccountsQuery: () => ({ data: mockAccounts }),
  usePocketsQuery: () => ({ data: mockPockets }),
  useSubPocketsQuery: () => ({ data: [] }),
  useMovementTemplatesQuery: () => ({ data: [] }),
  useSettingsQuery: () => ({
    data: { primaryCurrency: 'USD', dateFormat: 'MMM d, yyyy', movementsPerPage: 50, reminderAdvanceDays: 7, defaultCurrencyForNewAccounts: 'USD' },
  }),
}));

vi.mock('../../../hooks/useUnsavedChanges', () => ({
  useUnsavedChanges: vi.fn(),
}));

vi.mock('../../../store/useLastUsedPocket', () => ({
  useLastUsedPocket: { getState: () => ({ getLastType: getLastTypeMock }) },
  resolveLastUsedPocket: (...args: unknown[]) => resolveMock(...args),
  toSimpleType: (t: string) => (t.startsWith('Ingreso') ? 'income' : 'expense'),
}));

const defaultProps: MovementFormProps = {
  onSubmit: vi.fn().mockResolvedValue(undefined),
  onCancel: vi.fn(),
  isSaving: false,
};

describe('MovementForm last-used pre-fill', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getLastTypeMock.mockReturnValue(null);
    resolveMock.mockReturnValue(null);
  });

  it('pre-fills account, pocket, and type from last-used when opening a new movement', () => {
    getLastTypeMock.mockReturnValue('IngresoNormal');
    resolveMock.mockReturnValue({ accountId: 'acc2', pocketId: 'pkt2', lastType: 'IngresoNormal' });

    render(<MovementForm {...defaultProps} />);

    expect(resolveMock).toHaveBeenCalledWith('income', mockAccounts, mockPockets, expect.any(Object));
    expect(screen.getByLabelText(/type/i)).toHaveValue('IngresoNormal');
    expect(screen.getByLabelText(/^Account/)).toHaveValue('acc2');
    expect(screen.getByLabelText(/^Pocket/)).toHaveValue('pkt2');
  });

  it('falls back to empty defaults when resolveLastUsedPocket returns null', () => {
    getLastTypeMock.mockReturnValue(null);
    resolveMock.mockReturnValue(null);

    render(<MovementForm {...defaultProps} />);

    expect(screen.getByLabelText(/type/i)).toHaveValue('EgresoNormal');
    expect(screen.getByLabelText(/^Account/)).toHaveValue('');
    expect(screen.getByLabelText(/^Pocket/)).toHaveValue('');
  });

  it('does not call resolveLastUsedPocket when editing an existing movement', () => {
    render(
      <MovementForm
        {...defaultProps}
        initialData={{
          id: 'mov1',
          type: 'EgresoNormal',
          accountId: 'acc1',
          pocketId: 'pkt1',
          amount: 50,
          notes: 'test',
          displayedDate: '2026-01-15T00:00:00.000Z',
          createdAt: '2026-01-15T00:00:00.000Z',
          isPending: false,
          isOrphaned: false,
        }}
      />,
    );

    expect(resolveMock).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/type/i)).toHaveValue('EgresoNormal');
    expect(screen.getByLabelText(/^Account/)).toHaveValue('acc1');
    expect(screen.getByLabelText(/^Pocket/)).toHaveValue('pkt1');
  });

  it('does not call resolveLastUsedPocket when prefillValues.type is provided', () => {
    resolveMock.mockReturnValue({ accountId: 'acc2', pocketId: 'pkt2', lastType: 'IngresoFijo' });

    render(
      <MovementForm
        {...defaultProps}
        defaultValues={{ type: 'IngresoNormal' }}
      />,
    );

    expect(resolveMock).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/type/i)).toHaveValue('IngresoNormal');
    // Account/pocket stay empty because prefill explicitly took over the type path
    expect(screen.getByLabelText(/^Account/)).toHaveValue('');
    expect(screen.getByLabelText(/^Pocket/)).toHaveValue('');
  });
});
