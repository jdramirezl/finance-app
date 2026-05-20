import { useState } from 'react';
import type { Account, FixedExpenseGroup, Pocket, SubPocket } from '../types';
import type { BatchMovementRow } from '../components/BatchMovementForm';
import { calculateAporteMensual } from '../utils/fixedExpenseUtils';
import type { useToast } from './useToast';
import type { useConfirm } from './useConfirm';
import type { useMovementMutations } from './queries/useMovementMutations';
import type { useFixedExpenseGroupMutations } from './queries/useFixedExpenseGroupMutations';
import type { useSubPocketMutations } from './queries/useSubPocketMutations';

type MovementMutations = ReturnType<typeof useMovementMutations>;
type GroupMutations = ReturnType<typeof useFixedExpenseGroupMutations>;
type SubPocketMutations = ReturnType<typeof useSubPocketMutations>;

export interface BatchFormController {
  isOpen: boolean;
  rows: BatchMovementRow[];
  open: () => void;
  close: () => void;
  setRows: (rows: BatchMovementRow[]) => void;
  save: (rows: BatchMovementRow[]) => Promise<void>;
}

export interface UseFixedExpenseActionsParams {
  accounts: Account[];
  fixedPockets: Pocket[];
  fixedSubPockets: SubPocket[];
  movementMutations: MovementMutations;
  groupMutations: GroupMutations;
  subPocketMutations: SubPocketMutations;
  toast: ReturnType<typeof useToast.getState>;
  confirm: ReturnType<typeof useConfirm>['confirm'];
}

export interface UseFixedExpenseActionsResult {
  // Sub-pocket actions
  handleDeleteSubPocket: (id: string) => Promise<void>;
  handleToggleSubPocket: (id: string) => Promise<void>;
  handleMoveToGroup: (subPocketId: string, groupId: string) => Promise<void>;
  deletingId: string | null;
  togglingId: string | null;

  // Group actions
  handleDeleteGroup: (group: FixedExpenseGroup) => Promise<void>;
  handleToggleGroup: (groupId: string, enabled: boolean) => Promise<void>;
  handleReorderGroups: (groups: FixedExpenseGroup[]) => Promise<void>;
  togglingGroupId: string | null;

  // Collapse state
  collapsedGroups: Set<string>;
  toggleGroupCollapse: (groupId: string) => void;

  // Batch form controller
  batchForm: BatchFormController;
  prepareBatchFromEnabled: () => void;
}

/**
 * Encapsulates all CRUD flows on the Fixed Expenses page: sub-pocket
 * delete/toggle/move, group delete/toggle/reorder, expand/collapse state,
 * and the batch movement form populated from enabled fixed expenses.
 */
export const useFixedExpenseActions = ({
  accounts,
  fixedPockets,
  fixedSubPockets,
  movementMutations,
  groupMutations,
  subPocketMutations,
  toast,
  confirm,
}: UseFixedExpenseActionsParams): UseFixedExpenseActionsResult => {
  const { createMovement } = movementMutations;
  const { deleteFixedExpenseGroup, toggleFixedExpenseGroup, reorderFixedExpenseGroups } =
    groupMutations;
  const { deleteSubPocket, toggleSubPocketEnabled, moveSubPocketToGroup } =
    subPocketMutations;

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [togglingGroupId, setTogglingGroupId] = useState<string | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  const [batchOpen, setBatchOpen] = useState(false);
  const [batchRows, setBatchRows] = useState<BatchMovementRow[]>([]);

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
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete fixed expense';
      toast.error(msg);
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggleSubPocket = async (id: string) => {
    setTogglingId(id);
    try {
      await toggleSubPocketEnabled.mutateAsync(id);
      toast.success('Fixed expense status updated!');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to toggle fixed expense';
      toast.error(msg);
    } finally {
      setTogglingId(null);
    }
  };

  const handleMoveToGroup = async (subPocketId: string, groupId: string) => {
    try {
      await moveSubPocketToGroup.mutateAsync({ subPocketId, groupId });
      toast.success('Expense moved to new group!');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to move expense';
      toast.error(msg);
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
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete group';
      toast.error(msg);
    }
  };

  const handleToggleGroup = async (groupId: string, enabled: boolean) => {
    setTogglingGroupId(groupId);
    try {
      await toggleFixedExpenseGroup.mutateAsync({ id: groupId, enabled });
      toast.success(`Group ${enabled ? 'enabled' : 'disabled'} successfully!`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to toggle group';
      toast.error(msg);
    } finally {
      setTogglingGroupId(null);
    }
  };

  const handleReorderGroups = async (groups: FixedExpenseGroup[]) => {
    const ids = groups.map((g) => g.id);
    try {
      await reorderFixedExpenseGroups.mutateAsync(ids);
    } catch {
      toast.error('Failed to reorder groups');
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

  const prepareBatchFromEnabled = () => {
    if (fixedPockets.length === 0) {
      toast.error('No fixed expenses accounts found');
      return;
    }
    const enabled = fixedSubPockets.filter((sp) => sp.enabled);
    if (enabled.length === 0) {
      toast.error('No enabled fixed expenses found');
      return;
    }

    const rows: BatchMovementRow[] = enabled.map((sp) => {
      const parent = fixedPockets.find((fp) => fp.id === sp.pocketId);
      const account = parent ? accounts.find((a) => a.id === parent.accountId) : null;
      return {
        id: crypto.randomUUID(),
        type: 'IngresoFijo',
        accountId: account?.id || '',
        pocketId: sp.pocketId,
        subPocketId: sp.id,
        amount: calculateAporteMensual(sp.valueTotal, sp.periodicityMonths, sp.balance).toFixed(2),
        notes: `Monthly contribution for ${sp.name}`,
        displayedDate: new Date().toISOString().split('T')[0],
      };
    });

    setBatchRows(rows);
    setBatchOpen(true);
    toast.success(`Pre-populated ${rows.length} fixed expenses`);
  };

  const saveBatch = async (rows: BatchMovementRow[]) => {
    try {
      for (const row of rows) {
        await createMovement.mutateAsync({
          type: row.type,
          accountId: row.accountId,
          pocketId: row.pocketId,
          amount: parseFloat(row.amount),
          notes: row.notes || undefined,
          displayedDate: row.displayedDate,
          subPocketId: row.subPocketId,
          isPending: row.isPending || false,
        });
      }
      setBatchOpen(false);
      setBatchRows([]);
      toast.success(`Successfully created ${rows.length} movements!`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save movements';
      toast.error(msg);
      throw err;
    }
  };

  const closeBatch = () => {
    setBatchOpen(false);
    setBatchRows([]);
  };

  return {
    handleDeleteSubPocket,
    handleToggleSubPocket,
    handleMoveToGroup,
    deletingId,
    togglingId,
    handleDeleteGroup,
    handleToggleGroup,
    handleReorderGroups,
    togglingGroupId,
    collapsedGroups,
    toggleGroupCollapse,
    batchForm: {
      isOpen: batchOpen,
      rows: batchRows,
      open: () => setBatchOpen(true),
      close: closeBatch,
      setRows: setBatchRows,
      save: saveBatch,
    },
    prepareBatchFromEnabled,
  };
};
