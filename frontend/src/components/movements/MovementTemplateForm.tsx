import { useState } from 'react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import AccountPocketSelector from './AccountPocketSelector';
import { MOVEMENT_TYPES } from '../../constants/movementTypes';
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
    const [name, setName] = useState(initialData?.name || '');
    const [type, setType] = useState<MovementType>(initialData?.type || 'EgresoNormal');
    const [accountId, setAccountId] = useState(initialData?.accountId || '');
    const [pocketId, setPocketId] = useState(initialData?.pocketId || '');
    const [subPocketId, setSubPocketId] = useState(initialData?.subPocketId || '');
    const [defaultAmount, setDefaultAmount] = useState(initialData?.defaultAmount?.toString() || '');
    const [notes, setNotes] = useState(initialData?.notes || '');

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
                    options={MOVEMENT_TYPES}
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

            <AccountPocketSelector
                accountId={accountId}
                pocketId={pocketId}
                subPocketId={subPocketId}
                onAccountChange={setAccountId}
                onPocketChange={setPocketId}
                onSubPocketChange={setSubPocketId}
                movementType={type}
                showSubPocket
                required
            />

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
