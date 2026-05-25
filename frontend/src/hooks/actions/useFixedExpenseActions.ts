import { useState } from 'react';
import type { FixedExpenseGroup, SubPocket } from '../../types';
import type { useToast } from '../useToast';
import type { useConfirm } from '../useConfirm';
import type { useFixedExpenseGroupMutations } from '../queries/useFixedExpenseGroupMutations';
import type { useSubPocketMutations } from '../queries/useSubPocketMutations';

type GroupMutations = ReturnType<typeof useFixedExpenseGroupMutations>;
type SubPocketMutations = ReturnType<typeof useSubPocketMutations>;

export interface UseFixedExpenseActionsParams {
  fixedSubPockets: SubPocket[];
  groupMutations: GroupMutations;
  subPocketMutations: SubPocketMutations;
  toast: ReturnType<typeof useToast.getState>;
  confirm: ReturnType<typeof useConfirm>['confirm'];
}

export interface UseFixedExpenseActionsResult {
  // Sub-pocket actions
  handleDeleteSubPocket: (id: string) => Promise<void>;
  handleMoveToGroup: (subPocketId: string, groupId: string) => Promise<void>;
  deletingId: string | null;

  // Group actions
  handleDeleteGroup: (group: FixedExpenseGroup) => Promise<void>;
  handleReorderGroups: (groups: FixedExpenseGroup[]) => Promise<void>;

  // Collapse state
  collapsedGroups: Set<string>;
  toggleGroupCollapse: (groupId: string) => void;
}

/**
 * Encapsulates CRUD flows on the Fixed Expenses page: sub-pocket
 * delete/move, group delete/reorder, and expand/collapse state.
 *
 * The batch movement form previously owned by this hook has been folded
 * into the unified Generate Movements flow on `UnifiedBudgetPage` —
 * see `useBudgetActions.prepareUnifiedBatch`.
 */
export const useFixedExpenseActions = ({
  fixedSubPockets,
  groupMutations,
  subPocketMutations,
  toast,
  confirm,
}: UseFixedExpenseActionsParams): UseFixedExpenseActionsResult => {
  const { deleteFixedExpenseGroup, reorderFixedExpenseGroups } = groupMutations;
  const { deleteSubPocket, moveSubPocketToGroup } = subPocketMutations;

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  const handleDeleteSubPocket = async (id: string) => {
    const subPocket = fixedSubPockets.find((sp) => sp.id === id);
    const confirmed = await confirm({
      title: 'Delete Fixed Expense',
      message: `Are you sure you want to delete "${subPocket?.name}"? This action cannot be undone.`,
      confirmText: 'Delete Expense',
      cancelText: 'Cancel',
      variant: 'danger',
    });
    if (!confirmed) return;

    setDeletingId(id);
    try {
      await deleteSubPocket.mutateAsync(id);
      toast.success('Fixed expense deleted successfully!');
    } catch {
      // Toast is shown by the mutation's onError handler.
    } finally {
      setDeletingId(null);
    }
  };

  const handleMoveToGroup = async (subPocketId: string, groupId: string) => {
    try {
      await moveSubPocketToGroup.mutateAsync({ subPocketId, groupId });
      toast.success('Expense moved to new group!');
    } catch {
      // Toast is shown by the mutation's onError handler.
    }
  };

  const handleDeleteGroup = async (group: FixedExpenseGroup) => {
    const confirmed = await confirm({
      title: 'Delete Group',
      message: `Are you sure you want to delete "${group.name}"? All expenses will be moved to the Default group.`,
      confirmText: 'Delete Group',
      cancelText: 'Cancel',
      variant: 'danger',
    });
    if (!confirmed) return;

    try {
      await deleteFixedExpenseGroup.mutateAsync(group.id);
      toast.success('Group deleted successfully!');
    } catch {
      // Toast is shown by the mutation's onError handler.
    }
  };

  const handleReorderGroups = async (groups: FixedExpenseGroup[]) => {
    const ids = groups.map((g) => g.id);
    try {
      await reorderFixedExpenseGroups.mutateAsync(ids);
    } catch {
      // Toast is shown by the mutation's onError handler.
    }
  };

  const toggleGroupCollapse = (groupId: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  };

  return {
    handleDeleteSubPocket,
    handleMoveToGroup,
    deletingId,
    handleDeleteGroup,
    handleReorderGroups,
    collapsedGroups,
    toggleGroupCollapse,
  };
};
