import { useState } from 'react';
import { format } from 'date-fns';
import { useAccountsQuery, useMovementTemplatesQuery, usePocketsQuery } from '../../hooks/queries';
import Button from '../Button';
import Input from '../Input';
import Select from '../Select';
import AccountPocketSelector from '../selectors/AccountPocketSelector';
import { toDateOnly } from '../../utils/dateUtils';
import { MOVEMENT_TYPES, isFixedMovement } from '../../utils/movementTypes';
import type { Movement, MovementType } from '../../types';

interface MovementFormProps {
    initialData?: Movement | null;
    onSubmit: (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
    onCancel: () => void;
    isSaving: boolean;
    selectedAccountId: string;
    setSelectedAccountId: (id: string) => void;
    selectedPocketId: string;
    setSelectedPocketId: (id: string) => void;
    selectedSubPocketId: string;
    setSelectedSubPocketId: (id: string) => void;
    selectedType: MovementType;
    setSelectedType: (type: MovementType) => void;
    amount: string;
    setAmount: (amount: string) => void;
    notes: string;
    setNotes: (notes: string) => void;
    isFixedExpense: boolean;
    setIsFixedExpense: (isFixed: boolean) => void;
    saveAsTemplate: boolean;
    setSaveAsTemplate: (save: boolean) => void;
    templateName: string;
    setTemplateName: (name: string) => void;
    selectedTemplateId: string;
    onTemplateSelect: (id: string) => void;
    defaultValues?: {
        amount?: number;
        notes?: string;
        date?: string;
        type?: MovementType;
        fixedExpenseId?: string;
        templateId?: string;
    };
}

// Type select options for this form, which adds a synthetic "Transfer"
// entry on top of the canonical movement types. Transfer is a UI-only
// concept in this component — it is not a MovementType.
const MOVEMENT_TYPE_OPTIONS_WITH_TRANSFER: { value: MovementType | 'Transfer'; label: string }[] = [
    ...MOVEMENT_TYPES,
    { value: 'Transfer', label: 'Transfer' },
];

const MovementForm = ({
    initialData,
    onSubmit,
    onCancel,
    isSaving,
    selectedAccountId,
    setSelectedAccountId,
    selectedPocketId,
    setSelectedPocketId,
    selectedSubPocketId,
    setSelectedSubPocketId,
    selectedType,
    setSelectedType,
    amount,
    setAmount,
    notes,
    setNotes,
    isFixedExpense,
    setIsFixedExpense,
    saveAsTemplate,
    setSaveAsTemplate,
    templateName,
    setTemplateName,
    selectedTemplateId,
    onTemplateSelect,
    defaultValues,
}: MovementFormProps) => {
    const { data: accounts = [] } = useAccountsQuery();
    const { data: pockets = [] } = usePocketsQuery();
    const { data: movementTemplates = [] } = useMovementTemplatesQuery();

    // Whether the type select currently maps to a fixed-pocket movement.
    // The canonical MovementType-based check is duplicated as
    // isDefaultFixedExpense to mirror the legacy guard which OR'd the
    // explicit `isFixedExpense` flag with the type-derived value.
    const isDefaultFixedExpense = isFixedMovement(selectedType);

    const [isTransfer, setIsTransfer] = useState(false);
    const [targetAccountId, setTargetAccountId] = useState('');
    const [targetPocketId, setTargetPocketId] = useState('');

    const availableTargetPockets = targetAccountId
        ? pockets.filter((p) => p.accountId === targetAccountId)
        : [];

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);

        // Inject transfer data if in transfer mode
        if (isTransfer) {
            formData.append('isTransfer', 'true');
            formData.append('targetAccountId', targetAccountId);
            formData.append('targetPocketId', targetPocketId);
        }

        await onSubmit(e);
    };

    // Compute the date input default once. toDateOnly preserves the
    // calendar date of any incoming string (initialData or defaultValues),
    // and falls back to today via date-fns' format helper so we never
    // round-trip through `new Date(string)` (which would shift in
    // negative-offset timezones).
    const defaultDateValue = initialData?.displayedDate
        ? toDateOnly(initialData.displayedDate)
        : defaultValues?.date
            ? toDateOnly(defaultValues.date)
            : format(new Date(), 'yyyy-MM-dd');

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
                {!initialData && (
                    <Select
                        label="Load Template"
                        value={selectedTemplateId}
                        onChange={(e) => onTemplateSelect(e.target.value)}
                        options={[
                            { value: '', label: 'Start from scratch' },
                            ...movementTemplates.map(t => ({ value: t.id, label: t.name }))
                        ]}
                    />
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Select
                        label="Type"
                        name="type"
                        required
                        value={selectedType}
                        onChange={(e) => {
                            const value = e.target.value;
                            if (value === 'Transfer') {
                                setIsTransfer(true);
                                setIsFixedExpense(false);
                                // Clear selections when switching to transfer
                                setSelectedAccountId('');
                                setSelectedPocketId('');
                            } else {
                                setIsTransfer(false);
                                const type = value as MovementType;
                                setSelectedType(type);
                                const isFixedType = isFixedMovement(type);
                                setIsFixedExpense(isFixedType);

                                // Reset account if it's not valid for the new type selection
                                if (isFixedType) {
                                    const hasFixed = pockets.some(p => p.accountId === selectedAccountId && p.type === 'fixed');
                                    if (!hasFixed) setSelectedAccountId('');
                                }
                            }
                        }}
                        options={MOVEMENT_TYPE_OPTIONS_WITH_TRANSFER}
                    />

                    <Input
                        type="date"
                        label="Date"
                        name="displayedDate"
                        required
                        defaultValue={defaultDateValue}
                    />
                </div>

                <AccountPocketSelector
                    accountId={selectedAccountId}
                    pocketId={selectedPocketId}
                    subPocketId={selectedSubPocketId}
                    onAccountChange={setSelectedAccountId}
                    onPocketChange={setSelectedPocketId}
                    onSubPocketChange={setSelectedSubPocketId}
                    movementType={selectedType}
                    enforceMovementType
                    showFixedPocketHint
                    showSubPocket={!isTransfer && (isFixedExpense || isDefaultFixedExpense)}
                    showAccountCurrency
                    accountName="accountId"
                    pocketName="pocketId"
                    subPocketName="subPocketId"
                    accountLabel={isTransfer ? 'Source Account' : 'Account'}
                    pocketLabel={isTransfer ? 'Source Pocket' : 'Pocket'}
                    required
                />

                {isTransfer && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
                        <Select
                            label="Target Account"
                            name="targetAccountId"
                            required
                            value={targetAccountId}
                            onChange={(e) => {
                                setTargetAccountId(e.target.value);
                                setTargetPocketId('');
                            }}
                            options={[
                                { value: '', label: 'Select Target Account' },
                                ...accounts.map(acc => ({ 
                                    value: acc.id, 
                                    label: `${acc.name} (${acc.currency})` 
                                }))
                            ]}
                        />

                        <Select
                            label="Target Pocket"
                            name="targetPocketId"
                            required
                            value={targetPocketId}
                            onChange={(e) => setTargetPocketId(e.target.value)}
                            options={[
                                { value: '', label: 'Select Target Pocket' },
                                ...availableTargetPockets
                                    .filter(p => !selectedPocketId || p.id !== selectedPocketId)
                                    .map(p => ({ value: p.id, label: p.name }))
                            ]}
                            disabled={!targetAccountId}
                        />
                    </div>
                )}

                <Input
                    type="number"
                    label="Amount"
                    name="amount"
                    placeholder={selectedPocketId && pockets.find(p => p.id === selectedPocketId)?.name === 'Shares' ? '0.000000' : '0.00'}
                    step={selectedPocketId && pockets.find(p => p.id === selectedPocketId)?.name === 'Shares' ? '0.000001' : '0.01'}
                    min="0"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                />

                <Input
                    label="Notes"
                    name="notes"
                    placeholder={isTransfer ? "Transfer details..." : "What is this for?"}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                />

                <div className="flex items-center gap-2">
                    <input
                        type="checkbox"
                        id="isPending"
                        name="isPending"
                        defaultChecked={initialData?.isPending}
                        className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                    />
                    <label htmlFor="isPending" className="text-sm text-gray-700 dark:text-gray-300">
                        Mark as Pending (don't apply to balance yet)
                    </label>
                </div>

                {/* Hidden input to signal transfer mode to parent */}
                <input type="hidden" name="isTransfer" value={isTransfer.toString()} />

                {!initialData && !isTransfer && (
                    <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-2 mb-2">
                            <input
                                type="checkbox"
                                id="saveAsTemplate"
                                checked={saveAsTemplate}
                                onChange={(e) => setSaveAsTemplate(e.target.checked)}
                                className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                            />
                            <label htmlFor="saveAsTemplate" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                Save as Template
                            </label>
                        </div>

                        {saveAsTemplate && (
                            <Input
                                label="Template Name"
                                value={templateName}
                                onChange={(e) => setTemplateName(e.target.value)}
                                placeholder="e.g., Monthly Rent"
                                required={saveAsTemplate}
                            />
                        )}
                    </div>
                )}

                <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="secondary" onClick={onCancel}>
                        Cancel
                    </Button>
                    <Button type="submit" variant="primary" loading={isSaving}>
                        {initialData ? 'Update Movement' : (isTransfer ? 'Transfer Funds' : 'Create Movement')}
                    </Button>
                </div>
        </form>
    );
};

export default MovementForm;
