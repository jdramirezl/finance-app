import { useState } from 'react';
import type { Movement } from '../../types';
import type { useToast } from '../useToast';
import type { useConfirm } from '../useConfirm';
import type { useMovementMutations } from '../queries/useMovementMutations';

type RowMutations = Pick<
  ReturnType<typeof useMovementMutations>,
  'deleteMovement' | 'applyPendingMovement'
>;

export interface UseMovementRowActionsParams {
  movements: Movement[];
  mutations: RowMutations;
  confirm: ReturnType<typeof useConfirm>['confirm'];
  toast: ReturnType<typeof useToast.getState>;
  setError: (value: string | null) => void;
}

export interface UseMovementRowActionsResult {
  handleDelete: (id: string) => Promise<void>;
  handleApplyPending: (id: string) => Promise<void>;
  deletingId: string | null;
  applyingId: string | null;
}

/**
 * Encapsulates the per-row delete and apply-pending flows including their
 * confirmation prompts and per-id "loading" indicators.
 *
 * `confirm` is passed in (vs. calling useConfirm here) so the hook shares
 * the same dialog state instance the page renders.
 */
export const useMovementRowActions = ({
  movements,
  mutations,
  confirm,
  toast,
  setError,
}: UseMovementRowActionsParams): UseMovementRowActionsResult => {
  const { deleteMovement, applyPendingMovement } = mutations;
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [applyingId, setApplyingId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    const movement = movements.find((m) => m.id === id);
    const ok = await confirm({
      title: 'Delete Movement',
      message: `Are you sure you want to delete this movement${movement?.notes ? ` "${movement.notes}"` : ''}? This action cannot be undone.`,
      confirmText: 'Delete Movement',
      cancelText: 'Cancel',
      variant: 'danger',
    });
    if (!ok) return;
    setError(null);
    setDeletingId(id);
    try {
      await deleteMovement.mutateAsync(id);
      toast.success('Movement deleted successfully!');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete movement';
      setError(msg);
      // Toast is shown by the mutation's onError handler.
    } finally {
      setDeletingId(null);
    }
  };

  const handleApplyPending = async (id: string) => {
    const movement = movements.find((m) => m.id === id);
    const ok = await confirm({
      title: 'Apply Pending Movement',
      message: `Apply this pending movement${movement?.notes ? ` "${movement.notes}"` : ''}? This will update account balances.`,
      confirmText: 'Apply Movement',
      cancelText: 'Cancel',
      variant: 'info',
    });
    if (!ok) return;
    setError(null);
    setApplyingId(id);
    try {
      await applyPendingMovement.mutateAsync(id);
      toast.success('Movement applied successfully!');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to apply movement';
      setError(msg);
      // Toast is shown by the mutation's onError handler.
    } finally {
      setApplyingId(null);
    }
  };

  return { handleDelete, handleApplyPending, deletingId, applyingId };
};
