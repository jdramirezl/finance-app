import { useState } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import Button from './Button';
import Input from './Input';
import Select from './Select';
import type { MovementType, Account, Pocket, SubPocket } from '../types';

interface BatchMovementRow {
  id: string;
  type: MovementType;
  accountId: string;
  pocketId: string;
  subPocketId?: string;
  amount: string;
  notes: string;
  displayedDate: string;
}

interface BatchMovementFormProps {
  accounts: Account[];
  getPocketsByAccount: (accountId: string) => Pocket[];
  getSubPocketsByPocket: (pocketId: string) => SubPocket[];
  onSave: (rows: BatchMovementRow[]) => Promise<void>;
  onCancel: () => void;
}

const BatchMovementForm = ({
  accounts,
  getPocketsByAccount,
  getSubPocketsByPocket,
  onSave,
  onCancel,
}: BatchMovementFormProps) => {
  const [rows, setRows] = useState<BatchMovementRow[]>([
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
  const [isSaving, setIsSaving] = useState(false);

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
      if (!row.amount || parseFloat(row.amount) <= 0) errors.push(`Row ${index + 1}: Valid amount is required`);
    });

    if (errors.length > 0) {
      alert(errors.join('\n'));
      return;
    }

    setIsSaving(true);
    try {
      await onSave(rows);
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

      <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        Add multiple movements at once. All movements will be saved together when you click "Save All".
      </div>

      <div className="space-y-3 max-h-[60vh] overflow-y-auto">
        {rows.map((row, index) => {
          const availablePockets = row.accountId ? getPocketsByAccount(row.accountId) : [];
          const isFixedExpense = row.type === 'IngresoFijo' || row.type === 'EgresoFijo';
          const fixedPocket = availablePockets.find((p) => p.type === 'fixed');
          const availableSubPockets = fixedPocket && isFixedExpense ? getSubPocketsByPocket(fixedPocket.id) : [];

          return (
            <div
              key={row.id}
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
                  onChange={(e) => updateRow(row.id, { type: e.target.value as MovementType })}
                  required
                  options={movementTypes}
                />

                <Select
                  label="Account"
                  value={row.accountId}
                  onChange={(e) => updateRow(row.id, { accountId: e.target.value })}
                  required
                  options={[
                    { value: '', label: 'Select account' },
                    ...accounts.map((account) => ({
                      value: account.id,
                      label: `${account.name} (${account.currency})`,
                    })),
                  ]}
                />

                <Select
                  label="Pocket"
                  value={row.pocketId}
                  onChange={(e) => updateRow(row.id, { pocketId: e.target.value })}
                  required
                  disabled={!row.accountId}
                  options={[
                    { value: '', label: 'Select pocket' },
                    ...availablePockets.map((pocket) => ({
                      value: pocket.id,
                      label: pocket.name,
                    })),
                  ]}
                />

                {isFixedExpense && availableSubPockets.length > 0 && (
                  <Select
                    label="Sub-Pocket"
                    value={row.subPocketId || ''}
                    onChange={(e) => updateRow(row.id, { subPocketId: e.target.value || undefined })}
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
                  step="0.01"
                  value={row.amount}
                  onChange={(e) => updateRow(row.id, { amount: e.target.value })}
                  required
                />

                <Input
                  label="Date"
                  type="date"
                  value={row.displayedDate}
                  onChange={(e) => updateRow(row.id, { displayedDate: e.target.value })}
                  required
                />
              </div>

              <Input
                label="Notes (optional)"
                value={row.notes}
                onChange={(e) => updateRow(row.id, { notes: e.target.value })}
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
};

export default BatchMovementForm;
