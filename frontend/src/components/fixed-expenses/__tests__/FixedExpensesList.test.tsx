import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '../../../test/testUtils';
import userEvent from '@testing-library/user-event';
import FixedExpensesList from '../FixedExpensesList';
import type { Account, FixedExpenseGroup, SubPocket } from '../../../types';

// Capture every render of FixedExpenseGroupCard so we can assert on the
// props passed to each instance — this is the contract this list owns.
const groupCardRenders: Array<Record<string, unknown>> = [];

vi.mock('../FixedExpenseGroupCard', () => ({
  default: (props: Record<string, unknown> & { group: FixedExpenseGroup }) => {
    groupCardRenders.push(props);
    return (
      <div
        data-testid="group-card"
        data-group-id={props.group.id}
        data-group-name={props.group.name}
        data-default={String(props.isDefaultGroup)}
        data-collapsed={String(props.isCollapsed)}
        data-toggling={String(props.isToggling)}
        data-deleting={String(props.deletingId ?? '')}
        data-toggling-id={String(props.togglingId ?? '')}
      >
        <span data-testid="group-name">{props.group.name}</span>
        <span data-testid="group-subpocket-count">
          {(props.subPockets as SubPocket[]).length}
        </span>
        {(props.subPockets as SubPocket[]).map((sp) => (
          <span key={sp.id} data-testid={`sp-in-${props.group.id}`}>
            {sp.name}
          </span>
        ))}
      </div>
    );
  },
}));

// SortableList/SortableItem rely on @dnd-kit context. We don't need to test
// dnd here, so we render the items inline and expose the reorder callback
// via a "reorder-now" button.
vi.mock('../../ui/SortableList', () => ({
  default: <T,>({
    items,
    renderItem,
    onReorder,
  }: {
    items: T[];
    renderItem: (item: T, index: number) => React.ReactNode;
    onReorder: (items: T[]) => void;
    getId: (item: T) => string;
  }) => (
    <div data-testid="sortable-list">
      <button
        data-testid="trigger-reorder"
        onClick={() => onReorder([...items].reverse())}
      >
        reorder
      </button>
      {items.map((item, index) => (
        <div key={index}>{renderItem(item, index)}</div>
      ))}
    </div>
  ),
}));

vi.mock('../../ui/SortableItem', () => ({
  default: ({ id, children }: { id: string; children: React.ReactNode }) => (
    <div data-testid="sortable-item" data-id={id}>
      {children}
    </div>
  ),
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
  groupId: 'grp-bills',
};

const electricity: SubPocket = {
  id: 'sp-electric',
  pocketId: 'pkt-1',
  name: 'Electricity',
  valueTotal: 1200,
  periodicityMonths: 12,
  balance: 100,
  groupId: 'grp-bills',
};

const ungrouped: SubPocket = {
  id: 'sp-misc',
  pocketId: 'pkt-1',
  name: 'Misc',
  valueTotal: 240,
  periodicityMonths: 12,
  balance: 20,
  // groupId intentionally omitted to land in the Default bucket.
};

const account: Account = {
  id: 'acc-1',
  name: 'Bank',
  color: '#0EA5E9',
  currency: 'USD',
  balance: 0,
  type: 'normal',
};

const buildProps = (
  overrides: Partial<React.ComponentProps<typeof FixedExpensesList>> = {}
): React.ComponentProps<typeof FixedExpensesList> => ({
  groups: [billsGroup, defaultGroup],
  fixedSubPockets: [internet, electricity, ungrouped],
  pocketAccountMap: new Map<string, Account>([['pkt-1', account]]),
  currency: 'USD',
  collapsedGroups: new Set<string>(),
  togglingGroupId: null,
  deletingId: null,
  togglingId: null,
  onReorderGroups: vi.fn(),
  onToggleCollapse: vi.fn(),
  onToggleGroup: vi.fn(),
  onEditGroup: vi.fn(),
  onDeleteGroup: vi.fn(),
  onEditExpense: vi.fn(),
  onDeleteExpense: vi.fn(),
  onToggleExpense: vi.fn(),
  onMoveToGroup: vi.fn(),
  ...overrides,
});

describe('FixedExpensesList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    groupCardRenders.length = 0;
  });

  describe('empty state', () => {
    it('renders the empty state when there are no fixed sub pockets', () => {
      render(<FixedExpensesList {...buildProps({ fixedSubPockets: [] })} />);

      expect(screen.getByText(/no fixed expenses yet/i)).toBeInTheDocument();
      expect(
        screen.getByText(/create your first fixed expense to get started/i)
      ).toBeInTheDocument();
      expect(screen.queryByTestId('sortable-list')).not.toBeInTheDocument();
    });

    it('renders the empty state even when groups exist but no sub pockets do', () => {
      render(
        <FixedExpensesList
          {...buildProps({
            groups: [billsGroup, defaultGroup],
            fixedSubPockets: [],
          })}
        />
      );

      expect(screen.getByText(/no fixed expenses yet/i)).toBeInTheDocument();
      expect(screen.queryByTestId('group-card')).not.toBeInTheDocument();
    });
  });

  describe('rendering with sub pockets', () => {
    it('renders one group card per group when sub pockets exist', () => {
      render(<FixedExpensesList {...buildProps()} />);

      const cards = screen.getAllByTestId('group-card');
      expect(cards).toHaveLength(2);
      expect(cards[0]).toHaveAttribute('data-group-id', 'grp-bills');
      expect(cards[1]).toHaveAttribute('data-group-id', 'grp-default');
    });

    it('buckets sub pockets to their group by groupId', () => {
      render(<FixedExpensesList {...buildProps()} />);

      const billsRender = groupCardRenders.find(
        (p) => (p.group as FixedExpenseGroup).id === 'grp-bills'
      );
      const billsSubPockets = billsRender?.subPockets as SubPocket[];
      expect(billsSubPockets.map((sp) => sp.id)).toEqual(
        expect.arrayContaining(['sp-internet', 'sp-electric'])
      );
      expect(billsSubPockets).toHaveLength(2);
    });

    it('passes an empty array to a group with no matching sub pockets', () => {
      // Create a third group that has no sub pockets pointing to it.
      const subscriptions: FixedExpenseGroup = {
        id: 'grp-subs',
        name: 'Subscriptions',
        color: '#EF4444',
        displayOrder: 2,
        createdAt: '2025-01-01T00:00:00Z',
      };
      render(
        <FixedExpensesList
          {...buildProps({
            groups: [billsGroup, defaultGroup, subscriptions],
          })}
        />
      );

      const subsRender = groupCardRenders.find(
        (p) => (p.group as FixedExpenseGroup).id === 'grp-subs'
      );
      expect(subsRender).toBeDefined();
      expect(subsRender?.subPockets).toEqual([]);
    });

    it('passes ungrouped sub pockets (no groupId) under the empty-string bucket', () => {
      // The Default group has id 'grp-default', but ungrouped sub pockets are
      // bucketed by '' (empty string). They should NOT be passed into any
      // existing group card unless a group with that id exists.
      render(<FixedExpensesList {...buildProps()} />);

      const billsRender = groupCardRenders.find(
        (p) => (p.group as FixedExpenseGroup).id === 'grp-bills'
      );
      const defaultRender = groupCardRenders.find(
        (p) => (p.group as FixedExpenseGroup).id === 'grp-default'
      );

      // Misc has no groupId → bucketed as '' → does not appear under bills or default.
      expect(
        (billsRender?.subPockets as SubPocket[]).some((sp) => sp.id === 'sp-misc')
      ).toBe(false);
      expect(
        (defaultRender?.subPockets as SubPocket[]).some((sp) => sp.id === 'sp-misc')
      ).toBe(false);
    });
  });

  describe('default group flag', () => {
    it('marks the group named "Default" as the default group', () => {
      render(<FixedExpensesList {...buildProps()} />);

      const defaultRender = groupCardRenders.find(
        (p) => (p.group as FixedExpenseGroup).id === 'grp-default'
      );
      const billsRender = groupCardRenders.find(
        (p) => (p.group as FixedExpenseGroup).id === 'grp-bills'
      );

      expect(defaultRender?.isDefaultGroup).toBe(true);
      expect(billsRender?.isDefaultGroup).toBe(false);
    });
  });

  describe('per-group state forwarding', () => {
    it('forwards isCollapsed=true only to groups in the collapsedGroups set', () => {
      render(
        <FixedExpensesList
          {...buildProps({ collapsedGroups: new Set(['grp-bills']) })}
        />
      );

      const allCards = screen.getAllByTestId('group-card');
      const billsCard = allCards.find(
        (c) => c.getAttribute('data-group-id') === 'grp-bills'
      );
      const defaultCard = allCards.find(
        (c) => c.getAttribute('data-group-id') === 'grp-default'
      );

      expect(billsCard).toBeDefined();
      expect(defaultCard).toBeDefined();
      expect(billsCard).toHaveAttribute('data-collapsed', 'true');
      expect(defaultCard).toHaveAttribute('data-collapsed', 'false');
    });

    it('forwards isToggling=true only to the group whose id matches togglingGroupId', () => {
      render(
        <FixedExpensesList {...buildProps({ togglingGroupId: 'grp-bills' })} />
      );

      const allCards = screen.getAllByTestId('group-card');
      const billsCard = allCards.find(
        (c) => c.getAttribute('data-group-id') === 'grp-bills'
      );
      const defaultCard = allCards.find(
        (c) => c.getAttribute('data-group-id') === 'grp-default'
      );

      expect(billsCard).toHaveAttribute('data-toggling', 'true');
      expect(defaultCard).toHaveAttribute('data-toggling', 'false');
    });

    it('forwards deletingId and togglingId to every group card', () => {
      render(
        <FixedExpensesList
          {...buildProps({ deletingId: 'sp-internet', togglingId: 'sp-electric' })}
        />
      );

      for (const card of screen.getAllByTestId('group-card')) {
        expect(card).toHaveAttribute('data-deleting', 'sp-internet');
        expect(card).toHaveAttribute('data-toggling-id', 'sp-electric');
      }
    });
  });

  describe('handler forwarding', () => {
    it('forwards every action handler to the group card unchanged', () => {
      const handlers = {
        onToggleCollapse: vi.fn(),
        onToggleGroup: vi.fn(),
        onEditGroup: vi.fn(),
        onDeleteGroup: vi.fn(),
        onEditExpense: vi.fn(),
        onDeleteExpense: vi.fn(),
        onToggleExpense: vi.fn(),
        onMoveToGroup: vi.fn(),
      };
      render(<FixedExpensesList {...buildProps(handlers)} />);

      const billsRender = groupCardRenders.find(
        (p) => (p.group as FixedExpenseGroup).id === 'grp-bills'
      );
      expect(billsRender).toBeDefined();

      expect(billsRender?.onToggleCollapse).toBe(handlers.onToggleCollapse);
      expect(billsRender?.onToggleGroup).toBe(handlers.onToggleGroup);
      expect(billsRender?.onEditGroup).toBe(handlers.onEditGroup);
      expect(billsRender?.onDeleteGroup).toBe(handlers.onDeleteGroup);
      expect(billsRender?.onEditExpense).toBe(handlers.onEditExpense);
      expect(billsRender?.onDeleteExpense).toBe(handlers.onDeleteExpense);
      expect(billsRender?.onToggleExpense).toBe(handlers.onToggleExpense);
      expect(billsRender?.onMoveToGroup).toBe(handlers.onMoveToGroup);
    });

    it('forwards the pocket-to-account map to the group card', () => {
      const map = new Map<string, Account>([['pkt-1', account]]);
      render(<FixedExpensesList {...buildProps({ pocketAccountMap: map })} />);

      const billsRender = groupCardRenders.find(
        (p) => (p.group as FixedExpenseGroup).id === 'grp-bills'
      );
      expect(billsRender?.pocketAccountMap).toBe(map);
    });

    it('forwards the configured currency to each group card', () => {
      render(<FixedExpensesList {...buildProps({ currency: 'MXN' })} />);

      for (const props of groupCardRenders) {
        expect(props.currency).toBe('MXN');
      }
    });

    it('passes the full groups list to every group card as allGroups', () => {
      render(<FixedExpensesList {...buildProps()} />);

      for (const props of groupCardRenders) {
        expect(props.allGroups).toEqual([billsGroup, defaultGroup]);
      }
    });
  });

  describe('reorder', () => {
    it('calls onReorderGroups with the new ordering when the sortable list reorders', async () => {
      const user = userEvent.setup();
      const onReorderGroups = vi.fn();
      render(<FixedExpensesList {...buildProps({ onReorderGroups })} />);

      await user.click(screen.getByTestId('trigger-reorder'));

      expect(onReorderGroups).toHaveBeenCalledTimes(1);
      expect(onReorderGroups).toHaveBeenCalledWith([defaultGroup, billsGroup]);
    });
  });
});
