import { useCallback, useMemo } from 'react';
import { Receipt } from 'lucide-react';
import type { FixedExpenseGroup, SubPocket } from '../../types';
import EmptyState from '../ui/EmptyState';
import StitchGroupCard from './StitchGroupCard';

export interface StitchExpensesListProps {
  groups: FixedExpenseGroup[];
  fixedSubPockets: SubPocket[];
  currency: string;
  collapsedGroups: Set<string>;
  onToggleCollapse: (groupId: string) => void;
  onToggleGroup: (group: FixedExpenseGroup) => void;
  onEditGroup: (group: FixedExpenseGroup) => void;
  onDeleteGroup: (group: FixedExpenseGroup) => void;
  onEditExpense: (expense: SubPocket) => void;
  onDeleteExpense: (expense: SubPocket) => void;
  onToggleExpense: (expense: SubPocket) => void;
  togglingGroupId?: string | null;
  deletingId?: string | null;
  togglingId?: string | null;
}

/**
 * Stitch-style fixed expenses list.
 *
 * Replaces the legacy `FixedExpensesList` (and its `SortableList`/
 * `SortableItem` wrappers) with a flat, non-reorderable layout. Buckets
 * sub-pockets by `groupId` and renders one `StitchGroupCard` per group.
 * Sub-pockets without a `groupId` are folded into the "Default" group when
 * one exists; otherwise a synthetic Default bucket is appended so they
 * always appear somewhere.
 */
const StitchExpensesList = ({
  groups,
  fixedSubPockets,
  currency,
  collapsedGroups,
  onToggleCollapse,
  onToggleGroup,
  onEditGroup,
  onDeleteGroup,
  onEditExpense,
  onDeleteExpense,
  onToggleExpense,
  togglingGroupId = null,
  deletingId = null,
  togglingId = null,
}: StitchExpensesListProps) => {
  // ---- Bucketing ----
  // Bucket sub-pockets by groupId in a single pass so each card receives a
  // stable array reference. Ungrouped sub-pockets (no groupId) land in the
  // empty-string bucket and are merged into the Default group below.
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

  // Identify the Default group, if one exists, so we can fold ungrouped
  // sub-pockets into it. The legacy app conventionally names this group
  // "Default" — match that here.
  const defaultGroup = useMemo(
    () => groups.find((g) => g.name === 'Default') ?? null,
    [groups],
  );

  // Final list of groups + their expenses, in display order. Ungrouped
  // sub-pockets are merged into Default when present, otherwise into a
  // synthetic Default bucket appended at the end so they remain visible.
  const renderGroups = useMemo(() => {
    const ungrouped = subPocketsByGroup.get('') ?? [];

    type RenderEntry = {
      group: FixedExpenseGroup;
      expenses: SubPocket[];
      isDefaultGroup: boolean;
    };

    const entries: RenderEntry[] = groups.map((group) => {
      const groupExpenses = subPocketsByGroup.get(group.id) ?? [];
      const isDefault = group.name === 'Default';
      const expenses = isDefault ? [...groupExpenses, ...ungrouped] : groupExpenses;
      return { group, expenses, isDefaultGroup: isDefault };
    });

    // If no Default group exists but ungrouped sub-pockets do, render a
    // synthetic Default bucket so they don't silently disappear.
    if (!defaultGroup && ungrouped.length > 0) {
      entries.push({
        group: {
          id: '__default__',
          name: 'Default',
          color: '#6B7280',
          displayOrder: Number.MAX_SAFE_INTEGER,
          createdAt: '',
        },
        expenses: ungrouped,
        isDefaultGroup: true,
      });
    }

    return entries;
  }, [groups, subPocketsByGroup, defaultGroup]);

  // ---- Per-group bound callbacks ----
  // Build stable per-group callbacks once per (group, handler) tuple so that
  // children receive functions that don't need to change every render purely
  // because of re-binding. Each card receives no-arg callbacks for its own
  // group identity, which keeps the card's prop surface minimal.
  const buildCardHandlers = useCallback(
    (group: FixedExpenseGroup) => ({
      onToggleCollapse: () => onToggleCollapse(group.id),
      onToggleGroup: () => onToggleGroup(group),
      onEditGroup: () => onEditGroup(group),
      onDeleteGroup: () => onDeleteGroup(group),
    }),
    [onToggleCollapse, onToggleGroup, onEditGroup, onDeleteGroup],
  );

  // ---- Empty state ----
  if (fixedSubPockets.length === 0) {
    return (
      <EmptyState
        icon={Receipt}
        title="No fixed expenses yet"
        description="Create your first fixed expense to get started!"
      />
    );
  }

  // ---- Render ----
  return (
    <div className="space-y-3">
      {renderGroups.map(({ group, expenses, isDefaultGroup }) => {
        const cardHandlers = buildCardHandlers(group);
        return (
          <StitchGroupCard
            key={group.id}
            group={group}
            expenses={expenses}
            currency={currency}
            isDefaultGroup={isDefaultGroup}
            isCollapsed={collapsedGroups.has(group.id)}
            onToggleCollapse={cardHandlers.onToggleCollapse}
            onToggleGroup={cardHandlers.onToggleGroup}
            onEditGroup={cardHandlers.onEditGroup}
            onDeleteGroup={cardHandlers.onDeleteGroup}
            onEditExpense={onEditExpense}
            onDeleteExpense={onDeleteExpense}
            onToggleExpense={onToggleExpense}
            isTogglingGroup={togglingGroupId === group.id}
            deletingExpenseId={deletingId}
            togglingExpenseId={togglingId}
          />
        );
      })}
    </div>
  );
};

export default StitchExpensesList;
