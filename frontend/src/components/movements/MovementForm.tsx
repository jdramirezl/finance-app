import { useState } from 'react';
import { useAccountsQuery, usePocketsQuery, useSubPocketsQuery, useMovementTemplatesQuery } from '../../hooks/queries';
import Button from '../Button';
import Input from '../Input';
import Select from '../Select';
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
    setSelectedSubPocketId: (id: string) => void; // New prop
    selectedType: MovementType;
    setSelectedType: (type: MovementType) => void; // New prop
    amount: string; // New prop
    setAmount: (amount: string) => void; // New prop
    notes: string; // New prop
    setNotes: (notes: string) => void; // New prop
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
    const { data: subPockets = [] } = useSubPocketsQuery();
    const { data: movementTemplates = [] } = useMovementTemplatesQuery();

    // Determine if this is a fixed expense from defaultValues or initialData
    // const defaultType = defaultValues?.type || initialData?.type || 'EgresoNormal'; // No longer needed as we use selectedType
    const isDefaultFixedExpense = selectedType === 'IngresoFijo' || selectedType === 'EgresoFijo';

    const [isTransfer, setIsTransfer] = useState(false);
    const [targetAccountId, setTargetAccountId] = useState('');
    const [targetPocketId, setTargetPocketId] = useState('');
    // const [selectedSubPocketId, setSelectedSubPocketId] = useState(defaultValues?.fixedExpenseId || initialData?.subPocketId || ''); // Removed local state

    const availablePockets = selectedAccountId
        ? pockets.filter(p => p.accountId === selectedAccountId)
        : [];

    const availableTargetPockets = targetAccountId
        ? pockets.filter(p => p.accountId === targetAccountId)
        : [];

    const fixedPocket = availablePockets.find((p) => p.type === 'fixed');
    const availableSubPockets = fixedPocket && isFixedExpense
        ? subPockets.filter(sp => sp.pocketId === fixedPocket.id)
        : [];

    const movementTypes: { value: MovementType | 'Transfer'; label: string }[] = [
        { value: 'IngresoNormal', label: 'Normal Income' },
        { value: 'EgresoNormal', label: 'Normal Expense' },
        { value: 'IngresoFijo', label: 'Fixed Income' },
        { value: 'EgresoFijo', label: 'Fixed Expense' },
        { value: 'Transfer', label: 'Transfer' },
    ];

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
                        } else {
                            setIsTransfer(false);
                            const type = value as MovementType;
                            setSelectedType(type);
                            setIsFixedExpense(type === 'IngresoFijo' || type === 'EgresoFijo');
                        }
                    }}
                    options={movementTypes}
                />

                <Input
                    type="date"
                    label="Date"
                    name="displayedDate"
                    required
                    defaultValue={initialData?.displayedDate ? initialData.displayedDate.split('T')[0] : (defaultValues?.date ? defaultValues.date.split('T')[0] : new Date().toISOString().split('T')[0])}
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Select
                    label={isTransfer ? "Source Account" : "Account"}
                    name="accountId"
                    required
                    value={selectedAccountId}
                    onChange={(e) => {
                        setSelectedAccountId(e.target.value);
                        setSelectedPocketId('');
                    }}
                    options={[
                        { value: '', label: 'Select Account' },
                        ...accounts.map(acc => ({ value: acc.id, label: acc.name }))
                    ]}
                />

                <Select
                    label={isTransfer ? "Source Pocket" : "Pocket"}
                    name="pocketId"
                    required
                    value={selectedPocketId}
                    onChange={(e) => setSelectedPocketId(e.target.value)}
                    options={[
                        { value: '', label: 'Select Pocket' },
                        ...availablePockets.map(p => ({ value: p.id, label: p.name }))
                    ]}
                    disabled={!selectedAccountId}
                />
            </div>

            {isTransfer && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
                    <Select
                        label="Target Account"
                        name="targetAccountId" // Not used directly by form data but good for accessibility
                        required
                        value={targetAccountId}
                        onChange={(e) => {
                            setTargetAccountId(e.target.value);
                            setTargetPocketId('');
                        }}
                        options={[
                            { value: '', label: 'Select Target Account' },
                            ...accounts.map(acc => ({ value: acc.id, label: acc.name }))
                        ]}
                    />

                    <Select
                        label="Target Pocket"
                        name="targetPocketId" // Not used directly by form data but good for accessibility
                        required
                        value={targetPocketId}
                        onChange={(e) => setTargetPocketId(e.target.value)}
                        options={[
                            { value: '', label: 'Select Target Pocket' },
                            ...availableTargetPockets
                                .filter(p => !selectedPocketId || p.id !== selectedPocketId) // Prevent transferring to same pocket
                                .map(p => ({ value: p.id, label: p.name }))
                        ]}
                        disabled={!targetAccountId}
                    />
                </div>
            )}

            {(isFixedExpense || isDefaultFixedExpense) && availableSubPockets.length > 0 && !isTransfer && (
                <Select
                    label="Sub-Pocket (Optional)"
                    name="subPocketId"
                    value={selectedSubPocketId}
                    onChange={(e) => setSelectedSubPocketId(e.target.value)}
                    options={[
                        { value: '', label: 'None' },
                        ...availableSubPockets.map(sp => ({ value: sp.id, label: sp.name }))
                    ]}
                />
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
