import { Trash2 } from 'lucide-react';
import Button from '../Button';

export interface BulkActionsToolbarProps {
  selectedCount: number;
  onClearSelection: () => void;
  onApplyPending: () => void | Promise<void>;
  onMarkAsPending: () => void | Promise<void>;
  onDelete: () => void | Promise<void>;
}

/**
 * Sticky toolbar shown when one or more movements are selected.
 * Pure presentational — the page owns the actual mutation logic and
 * confirm prompts via the callback props.
 */
const BulkActionsToolbar = ({
  selectedCount,
  onClearSelection,
  onApplyPending,
  onMarkAsPending,
  onDelete,
}: BulkActionsToolbarProps) => {
  if (selectedCount === 0) return null;

  return (
    <div className="sticky top-0 z-10 bg-blue-50 dark:bg-blue-900/30 border-2 border-blue-300 dark:border-blue-700 rounded-lg p-4 shadow-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
            {selectedCount} movement{selectedCount > 1 ? 's' : ''} selected
          </span>
          <button
            onClick={onClearSelection}
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            Clear selection
          </button>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={onApplyPending}>
            Apply Pending
          </Button>
          <Button variant="secondary" size="sm" onClick={onMarkAsPending}>
            Mark as Pending
          </Button>
          <Button variant="danger" size="sm" onClick={onDelete}>
            <Trash2 className="w-4 h-4" />
            Delete Selected
          </Button>
        </div>
      </div>
    </div>
  );
};

export default BulkActionsToolbar;
