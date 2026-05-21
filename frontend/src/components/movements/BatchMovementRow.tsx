import { memo } from 'react';
import { Trash2 } from 'lucide-react';
import Input from '../Input';
import Select from '../Select';
import AccountPocketSelector from '../selectors/AccountPocketSelector';
import { MOVEMENT_TYPES } from '../../utils/movementTypes';
import type { MovementType } from '../../types';

/**
 * Shape of a single row in BatchMovementForm.
 *
 * The interface previously lived inline in BatchMovementForm.tsx but is
 * co-located with the row component now that the row has been extracted.
 * BatchMovementForm.tsx re-exports this type so existing consumers
 * (useBudgetActions, useFixedExpenseActions, useMovementSubmit,
 * useBalanceDeltas, MovementFormPanel, MovementsPage) keep working
 * without an import-path change.
 */
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

interface BatchMovementRowProps {
    /** The row's current data (controlled by the parent). */
    row: BatchMovementRow;
    /** Zero-based index, used purely for the "Movement #N" label. */
    index: number;
    /**
     * Whether the remove button should be rendered. The parent keeps at
     * least one row visible at all times, so it passes `false` when this
     * is the only row.
     */
    canRemove: boolean;
    /**
     * The amount input's `step` attribute. The parent computes this per
     * row based on the selected pocket (e.g. share-tracking pockets need
     * higher precision than currency pockets).
     */
    amountStep: string;
    /** Merge a partial update into this row. Parent owns row state. */
    onUpdate: (id: string, updates: Partial<BatchMovementRow>) => void;
    /** Request removal of this row. Ignored by the parent if it would empty the list. */
    onRemove: (id: string) => void;
    /**
     * Fired when any input inside the row receives focus. The parent uses
     * this to keep its side-panel context in sync with the focused row.
     */
    onFocus: (row: BatchMovementRow) => void;
}

/**
 * A single editable row inside BatchMovementForm.
 *
 * Wrapped in React.memo so editing one row only re-renders that row;
 * sibling rows skip rendering as long as the parent hands down stable
 * callback identities (via useCallback) and the row's own props are
 * shallow-equal to the previous render.
 *
 * Cascading account → pocket → sub-pocket logic and movement-type-driven
 * filtering live entirely inside AccountPocketSelector, so this component
 * is purely presentational: every input change is forwarded to the parent
 * via `onUpdate`, and the parent re-renders this row with the new data.
 */
const BatchMovementRow = ({
    row,
    index,
    canRemove,
    amountStep,
    onUpdate,
    onRemove,
    onFocus,
}: BatchMovementRowProps) => {
    return (
        <div
            onFocus={() => onFocus(row)}
            className="p-4 border dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800/50 space-y-3"
        >
            <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Movement #{index + 1}
                </span>
                {canRemove && (
                    <button
                        onClick={() => onRemove(row.id)}
                        className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                        aria-label={`Remove movement #${index + 1}`}
                        title="Remove this row"
                    >
                        <Trash2 className="w-4 h-4" aria-hidden="true" />
                    </button>
                )}
            </div>

            <Select
                label="Type"
                value={row.type}
                onChange={(e) =>
                    onUpdate(row.id, { type: e.target.value as MovementType })
                }
                required
                options={MOVEMENT_TYPES}
            />

            <AccountPocketSelector
                accountId={row.accountId}
                pocketId={row.pocketId}
                subPocketId={row.subPocketId || ''}
                onAccountChange={(accountId) => onUpdate(row.id, { accountId })}
                onPocketChange={(pocketId) => onUpdate(row.id, { pocketId })}
                onSubPocketChange={(subPocketId) =>
                    onUpdate(row.id, { subPocketId: subPocketId || undefined })
                }
                movementType={row.type}
                enforceMovementType
                showSubPocket
                showAccountCurrency
                required
            />

            <div className="grid grid-cols-2 gap-3">
                <Input
                    label="Amount"
                    type="number"
                    step={amountStep}
                    value={row.amount}
                    onChange={(e) => onUpdate(row.id, { amount: e.target.value })}
                    required
                />

                <Input
                    label="Date"
                    type="date"
                    value={row.displayedDate}
                    onChange={(e) =>
                        onUpdate(row.id, { displayedDate: e.target.value })
                    }
                    required
                />
            </div>

            <Input
                label="Notes (optional)"
                value={row.notes}
                onChange={(e) => onUpdate(row.id, { notes: e.target.value })}
                placeholder="Add notes..."
            />
        </div>
    );
};

export default memo(BatchMovementRow);
