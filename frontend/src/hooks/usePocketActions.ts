import { useState } from 'react';
import type { Account, Pocket } from '../types';
import type { PocketFormData } from '../components/accounts/PocketForm';
import type { useToast } from './useToast';
import type { useConfirm } from './useConfirm';
import type { usePocketMutations } from './queries/usePocketMutations';

type PocketMutations = ReturnType<typeof usePocketMutations>;

export interface MigrationController {
  isOpen: boolean;
  pocketId: string | null;
  targetAccountId: string;
  setTargetAccountId: (id: string) => void;
  isMigrating: boolean;
  open: (pocketId: string) => void;
  close: () => void;
  confirm: () => Promise<void>;
}

export interface UsePocketActionsParams {
  accounts: Account[];
  pockets: Pocket[];
  selectedAccountId: string | null;
  mutations: PocketMutations;
  confirm: ReturnType<typeof useConfirm>['confirm'];
  toast: ReturnType<typeof useToast.getState>;
  setError: (value: string | null) => void;
  closePocketForm: () => void;
}

export interface UsePocketActionsResult {
  handleCreatePocket: (data: PocketFormData) => Promise<void>;
  handleUpdatePocket: (
    pocket: Pocket,
    data: PocketFormData
  ) => Promise<void>;
  handleDeletePocket: (id: string) => Promise<void>;
  isPocketFormSaving: boolean;
  migration: MigrationController;
}

/**
 * Encapsulates pocket CRUD flows for the currently selected account, plus
 * the migration dialog state machine for moving fixed-expense pockets
 * between accounts.
 *
 * `pockets` is expected to be the slice of pockets visible in the section
 * (typically filtered to the selected account). `selectedAccountId` is
 * required to scope create operations.
 */
export const usePocketActions = ({
  accounts,
  pockets,
  selectedAccountId,
  mutations,
  confirm,
  toast,
  setError,
  closePocketForm,
}: UsePocketActionsParams): UsePocketActionsResult => {
  const {
    createPocket,
    updatePocket,
    deletePocket,
    migrateFixedPocketToAccount,
  } = mutations;

  const [migrationPocketId, setMigrationPocketId] = useState<string | null>(
    null
  );
  const [migrationTargetAccountId, setMigrationTargetAccountId] = useState('');
  const [isMigrationOpen, setIsMigrationOpen] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);

  const handleCreatePocket = async (data: PocketFormData) => {
    setError(null);
    if (!selectedAccountId) return;

    try {
      await createPocket.mutateAsync({
        accountId: selectedAccountId,
        name: data.name,
        type: data.type || 'normal',
      });
      toast.success('Pocket created successfully!');
      closePocketForm();
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Failed to create pocket';
      setError(msg);
      // Toast is shown by the mutation's onError handler.
    }
  };

  const handleUpdatePocket = async (
    pocket: Pocket,
    data: PocketFormData
  ) => {
    setError(null);

    try {
      await updatePocket.mutateAsync({
        id: pocket.id,
        updates: { name: data.name },
      });
      toast.success('Pocket updated successfully!');
      closePocketForm();
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Failed to update pocket';
      setError(msg);
      // Toast is shown by the mutation's onError handler.
    }
  };

  const handleDeletePocket = async (id: string) => {
    const pocket = pockets.find((p) => p.id === id);
    const confirmed = await confirm({
      title: 'Delete Pocket',
      message: `Are you sure you want to delete "${pocket?.name}"? This action cannot be undone.`,
      confirmText: 'Delete Pocket',
      cancelText: 'Cancel',
      variant: 'danger',
    });

    if (!confirmed) return;

    setError(null);
    try {
      await deletePocket.mutateAsync(id);
      toast.success('Pocket deleted successfully!');
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Failed to delete pocket';
      setError(msg);
      // Toast is shown by the mutation's onError handler.
    }
  };

  const openMigration = (pocketId: string) => {
    setMigrationPocketId(pocketId);
    setMigrationTargetAccountId('');
    setIsMigrationOpen(true);
  };

  const closeMigration = () => {
    if (isMigrating) return;
    setIsMigrationOpen(false);
    setMigrationPocketId(null);
    setMigrationTargetAccountId('');
  };

  const confirmMigration = async () => {
    if (!migrationPocketId || !migrationTargetAccountId) return;
    setIsMigrating(true);
    setError(null);
    try {
      const pocket = pockets.find((p) => p.id === migrationPocketId);
      const targetAccount = accounts.find(
        (a) => a.id === migrationTargetAccountId
      );

      await migrateFixedPocketToAccount.mutateAsync({
        pocketId: migrationPocketId,
        targetAccountId: migrationTargetAccountId,
      });

      setIsMigrationOpen(false);
      setMigrationPocketId(null);
      setMigrationTargetAccountId('');

      toast.success(
        `Successfully migrated "${pocket?.name}" to "${targetAccount?.name}". All movements have been transferred.`
      );
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Failed to migrate pocket';
      setError(msg);
      // Toast is shown by the mutation's onError handler.
    } finally {
      setIsMigrating(false);
    }
  };

  return {
    handleCreatePocket,
    handleUpdatePocket,
    handleDeletePocket,
    isPocketFormSaving: createPocket.isPending || updatePocket.isPending,
    migration: {
      isOpen: isMigrationOpen,
      pocketId: migrationPocketId,
      targetAccountId: migrationTargetAccountId,
      setTargetAccountId: setMigrationTargetAccountId,
      isMigrating,
      open: openMigration,
      close: closeMigration,
      confirm: confirmMigration,
    },
  };
};
