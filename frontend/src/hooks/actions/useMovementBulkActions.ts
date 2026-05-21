import { useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { movementService } from '../../services/movementService';
import type { Movement } from '../../types';
import type { useToast } from '../useToast';
import type { useConfirm } from '../useConfirm';
import type { BulkSelectionResult } from '../useBulkSelection';

export interface UseMovementBulkActionsParams {
  bulk: BulkSelectionResult;
  /**
   * The movements currently visible to the user. Used to look up properties
   * (e.g. `subPocketId`) of the selected ids so we can invalidate query
   * caches conditionally instead of unconditionally fanning out.
   */
  movements: Movement[];
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
 *
 * Cache invalidation mirrors the targeted approach used in
 * `useMovementMutations`:
 *   - `['movements']`, `['accounts']`, `['pockets']` are always invalidated
 *     because every bulk action shifts at least one movement into or out of
 *     balance calculations.
 *   - `['subPockets']` is only invalidated when at least one of the selected
 *     movements references a sub-pocket.
 *   - `['reminders']` is only invalidated for delete operations (a deleted
 *     movement may restore a previously-completed reminder).
 */
export const useMovementBulkActions = ({
  bulk,
  movements,
  confirm,
  toast,
  operations,
}: UseMovementBulkActionsParams): UseMovementBulkActionsResult => {
  const queryClient = useQueryClient();

  // Build an id → movement lookup once per render so we don't pay O(n) per
  // selected id when computing whether sub-pockets need invalidation.
  const movementsById = useMemo(() => {
    const map = new Map<string, Movement>();
    for (const m of movements) {
      map.set(m.id, m);
    }
    return map;
  }, [movements]);

  const ops = {
    applyPending:
      operations?.applyPending ?? ((id: string) => movementService.applyPendingMovement(id)),
    markAsPending:
      operations?.markAsPending ?? ((id: string) => movementService.markAsPending(id)),
    delete: operations?.delete ?? ((id: string) => movementService.deleteMovement(id)),
  };

  const invalidateMovementCaches = (opts: {
    includeSubPockets: boolean;
    includeReminders: boolean;
  }) => {
    queryClient.invalidateQueries({ queryKey: ['movements'] });
    queryClient.invalidateQueries({ queryKey: ['accounts'] });
    queryClient.invalidateQueries({ queryKey: ['pockets'] });
    if (opts.includeSubPockets) {
      queryClient.invalidateQueries({ queryKey: ['subPockets'] });
    }
    if (opts.includeReminders) {
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
    }
  };

  const runBulkAction = async (
    fn: (id: string) => Promise<unknown>,
    pastVerb: string,
    failureVerb: string,
    opts: { isDelete: boolean },
  ) => {
    const ids = Array.from(bulk.selectedIds);
    // Compute conditional invalidation flags before the fan-out so they're
    // available even if the toolbar deselects everything afterward.
    const includeSubPockets = ids.some((id) => {
      const movement = movementsById.get(id);
      return Boolean(movement?.subPocketId);
    });
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
      invalidateMovementCaches({
        includeSubPockets,
        includeReminders: opts.isDelete,
      });
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
    await runBulkAction(ops.applyPending, 'Applied', 'apply movements', {
      isDelete: false,
    });
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
    await runBulkAction(ops.markAsPending, 'Marked', 'mark as pending', {
      isDelete: false,
    });
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
    await runBulkAction(ops.delete, 'Deleted', 'delete movements', {
      isDelete: true,
    });
  };

  return { handleBulkApplyPending, handleBulkMarkAsPending, handleBulkDelete };
};
