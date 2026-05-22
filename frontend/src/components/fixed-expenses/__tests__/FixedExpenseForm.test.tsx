import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../../../test/testUtils';
import userEvent from '@testing-library/user-event';
import FixedExpenseForm from '../FixedExpenseForm';
import type { Account, Pocket, SubPocket } from '../../../types';

// Mutations and toast hooks are mocked at module level so the form runs
// without TanStack-Query providers driving the actual network layer.
const createMutateAsync = vi.fn();
const updateMutateAsync = vi.fn();
const toastSuccess = vi.fn();
const toastError = vi.fn();

vi.mock('../../../hooks/queries', () => ({
  useSubPocketMutations: () => ({
    createSubPocket: { mutateAsync: createMutateAsync, isPending: false },
    updateSubPocket: { mutateAsync: updateMutateAsync, isPending: false },
  }),
}));

vi.mock('../../../hooks/useToast', () => ({
  useToast: () => ({
    success: toastSuccess,
    error: toastError,
    info: vi.fn(),
    warning: vi.fn(),
  }),
}));

vi.mock('../../../hooks/useUnsavedChanges', () => ({
  useUnsavedChanges: vi.fn(),
}));

const account1: Account = {
  id: 'acc1',
  name: 'Checking',
  color: '#000',
  currency: 'USD',
  balance: 1000,
  type: 'normal',
};

const account2: Account = {
  id: 'acc2',
  name: 'Savings',
  color: '#111',
  currency: 'MXN',
  balance: 5000,
  type: 'normal',
};

const pocket1: Pocket = {
  id: 'pkt1',
  accountId: 'acc1',
  name: 'Fixed',
  type: 'fixed',
  balance: 500,
  currency: 'USD',
};

const pocket2: Pocket = {
  id: 'pkt2',
  accountId: 'acc2',
  name: 'Fixed',
  type: 'fixed',
  balance: 2000,
  currency: 'MXN',
};

const baseProps = {
  fixedPockets: [pocket1],
  accounts: [account1],
  onClose: vi.fn(),
  onSuccess: vi.fn(),
};

describe('FixedExpenseForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createMutateAsync.mockResolvedValue(undefined);
    updateMutateAsync.mockResolvedValue(undefined);
  });

  describe('rendering', () => {
    it('renders Name, Total Value, and Periodicity inputs', () => {
      render(<FixedExpenseForm {...baseProps} />);

      expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/total value/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/periodicity/i)).toBeInTheDocument();
    });

    it('renders Create button when no initialData', () => {
      render(<FixedExpenseForm {...baseProps} />);
      expect(
        screen.getByRole('button', { name: /create fixed expense/i })
      ).toBeInTheDocument();
    });

    it('renders Save Changes button when initialData is provided', () => {
      const initial: SubPocket = {
        id: 'sp1',
        pocketId: 'pkt1',
        name: 'Insurance',
        valueTotal: 1200,
        periodicityMonths: 12,
        balance: 0,
        enabled: true,
      };
      render(<FixedExpenseForm {...baseProps} initialData={initial} />);

      expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/name/i)).toHaveValue('Insurance');
      expect(screen.getByLabelText(/total value/i)).toHaveValue(1200);
      expect(screen.getByLabelText(/periodicity/i)).toHaveValue(12);
    });

    it('hides the Account select when only one fixed pocket exists', () => {
      render(<FixedExpenseForm {...baseProps} />);
      expect(screen.queryByText(/^Account$/)).not.toBeInTheDocument();
    });

    it('shows the Account select when multiple fixed pockets exist', () => {
      render(
        <FixedExpenseForm
          {...baseProps}
          fixedPockets={[pocket1, pocket2]}
          accounts={[account1, account2]}
        />
      );

      // The Account label is rendered as a plain <label> (not the Input
      // component's label), so query by accessible text.
      expect(screen.getByText(/^Account/)).toBeInTheDocument();
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    it('updates the monthly contribution preview when inputs change', async () => {
      const user = userEvent.setup();
      render(<FixedExpenseForm {...baseProps} />);

      const totalInput = screen.getByLabelText(/total value/i);
      const periodInput = screen.getByLabelText(/periodicity/i);

      // Total = 1200, Periodicity = 12 → 100/month formatted as USD
      await user.clear(totalInput);
      await user.type(totalInput, '1200');
      await user.clear(periodInput);
      await user.type(periodInput, '12');

      await waitFor(() => {
        expect(screen.getByText(/Monthly Contribution:/i)).toBeInTheDocument();
        // Match $100.00 with locale-tolerant separators (e.g. NBSP).
        expect(screen.getByText(/\$\s*100\.00/)).toBeInTheDocument();
      });
    });
  });

  describe('validation', () => {
    it('shows required-field error when Name is empty on blur', async () => {
      const user = userEvent.setup();
      render(<FixedExpenseForm {...baseProps} />);

      const nameInput = screen.getByLabelText(/name/i);
      await user.click(nameInput);
      await user.tab();

      await waitFor(() => {
        expect(screen.getByText(/name is required/i)).toBeInTheDocument();
      });
    });

    it('rejects total value below 0.01', async () => {
      const user = userEvent.setup();
      render(<FixedExpenseForm {...baseProps} />);

      const nameInput = screen.getByLabelText(/name/i);
      await user.type(nameInput, 'Bill');

      const totalInput = screen.getByLabelText(/total value/i);
      await user.clear(totalInput);
      await user.type(totalInput, '0');

      await user.click(screen.getByRole('button', { name: /create fixed expense/i }));

      await waitFor(() => {
        expect(screen.getByText(/at least 0\.01/i)).toBeInTheDocument();
      });
      expect(createMutateAsync).not.toHaveBeenCalled();
    });
  });

  describe('submission', () => {
    it('calls createSubPocket with the form data and triggers callbacks', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      const onSuccess = vi.fn();
      render(
        <FixedExpenseForm
          {...baseProps}
          onClose={onClose}
          onSuccess={onSuccess}
        />
      );

      await user.type(screen.getByLabelText(/name/i), 'Car payment');
      const totalInput = screen.getByLabelText(/total value/i);
      await user.clear(totalInput);
      await user.type(totalInput, '6000');
      const periodInput = screen.getByLabelText(/periodicity/i);
      await user.clear(periodInput);
      await user.type(periodInput, '24');

      await user.click(screen.getByRole('button', { name: /create fixed expense/i }));

      await waitFor(() => {
        expect(createMutateAsync).toHaveBeenCalledWith({
          pocketId: 'pkt1',
          name: 'Car payment',
          valueTotal: 6000,
          periodicityMonths: 24,
        });
      });
      expect(onSuccess).toHaveBeenCalledTimes(1);
      expect(onClose).toHaveBeenCalledTimes(1);
      expect(toastSuccess).toHaveBeenCalledWith(
        expect.stringMatching(/created/i)
      );
    });

    it('calls updateSubPocket when editing an existing fixed expense', async () => {
      const user = userEvent.setup();
      const initial: SubPocket = {
        id: 'sp1',
        pocketId: 'pkt1',
        name: 'Insurance',
        valueTotal: 1200,
        periodicityMonths: 12,
        balance: 0,
        enabled: true,
      };
      render(<FixedExpenseForm {...baseProps} initialData={initial} />);

      const nameInput = screen.getByLabelText(/name/i);
      await user.clear(nameInput);
      await user.type(nameInput, 'Renamed');

      await user.click(screen.getByRole('button', { name: /save changes/i }));

      await waitFor(() => {
        expect(updateMutateAsync).toHaveBeenCalledWith({
          id: 'sp1',
          updates: {
            name: 'Renamed',
            valueTotal: 1200,
            periodicityMonths: 12,
          },
        });
      });
      expect(toastSuccess).toHaveBeenCalledWith(
        expect.stringMatching(/updated/i)
      );
    });

    it('renders an inline error message when the mutation rejects', async () => {
      createMutateAsync.mockRejectedValueOnce(new Error('Save failed'));

      const user = userEvent.setup();
      const onSuccess = vi.fn();
      const onClose = vi.fn();
      render(
        <FixedExpenseForm {...baseProps} onSuccess={onSuccess} onClose={onClose} />
      );

      await user.type(screen.getByLabelText(/name/i), 'Bill');
      const totalInput = screen.getByLabelText(/total value/i);
      await user.clear(totalInput);
      await user.type(totalInput, '100');

      await user.click(screen.getByRole('button', { name: /create fixed expense/i }));

      await waitFor(() => {
        expect(screen.getByText('Save failed')).toBeInTheDocument();
      });
      expect(onSuccess).not.toHaveBeenCalled();
      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe('cancel', () => {
    it('calls onClose when Cancel is clicked', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      render(<FixedExpenseForm {...baseProps} onClose={onClose} />);

      await user.click(screen.getByRole('button', { name: /cancel/i }));

      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });
});
