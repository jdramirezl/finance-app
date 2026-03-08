import { useState, useImperativeHandle, forwardRef, useEffect } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import Button from './Button';
import Input from './Input';
import Select from './Select';
import type { MovementType, Account, Pocket, SubPocket } from '../types';

export interface BatchMovementRow {
  id: string;
  type: MovementType;
  accountId: string;
  pocketId: string;
  subPocketId?: string;
  amount: string;
  notes: string;
  displayedDate: string;
  isPending?: boolean;
}

interface BatchMovementFormProps {
  accounts: Account[];
  getPocketsByAccount: (accountId: string) => Pocket[];
  getSubPocketsByPocket: (pocketId: string) => SubPocket[];
  onSave: (rows: BatchMovementRow[]) => Promise<void>;
  onCancel: () => void;
  onFocusRow?: (row: BatchMovementRow) => void;
  onRowsChange?: (rows: BatchMovementRow[]) => void;
  initialRows?: BatchMovementRow[]; // Optional pre-populated rows
}

export interface BatchMovementFormRef {
  updateAmount: (id: string, amount: string) => void;
}

const BatchMovementForm = forwardRef<BatchMovementFormRef, BatchMovementFormProps>(({
  accounts,
  getPocketsByAccount,
  getSubPocketsByPocket,
  onSave,
  onCancel,
  onFocusRow,
  onRowsChange,
  initialRows,
}: BatchMovementFormProps, ref) => {
  const [rows, setRows] = useState<BatchMovementRow[]>(
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
            displayedDate: new Date().toISOString().split('T')[0],
          },
        ]
  );

  // Notify parent of changes
  useEffect(() => {
    onRowsChange?.(rows);
  }, [rows, onRowsChange]);
  const [isSaving, setIsSaving] = useState(false);
  const [markAsPending, setMarkAsPending] = useState(false);

  useImperativeHandle(ref, () => ({
    updateAmount: (id, amount) => {
      updateRow(id, { amount });
    },
  }));

  const movementTypes: { value: MovementType; label: string }[] = [
    { value: 'IngresoNormal', label: 'Normal Income' },
    { value: 'EgresoNormal', label: 'Normal Expense' },
    { value: 'IngresoFijo', label: 'Fixed Income' },
    { value: 'EgresoFijo', label: 'Fixed Expense' },
  ];

  const addRow = () => {
    setRows([
      ...rows,
      {
        id: crypto.randomUUID(),
        type: 'IngresoNormal',
        accountId: '',
        pocketId: '',
        amount: '',
        notes: '',
        displayedDate: new Date().toISOString().split('T')[0],
      },
    ]);
  };

  const removeRow = (id: string) => {
    if (rows.length === 1) return; // Keep at least one row
    setRows(rows.filter((row) => row.id !== id));
  };

  const updateRow = (id: string, updates: Partial<BatchMovementRow>) => {
    setRows(
      rows.map((row) => {
        if (row.id === id) {
          const updated = { ...row, ...updates };
          
          // Reset pocket if account changes
          if (updates.accountId !== undefined && updates.accountId !== row.accountId) {
            updated.pocketId = '';
            updated.subPocketId = undefined;

            // If we have an account and it's a fixed movement, auto-select the fixed pocket
            const isFixedMove = updated.type === 'IngresoFijo' || updated.type === 'EgresoFijo';
            if (isFixedMove && updated.accountId) {
              const accountPockets = getPocketsByAccount(updated.accountId);
              const fixedPock = accountPockets.find(p => p.type === 'fixed');
              if (fixedPock) {
                updated.pocketId = fixedPock.id;
              }
            }
          }

          // If type changes, apply filtering rules
          if (updates.type !== undefined && updates.type !== row.type) {
            const wasFixed = row.type === 'IngresoFijo' || row.type === 'EgresoFijo';
            const isNowFixed = updates.type === 'IngresoFijo' || updates.type === 'EgresoFijo';

            if (isNowFixed && !wasFixed) {
              // Transitionally check if current account is valid for fixed
              if (updated.accountId) {
                const accountPockets = getPocketsByAccount(updated.accountId);
                const fixedPock = accountPockets.find(p => p.type === 'fixed');
                if (fixedPock) {
                  updated.pocketId = fixedPock.id;
                } else {
                  // Current account has no fixed pocket, clear it
                  updated.accountId = '';
                  updated.pocketId = '';
                }
              }
            } else if (!isNowFixed && wasFixed) {
              // Moved from fixed to normal, clear pocket if it was fixed
              if (updated.pocketId) {
                const currentPocket = getPocketsByAccount(updated.accountId).find(p => p.id === updated.pocketId);
                if (currentPocket?.type === 'fixed') {
                  updated.pocketId = '';
                }
              }
            }
          }
          
          // Reset subPocket if pocket changes
          if (updates.pocketId !== undefined && updates.pocketId !== row.pocketId) {
            updated.subPocketId = undefined;
          }
          
          return updated;
        }
        return row;
      })
    );
  };

  const handleSave = async () => {
    // Validate all rows
    const errors: string[] = [];
    rows.forEach((row, index) => {
      if (!row.accountId) errors.push(`Row ${index + 1}: Account is required`);
      if (!row.pocketId) errors.push(`Row ${index + 1}: Pocket is required`);
      if (!row.amount || parseFloat(row.amount) < 0) errors.push(`Row ${index + 1}: Valid amount is required (cannot be negative)`);
    });

    if (errors.length > 0) {
      alert(errors.join('\n'));
      return;
    }

    setIsSaving(true);
    try {
      // Add isPending flag to all rows if checkbox is checked
      const rowsWithPending = rows.map(row => ({
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
        >
          <X className="w-5 h-5" />
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
          const isFixedExpense = row.type === 'IngresoFijo' || row.type === 'EgresoFijo';
          
          // Filter accounts: show all for normal, only those with fixed pockets for fixed movements
          const filteredAccounts = isFixedExpense
            ? accounts.filter(acc => getPocketsByAccount(acc.id).some(p => p.type === 'fixed'))
            : accounts;

          const allAccountPockets = row.accountId ? getPocketsByAccount(row.accountId) : [];
          
          // Filter pockets: only fixed for fixed movements, exclude fixed for normal movements
          const filteredPockets = isFixedExpense
            ? allAccountPockets.filter(p => p.type === 'fixed')
            : allAccountPockets.filter(p => p.type !== 'fixed');

          const fixedPocket = allAccountPockets.find((p) => p.type === 'fixed');
          const availableSubPockets = fixedPocket && isFixedExpense ? getSubPocketsByPocket(fixedPocket.id) : [];

          return (
            <div
              key={row.id}
              onFocus={() => onFocusRow?.(row)}
              className="p-4 border dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800/50 space-y-3"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Movement #{index + 1}
                </span>
                {rows.length > 1 && (
                  <button
                    onClick={() => removeRow(row.id)}
                    className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Select
                  label="Type"
                  value={row.type}
                  onChange={(e) => {
                    const type = e.target.value as MovementType;
                    updateRow(row.id, { type });
                    onFocusRow?.({ ...row, type });
                  }}
                  required
                  options={movementTypes}
                />

                <Select
                  label="Account"
                  value={row.accountId}
                  onChange={(e) => {
                    const accountId = e.target.value;
                    updateRow(row.id, { accountId });
                    onFocusRow?.({ ...row, accountId, pocketId: '' });
                  }}
                  required
                  options={[
                    { value: '', label: 'Select account' },
                    ...filteredAccounts.map((account) => ({
                      value: account.id,
                      label: `${account.name} (${account.currency})`,
                    })),
                  ]}
                />

                <Select
                  label="Pocket"
                  value={row.pocketId}
                  onChange={(e) => {
                    const pocketId = e.target.value;
                    updateRow(row.id, { pocketId });
                    onFocusRow?.({ ...row, pocketId });
                  }}
                  required
                  disabled={!row.accountId}
                  options={[
                    { value: '', label: 'Select pocket' },
                    ...filteredPockets.map((pocket) => ({
                      value: pocket.id,
                      label: pocket.name,
                    })),
                  ]}
                />

                {isFixedExpense && availableSubPockets.length > 0 && (
                  <Select
                    label="Sub-Pocket"
                    value={row.subPocketId || ''}
                    onChange={(e) => {
                      const subPocketId = e.target.value || undefined;
                      updateRow(row.id, { subPocketId });
                      onFocusRow?.({ ...row, subPocketId });
                    }}
                    options={[
                      { value: '', label: 'Select sub-pocket (optional)' },
                      ...availableSubPockets.map((subPocket) => ({
                        value: subPocket.id,
                        label: subPocket.name,
                      })),
                    ]}
                  />
                )}

                <Input
                  label="Amount"
                  type="number"
                  step={row.pocketId && filteredPockets.find(p => p.id === row.pocketId)?.name === 'Shares' ? '0.000001' : '0.01'}
                  value={row.amount}
                  onChange={(e) => {
                    const amount = e.target.value;
                    updateRow(row.id, { amount });
                    onFocusRow?.({ ...row, amount });
                  }}
                  required
                />

                <Input
                  label="Date"
                  type="date"
                  value={row.displayedDate}
                  onChange={(e) => {
                    const displayedDate = e.target.value;
                    updateRow(row.id, { displayedDate });
                    onFocusRow?.({ ...row, displayedDate });
                  }}
                  required
                />
              </div>

              <Input
                label="Notes (optional)"
                value={row.notes}
                onChange={(e) => {
                  const notes = e.target.value;
                  updateRow(row.id, { notes });
                  onFocusRow?.({ ...row, notes });
                }}
                placeholder="Add notes..."
              />
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between pt-4 border-t dark:border-gray-700">
        <Button variant="secondary" onClick={addRow} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
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
});

export default BatchMovementForm;
