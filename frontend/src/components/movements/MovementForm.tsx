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
    isFixedExpense: boolean;
    setIsFixedExpense: (isFixed: boolean) => void;
    saveAsTemplate: boolean;
    setSaveAsTemplate: (save: boolean) => void;
    templateName: string;
    setTemplateName: (name: string) => void;
    selectedTemplateId: string;
    onTemplateSelect: (id: string) => void;
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
    isFixedExpense,
    setIsFixedExpense,
    saveAsTemplate,
    setSaveAsTemplate,
    templateName,
    setTemplateName,
    selectedTemplateId,
    onTemplateSelect,
}: MovementFormProps) => {
    const { data: accounts = [] } = useAccountsQuery();
    const { data: pockets = [] } = usePocketsQuery();
    const { data: subPockets = [] } = useSubPocketsQuery();
    const { data: movementTemplates = [] } = useMovementTemplatesQuery();

    const availablePockets = selectedAccountId
        ? pockets.filter(p => p.accountId === selectedAccountId)
        : [];

    const fixedPocket = availablePockets.find((p) => p.type === 'fixed');
    const availableSubPockets = fixedPocket && isFixedExpense
        ? subPockets.filter(sp => sp.pocketId === fixedPocket.id)
        : [];

    const movementTypes: { value: MovementType; label: string }[] = [
        { value: 'IngresoNormal', label: 'Normal Income' },
        { value: 'EgresoNormal', label: 'Normal Expense' },
        { value: 'IngresoFijo', label: 'Fixed Income' },
        { value: 'EgresoFijo', label: 'Fixed Expense' },
    ];

    return (
        <form onSubmit={onSubmit} className="space-y-4">
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
                    defaultValue={initialData?.type || 'EgresoNormal'}
                    onChange={(e) => {
                        const type = e.target.value as MovementType;
                        setIsFixedExpense(type === 'IngresoFijo' || type === 'EgresoFijo');
                    }}
                    options={movementTypes}
                />

                <Input
                    type="date"
                    label="Date"
                    name="displayedDate"
                    required
                    defaultValue={initialData?.displayedDate ? initialData.displayedDate.split('T')[0] : new Date().toISOString().split('T')[0]}
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Select
                    label="Account"
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
                    label="Pocket"
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

            {isFixedExpense && availableSubPockets.length > 0 && (
                <Select
                    label="Sub-Pocket (Optional)"
                    name="subPocketId"
                    defaultValue={initialData?.subPocketId || ''}
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
                placeholder="0.00"
                step="0.01"
                min="0"
                required
                defaultValue={initialData?.amount}
            />

            <Input
                label="Notes"
                name="notes"
                placeholder="What is this for?"
                defaultValue={initialData?.notes}
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

            {!initialData && (
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
                    {initialData ? 'Update Movement' : 'Create Movement'}
                </Button>
            </div>
        </form>
    );
};

export default MovementForm;
