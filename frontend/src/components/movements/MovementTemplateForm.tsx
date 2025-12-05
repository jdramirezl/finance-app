import { useState, useEffect } from 'react';
import { useAccountsQuery, usePocketsQuery, useSubPocketsQuery } from '../../hooks/queries';
import Button from '../Button';
import Input from '../Input';
import Select from '../Select';
import type { MovementTemplate, MovementType } from '../../types';

interface MovementTemplateFormProps {
    initialData?: MovementTemplate | null;
    onSubmit: (data: {
        name: string;
        type: MovementType;
        accountId: string;
        pocketId: string;
        subPocketId?: string | null;
        defaultAmount?: number | null;
        notes?: string | null;
    }) => Promise<void>;
    onCancel: () => void;
    isSaving: boolean;
}

const MovementTemplateForm = ({
    initialData,
    onSubmit,
    onCancel,
    isSaving,
}: MovementTemplateFormProps) => {
    const { data: accounts = [] } = useAccountsQuery();
    const { data: pockets = [] } = usePocketsQuery();
    const { data: subPockets = [] } = useSubPocketsQuery();

    const [name, setName] = useState(initialData?.name || '');
    const [type, setType] = useState<MovementType>(initialData?.type || 'EgresoNormal');
    const [accountId, setAccountId] = useState(initialData?.accountId || '');
    const [pocketId, setPocketId] = useState(initialData?.pocketId || '');
    const [subPocketId, setSubPocketId] = useState(initialData?.subPocketId || '');
    const [defaultAmount, setDefaultAmount] = useState(initialData?.defaultAmount?.toString() || '');
    const [notes, setNotes] = useState(initialData?.notes || '');

    // Reset pocket when account changes
    useEffect(() => {
        if (accountId && initialData?.accountId !== accountId) {
            setPocketId('');
            setSubPocketId('');
        }
    }, [accountId, initialData]);

    const availablePockets = accountId
        ? pockets.filter(p => p.accountId === accountId)
        : [];

    const isFixedExpense = type === 'IngresoFijo' || type === 'EgresoFijo';
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await onSubmit({
            name,
            type,
            accountId,
            pocketId,
            subPocketId: subPocketId || null,
            defaultAmount: defaultAmount ? parseFloat(defaultAmount) : null,
            notes: notes || null,
        });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <Input
                label="Template Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Monthly Rent"
                required
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Select
                    label="Type"
                    value={type}
                    onChange={(e) => setType(e.target.value as MovementType)}
                    options={movementTypes}
                    required
                />

                <Input
                    type="number"
                    label="Default Amount (Optional)"
                    value={defaultAmount}
                    onChange={(e) => setDefaultAmount(e.target.value)}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Select
                    label="Account"
                    value={accountId}
                    onChange={(e) => setAccountId(e.target.value)}
                    options={[
                        { value: '', label: 'Select Account' },
                        ...accounts.map(acc => ({ value: acc.id, label: acc.name }))
                    ]}
                    required
                />

                <Select
                    label="Pocket"
                    value={pocketId}
                    onChange={(e) => setPocketId(e.target.value)}
                    options={[
                        { value: '', label: 'Select Pocket' },
                        ...availablePockets.map(p => ({ value: p.id, label: p.name }))
                    ]}
                    disabled={!accountId}
                    required
                />
            </div>

            {isFixedExpense && availableSubPockets.length > 0 && (
                <Select
                    label="Sub-Pocket (Optional)"
                    value={subPocketId}
                    onChange={(e) => setSubPocketId(e.target.value)}
                    options={[
                        { value: '', label: 'None' },
                        ...availableSubPockets.map(sp => ({ value: sp.id, label: sp.name }))
                    ]}
                />
            )}

            <Input
                label="Notes (Optional)"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Template notes..."
            />

            <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="secondary" onClick={onCancel}>
                    Cancel
                </Button>
                <Button type="submit" variant="primary" loading={isSaving}>
                    {initialData ? 'Update Template' : 'Create Template'}
                </Button>
            </div>
        </form>
    );
};

export default MovementTemplateForm;
