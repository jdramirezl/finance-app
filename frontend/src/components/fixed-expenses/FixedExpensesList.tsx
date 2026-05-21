import { useMemo } from 'react';
import { Receipt } from 'lucide-react';
import type { Account, Currency, FixedExpenseGroup, SubPocket } from '../../types';
import EmptyState from '../ui/EmptyState';
import SortableList from '../ui/SortableList';
import SortableItem from '../ui/SortableItem';
import FixedExpenseGroupCard from './FixedExpenseGroupCard';

export interface FixedExpensesListProps {
  groups: FixedExpenseGroup[];
  fixedSubPockets: SubPocket[];
  pocketAccountMap: Map<string, Account>;
  currency: Currency;
  collapsedGroups: Set<string>;
  togglingGroupId: string | null;
  deletingId: string | null;
  togglingId: string | null;
  onReorderGroups: (groups: FixedExpenseGroup[]) => void;
  onToggleCollapse: (groupId: string) => void;
  onToggleGroup: (groupId: string, enabled: boolean) => void;
  onEditGroup: (group: FixedExpenseGroup) => void;
  onDeleteGroup: (group: FixedExpenseGroup) => void;
  onEditExpense: (subPocket: SubPocket) => void;
  onDeleteExpense: (id: string) => void;
  onToggleExpense: (id: string) => void;
  onMoveToGroup: (subPocketId: string, groupId: string) => void;
}

/**
 * Renders the sortable list of fixed-expense groups, with each group card
 * showing its sub-pockets. The page owns all action handlers and threads
 * them through.
 */
const FixedExpensesList = ({
  groups,
  fixedSubPockets,
  pocketAccountMap,
  currency,
  collapsedGroups,
  togglingGroupId,
  deletingId,
  togglingId,
  onReorderGroups,
  onToggleCollapse,
  onToggleGroup,
  onEditGroup,
  onDeleteGroup,
  onEditExpense,
  onDeleteExpense,
  onToggleExpense,
  onMoveToGroup,
}: FixedExpensesListProps) => {
  // Bucket sub-pockets by group once so each group card receives a stable
  // array reference. Without this, every group card would receive a fresh
  // filter() result on every parent re-render and React.memo couldn't help.
  const subPocketsByGroup = useMemo(() => {
    const map = new Map<string, SubPocket[]>();
    for (const sp of fixedSubPockets) {
      const groupId = sp.groupId ?? '';
      const list = map.get(groupId);
      if (list) {
        list.push(sp);
      } else {
        map.set(groupId, [sp]);
      }
    }
    return map;
  }, [fixedSubPockets]);

  if (fixedSubPockets.length === 0) {
    return (
      <EmptyState
        icon={Receipt}
        title="No fixed expenses yet"
        description="Create your first fixed expense to get started!"
      />
    );
  }

  return (
    <div className="space-y-4">
      <SortableList
        items={groups}
        getId={(item) => item.id}
        onReorder={onReorderGroups}
        renderItem={(group) => {
          const groupExpenses = subPocketsByGroup.get(group.id) ?? [];
          const isDefault = group.name === 'Default';

          return (
            <SortableItem key={group.id} id={group.id}>
              <FixedExpenseGroupCard
                group={group}
                subPockets={groupExpenses}
                allGroups={groups}
                currency={currency}
                isDefaultGroup={isDefault}
                isCollapsed={collapsedGroups.has(group.id)}
                isToggling={togglingGroupId === group.id}
                onToggleCollapse={onToggleCollapse}
                onToggleGroup={onToggleGroup}
                onEditGroup={onEditGroup}
                onDeleteGroup={onDeleteGroup}
                onEditExpense={onEditExpense}
                onDeleteExpense={onDeleteExpense}
                onToggleExpense={onToggleExpense}
                onMoveToGroup={onMoveToGroup}
                deletingId={deletingId}
                togglingId={togglingId}
                pocketAccountMap={pocketAccountMap}
              />
            </SortableItem>
          );
        }}
      />
    </div>
  );
};

export default FixedExpensesList;
