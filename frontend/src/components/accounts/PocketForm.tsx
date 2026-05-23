import { useForm } from 'react-hook-form';
import type { Pocket } from '../../types';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import { useUnsavedChanges } from '../../hooks/useUnsavedChanges';

export interface PocketFormData {
    name: string;
    type: Pocket['type'];
}

interface PocketFormProps {
    initialData?: Pocket | null;
    onSubmit: (data: PocketFormData) => Promise<void>;
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

    const { register, handleSubmit, formState: { errors, isDirty } } = useForm<PocketFormData>({
        mode: 'onBlur',
        defaultValues: {
            name: initialData?.name || '',
            type: 'normal',
        },
    });

    useUnsavedChanges(isDirty);

    const pocketTypes: Pocket['type'][] = ['normal', 'fixed'];

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
                label="Pocket Name"
                placeholder="e.g., Savings, Emergency Fund"
                required
                error={errors.name?.message}
                {...register('name', { required: 'Name is required' })}
            />

            {!isEditing && (
                <Select
                    label="Pocket Type"
                    required
                    options={pocketTypes.map(t => ({
                        value: t,
                        label: t === 'fixed' ? 'Fixed Expenses' : 'Normal'
                    }))}
                    {...register('type')}
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
