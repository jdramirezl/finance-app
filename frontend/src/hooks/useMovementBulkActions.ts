import { useQueryClient } from '@tanstack/react-query';
import { movementService } from '../services/movementService';
import type { useToast } from './useToast';
import type { useConfirm } from './useConfirm';
import type { BulkSelectionResult } from './useBulkSelection';

export interface UseMovementBulkActionsParams {
  bulk: BulkSelectionResult;
  confirm: ReturnType<typeof useConfirm>['confirm'];
  toast: ReturnType<typeof useToast.getState>;
  /**
   * Optional override for the underlying single-item operations. Tests pass
   * fakes here; production callers can omit it.
   */
  operations?: {
    applyPending?: (id: string) => Promise<unknown>;
    markAsPending?: (id: string) => Promise<unknown>;
    delete?: (id: string) => Promise<unknown>;
  };
}

export interface UseMovementBulkActionsResult {
  handleBulkApplyPending: () => Promise<void>;
  handleBulkMarkAsPending: () => Promise<void>;
  handleBulkDelete: () => Promise<void>;
}

/**
 * Bulk-action handlers for the movements toolbar (apply / mark-pending /
 * delete). Each prompts for confirmation, fans out to the service layer
 * via Promise.allSettled, and reports a partial-failure aware toast.
 *
 * Bulk operations call `movementService` directly rather than the per-item
 * mutation hooks so a partial failure produces a single aggregate toast
 * (e.g. "2 applied, 3 failed") instead of one toast per failed item.
 * After the fan-out completes, the relevant query caches are invalidated
 * so the UI reflects whatever subset succeeded.
 */
export const useMovementBulkActions = ({
  bulk,
  confirm,
  toast,
  operations,
}: UseMovementBulkActionsParams): UseMovementBulkActionsResult => {
  const queryClient = useQueryClient();

  const ops = {
    applyPending:
      operations?.applyPending ?? ((id: string) => movementService.applyPendingMovement(id)),
    markAsPending:
      operations?.markAsPending ?? ((id: string) => movementService.markAsPending(id)),
    delete: operations?.delete ?? ((id: string) => movementService.deleteMovement(id)),
  };

  const invalidateMovementCaches = () => {
    queryClient.invalidateQueries({ queryKey: ['movements'] });
    queryClient.invalidateQueries({ queryKey: ['accounts'] });
    queryClient.invalidateQueries({ queryKey: ['pockets'] });
    queryClient.invalidateQueries({ queryKey: ['subPockets'] });
    queryClient.invalidateQueries({ queryKey: ['reminders'] });
  };

  const runBulkAction = async (
    fn: (id: string) => Promise<unknown>,
    pastVerb: string,
    failureVerb: string,
  ) => {
    const ids = Array.from(bulk.selectedIds);
    try {
      const results = await Promise.allSettled(ids.map(fn));
      const succeeded = results.filter((r) => r.status === 'fulfilled').length;
      const failed = results.length - succeeded;
      if (failed > 0) {
        toast.error(`${succeeded} ${pastVerb.toLowerCase()}, ${failed} failed`);
      } else {
        toast.success(
          `${pastVerb} ${succeeded} movement${succeeded === 1 ? '' : 's'}`
        );
      }
      bulk.deselectAll();
    } catch (err: unknown) {
      // Defensive: Promise.allSettled never rejects, so this only fires for
      // a synchronous throw above (e.g. iterating selectedIds). Surface the
      // error rather than swallowing it.
      toast.error(
        err instanceof Error ? err.message : `Failed to ${failureVerb}`
      );
    } finally {
      invalidateMovementCaches();
    }
  };

  const handleBulkApplyPending = async () => {
    const ok = await confirm({
      title: 'Apply Pending Movements',
      message: `Apply ${bulk.selectedCount} pending movement(s)? This will update account balances.`,
      confirmText: 'Apply Movements',
      cancelText: 'Cancel',
      variant: 'info',
    });
    if (!ok) return;
    await runBulkAction(ops.applyPending, 'Applied', 'apply movements');
  };

  const handleBulkMarkAsPending = async () => {
    const ok = await confirm({
      title: 'Mark as Pending',
      message: `Mark ${bulk.selectedCount} movement(s) as pending? This will exclude them from balance calculations.`,
      confirmText: 'Mark as Pending',
      cancelText: 'Cancel',
      variant: 'warning',
    });
    if (!ok) return;
    await runBulkAction(ops.markAsPending, 'Marked', 'mark as pending');
  };

  const handleBulkDelete = async () => {
    const ok = await confirm({
      title: 'Delete Movements',
      message: `Are you sure you want to delete ${bulk.selectedCount} movement(s)? This action cannot be undone.`,
      confirmText: 'Delete Movements',
      cancelText: 'Cancel',
      variant: 'danger',
    });
    if (!ok) return;
    await runBulkAction(ops.delete, 'Deleted', 'delete movements');
  };

  return { handleBulkApplyPending, handleBulkMarkAsPending, handleBulkDelete };
};
