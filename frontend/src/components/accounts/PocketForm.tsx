import type { Pocket } from '../../types';
import Button from '../Button';
import Input from '../Input';
import Select from '../Select';

interface PocketFormProps {
    initialData?: Pocket | null;
    onSubmit: (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
    onCancel: () => void;
    isSaving: boolean;
}

const PocketForm = ({
    initialData,
    onSubmit,
    onCancel,
    isSaving,
}: PocketFormProps) => {
    const isEditing = !!initialData;

    const pocketTypes: Pocket['type'][] = ['normal', 'fixed'];

    return (
        <form onSubmit={onSubmit} className="space-y-4">
            <Input
                label="Pocket Name"
                name="name"
                defaultValue={initialData?.name}
                required
                placeholder="e.g., Savings, Emergency Fund"
            />

            {!isEditing && (
                <Select
                    label="Pocket Type"
                    name="type"
                    defaultValue="normal"
                    required
                    options={pocketTypes.map(t => ({
                        value: t,
                        label: t === 'fixed' ? 'Fixed Expenses' : 'Normal'
                    }))}
                />
            )}

            <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="secondary" onClick={onCancel}>
                    Cancel
                </Button>
                <Button type="submit" variant="primary" loading={isSaving}>
                    {isEditing ? 'Update Pocket' : 'Create Pocket'}
                </Button>
            </div>
        </form>
    );
};

export default PocketForm;
