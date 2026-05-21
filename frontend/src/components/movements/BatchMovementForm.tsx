import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
} from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { format } from 'date-fns';
import { Plus, X } from 'lucide-react';
import Button from '../ui/Button';
import BatchMovementRow from './BatchMovementRow';
import { usePocketsQuery } from '../../hooks/queries';
import { useUnsavedChanges } from '../../hooks/useUnsavedChanges';

// Re-export the row data type from its new home so existing consumers
// (useBudgetActions, useFixedExpenseActions, useMovementSubmit,
// useBalanceDeltas, MovementFormPanel, MovementsPage) keep working without
// import-path churn. The single source of truth is now the row component.
export type { BatchMovementRow } from './BatchMovementRow';
import type { BatchMovementRow as BatchMovementRowData } from './BatchMovementRow';
import type { BatchFormValues } from './BatchMovementRow';

interface BatchMovementFormProps {
  onSave: (rows: BatchMovementRowData[]) => Promise<void>;
  onCancel: () => void;
  onFocusRow?: (row: BatchMovementRowData) => void;
  onRowsChange?: (rows: BatchMovementRowData[]) => void;
  initialRows?: BatchMovementRowData[];
}

export interface BatchMovementFormRef {
  updateAmount: (id: string, amount: string) => void;
}

function createDefaultRow(): BatchMovementRowData {
  return {
    id: crypto.randomUUID(),
    type: 'IngresoNormal',
    accountId: '',
    pocketId: '',
    amount: '',
    notes: '',
    displayedDate: format(new Date(), 'yyyy-MM-dd'),
  };
}

const BatchMovementForm = forwardRef<BatchMovementFormRef, BatchMovementFormProps>(
  ({ onSave, onCancel, onFocusRow, onRowsChange, initialRows }, ref) => {
    const { data: pockets = [] } = usePocketsQuery();

    const { control, handleSubmit, setValue, watch, formState } = useForm<BatchFormValues>({
      mode: 'onBlur',
      defaultValues: {
        rows: initialRows && initialRows.length > 0 ? initialRows : [createDefaultRow()],
        markAsPending: false,
      },
    });

    const { fields, append, remove } = useFieldArray({ control, name: 'rows' });

    useUnsavedChanges(formState.isDirty);

    // Callback refs for stable identity across renders
    const onFocusRowRef = useRef(onFocusRow);
    const onRowsChangeRef = useRef(onRowsChange);
    onFocusRowRef.current = onFocusRow;
    onRowsChangeRef.current = onRowsChange;

    const lastFocusedIndexRef = useRef<number | null>(null);

    // Watch rows to fire onRowsChange and onFocusRow
    const watchedRows = watch('rows');

    // Notify parent when rows are added/removed
    const prevLengthRef = useRef(fields.length);
    useEffect(() => {
      if (fields.length !== prevLengthRef.current) {
        prevLengthRef.current = fields.length;
        onRowsChangeRef.current?.(watchedRows);
      }
    }, [fields.length, watchedRows]);

    // Re-publish focused row data when it changes
    useEffect(() => {
      const idx = lastFocusedIndexRef.current;
      if (idx === null || idx >= watchedRows.length) return;
      onFocusRowRef.current?.(watchedRows[idx]);
    }, [watchedRows]);

    const handleRowFocus = useCallback((index: number) => {
      lastFocusedIndexRef.current = index;
      // Defer to next tick so the watched value is current
      // (onFocusRow fires via the useEffect above)
    }, []);

    // Imperative handle for QuickCalculator
    useImperativeHandle(
      ref,
      () => ({
        updateAmount: (id, amount) => {
          const idx = watchedRows.findIndex((r) => r.id === id);
          if (idx !== -1) setValue(`rows.${idx}.amount`, amount, { shouldDirty: true });
        },
      }),
      [watchedRows, setValue]
    );

    const onSubmit = async (data: BatchFormValues) => {
      const rowsWithPending = data.rows.map((row) => ({
        ...row,
        isPending: data.markAsPending,
      }));
      await onSave(rowsWithPending);
    };

    const addRow = useCallback(() => {
      append(createDefaultRow());
    }, [append]);

    const handleRemove = useCallback(
      (index: number) => {
        if (fields.length <= 1) return;
        remove(index);
      },
      [fields.length, remove]
    );

    return (
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Add Multiple Movements
          </h3>
          <button
            type="button"
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
              checked={watch('markAsPending')}
              onChange={(e) => setValue('markAsPending', e.target.checked)}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
            />
            <span className="text-gray-700 dark:text-gray-300">
              Mark all as pending (won't affect balances until applied)
            </span>
          </label>
        </div>

        <div className="space-y-3 max-h-[60vh] overflow-y-auto">
          {fields.map((field, index) => {
            const row = watchedRows[index];
            const selectedPocket = row?.pocketId
              ? pockets.find((p) => p.id === row.pocketId)
              : undefined;
            const amountStep =
              selectedPocket?.name === 'Shares' ? '0.000001' : '0.01';

            return (
              <BatchMovementRow
                key={field.id}
                index={index}
                control={control}
                errors={formState.errors.rows?.[index] as Record<string, { message?: string }> | undefined}
                canRemove={fields.length > 1}
                amountStep={amountStep}
                onRemove={() => handleRemove(index)}
                onFocus={() => handleRowFocus(index)}
              />
            );
          })}
        </div>

        <div className="flex items-center justify-between pt-4 border-t dark:border-gray-700">
          <Button type="button" variant="secondary" onClick={addRow} className="flex items-center gap-2">
            <Plus className="w-4 h-4" aria-hidden="true" />
            Add Row
          </Button>

          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={onCancel} disabled={formState.isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={formState.isSubmitting} disabled={formState.isSubmitting}>
              Save All ({fields.length})
            </Button>
          </div>
        </div>
      </form>
    );
  }
);

export default BatchMovementForm;
