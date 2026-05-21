import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { format } from 'date-fns';
import { Plus, X } from 'lucide-react';
import Button from './Button';
import BatchMovementRow from './movements/BatchMovementRow';
import { usePocketsQuery } from '../hooks/queries';
import { useToast } from '../hooks/useToast';

// Re-export the row data type from its new home so existing consumers
// (useBudgetActions, useFixedExpenseActions, useMovementSubmit,
// useBalanceDeltas, MovementFormPanel, MovementsPage) keep working without
// import-path churn. The single source of truth is now the row component.
export type { BatchMovementRow } from './movements/BatchMovementRow';
import type { BatchMovementRow as BatchMovementRowData } from './movements/BatchMovementRow';

interface BatchMovementFormProps {
  onSave: (rows: BatchMovementRowData[]) => Promise<void>;
  onCancel: () => void;
  /**
   * Notified whenever the focused row's data changes (e.g. the user edits a
   * field on the row that currently has keyboard focus). The parent uses
   * this to keep the side-panel context in sync with the row.
   */
  onFocusRow?: (row: BatchMovementRowData) => void;
  /** Notified when rows are added or removed (not when fields are edited). */
  onRowsChange?: (rows: BatchMovementRowData[]) => void;
  /** Optional pre-populated rows (e.g. from a budget plan). */
  initialRows?: BatchMovementRowData[];
}

export interface BatchMovementFormRef {
  updateAmount: (id: string, amount: string) => void;
}

const BatchMovementForm = forwardRef<BatchMovementFormRef, BatchMovementFormProps>(
  ({ onSave, onCancel, onFocusRow, onRowsChange, initialRows }, ref) => {
    // Pockets are only consulted locally to surface the high-precision
    // amount step for the share-tracking pocket. Account/pocket/sub-pocket
    // option lists are owned by AccountPocketSelector, which fetches them
    // through the same query hook.
    const { data: pockets = [] } = usePocketsQuery();

    const [rows, setRows] = useState<BatchMovementRowData[]>(
      initialRows && initialRows.length > 0
        ? initialRows
        : [
            {
              id: crypto.randomUUID(),
              type: 'IngresoNormal',
              accountId: '',
              pocketId: '',
              amount: '',
              notes: '',
              displayedDate: format(new Date(), 'yyyy-MM-dd'),
            },
          ]
    );

    const [isSaving, setIsSaving] = useState(false);
    const [markAsPending, setMarkAsPending] = useState(false);
    const toast = useToast();

    // Keep callbacks (onFocusRow, onRowsChange) in refs so the per-row
    // memoized handlers below can stay referentially stable across renders
    // even when callers pass inline functions. Without this, every
    // BatchMovementRow would re-render whenever the parent re-renders,
    // defeating React.memo on the row component.
    const lastFocusedRowIdRef = useRef<string | null>(null);
    const onFocusRowRef = useRef(onFocusRow);
    const onRowsChangeRef = useRef(onRowsChange);
    onFocusRowRef.current = onFocusRow;
    onRowsChangeRef.current = onRowsChange;

    // Re-publish the focused row whenever its data changes. We treat
    // `rows` as the source of truth: a row marks itself as focused via
    // handleRowFocus, and this effect fires onFocusRow whenever the
    // focused row's contents change. This avoids hand-merging next-state
    // values inside individual onChange callbacks, which doesn't compose
    // with AccountPocketSelector's internal cascading.
    useEffect(() => {
      const focusedId = lastFocusedRowIdRef.current;
      if (!focusedId) return;
      const focused = rows.find((r) => r.id === focusedId);
      if (focused) onFocusRowRef.current?.(focused);
    }, [rows]);

    // Functional updater is required because AccountPocketSelector may emit
    // back-to-back callbacks (e.g. onAccountChange followed by an internal
    // onPocketChange('') cascade). With a value-form setRows both calls
    // would close over the same captured rows and the second would clobber
    // the first; the functional form composes them correctly.
    //
    // Cascading resets and movement-type-driven filtering live inside
    // AccountPocketSelector now, so updateRow no longer needs to perform
    // any of that bookkeeping — it just merges the requested change.
    const updateRow = useCallback(
      (id: string, updates: Partial<BatchMovementRowData>) => {
        setRows((prev) =>
          prev.map((row) => (row.id === id ? { ...row, ...updates } : row))
        );
      },
      []
    );

    const removeRow = useCallback((id: string) => {
      setRows((prev) => {
        if (prev.length === 1) return prev; // Keep at least one row
        const next = prev.filter((row) => row.id !== id);
        onRowsChangeRef.current?.(next);
        return next;
      });
    }, []);

    const addRow = useCallback(() => {
      setRows((prev) => {
        const next: BatchMovementRowData[] = [
          ...prev,
          {
            id: crypto.randomUUID(),
            type: 'IngresoNormal',
            accountId: '',
            pocketId: '',
            amount: '',
            notes: '',
            displayedDate: format(new Date(), 'yyyy-MM-dd'),
          },
        ];
        onRowsChangeRef.current?.(next);
        return next;
      });
    }, []);

    const handleRowFocus = useCallback((row: BatchMovementRowData) => {
      lastFocusedRowIdRef.current = row.id;
      onFocusRowRef.current?.(row);
    }, []);

    useImperativeHandle(
      ref,
      () => ({
        updateAmount: (id, amount) => {
          updateRow(id, { amount });
        },
      }),
      [updateRow]
    );

    const handleSave = async () => {
      // Validate all rows
      const errors: string[] = [];
      rows.forEach((row, index) => {
        if (!row.accountId) errors.push(`Row ${index + 1}: Account is required`);
        if (!row.pocketId) errors.push(`Row ${index + 1}: Pocket is required`);
        if (!row.amount || parseFloat(row.amount) < 0)
          errors.push(`Row ${index + 1}: Valid amount is required (cannot be negative)`);
      });

      if (errors.length > 0) {
        toast.error(errors.join(' • '));
        return;
      }

      setIsSaving(true);
      try {
        const rowsWithPending = rows.map((row) => ({
          ...row,
          isPending: markAsPending,
        }));
        await onSave(rowsWithPending);
      } finally {
        setIsSaving(false);
      }
    };

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Add Multiple Movements
          </h3>
          <button
            onClick={onCancel}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            aria-label="Close batch movement form"
            title="Close"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <div className="space-y-3 mb-4">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Add multiple movements at once. All movements will be saved together when you click "Save All".
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={markAsPending}
              onChange={(e) => setMarkAsPending(e.target.checked)}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
            />
            <span className="text-gray-700 dark:text-gray-300">
              Mark all as pending (won't affect balances until applied)
            </span>
          </label>
        </div>

        <div className="space-y-3 max-h-[60vh] overflow-y-auto">
          {rows.map((row, index) => {
            const selectedPocket = row.pocketId
              ? pockets.find((p) => p.id === row.pocketId)
              : undefined;
            const amountStep =
              selectedPocket?.name === 'Shares' ? '0.000001' : '0.01';

            return (
              <BatchMovementRow
                key={row.id}
                row={row}
                index={index}
                canRemove={rows.length > 1}
                amountStep={amountStep}
                onUpdate={updateRow}
                onRemove={removeRow}
                onFocus={handleRowFocus}
              />
            );
          })}
        </div>

        <div className="flex items-center justify-between pt-4 border-t dark:border-gray-700">
          <Button variant="secondary" onClick={addRow} className="flex items-center gap-2">
            <Plus className="w-4 h-4" aria-hidden="true" />
            Add Row
          </Button>

          <div className="flex gap-2">
            <Button variant="secondary" onClick={onCancel} disabled={isSaving}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSave} loading={isSaving} disabled={isSaving}>
              Save All ({rows.length})
            </Button>
          </div>
        </div>
      </div>
    );
  }
);

export default BatchMovementForm;
