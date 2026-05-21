import { memo } from 'react';
import { Controller, type Control } from 'react-hook-form';
import { Trash2 } from 'lucide-react';
import Input from '../ui/Input';
import Select from '../ui/Select';
import AccountPocketSelector from './AccountPocketSelector';
import CategorySelector from './CategorySelector';
import { MOVEMENT_TYPES } from '../../constants/movementTypes';
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
    category?: string;
    isPending?: boolean;
}

export interface BatchFormValues {
    rows: BatchMovementRow[];
    markAsPending: boolean;
}

interface BatchMovementRowProps {
    /** Zero-based index into the field array. */
    index: number;
    /** react-hook-form control for Controller fields. */
    control: Control<BatchFormValues>;
    /** Per-row errors from formState.errors.rows[index]. */
    errors?: Record<string, { message?: string }>;
    /** Whether the remove button should be rendered. */
    canRemove: boolean;
    /** The amount input's `step` attribute. */
    amountStep: string;
    /** Request removal of this row. */
    onRemove: () => void;
    /** Fired when any input inside the row receives focus. */
    onFocus: () => void;
}

/**
 * A single editable row inside BatchMovementForm.
 *
 * Uses react-hook-form Controller for AccountPocketSelector (controlled
 * component) and register-compatible inputs for simple fields.
 */
const BatchMovementRowComponent = ({
    index,
    control,
    errors,
    canRemove,
    amountStep,
    onRemove,
    onFocus,
}: BatchMovementRowProps) => {
    return (
        <div
            onFocus={onFocus}
            className="p-4 border dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800/50 space-y-3"
        >
            <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Movement #{index + 1}
                </span>
                {canRemove && (
                    <button
                        type="button"
                        onClick={onRemove}
                        className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                        aria-label={`Remove movement #${index + 1}`}
                        title="Remove this row"
                    >
                        <Trash2 className="w-4 h-4" aria-hidden="true" />
                    </button>
                )}
            </div>

            <Controller
                control={control}
                name={`rows.${index}.type`}
                render={({ field }) => (
                    <Select
                        label="Type"
                        value={field.value}
                        onChange={(e) => field.onChange(e.target.value)}
                        onBlur={field.onBlur}
                        required
                        options={MOVEMENT_TYPES}
                    />
                )}
            />

            <Controller
                control={control}
                name={`rows.${index}.accountId`}
                rules={{ required: 'Account is required' }}
                render={({ field: accountField }) => (
                    <Controller
                        control={control}
                        name={`rows.${index}.pocketId`}
                        rules={{ required: 'Pocket is required' }}
                        render={({ field: pocketField }) => (
                            <Controller
                                control={control}
                                name={`rows.${index}.subPocketId`}
                                render={({ field: subPocketField }) => (
                                    <Controller
                                        control={control}
                                        name={`rows.${index}.type`}
                                        render={({ field: typeField }) => (
                                            <>
                                                <AccountPocketSelector
                                                    accountId={accountField.value}
                                                    pocketId={pocketField.value}
                                                    subPocketId={subPocketField.value || ''}
                                                    onAccountChange={(id) => accountField.onChange(id)}
                                                    onPocketChange={(id) => pocketField.onChange(id)}
                                                    onSubPocketChange={(id) =>
                                                        subPocketField.onChange(id || undefined)
                                                    }
                                                    movementType={typeField.value}
                                                    enforceMovementType
                                                    showSubPocket
                                                    showAccountCurrency
                                                    required
                                                />
                                                {(errors?.accountId || errors?.pocketId) && (
                                                    <p className="text-sm text-red-600 dark:text-red-400">
                                                        {errors?.accountId?.message || errors?.pocketId?.message}
                                                    </p>
                                                )}
                                            </>
                                        )}
                                    />
                                )}
                            />
                        )}
                    />
                )}
            />

            <div className="grid grid-cols-2 gap-3">
                <Controller
                    control={control}
                    name={`rows.${index}.amount`}
                    rules={{
                        required: 'Amount is required',
                        validate: (v) => {
                            const num = parseFloat(v);
                            if (isNaN(num) || num < 0) return 'Amount must be 0 or greater';
                            return true;
                        },
                    }}
                    render={({ field }) => (
                        <Input
                            label="Amount"
                            type="number"
                            step={amountStep}
                            value={field.value}
                            onChange={field.onChange}
                            onBlur={field.onBlur}
                            required
                            error={errors?.amount?.message}
                        />
                    )}
                />

                <Controller
                    control={control}
                    name={`rows.${index}.displayedDate`}
                    render={({ field }) => (
                        <Input
                            label="Date"
                            type="date"
                            value={field.value}
                            onChange={field.onChange}
                            onBlur={field.onBlur}
                            required
                        />
                    )}
                />
            </div>

            <Controller
                control={control}
                name={`rows.${index}.notes`}
                render={({ field }) => (
                    <Input
                        label="Notes (optional)"
                        value={field.value}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        placeholder="Add notes..."
                    />
                )}
            />

            <Controller
                control={control}
                name={`rows.${index}.category`}
                render={({ field }) => (
                    <CategorySelector
                        value={field.value ?? ''}
                        onChange={field.onChange}
                    />
                )}
            />
        </div>
    );
};

export default memo(BatchMovementRowComponent);
