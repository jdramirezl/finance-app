import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '../../../test/testUtils';
import userEvent from '@testing-library/user-event';
import StitchExpensesList from '../StitchExpensesList';
import type { FixedExpenseGroup, SubPocket } from '../../../types';

// Capture every render of StitchGroupCard so we can assert on the props
// passed to each instance — this is the contract this list owns.
const groupCardRenders: Array<Record<string, unknown>> = [];

vi.mock('../StitchGroupCard', () => ({
  default: (props: Record<string, unknown> & { group: FixedExpenseGroup }) => {
    groupCardRenders.push(props);
    const expenses = props.expenses as SubPocket[];
    return (
      <div
        data-testid="group-card"
        data-group-id={props.group.id}
        data-group-name={props.group.name}
        data-default={String(props.isDefaultGroup)}
        data-collapsed={String(props.isCollapsed)}
        data-toggling-group={String(props.isTogglingGroup)}
        data-deleting-expense-id={String(props.deletingExpenseId ?? '')}
        data-toggling-expense-id={String(props.togglingExpenseId ?? '')}
      >
        <span data-testid="group-name">{props.group.name}</span>
        <span data-testid="group-expense-count">{expenses.length}</span>
        {expenses.map((sp) => (
          <span key={sp.id} data-testid={`sp-in-${props.group.id}`}>
            {sp.name}
          </span>
        ))}
        <button
          data-testid={`trigger-toggle-collapse-${props.group.id}`}
          onClick={props.onToggleCollapse as () => void}
        >
          collapse
        </button>
        <button
          data-testid={`trigger-toggle-group-${props.group.id}`}
          onClick={props.onToggleGroup as () => void}
        >
          toggle-group
        </button>
        <button
          data-testid={`trigger-edit-group-${props.group.id}`}
          onClick={props.onEditGroup as () => void}
        >
          edit-group
        </button>
        <button
          data-testid={`trigger-delete-group-${props.group.id}`}
          onClick={props.onDeleteGroup as () => void}
        >
          delete-group
        </button>
        {expenses.map((sp) => (
          <button
            key={`edit-${sp.id}`}
            data-testid={`trigger-edit-expense-${sp.id}`}
            onClick={() =>
              (props.onEditExpense as (expense: SubPocket) => void)(sp)
            }
          >
            edit
          </button>
        ))}
        {expenses.map((sp) => (
          <button
            key={`delete-${sp.id}`}
            data-testid={`trigger-delete-expense-${sp.id}`}
            onClick={() =>
              (props.onDeleteExpense as (expense: SubPocket) => void)(sp)
            }
          >
            delete
          </button>
        ))}
        {expenses.map((sp) => (
          <button
            key={`toggle-${sp.id}`}
            data-testid={`trigger-toggle-expense-${sp.id}`}
            onClick={() =>
              (props.onToggleExpense as (expense: SubPocket) => void)(sp)
            }
          >
            toggle
          </button>
        ))}
      </div>
    );
  },
}));

const billsGroup: FixedExpenseGroup = {
  id: 'grp-bills',
  name: 'Bills',
  color: '#3B82F6',
  displayOrder: 0,
  createdAt: '2025-01-01T00:00:00Z',
};

const defaultGroup: FixedExpenseGroup = {
  id: 'grp-default',
  name: 'Default',
  color: '#6B7280',
  displayOrder: 1,
  createdAt: '2025-01-01T00:00:00Z',
};

const internet: SubPocket = {
  id: 'sp-internet',
  pocketId: 'pkt-1',
  name: 'Internet',
  valueTotal: 600,
  periodicityMonths: 12,
  balance: 50,
  enabled: true,
  groupId: 'grp-bills',
};

const electricity: SubPocket = {
  id: 'sp-electric',
  pocketId: 'pkt-1',
  name: 'Electricity',
  valueTotal: 1200,
  periodicityMonths: 12,
  balance: 100,
  enabled: true,
  groupId: 'grp-bills',
};

const ungrouped: SubPocket = {
  id: 'sp-misc',
  pocketId: 'pkt-1',
  name: 'Misc',
  valueTotal: 240,
  periodicityMonths: 12,
  balance: 20,
  enabled: false,
  // groupId intentionally omitted to land in the Default bucket.
};

type Props = React.ComponentProps<typeof StitchExpensesList>;

const buildProps = (overrides: Partial<Props> = {}): Props => ({
  groups: [billsGroup, defaultGroup],
  fixedSubPockets: [internet, electricity, ungrouped],
  currency: 'USD',
  collapsedGroups: new Set<string>(),
  togglingGroupId: null,
  deletingId: null,
  togglingId: null,
  onToggleCollapse: vi.fn(),
  onToggleGroup: vi.fn(),
  onEditGroup: vi.fn(),
  onDeleteGroup: vi.fn(),
  onEditExpense: vi.fn(),
  onDeleteExpense: vi.fn(),
  onToggleExpense: vi.fn(),
  ...overrides,
});

describe('StitchExpensesList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    groupCardRenders.length = 0;
  });

  describe('empty state', () => {
    it('renders the empty state when there are no fixed sub-pockets', () => {
      render(<StitchExpensesList {...buildProps({ fixedSubPockets: [] })} />);

      expect(screen.getByText(/no fixed expenses yet/i)).toBeInTheDocument();
      expect(screen.queryByTestId('group-card')).not.toBeInTheDocument();
    });

    it('renders the empty state even when groups exist but no sub-pockets do', () => {
      render(
        <StitchExpensesList
          {...buildProps({
            groups: [billsGroup, defaultGroup],
            fixedSubPockets: [],
          })}
        />,
      );

      expect(screen.getByText(/no fixed expenses yet/i)).toBeInTheDocument();
      expect(screen.queryByTestId('group-card')).not.toBeInTheDocument();
    });
  });

  describe('bucketing', () => {
    it('renders one group card per group when sub-pockets exist', () => {
      render(<StitchExpensesList {...buildProps()} />);

      const cards = screen.getAllByTestId('group-card');
      expect(cards).toHaveLength(2);
      expect(cards[0]).toHaveAttribute('data-group-id', 'grp-bills');
      expect(cards[1]).toHaveAttribute('data-group-id', 'grp-default');
    });

    it('buckets sub-pockets to their group by groupId', () => {
      render(<StitchExpensesList {...buildProps()} />);

      const billsRender = groupCardRenders.find(
        (p) => (p.group as FixedExpenseGroup).id === 'grp-bills',
      );
      const billsExpenses = billsRender?.expenses as SubPocket[];
      expect(billsExpenses.map((sp) => sp.id)).toEqual([
        'sp-internet',
        'sp-electric',
      ]);
    });

    it('passes an empty array to a group with no matching sub-pockets', () => {
      const subscriptions: FixedExpenseGroup = {
        id: 'grp-subs',
        name: 'Subscriptions',
        color: '#EF4444',
        displayOrder: 2,
        createdAt: '2025-01-01T00:00:00Z',
      };
      render(
        <StitchExpensesList
          {...buildProps({ groups: [billsGroup, defaultGroup, subscriptions] })}
        />,
      );

      const subsRender = groupCardRenders.find(
        (p) => (p.group as FixedExpenseGroup).id === 'grp-subs',
      );
      expect(subsRender).toBeDefined();
      expect(subsRender?.expenses).toEqual([]);
    });

    it('folds ungrouped sub-pockets into the Default group when one exists', () => {
      render(<StitchExpensesList {...buildProps()} />);

      const defaultRender = groupCardRenders.find(
        (p) => (p.group as FixedExpenseGroup).id === 'grp-default',
      );
      const defaultExpenses = defaultRender?.expenses as SubPocket[];
      expect(defaultExpenses.map((sp) => sp.id)).toContain('sp-misc');
    });

    it('appends a synthetic Default bucket for ungrouped sub-pockets when none exists', () => {
      render(
        <StitchExpensesList
          {...buildProps({
            groups: [billsGroup],
            fixedSubPockets: [internet, ungrouped],
          })}
        />,
      );

      const cards = screen.getAllByTestId('group-card');
      expect(cards).toHaveLength(2);
      expect(cards[1]).toHaveAttribute('data-group-name', 'Default');
      expect(cards[1]).toHaveAttribute('data-default', 'true');

      const defaultRender = groupCardRenders.find(
        (p) => (p.group as FixedExpenseGroup).name === 'Default',
      );
      expect(
        (defaultRender?.expenses as SubPocket[]).map((sp) => sp.id),
      ).toEqual(['sp-misc']);
    });

    it('marks the Default group with isDefaultGroup=true and other groups with false', () => {
      render(<StitchExpensesList {...buildProps()} />);

      const defaultRender = groupCardRenders.find(
        (p) => (p.group as FixedExpenseGroup).id === 'grp-default',
      );
      const billsRender = groupCardRenders.find(
        (p) => (p.group as FixedExpenseGroup).id === 'grp-bills',
      );

      expect(defaultRender?.isDefaultGroup).toBe(true);
      expect(billsRender?.isDefaultGroup).toBe(false);
    });
  });

  describe('per-group state forwarding', () => {
    it('forwards isCollapsed=true only to groups in the collapsedGroups set', () => {
      render(
        <StitchExpensesList
          {...buildProps({ collapsedGroups: new Set(['grp-bills']) })}
        />,
      );

      const cards = screen.getAllByTestId('group-card');
      const billsCard = cards.find(
        (c) => c.getAttribute('data-group-id') === 'grp-bills',
      );
      const defaultCard = cards.find(
        (c) => c.getAttribute('data-group-id') === 'grp-default',
      );

      expect(billsCard).toHaveAttribute('data-collapsed', 'true');
      expect(defaultCard).toHaveAttribute('data-collapsed', 'false');
    });

    it('forwards isTogglingGroup=true only to the group whose id matches togglingGroupId', () => {
      render(
        <StitchExpensesList
          {...buildProps({ togglingGroupId: 'grp-bills' })}
        />,
      );

      const cards = screen.getAllByTestId('group-card');
      const billsCard = cards.find(
        (c) => c.getAttribute('data-group-id') === 'grp-bills',
      );
      const defaultCard = cards.find(
        (c) => c.getAttribute('data-group-id') === 'grp-default',
      );

      expect(billsCard).toHaveAttribute('data-toggling-group', 'true');
      expect(defaultCard).toHaveAttribute('data-toggling-group', 'false');
    });

    it('forwards deletingId and togglingId to every group card', () => {
      render(
        <StitchExpensesList
          {...buildProps({ deletingId: 'sp-internet', togglingId: 'sp-electric' })}
        />,
      );

      for (const card of screen.getAllByTestId('group-card')) {
        expect(card).toHaveAttribute('data-deleting-expense-id', 'sp-internet');
        expect(card).toHaveAttribute('data-toggling-expense-id', 'sp-electric');
      }
    });

    it('forwards the configured currency to each group card', () => {
      render(<StitchExpensesList {...buildProps({ currency: 'MXN' })} />);

      for (const props of groupCardRenders) {
        expect(props.currency).toBe('MXN');
      }
    });
  });

  describe('callback wiring', () => {
    it('invokes onToggleCollapse with the group id when the card triggers it', async () => {
      const user = userEvent.setup();
      const onToggleCollapse = vi.fn();
      render(<StitchExpensesList {...buildProps({ onToggleCollapse })} />);

      await user.click(screen.getByTestId('trigger-toggle-collapse-grp-bills'));

      expect(onToggleCollapse).toHaveBeenCalledTimes(1);
      expect(onToggleCollapse).toHaveBeenCalledWith('grp-bills');
    });

    it('invokes onToggleGroup with the group when the card triggers it', async () => {
      const user = userEvent.setup();
      const onToggleGroup = vi.fn();
      render(<StitchExpensesList {...buildProps({ onToggleGroup })} />);

      await user.click(screen.getByTestId('trigger-toggle-group-grp-bills'));

      expect(onToggleGroup).toHaveBeenCalledTimes(1);
      expect(onToggleGroup).toHaveBeenCalledWith(billsGroup);
    });

    it('invokes onEditGroup with the group when the card triggers it', async () => {
      const user = userEvent.setup();
      const onEditGroup = vi.fn();
      render(<StitchExpensesList {...buildProps({ onEditGroup })} />);

      await user.click(screen.getByTestId('trigger-edit-group-grp-bills'));

      expect(onEditGroup).toHaveBeenCalledTimes(1);
      expect(onEditGroup).toHaveBeenCalledWith(billsGroup);
    });

    it('invokes onDeleteGroup with the group when the card triggers it', async () => {
      const user = userEvent.setup();
      const onDeleteGroup = vi.fn();
      render(<StitchExpensesList {...buildProps({ onDeleteGroup })} />);

      await user.click(screen.getByTestId('trigger-delete-group-grp-bills'));

      expect(onDeleteGroup).toHaveBeenCalledTimes(1);
      expect(onDeleteGroup).toHaveBeenCalledWith(billsGroup);
    });

    it('forwards onEditExpense, onDeleteExpense, and onToggleExpense unchanged', () => {
      const handlers = {
        onEditExpense: vi.fn(),
        onDeleteExpense: vi.fn(),
        onToggleExpense: vi.fn(),
      };
      render(<StitchExpensesList {...buildProps(handlers)} />);

      const billsRender = groupCardRenders.find(
        (p) => (p.group as FixedExpenseGroup).id === 'grp-bills',
      );
      expect(billsRender?.onEditExpense).toBe(handlers.onEditExpense);
      expect(billsRender?.onDeleteExpense).toBe(handlers.onDeleteExpense);
      expect(billsRender?.onToggleExpense).toBe(handlers.onToggleExpense);
    });

    it('routes per-expense callbacks with the expense object', async () => {
      const user = userEvent.setup();
      const onDeleteExpense = vi.fn();
      render(<StitchExpensesList {...buildProps({ onDeleteExpense })} />);

      await user.click(screen.getByTestId('trigger-delete-expense-sp-internet'));

      expect(onDeleteExpense).toHaveBeenCalledTimes(1);
      expect(onDeleteExpense).toHaveBeenCalledWith(internet);
    });
  });
});
