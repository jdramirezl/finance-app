import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../../../test/testUtils';
import userEvent from '@testing-library/user-event';
import ReminderForm from '../ReminderForm';
import type { Reminder } from '../../../services/reminderService';
import type { SubPocket, FixedExpenseGroup, MovementTemplate } from '../../../types';

const subPockets: SubPocket[] = [
  {
    id: 'sp-1',
    pocketId: 'pkt-1',
    name: 'Internet',
    valueTotal: 60,
    periodicityMonths: 12,
    balance: 0,
    groupId: 'grp-1',
  },
];

const fixedExpenseGroups: FixedExpenseGroup[] = [
  {
    id: 'grp-1',
    name: 'Bills',
    color: '#000',
    displayOrder: 0,
    createdAt: '2025-01-01T00:00:00Z',
  },
];

const templates: MovementTemplate[] = [
  {
    id: 'tpl-1',
    name: 'Rent',
    type: 'EgresoFijo',
    accountId: 'acc-1',
    pocketId: 'pkt-1',
    defaultAmount: 1500,
    notes: 'monthly rent',
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
  },
];

vi.mock('../../../hooks/queries', () => ({
  useSubPocketsQuery: () => ({ data: subPockets }),
  useMovementTemplatesQuery: () => ({ data: templates }),
  useFixedExpenseGroupsQuery: () => ({ data: fixedExpenseGroups }),
}));

vi.mock('../../../hooks/useUnsavedChanges', () => ({
  useUnsavedChanges: vi.fn(),
}));

const defaultProps = {
  onSubmit: vi.fn().mockResolvedValue(undefined),
  onCancel: vi.fn(),
  isSaving: false,
};

describe('ReminderForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    defaultProps.onSubmit.mockResolvedValue(undefined);
  });

  describe('rendering', () => {
    it('renders Title, Amount, Due Date, and Repeat fields', () => {
      render(<ReminderForm {...defaultProps} />);

      expect(screen.getByLabelText(/^title/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^amount/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/due date/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/repeat/i)).toBeInTheDocument();
    });

    it('renders Create button label by default', () => {
      render(<ReminderForm {...defaultProps} />);
      expect(
        screen.getByRole('button', { name: /create reminder/i })
      ).toBeInTheDocument();
    });

    it('renders Update button label and hydrates fields when editing', () => {
      const initial: Reminder = {
        id: 'rem-1',
        userId: 'user-1',
        title: 'Insurance',
        amount: 250,
        dueDate: '2025-08-01',
        isPaid: false,
        recurrence: { type: 'monthly', interval: 1, endType: 'never' },
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z',
      };
      render(<ReminderForm {...defaultProps} initialData={initial} />);

      expect(
        screen.getByRole('button', { name: /update reminder/i })
      ).toBeInTheDocument();
      expect(screen.getByLabelText(/^title/i)).toHaveValue('Insurance');
      expect(screen.getByLabelText(/^amount/i)).toHaveValue(250);
      expect(screen.getByLabelText(/due date/i)).toHaveValue('2025-08-01');
    });
  });

  describe('conditional sections', () => {
    it('does not show end-condition radios for one-off reminders', () => {
      render(<ReminderForm {...defaultProps} />);
      expect(screen.queryByText(/^Ends/)).not.toBeInTheDocument();
    });

    it('shows end-condition radios for recurring reminders', async () => {
      const user = userEvent.setup();
      render(<ReminderForm {...defaultProps} />);

      await user.selectOptions(screen.getByLabelText(/repeat/i), 'monthly');

      await waitFor(() => {
        const radios = screen.getAllByRole('radio');
        const values = radios.map((r) => (r as HTMLInputElement).value);
        expect(values).toEqual(expect.arrayContaining(['never', 'after', 'on_date']));
      });
    });

    it('shows the day-of-week picker when recurrence is weekly', async () => {
      const user = userEvent.setup();
      render(<ReminderForm {...defaultProps} />);

      await user.selectOptions(screen.getByLabelText(/repeat/i), 'weekly');

      await waitFor(() => {
        expect(screen.getByText(/repeat on/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Mon' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Sun' })).toBeInTheDocument();
      });
    });

    it('shows custom interval and period when recurrence is custom', async () => {
      const user = userEvent.setup();
      render(<ReminderForm {...defaultProps} />);

      await user.selectOptions(screen.getByLabelText(/repeat/i), 'custom');

      await waitFor(() => {
        expect(screen.getByLabelText(/^every/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/^period/i)).toBeInTheDocument();
      });
    });

    it('shows the count input when end-condition is "after"', async () => {
      const user = userEvent.setup();
      render(<ReminderForm {...defaultProps} />);

      await user.selectOptions(screen.getByLabelText(/repeat/i), 'monthly');

      const radios = screen.getAllByRole('radio');
      const afterRadio = radios.find(
        (r) => (r as HTMLInputElement).value === 'after'
      );
      expect(afterRadio).toBeDefined();
      await user.click(afterRadio!);

      await waitFor(() => {
        expect(screen.getByText(/occurrences/i)).toBeInTheDocument();
      });
    });
  });

  describe('validation', () => {
    it('shows required error for empty title on blur', async () => {
      const user = userEvent.setup();
      render(<ReminderForm {...defaultProps} />);

      const title = screen.getByLabelText(/^title/i);
      await user.click(title);
      await user.tab();

      await waitFor(() => {
        expect(screen.getByText(/title is required/i)).toBeInTheDocument();
      });
    });

    it('rejects amount below 0.01', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn().mockResolvedValue(undefined);
      render(<ReminderForm {...defaultProps} onSubmit={onSubmit} />);

      await user.type(screen.getByLabelText(/^title/i), 'Bill');
      const amount = screen.getByLabelText(/^amount/i);
      await user.clear(amount);
      await user.type(amount, '0');

      await user.click(screen.getByRole('button', { name: /create reminder/i }));

      await waitFor(() => {
        expect(screen.getByText(/minimum amount is 0\.01/i)).toBeInTheDocument();
      });
      expect(onSubmit).not.toHaveBeenCalled();
    });
  });

  describe('submission', () => {
    it('submits a one-off reminder with parsed amount and ISO due date', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn().mockResolvedValue(undefined);
      render(<ReminderForm {...defaultProps} onSubmit={onSubmit} />);

      await user.type(screen.getByLabelText(/^title/i), 'Phone bill');
      const amount = screen.getByLabelText(/^amount/i);
      await user.clear(amount);
      await user.type(amount, '49.99');
      const due = screen.getByLabelText(/due date/i);
      await user.clear(due);
      await user.type(due, '2025-09-01');

      await user.click(screen.getByRole('button', { name: /create reminder/i }));

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledTimes(1);
      });

      const payload = onSubmit.mock.calls[0][0];
      expect(payload.title).toBe('Phone bill');
      expect(payload.amount).toBeCloseTo(49.99);
      expect(payload.dueDate).toMatch(/^2025-09-01/);
      expect(payload.recurrence.type).toBe('once');
      expect(payload.recurrence.endType).toBe('never');
    });

    it('omits weekly daysOfWeek and custom period when recurrence is monthly', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn().mockResolvedValue(undefined);
      render(<ReminderForm {...defaultProps} onSubmit={onSubmit} />);

      await user.type(screen.getByLabelText(/^title/i), 'Rent');
      const amount = screen.getByLabelText(/^amount/i);
      await user.clear(amount);
      await user.type(amount, '1500');
      await user.selectOptions(screen.getByLabelText(/repeat/i), 'monthly');

      await user.click(screen.getByRole('button', { name: /create reminder/i }));

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledTimes(1);
      });

      const payload = onSubmit.mock.calls[0][0];
      expect(payload.recurrence.type).toBe('monthly');
      expect(payload.recurrence.daysOfWeek).toBeUndefined();
      expect(payload.recurrence.customPeriod).toBeUndefined();
    });
  });

  describe('auto-fill from links', () => {
    it('auto-fills the title and amount when a template is selected', async () => {
      const user = userEvent.setup();
      render(<ReminderForm {...defaultProps} />);

      await user.selectOptions(screen.getByLabelText(/^template/i), 'tpl-1');

      await waitFor(() => {
        expect(screen.getByLabelText(/^title/i)).toHaveValue('Rent');
        expect(screen.getByLabelText(/^amount/i)).toHaveValue(1500);
      });
    });

    it('auto-fills the amount from a fixed expense when amount is empty', async () => {
      const user = userEvent.setup();
      render(<ReminderForm {...defaultProps} />);

      await user.selectOptions(screen.getByLabelText(/fixed expense/i), 'sp-1');

      await waitFor(() => {
        expect(screen.getByLabelText(/^amount/i)).toHaveValue(60);
      });
    });
  });

  describe('cancel', () => {
    it('calls onCancel when Cancel is clicked', async () => {
      const user = userEvent.setup();
      const onCancel = vi.fn();
      render(<ReminderForm {...defaultProps} onCancel={onCancel} />);

      await user.click(screen.getByRole('button', { name: /cancel/i }));
      expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it('disables Cancel and Submit when isSaving is true', () => {
      render(<ReminderForm {...defaultProps} isSaving />);

      expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled();
      // While saving, the submit button label flips to "Saving..."
      expect(
        screen.getByRole('button', { name: /saving\.\.\./i })
      ).toBeDisabled();
    });
  });
});
