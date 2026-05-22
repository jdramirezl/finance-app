import Modal from '../ui/Modal';
import Button from '../ui/Button';

interface CascadeDeleteDialogProps {
  isOpen: boolean;
  isDeleting: boolean;
  deleteMovements: boolean;
  onDeleteMovementsChange: (value: boolean) => void;
  onConfirm: () => void;
  onClose: () => void;
}

/**
 * Controlled confirmation dialog for cascade-deleting an account along
 * with all its pockets, sub-pockets, and (optionally) its movement
 * history. The "delete movements" choice and the open/close state are
 * owned by the caller (via `useAccountActions`) so the dialog stays a
 * pure render of those props.
 */
const CascadeDeleteDialog = ({
  isOpen,
  isDeleting,
  deleteMovements,
  onDeleteMovementsChange,
  onConfirm,
  onClose,
}: CascadeDeleteDialogProps) => {
  return (
    <Modal isOpen={isOpen} onClose={() => !isDeleting && onClose()}>
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Delete Account & All Data
        </h3>
        <p className="text-gray-500 dark:text-gray-400">
          This is a destructive action. You can choose to delete everything or keep the transaction history.
        </p>

        <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-300 dark:border-red-600">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={deleteMovements}
              onChange={(e) => onDeleteMovementsChange(e.target.checked)}
              className="mt-1 w-4 h-4 text-red-600 rounded border-gray-300 focus:ring-red-500"
            />
            <div>
              <span className="font-medium text-red-600 dark:text-red-400">
                Delete all movements history
              </span>
              <p className="text-sm text-red-600/80 dark:text-red-400/80 mt-1">
                If checked, all movements associated with this account will be permanently deleted.
                If unchecked, movements will be preserved but marked as orphaned.
              </p>
            </div>
          </label>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button variant="secondary" onClick={onClose} disabled={isDeleting}>
            Cancel
          </Button>
          <Button variant="danger" onClick={onConfirm} loading={isDeleting}>
            Delete Everything
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default CascadeDeleteDialog;
