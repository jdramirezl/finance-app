import { useEffect, useState } from 'react';
import Modal from '../Modal';
import Button from '../Button';
import AccountPocketSelector from '../selectors/AccountPocketSelector';

interface RestoreOrphanedModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (accountId: string, pocketId: string) => Promise<void> | void;
  movementCount: number;
  /** Original account/pocket label shown for context (e.g. "Old Bank (USD)") */
  sourceLabel?: string;
  isSubmitting?: boolean;
}

const RestoreOrphanedModal = ({
  isOpen,
  onClose,
  onConfirm,
  movementCount,
  sourceLabel,
  isSubmitting = false,
}: RestoreOrphanedModalProps) => {
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [selectedPocketId, setSelectedPocketId] = useState<string>('');

  // Reset selection whenever the modal is opened. AccountPocketSelector
  // owns the cascading reset when the user changes account, so we no
  // longer need a separate effect to clear the pocket on account change.
  useEffect(() => {
    if (isOpen) {
      setSelectedAccountId('');
      setSelectedPocketId('');
    }
  }, [isOpen]);

  const canSubmit =
    !!selectedAccountId && !!selectedPocketId && movementCount > 0 && !isSubmitting;

  const handleConfirm = async () => {
    if (!canSubmit) return;
    await onConfirm(selectedAccountId, selectedPocketId);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Restore Orphaned Movements" size="md">
      <div className="space-y-4">
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
          <p className="text-xs text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider mb-1">
            Movements to restore
          </p>
          <p className="text-sm text-gray-900 dark:text-gray-100 font-medium">
            {movementCount} movement{movementCount === 1 ? '' : 's'}
            {sourceLabel ? ` from ${sourceLabel}` : ''}
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
            Pick the destination account and pocket. Balances will update once the restore
            completes.
          </p>
        </div>

        <AccountPocketSelector
          accountId={selectedAccountId}
          pocketId={selectedPocketId}
          onAccountChange={setSelectedAccountId}
          onPocketChange={setSelectedPocketId}
          accountLabel="Target Account"
          pocketLabel="Target Pocket"
          showAccountCurrency
          required
          disabled={isSubmitting}
        />

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleConfirm} loading={isSubmitting} disabled={!canSubmit}>
            Restore {movementCount > 0 ? movementCount : ''}{' '}
            Movement{movementCount === 1 ? '' : 's'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default RestoreOrphanedModal;
