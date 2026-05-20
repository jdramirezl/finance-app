import type { useToast } from './useToast';
import type { useConfirm } from './useConfirm';
import type { useMovementMutations } from './queries/useMovementMutations';
import type { BulkSelectionResult } from './useBulkSelection';

type BulkMutations = Pick<
  ReturnType<typeof useMovementMutations>,
  'applyPendingMovement' | 'markAsPending' | 'deleteMovement'
>;

export interface UseMovementBulkActionsParams {
  bulk: BulkSelectionResult;
  mutations: BulkMutations;
  confirm: ReturnType<typeof useConfirm>['confirm'];
  toast: ReturnType<typeof useToast.getState>;
}

export interface UseMovementBulkActionsResult {
  handleBulkApplyPending: () => Promise<void>;
  handleBulkMarkAsPending: () => Promise<void>;
  handleBulkDelete: () => Promise<void>;
}

/**
 * Bulk-action handlers for the movements toolbar (apply / mark-pending /
 * delete). Each prompts for confirmation, fans out to mutateAsync via
 * Promise.allSettled, and reports a partial-failure aware toast.
 *
 * `bulk` is the shared `useBulkSelection` instance the page renders with.
 * Mutations and `confirm` are passed in so the hook shares the same
 * instances driving the page's UI.
 */
export const useMovementBulkActions = ({
  bulk,
  mutations,
  confirm,
  toast,
}: UseMovementBulkActionsParams): UseMovementBulkActionsResult => {
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
      toast.error(
        err instanceof Error ? err.message : `Failed to ${failureVerb}`
      );
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
    await runBulkAction(
      (id) => mutations.applyPendingMovement.mutateAsync(id),
      'Applied',
      'apply movements'
    );
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
    await runBulkAction(
      (id) => mutations.markAsPending.mutateAsync(id),
      'Marked',
      'mark as pending'
    );
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
    await runBulkAction(
      (id) => mutations.deleteMovement.mutateAsync(id),
      'Deleted',
      'delete movements'
    );
  };

  return { handleBulkApplyPending, handleBulkMarkAsPending, handleBulkDelete };
};
