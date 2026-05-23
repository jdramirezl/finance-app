import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '../../../test/testUtils';
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
  groupId: 'grp-bills',
};

const electricity: SubPocket = {
  id: 'sp-electricity',
  pocketId: 'pkt-1',
  name: 'Electricity',
  valueTotal: 1200, // 1200 / 12 = $100/mo
  periodicityMonths: 12,
  balance: 100,
  groupId: 'grp-bills',
};

type Props = React.ComponentProps<typeof StitchGroupCard>;

const buildProps = (overrides: Partial<Props> = {}): Props => ({
  group: billsGroup,
  expenses: [internet, electricity],
  currency: 'USD',
  isDefaultGroup: false,
  isCollapsed: false,
  onToggleCollapse: vi.fn(),
  onEditGroup: vi.fn(),
  onDeleteGroup: vi.fn(),
  onEditExpense: vi.fn(),
  onDeleteExpense: vi.fn(),
  onMoveToGroup: vi.fn(),
  availableGroups: [
    { id: 'grp-subs', name: 'Subscriptions' },
    { id: 'grp-utilities', name: 'Utilities' },
  ],
  deletingExpenseId: null,
  ...overrides,
});

describe('StitchGroupCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders the group name and item count', () => {
      render(<StitchGroupCard {...buildProps()} />);

      expect(screen.getByText('Bills')).toBeInTheDocument();
      expect(screen.getByText('2 items')).toBeInTheDocument();
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
  });

  describe('move-to-group dropdown', () => {
    it('does not render the dropdown by default', () => {
      render(<StitchGroupCard {...buildProps()} />);

      expect(
        screen.queryByRole('menu', { name: /move internet to/i }),
      ).not.toBeInTheDocument();
    });

    it('opens the dropdown when the move button is clicked', async () => {
      const user = userEvent.setup();
      render(<StitchGroupCard {...buildProps()} />);

      await user.click(
        screen.getByLabelText(/move fixed expense internet to another group/i),
      );

      expect(
        screen.getByRole('menu', { name: /move internet to/i }),
      ).toBeInTheDocument();
    });

    it('shows each available group plus an Ungrouped option in the dropdown', async () => {
      const user = userEvent.setup();
      render(<StitchGroupCard {...buildProps()} />);

      await user.click(
        screen.getByLabelText(/move fixed expense internet to another group/i),
      );

      const menu = screen.getByRole('menu', { name: /move internet to/i });
      expect(within(menu).getByRole('menuitem', { name: 'Subscriptions' }))
        .toBeInTheDocument();
      expect(within(menu).getByRole('menuitem', { name: 'Utilities' }))
        .toBeInTheDocument();
      expect(within(menu).getByRole('menuitem', { name: 'Ungrouped' }))
        .toBeInTheDocument();
    });

    it('renders an empty-state hint when no other groups are available', async () => {
      const user = userEvent.setup();
      render(
        <StitchGroupCard {...buildProps({ availableGroups: [] })} />,
      );

      await user.click(
        screen.getByLabelText(/move fixed expense internet to another group/i),
      );

      expect(screen.getByText(/no other groups/i)).toBeInTheDocument();
      // Ungrouped option is still offered even with no other groups.
      expect(
        screen.getByRole('menuitem', { name: 'Ungrouped' }),
      ).toBeInTheDocument();
    });

    it('invokes onMoveToGroup with the target group id and closes the menu', async () => {
      const user = userEvent.setup();
      const onMoveToGroup = vi.fn();
      render(<StitchGroupCard {...buildProps({ onMoveToGroup })} />);

      await user.click(
        screen.getByLabelText(/move fixed expense internet to another group/i),
      );
      await user.click(
        screen.getByRole('menuitem', { name: 'Subscriptions' }),
      );

      expect(onMoveToGroup).toHaveBeenCalledTimes(1);
      expect(onMoveToGroup).toHaveBeenCalledWith(internet, 'grp-subs');
      expect(
        screen.queryByRole('menu', { name: /move internet to/i }),
      ).not.toBeInTheDocument();
    });

    it('invokes onMoveToGroup with null when Ungrouped is picked', async () => {
      const user = userEvent.setup();
      const onMoveToGroup = vi.fn();
      render(<StitchGroupCard {...buildProps({ onMoveToGroup })} />);

      await user.click(
        screen.getByLabelText(/move fixed expense internet to another group/i),
      );
      await user.click(screen.getByRole('menuitem', { name: 'Ungrouped' }));

      expect(onMoveToGroup).toHaveBeenCalledTimes(1);
      expect(onMoveToGroup).toHaveBeenCalledWith(internet, null);
    });

    it('toggles the dropdown closed when the move button is clicked again', async () => {
      const user = userEvent.setup();
      render(<StitchGroupCard {...buildProps()} />);

      const trigger = screen.getByLabelText(
        /move fixed expense internet to another group/i,
      );
      await user.click(trigger);
      expect(
        screen.getByRole('menu', { name: /move internet to/i }),
      ).toBeInTheDocument();

      await user.click(trigger);
      expect(
        screen.queryByRole('menu', { name: /move internet to/i }),
      ).not.toBeInTheDocument();
    });

    it('opens only one expense dropdown at a time', async () => {
      const user = userEvent.setup();
      render(<StitchGroupCard {...buildProps()} />);

      await user.click(
        screen.getByLabelText(/move fixed expense internet to another group/i),
      );
      await user.click(
        screen.getByLabelText(
          /move fixed expense electricity to another group/i,
        ),
      );

      // Internet's menu should be replaced by electricity's.
      expect(
        screen.queryByRole('menu', { name: /move internet to/i }),
      ).not.toBeInTheDocument();
      expect(
        screen.getByRole('menu', { name: /move electricity to/i }),
      ).toBeInTheDocument();
    });
  });
});
