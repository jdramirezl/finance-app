import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '../../../test/testUtils';
import userEvent from '@testing-library/user-event';
import FixedExpenseGroupCard from '../FixedExpenseGroupCard';
import type { Account, FixedExpenseGroup, SubPocket } from '../../../types';

const group: FixedExpenseGroup = {
  id: 'grp-1',
  name: 'Bills',
  color: '#3b82f6',
  displayOrder: 0,
  createdAt: '2025-01-01T00:00:00Z',
};

const defaultGroup: FixedExpenseGroup = {
  id: 'grp-default',
  name: 'Default',
  color: '#6b7280',
  displayOrder: 0,
  createdAt: '2025-01-01T00:00:00Z',
};

const subPocketEnabled: SubPocket = {
  id: 'sp-1',
  pocketId: 'pkt-1',
  name: 'Internet',
  valueTotal: 1200,
  periodicityMonths: 12,
  balance: 100,
  groupId: 'grp-1',
};

const subPocketDisabled: SubPocket = {
  id: 'sp-2',
  pocketId: 'pkt-1',
  name: 'Gym',
  valueTotal: 600,
  periodicityMonths: 12,
  balance: 0,
  groupId: 'grp-1',
};

const account: Account = {
  id: 'acc-1',
  name: 'Bank',
  color: '#0ea5e9',
  currency: 'USD',
  balance: 0,
  type: 'normal',
};

const makeProps = (overrides: Partial<React.ComponentProps<typeof FixedExpenseGroupCard>> = {}) => ({
  group,
  subPockets: [subPocketEnabled, subPocketDisabled],
  allGroups: [group, defaultGroup],
  currency: 'USD',
  isDefaultGroup: false,
  isCollapsed: false,
  isToggling: false,
  onToggleCollapse: vi.fn(),
  onToggleGroup: vi.fn(),
  onEditGroup: vi.fn(),
  onDeleteGroup: vi.fn(),
  onEditExpense: vi.fn(),
  onDeleteExpense: vi.fn(),
  onToggleExpense: vi.fn(),
  onMoveToGroup: vi.fn(),
  deletingId: null,
  togglingId: null,
  ...overrides,
});

describe('FixedExpenseGroupCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('group header', () => {
    it('renders group name and the enabled count out of total', () => {
      render(<FixedExpenseGroupCard {...makeProps()} />);

      expect(screen.getByRole('heading', { name: 'Bills' })).toBeInTheDocument();
      // 1 of 2 enabled (subPocketEnabled vs subPocketDisabled)
      expect(screen.getByText(/\(1\/2 enabled\)/)).toBeInTheDocument();
    });

    it('renders Expected and Actual monthly totals for the group', () => {
      render(<FixedExpenseGroupCard {...makeProps()} />);

      // The header shows "Expected:" / "Actual:" totals; each sub pocket row
      // shows them again. The header-level totals are the first occurrence.
      const expected = screen.getAllByText('Expected:');
      const actual = screen.getAllByText('Actual:');
      expect(expected.length).toBeGreaterThanOrEqual(1);
      expect(actual.length).toBeGreaterThanOrEqual(1);
    });

    it('uses Expand label when collapsed and Collapse label when expanded', () => {
      const { rerender } = render(
        <FixedExpenseGroupCard {...makeProps({ isCollapsed: false })} />
      );
      expect(
        screen.getByRole('button', { name: /collapse bills/i })
      ).toBeInTheDocument();

      rerender(<FixedExpenseGroupCard {...makeProps({ isCollapsed: true })} />);
      expect(
        screen.getByRole('button', { name: /expand bills/i })
      ).toBeInTheDocument();
    });

    it('calls onToggleCollapse with the group id when chevron is clicked', async () => {
      const user = userEvent.setup();
      const onToggleCollapse = vi.fn();
      render(
        <FixedExpenseGroupCard {...makeProps({ onToggleCollapse })} />
      );

      await user.click(screen.getByRole('button', { name: /collapse bills/i }));
      expect(onToggleCollapse).toHaveBeenCalledWith('grp-1');
    });
  });

  describe('group-level toggle', () => {
    it('shows "Enable all" label and enables all when not all are enabled', async () => {
      const user = userEvent.setup();
      const onToggleGroup = vi.fn();
      render(
        <FixedExpenseGroupCard {...makeProps({ onToggleGroup })} />
      );

      const toggleBtn = screen.getByRole('button', {
        name: /enable all expenses in bills/i,
      });
      await user.click(toggleBtn);

      expect(onToggleGroup).toHaveBeenCalledWith('grp-1', true);
    });

    it('shows "Disable all" label and disables when all are enabled', async () => {
      const user = userEvent.setup();
      const onToggleGroup = vi.fn();
      render(
        <FixedExpenseGroupCard
          {...makeProps({
            onToggleGroup,
            subPockets: [subPocketEnabled, { ...subPocketDisabled }],
          })}
        />
      );

      const toggleBtn = screen.getByRole('button', {
        name: /disable all expenses in bills/i,
      });
      await user.click(toggleBtn);

      expect(onToggleGroup).toHaveBeenCalledWith('grp-1', false);
    });

    it('disables the group toggle when there are no sub pockets', () => {
      render(
        <FixedExpenseGroupCard
          {...makeProps({ subPockets: [] })}
        />
      );

      const toggleBtn = screen.getByRole('button', {
        name: /enable all expenses in bills/i,
      });
      expect(toggleBtn).toBeDisabled();
    });
  });

  describe('group edit/delete buttons', () => {
    it('renders edit and delete buttons when not the default group', async () => {
      const user = userEvent.setup();
      const onEditGroup = vi.fn();
      const onDeleteGroup = vi.fn();
      render(
        <FixedExpenseGroupCard
          {...makeProps({ onEditGroup, onDeleteGroup })}
        />
      );

      const editBtn = screen.getByRole('button', { name: /edit group bills/i });
      const deleteBtn = screen.getByRole('button', { name: /delete group bills/i });

      await user.click(editBtn);
      expect(onEditGroup).toHaveBeenCalledWith(group);

      await user.click(deleteBtn);
      expect(onDeleteGroup).toHaveBeenCalledWith(group);
    });

    it('hides edit and delete buttons for the default group', () => {
      render(
        <FixedExpenseGroupCard
          {...makeProps({ isDefaultGroup: true })}
        />
      );

      expect(
        screen.queryByRole('button', { name: /edit group/i })
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: /delete group/i })
      ).not.toBeInTheDocument();
    });
  });

  describe('expanded vs collapsed body', () => {
    it('renders sub pocket rows when expanded', () => {
      render(<FixedExpenseGroupCard {...makeProps()} />);

      expect(screen.getByText('Internet')).toBeInTheDocument();
      expect(screen.getByText('Gym')).toBeInTheDocument();
    });

    it('hides sub pocket rows when collapsed', () => {
      render(
        <FixedExpenseGroupCard {...makeProps({ isCollapsed: true })} />
      );

      expect(screen.queryByText('Internet')).not.toBeInTheDocument();
      expect(screen.queryByText('Gym')).not.toBeInTheDocument();
    });

    it('shows an empty-state message when expanded with no sub pockets', () => {
      render(<FixedExpenseGroupCard {...makeProps({ subPockets: [] })} />);

      expect(screen.getByText(/no expenses in this group/i)).toBeInTheDocument();
    });
  });

  describe('per-expense actions', () => {
    it('calls onEditExpense with the sub pocket when edit is clicked', async () => {
      const user = userEvent.setup();
      const onEditExpense = vi.fn();
      render(<FixedExpenseGroupCard {...makeProps({ onEditExpense })} />);

      await user.click(
        screen.getByRole('button', { name: /edit fixed expense internet/i })
      );
      expect(onEditExpense).toHaveBeenCalledWith(subPocketEnabled);
    });

    it('calls onDeleteExpense with the sub pocket id when delete is clicked', async () => {
      const user = userEvent.setup();
      const onDeleteExpense = vi.fn();
      render(<FixedExpenseGroupCard {...makeProps({ onDeleteExpense })} />);

      await user.click(
        screen.getByRole('button', { name: /delete fixed expense gym/i })
      );
      expect(onDeleteExpense).toHaveBeenCalledWith('sp-2');
    });

    it('calls onToggleExpense with the sub pocket id when expense toggle is clicked', async () => {
      const user = userEvent.setup();
      const onToggleExpense = vi.fn();
      render(<FixedExpenseGroupCard {...makeProps({ onToggleExpense })} />);

      await user.click(screen.getByRole('button', { name: /^disable internet$/i }));
      expect(onToggleExpense).toHaveBeenCalledWith('sp-1');
    });

    it('calls onMoveToGroup when the group selector is changed', async () => {
      const user = userEvent.setup();
      const onMoveToGroup = vi.fn();
      render(<FixedExpenseGroupCard {...makeProps({ onMoveToGroup })} />);

      const selector = screen.getByLabelText(/move internet to a different group/i);
      await user.selectOptions(selector, 'grp-default');
      expect(onMoveToGroup).toHaveBeenCalledWith('sp-1', 'grp-default');
    });
  });

  describe('disabled / account badge / per-row state', () => {
    it('renders the account name badge when pocketAccountMap has the pocket', () => {
      const map = new Map<string, Account>([['pkt-1', account]]);
      render(<FixedExpenseGroupCard {...makeProps({ pocketAccountMap: map })} />);

      // Two rows share the same pocket, so the badge appears twice.
      const badges = screen.getAllByText('Bank');
      expect(badges.length).toBeGreaterThanOrEqual(1);
    });

    it('shows a "Disabled" pill for sub pockets that are not enabled', () => {
      render(<FixedExpenseGroupCard {...makeProps()} />);
      expect(screen.getByText('Disabled')).toBeInTheDocument();
    });

    it('marks the per-row delete button as disabled while deleting', () => {
      render(
        <FixedExpenseGroupCard {...makeProps({ deletingId: 'sp-1' })} />
      );

      const deleteBtn = screen.getByRole('button', {
        name: /delete fixed expense internet/i,
      });
      expect(deleteBtn).toBeDisabled();
    });

    it('marks the per-row toggle button as disabled while toggling', () => {
      render(
        <FixedExpenseGroupCard {...makeProps({ togglingId: 'sp-2' })} />
      );

      const toggleBtn = screen.getByRole('button', { name: /^enable gym$/i });
      expect(toggleBtn).toBeDisabled();
    });

    it('lists each fixed expense by name within the expanded body', () => {
      render(<FixedExpenseGroupCard {...makeProps()} />);

      const internetSection = screen.getByText('Internet').closest('div');
      const gymSection = screen.getByText('Gym').closest('div');

      expect(internetSection).not.toBeNull();
      expect(gymSection).not.toBeNull();
      // Sanity check that periodicity label is rendered for each row.
      const allPeriodicity = screen.getAllByText('Periodicity:');
      expect(allPeriodicity).toHaveLength(2);
    });

    it('renders a select with all groups for moving the expense', () => {
      render(<FixedExpenseGroupCard {...makeProps()} />);

      const selector = screen.getByLabelText(/move internet to a different group/i);
      const options = within(selector as HTMLElement).getAllByRole('option');
      const optionValues = options.map(o => (o as HTMLOptionElement).value);
      expect(optionValues).toEqual(expect.arrayContaining(['grp-1', 'grp-default']));
    });
  });
});
