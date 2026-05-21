import { useMemo } from 'react';
import { Receipt } from 'lucide-react';
import type { Account, Currency, FixedExpenseGroup, SubPocket } from '../../types';
import EmptyState from '../ui/EmptyState';
import FixedExpenseGroupCard from './FixedExpenseGroupCard';

export interface FixedExpensesListProps {
  groups: FixedExpenseGroup[];
  fixedSubPockets: SubPocket[];
  pocketAccountMap: Map<string, Account>;
  currency: Currency;
  deletingId: string | null;
  togglingId: string | null;
  onEditGroup: (group: FixedExpenseGroup) => void;
  onDeleteGroup: (group: FixedExpenseGroup) => void;
  onEditExpense: (subPocket: SubPocket) => void;
  onDeleteExpense: (id: string) => void;
  onToggleExpense: (id: string) => void;
  onMoveToGroup: (subPocketId: string, groupId: string) => void;
}

/**
 * Responsive grid of fixed-expense group cards.
 * Layout: 1 col mobile, 2 cols tablet, 3 cols desktop.
 */
const FixedExpensesList = ({
  groups,
  fixedSubPockets,
  currency,
  deletingId,
  togglingId,
  onEditGroup,
  onDeleteGroup,
  onEditExpense,
  onDeleteExpense,
  onToggleExpense,
  onMoveToGroup,
}: FixedExpensesListProps) => {
  const subPocketsByGroup = useMemo(() => {
    const map = new Map<string, SubPocket[]>();
    for (const sp of fixedSubPockets) {
      const groupId = sp.groupId ?? '';
      const list = map.get(groupId);
      if (list) list.push(sp);
      else map.set(groupId, [sp]);
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
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      {groups.map((group) => (
        <FixedExpenseGroupCard
          key={group.id}
          group={group}
          subPockets={subPocketsByGroup.get(group.id) ?? []}
          allGroups={groups}
          currency={currency}
          isDefaultGroup={group.name === 'Default'}
          onEditGroup={onEditGroup}
          onDeleteGroup={onDeleteGroup}
          onEditExpense={onEditExpense}
          onDeleteExpense={onDeleteExpense}
          onToggleExpense={onToggleExpense}
          onMoveToGroup={onMoveToGroup}
          deletingId={deletingId}
          togglingId={togglingId}
        />
      ))}
    </div>
  );
};

export default FixedExpensesList;
