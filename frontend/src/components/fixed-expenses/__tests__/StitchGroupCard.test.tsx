import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '../../../test/testUtils';
import userEvent from '@testing-library/user-event';
import StitchGroupCard from '../StitchGroupCard';
import type { FixedExpenseGroup, SubPocket } from '../../../types';

const billsGroup: FixedExpenseGroup = {
  id: 'grp-bills',
  name: 'Bills',
  color: '#3B82F6',
  displayOrder: 0,
  createdAt: '2025-01-01T00:00:00Z',
};

const internet: SubPocket = {
  id: 'sp-internet',
  pocketId: 'pkt-1',
  name: 'Internet',
  valueTotal: 600, // 600 / 12 = $50/mo
  periodicityMonths: 12,
  balance: 50,
  enabled: true,
  groupId: 'grp-bills',
};

const electricity: SubPocket = {
  id: 'sp-electricity',
  pocketId: 'pkt-1',
  name: 'Electricity',
  valueTotal: 1200, // 1200 / 12 = $100/mo
  periodicityMonths: 12,
  balance: 100,
  enabled: true,
  groupId: 'grp-bills',
};

const disabledExpense: SubPocket = {
  ...electricity,
  id: 'sp-disabled',
  name: 'Disabled',
  enabled: false,
};

type Props = React.ComponentProps<typeof StitchGroupCard>;

const buildProps = (overrides: Partial<Props> = {}): Props => ({
  group: billsGroup,
  expenses: [internet, electricity],
  currency: 'USD',
  isDefaultGroup: false,
  isCollapsed: false,
  onToggleCollapse: vi.fn(),
  onToggleGroup: vi.fn(),
  onEditGroup: vi.fn(),
  onDeleteGroup: vi.fn(),
  onEditExpense: vi.fn(),
  onDeleteExpense: vi.fn(),
  onToggleExpense: vi.fn(),
  isTogglingGroup: false,
  deletingExpenseId: null,
  togglingExpenseId: null,
  ...overrides,
});

describe('StitchGroupCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders the group name and enabled count', () => {
      render(<StitchGroupCard {...buildProps()} />);

      expect(screen.getByText('Bills')).toBeInTheDocument();
      expect(screen.getByText('2/2')).toBeInTheDocument();
    });

    it('renders each expense name and its monthly amount when expanded', () => {
      render(<StitchGroupCard {...buildProps()} />);

      expect(screen.getByText('Internet')).toBeInTheDocument();
      expect(screen.getByText('Electricity')).toBeInTheDocument();
      // Group total = 50 + 100 = 150
      expect(screen.getByText('$150.00')).toBeInTheDocument();
      expect(screen.getByText('$50.00')).toBeInTheDocument();
      expect(screen.getByText('$100.00')).toBeInTheDocument();
    });

    it('skips disabled expenses when computing the group total', () => {
      render(
        <StitchGroupCard
          {...buildProps({ expenses: [internet, disabledExpense] })}
        />,
      );

      // Only the enabled internet ($50) counts toward the group total — both
      // the group total and the row amount render as $50.00.
      const fiftyMatches = screen.getAllByText('$50.00');
      expect(fiftyMatches.length).toBeGreaterThanOrEqual(2);
      expect(screen.getByText('1/2')).toBeInTheDocument();
    });

    it('hides the expense rows when collapsed', () => {
      render(<StitchGroupCard {...buildProps({ isCollapsed: true })} />);

      expect(screen.queryByText('Internet')).not.toBeInTheDocument();
      expect(screen.queryByText('Electricity')).not.toBeInTheDocument();
    });

    it('renders the empty-group message when expenses is empty and expanded', () => {
      render(<StitchGroupCard {...buildProps({ expenses: [] })} />);

      expect(screen.getByText(/no expenses in this group/i)).toBeInTheDocument();
    });

    it('hides edit/delete group buttons for the Default group', () => {
      render(<StitchGroupCard {...buildProps({ isDefaultGroup: true })} />);

      expect(
        screen.queryByLabelText(/edit group bills/i),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByLabelText(/delete group bills/i),
      ).not.toBeInTheDocument();
      // Toggle-all button is still present.
      expect(
        screen.getByLabelText(/disable all expenses in bills/i),
      ).toBeInTheDocument();
    });

    it('exposes the correct toggle-all label depending on enabled state', () => {
      const { rerender } = render(<StitchGroupCard {...buildProps()} />);
      expect(
        screen.getByLabelText(/disable all expenses in bills/i),
      ).toBeInTheDocument();

      rerender(
        <StitchGroupCard
          {...buildProps({ expenses: [{ ...internet, enabled: false }] })}
        />,
      );
      expect(
        screen.getByLabelText(/enable all expenses in bills/i),
      ).toBeInTheDocument();
    });
  });

  describe('group-level callbacks', () => {
    it('invokes onToggleCollapse when the header text or chevron is clicked', async () => {
      const user = userEvent.setup();
      const onToggleCollapse = vi.fn();
      render(<StitchGroupCard {...buildProps({ onToggleCollapse })} />);

      // The header text + chevron both expose the same intent.
      await user.click(screen.getByLabelText(/collapse bills/i, { selector: 'button[aria-expanded]' }));
      expect(onToggleCollapse).toHaveBeenCalledTimes(1);
    });

    it('invokes onToggleGroup when the toggle-all button is clicked', async () => {
      const user = userEvent.setup();
      const onToggleGroup = vi.fn();
      render(<StitchGroupCard {...buildProps({ onToggleGroup })} />);

      await user.click(screen.getByLabelText(/disable all expenses in bills/i));
      expect(onToggleGroup).toHaveBeenCalledTimes(1);
    });

    it('invokes onEditGroup when the edit group button is clicked', async () => {
      const user = userEvent.setup();
      const onEditGroup = vi.fn();
      render(<StitchGroupCard {...buildProps({ onEditGroup })} />);

      await user.click(screen.getByLabelText(/edit group bills/i));
      expect(onEditGroup).toHaveBeenCalledTimes(1);
    });

    it('invokes onDeleteGroup when the delete group button is clicked', async () => {
      const user = userEvent.setup();
      const onDeleteGroup = vi.fn();
      render(<StitchGroupCard {...buildProps({ onDeleteGroup })} />);

      await user.click(screen.getByLabelText(/delete group bills/i));
      expect(onDeleteGroup).toHaveBeenCalledTimes(1);
    });

    it('disables the toggle-all button when isTogglingGroup is true', () => {
      render(<StitchGroupCard {...buildProps({ isTogglingGroup: true })} />);

      expect(
        screen.getByLabelText(/disable all expenses in bills/i),
      ).toBeDisabled();
    });

    it('disables the toggle-all button when there are no expenses', () => {
      render(<StitchGroupCard {...buildProps({ expenses: [] })} />);

      expect(
        screen.getByLabelText(/enable all expenses in bills/i),
      ).toBeDisabled();
    });
  });

  describe('expense-level callbacks', () => {
    it('invokes onEditExpense with the expense when its edit button is clicked', async () => {
      const user = userEvent.setup();
      const onEditExpense = vi.fn();
      render(<StitchGroupCard {...buildProps({ onEditExpense })} />);

      await user.click(
        screen.getByLabelText(/edit fixed expense internet/i),
      );
      expect(onEditExpense).toHaveBeenCalledTimes(1);
      expect(onEditExpense).toHaveBeenCalledWith(internet);
    });

    it('invokes onDeleteExpense with the expense when its delete button is clicked', async () => {
      const user = userEvent.setup();
      const onDeleteExpense = vi.fn();
      render(<StitchGroupCard {...buildProps({ onDeleteExpense })} />);

      await user.click(
        screen.getByLabelText(/delete fixed expense internet/i),
      );
      expect(onDeleteExpense).toHaveBeenCalledTimes(1);
      expect(onDeleteExpense).toHaveBeenCalledWith(internet);
    });

    it('invokes onToggleExpense with the expense when its checkbox is clicked', async () => {
      const user = userEvent.setup();
      const onToggleExpense = vi.fn();
      render(<StitchGroupCard {...buildProps({ onToggleExpense })} />);

      await user.click(screen.getByLabelText(/disable internet/i));
      expect(onToggleExpense).toHaveBeenCalledTimes(1);
      expect(onToggleExpense).toHaveBeenCalledWith(internet);
    });

    it('disables the delete button while deletingExpenseId matches', () => {
      render(
        <StitchGroupCard
          {...buildProps({ deletingExpenseId: 'sp-internet' })}
        />,
      );

      expect(
        screen.getByLabelText(/delete fixed expense internet/i),
      ).toBeDisabled();
      expect(
        screen.getByLabelText(/delete fixed expense electricity/i),
      ).not.toBeDisabled();
    });

    it('disables the toggle checkbox while togglingExpenseId matches', () => {
      render(
        <StitchGroupCard
          {...buildProps({ togglingExpenseId: 'sp-internet' })}
        />,
      );

      expect(screen.getByLabelText(/disable internet/i)).toBeDisabled();
      expect(screen.getByLabelText(/disable electricity/i)).not.toBeDisabled();
    });

    it('shows the expense in disabled state when its enabled flag is false', () => {
      render(
        <StitchGroupCard
          {...buildProps({ expenses: [{ ...internet, enabled: false }] })}
        />,
      );

      // Checkbox reflects disabled state
      const checkbox = screen.getByLabelText(/enable internet/i) as HTMLInputElement;
      expect(checkbox.checked).toBe(false);
    });
  });
});
