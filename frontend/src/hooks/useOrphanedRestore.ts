import { useState } from 'react';
import type { useToast } from './useToast';
import type { useMovementMutations } from './queries/useMovementMutations';

type RestoreMutation = ReturnType<
  typeof useMovementMutations
>['restoreOrphanedMovements'];

interface RestoreModalState {
  isOpen: boolean;
  movementIds: string[];
  sourceLabel: string;
}

export interface OpenRestoreArgs {
  movementIds: string[];
  sourceLabel: string;
}

export interface UseOrphanedRestoreParams {
  restoreMutation: RestoreMutation;
  toast: ReturnType<typeof useToast.getState>;
}

export interface UseOrphanedRestoreResult {
  modalState: RestoreModalState;
  isSubmitting: boolean;
  open: (args: OpenRestoreArgs) => void;
  close: () => void;
  confirmRestore: (accountId: string, pocketId: string) => Promise<void>;
}

const EMPTY_STATE: RestoreModalState = {
  isOpen: false,
  movementIds: [],
  sourceLabel: '',
};

/**
 * Manages the restore-orphaned-movements modal: open/close, the confirm
 * flow, and the toast notifications for partial success.
 */
export const useOrphanedRestore = ({
  restoreMutation,
  toast,
}: UseOrphanedRestoreParams): UseOrphanedRestoreResult => {
  const [modalState, setModalState] = useState<RestoreModalState>(EMPTY_STATE);

  const open = ({ movementIds, sourceLabel }: OpenRestoreArgs) => {
    setModalState({ isOpen: true, movementIds, sourceLabel });
  };

  const close = () => {
    if (restoreMutation.isPending) return;
    setModalState(EMPTY_STATE);
  };

  const confirmRestore = async (accountId: string, pocketId: string) => {
    try {
      const result = await restoreMutation.mutateAsync({
        movementIds: modalState.movementIds,
        accountId,
        pocketId,
      });
      const restored = result?.restored ?? modalState.movementIds.length;
      const failed = result?.failed ?? 0;
      if (failed > 0) {
        toast.warning(`Restored ${restored} movement(s), ${failed} failed`);
      } else {
        toast.success(
          `Restored ${restored} movement${restored === 1 ? '' : 's'}`
        );
      }
      setModalState(EMPTY_STATE);
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to restore movements'
      );
    }
  };

  return {
    modalState,
    isSubmitting: restoreMutation.isPending,
    open,
    close,
    confirmRestore,
  };
};
