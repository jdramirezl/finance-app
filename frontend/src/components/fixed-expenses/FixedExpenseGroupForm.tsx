import { useForm, Controller } from 'react-hook-form';
import type { FixedExpenseGroup } from '../../types';
import { useFixedExpenseGroupMutations } from '../../hooks/queries';
import { useToast } from '../../hooks/useToast';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { useUnsavedChanges } from '../../hooks/useUnsavedChanges';

interface FixedExpenseGroupFormData {
    groupName: string;
    groupColor: string;
}

interface FixedExpenseGroupFormProps {
    initialData?: FixedExpenseGroup | null;
    onClose: () => void;
    onSuccess: () => void;
}

const COLOR_OPTIONS = [
    '#3B82F6', '#EF4444', '#10B981', '#F59E0B',
    '#8B5CF6', '#EC4899', '#6366F1', '#14B8A6',
];

const FixedExpenseGroupForm = ({
    initialData,
    onClose,
    onSuccess,
}: FixedExpenseGroupFormProps) => {
    const { createFixedExpenseGroup, updateFixedExpenseGroup } = useFixedExpenseGroupMutations();
    const toast = useToast();

    const { register, handleSubmit, control, formState: { errors, isDirty, isSubmitting } } = useForm<FixedExpenseGroupFormData>({
        mode: 'onBlur',
        defaultValues: {
            groupName: initialData?.name || '',
            groupColor: initialData?.color || '#3B82F6',
        },
    });

    useUnsavedChanges(isDirty);

    const onSubmit = async (data: FixedExpenseGroupFormData) => {
        try {
            if (initialData) {
                await updateFixedExpenseGroup.mutateAsync({ id: initialData.id, name: data.groupName, color: data.groupColor });
                toast.success('Group updated successfully!');
            } else {
                await createFixedExpenseGroup.mutateAsync({ name: data.groupName, color: data.groupColor });
                toast.success('Group created successfully!');
            }
            onSuccess();
            onClose();
        } catch {
            // Toast is shown by the mutation's onError handler.
        }
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {initialData ? 'Edit Group' : 'New Group'}
            </h2>

            <Input
                label="Group Name"
                type="text"
                placeholder="e.g., Housing, Transportation"
                required
                error={errors.groupName?.message}
                {...register('groupName', { required: 'Name is required' })}
            />

            <Controller
                name="groupColor"
                control={control}
                rules={{ required: 'Color is required' }}
                render={({ field }) => (
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Color<span className="text-red-500 ml-0.5">*</span>
                        </label>
                        <div className="flex gap-2 flex-wrap">
                            {COLOR_OPTIONS.map((color) => (
                                <label key={color} className="cursor-pointer">
                                    <input
                                        type="radio"
                                        name="groupColor"
                                        value={color}
                                        checked={field.value === color}
                                        onChange={() => field.onChange(color)}
                                        className="sr-only peer"
                                    />
                                    <div
                                        className="w-8 h-8 rounded-full border-2 border-transparent peer-checked:border-gray-900 dark:peer-checked:border-white transition-all"
                                        style={{ backgroundColor: color }}
                                    />
                                </label>
                            ))}
                        </div>
                        {errors.groupColor && (
                            <p className="text-sm text-red-600 dark:text-red-400 mt-1">{errors.groupColor.message}</p>
                        )}
                    </div>
                )}
            />

            <div className="flex gap-2 pt-4">
                <Button
                    type="submit"
                    variant="primary"
                    loading={isSubmitting}
                    className="flex-1"
                >
                    {initialData ? 'Save Changes' : 'Create Group'}
                </Button>
                <Button
                    type="button"
                    variant="secondary"
                    onClick={onClose}
                >
                    Cancel
                </Button>
            </div>
        </form>
    );
};

export default FixedExpenseGroupForm;
