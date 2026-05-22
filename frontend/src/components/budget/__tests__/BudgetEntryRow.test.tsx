import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '../../../test/testUtils';
import userEvent from '@testing-library/user-event';
import BudgetEntryRow, { type DistributionEntry } from '../BudgetEntryRow';
import type { Account, Pocket } from '../../../types';

const mockAccounts: Account[] = [
  {
    id: 'acc-1',
    name: 'Bank Account',
    color: '#3B82F6',
    currency: 'USD',
    balance: 1000,
    type: 'normal',
  },
  {
    id: 'acc-2',
    name: 'Cash',
    color: '#10B981',
    currency: 'MXN',
    balance: 500,
    type: 'normal',
  },
];

const mockPockets: Pocket[] = [
  {
    id: 'pocket-1',
    accountId: 'acc-1',
    name: 'Savings',
    type: 'normal',
    balance: 600,
    currency: 'USD',
  },
  {
    id: 'pocket-2',
    accountId: 'acc-1',
    name: 'Fixed Expenses',
    type: 'fixed',
    balance: 400,
    currency: 'USD',
  },
];

const baseEntry: DistributionEntry = {
  id: 'e1',
  name: 'Savings',
  percentage: 25,
};

const baseProps = {
  entry: baseEntry,
  amount: 250,
  currency: 'USD',
  primaryCurrency: 'USD',
  showConversion: false,
  isEditing: false,
  editName: '',
  editPercentage: 0,
  editPocketId: '',
  onEditNameChange: vi.fn(),
  onEditPercentageChange: vi.fn(),
  onEditPocketChange: vi.fn(),
  onStartEdit: vi.fn(),
  onSave: vi.fn(),
  onCancel: vi.fn(),
  onDelete: vi.fn(),
  pockets: mockPockets,
  accounts: mockAccounts,
};

describe('BudgetEntryRow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('view mode', () => {
    it('renders the entry name and percentage', () => {
      render(<BudgetEntryRow {...baseProps} />);

      expect(screen.getByText('Savings')).toBeInTheDocument();
      expect(screen.getByText('25%')).toBeInTheDocument();
    });

    it('renders the amount formatted as currency', () => {
      render(<BudgetEntryRow {...baseProps} amount={1234.56} currency="USD" />);

      // Currency formatting like "$1,234.56"
      expect(screen.getByText(/\$1,234\.56/)).toBeInTheDocument();
    });

    it('shows "Unnamed" placeholder when entry name is empty', () => {
      render(
        <BudgetEntryRow
          {...baseProps}
          entry={{ ...baseEntry, name: '' }}
        />,
      );

      expect(screen.getByText('Unnamed')).toBeInTheDocument();
    });

    it('shows linked pocket info when entry has a valid pocketId', () => {
      render(
        <BudgetEntryRow
          {...baseProps}
          entry={{ ...baseEntry, pocketId: 'pocket-1', accountId: 'acc-1' }}
        />,
      );

      expect(screen.getByText(/Savings · Bank Account/)).toBeInTheDocument();
    });

    it('shows orphan warning when pocketId is set but pocket is missing', () => {
      render(
        <BudgetEntryRow
          {...baseProps}
          entry={{ ...baseEntry, pocketId: 'missing-pocket' }}
        />,
      );

      expect(
        screen.getByText(/linked pocket no longer exists/i),
      ).toBeInTheDocument();
    });

    it('renders converted amount when showConversion is true', () => {
      render(
        <BudgetEntryRow
          {...baseProps}
          showConversion
          convertedAmount={4565}
          primaryCurrency="MXN"
        />,
      );

      expect(screen.getByText(/MX\$4,565|\$4,565/)).toBeInTheDocument();
    });

    it('renders ellipsis when showConversion is true but convertedAmount is undefined', () => {
      render(
        <BudgetEntryRow
          {...baseProps}
          showConversion
          convertedAmount={undefined}
        />,
      );

      expect(screen.getByText('...')).toBeInTheDocument();
    });

    it('calls onStartEdit with the entry when edit button is clicked', async () => {
      const onStartEdit = vi.fn();
      const user = userEvent.setup();
      render(<BudgetEntryRow {...baseProps} onStartEdit={onStartEdit} />);

      await user.click(screen.getByTitle('Edit'));

      expect(onStartEdit).toHaveBeenCalledWith(baseEntry);
    });

    it('calls onDelete with the entry id when delete button is clicked', async () => {
      const onDelete = vi.fn();
      const user = userEvent.setup();
      render(<BudgetEntryRow {...baseProps} onDelete={onDelete} />);

      await user.click(screen.getByTitle('Delete'));

      expect(onDelete).toHaveBeenCalledWith('e1');
    });

    it('does not show edit-mode controls when not editing', () => {
      render(<BudgetEntryRow {...baseProps} />);

      expect(screen.queryByTitle('Save')).not.toBeInTheDocument();
      expect(screen.queryByTitle('Cancel')).not.toBeInTheDocument();
      expect(
        screen.queryByPlaceholderText('Entry name'),
      ).not.toBeInTheDocument();
    });
  });

  describe('edit mode', () => {
    const editProps = {
      ...baseProps,
      isEditing: true,
      editName: 'New Name',
      editPercentage: 30,
      editPocketId: 'pocket-1',
    };

    it('renders editable name and percentage inputs', () => {
      render(<BudgetEntryRow {...editProps} />);

      expect(screen.getByPlaceholderText('Entry name')).toHaveValue('New Name');
      expect(screen.getByPlaceholderText('%')).toHaveValue(30);
    });

    it('renders the pocket selector with current value', () => {
      render(<BudgetEntryRow {...editProps} />);

      const select = screen.getByLabelText(/link to pocket/i);
      expect(select).toHaveValue('pocket-1');
    });

    it('renders all pockets as options with type and account suffix', () => {
      render(<BudgetEntryRow {...editProps} />);

      // Fixed pocket option includes [fixed] suffix and account name+currency
      expect(
        screen.getByRole('option', {
          name: /Fixed Expenses \[fixed\] — Bank Account \(USD\)/,
        }),
      ).toBeInTheDocument();
      // Normal pocket option (no [fixed] suffix)
      expect(
        screen.getByRole('option', {
          name: /^Savings — Bank Account \(USD\)$/,
        }),
      ).toBeInTheDocument();
    });

    it('forwards typing in the name input via onEditNameChange', async () => {
      const onEditNameChange = vi.fn();
      const user = userEvent.setup();
      render(
        <BudgetEntryRow
          {...editProps}
          editName=""
          onEditNameChange={onEditNameChange}
        />,
      );

      await user.type(screen.getByPlaceholderText('Entry name'), 'A');

      expect(onEditNameChange).toHaveBeenCalledWith('A');
    });

    it('forwards percentage changes via onEditPercentageChange (parsed)', async () => {
      const onEditPercentageChange = vi.fn();
      const user = userEvent.setup();
      render(
        <BudgetEntryRow
          {...editProps}
          editPercentage={0}
          onEditPercentageChange={onEditPercentageChange}
        />,
      );

      await user.type(screen.getByPlaceholderText('%'), '5');

      expect(onEditPercentageChange).toHaveBeenCalledWith(5);
    });

    it('forwards pocket selection via onEditPocketChange', async () => {
      const onEditPocketChange = vi.fn();
      const user = userEvent.setup();
      render(
        <BudgetEntryRow
          {...editProps}
          onEditPocketChange={onEditPocketChange}
        />,
      );

      await user.selectOptions(
        screen.getByLabelText(/link to pocket/i),
        'pocket-2',
      );

      expect(onEditPocketChange).toHaveBeenCalledWith('pocket-2');
    });

    it('calls onSave with entry id when save button is clicked', async () => {
      const onSave = vi.fn();
      const user = userEvent.setup();
      render(<BudgetEntryRow {...editProps} onSave={onSave} />);

      await user.click(screen.getByTitle('Save'));

      expect(onSave).toHaveBeenCalledWith('e1');
    });

    it('calls onCancel when cancel button is clicked', async () => {
      const onCancel = vi.fn();
      const user = userEvent.setup();
      render(<BudgetEntryRow {...editProps} onCancel={onCancel} />);

      await user.click(screen.getByTitle('Cancel'));

      expect(onCancel).toHaveBeenCalled();
    });

    it('does not show view-mode action buttons in edit mode', () => {
      render(<BudgetEntryRow {...editProps} />);

      expect(screen.queryByTitle('Edit')).not.toBeInTheDocument();
      expect(screen.queryByTitle('Delete')).not.toBeInTheDocument();
    });
  });
});
