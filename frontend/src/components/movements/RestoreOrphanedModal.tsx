import { useEffect, useMemo, useState } from 'react';
import { Wallet, FolderOpen } from 'lucide-react';
import Modal from '../Modal';
import Button from '../Button';
import type { Account, Pocket } from '../../types';

interface RestoreOrphanedModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (accountId: string, pocketId: string) => Promise<void> | void;
  accounts: Account[];
  pockets: Pocket[];
  movementCount: number;
  /** Original account/pocket label shown for context (e.g. "Old Bank (USD)") */
  sourceLabel?: string;
  isSubmitting?: boolean;
}

const RestoreOrphanedModal = ({
  isOpen,
  onClose,
  onConfirm,
  accounts,
  pockets,
  movementCount,
  sourceLabel,
  isSubmitting = false,
}: RestoreOrphanedModalProps) => {
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [selectedPocketId, setSelectedPocketId] = useState<string>('');

  // Reset selection whenever the modal is opened
  useEffect(() => {
    if (isOpen) {
      setSelectedAccountId('');
      setSelectedPocketId('');
    }
  }, [isOpen]);

  // Pockets only show for the selected account; clear pocket when account changes
  const availablePockets = useMemo(
    () => pockets.filter((p) => p.accountId === selectedAccountId),
    [pockets, selectedAccountId],
  );

  useEffect(() => {
    if (selectedPocketId && !availablePockets.some((p) => p.id === selectedPocketId)) {
      setSelectedPocketId('');
    }
  }, [availablePockets, selectedPocketId]);

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

        <div className="space-y-1">
          <label
            htmlFor="restore-account"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2"
          >
            <Wallet className="w-4 h-4" />
            Target Account
          </label>
          <select
            id="restore-account"
            value={selectedAccountId}
            onChange={(e) => setSelectedAccountId(e.target.value)}
            disabled={isSubmitting || accounts.length === 0}
            className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            <option value="">
              {accounts.length === 0 ? 'No accounts available' : 'Select an account'}
            </option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name} ({account.currency})
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label
            htmlFor="restore-pocket"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2"
          >
            <FolderOpen className="w-4 h-4" />
            Target Pocket
          </label>
          <select
            id="restore-pocket"
            value={selectedPocketId}
            onChange={(e) => setSelectedPocketId(e.target.value)}
            disabled={isSubmitting || !selectedAccountId || availablePockets.length === 0}
            className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            <option value="">
              {!selectedAccountId
                ? 'Select an account first'
                : availablePockets.length === 0
                  ? 'This account has no pockets'
                  : 'Select a pocket'}
            </option>
            {availablePockets.map((pocket) => (
              <option key={pocket.id} value={pocket.id}>
                {pocket.name}
                {pocket.type === 'fixed' ? ' (fixed)' : ''}
              </option>
            ))}
          </select>
        </div>

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
