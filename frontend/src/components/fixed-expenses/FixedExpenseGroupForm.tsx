import { useState } from 'react';
import type { FixedExpenseGroup } from '../../types';
import { useFixedExpenseGroupMutations } from '../../hooks/queries';
import { useToast } from '../../hooks/useToast';
import Button from '../Button';
import Input from '../Input';

interface FixedExpenseGroupFormProps {
    initialData?: FixedExpenseGroup | null;
    onClose: () => void;
    onSuccess: () => void;
}

const FixedExpenseGroupForm = ({
    initialData,
    onClose,
    onSuccess,
}: FixedExpenseGroupFormProps) => {
    const { createFixedExpenseGroup, updateFixedExpenseGroup } = useFixedExpenseGroupMutations();
    const toast = useToast();
    const [isSaving, setIsSaving] = useState(false);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSaving(true);
        const form = e.currentTarget;
        const formData = new FormData(form);

        const name = formData.get('groupName') as string;
        const color = formData.get('groupColor') as string;

        try {
            if (initialData) {
                await updateFixedExpenseGroup.mutateAsync({ id: initialData.id, name, color });
                toast.success('Group updated successfully!');
            } else {
                await createFixedExpenseGroup.mutateAsync({ name, color });
                toast.success('Group created successfully!');
            }
            onSuccess();
            onClose();
        } catch (err: any) {
            toast.error(err.message || 'Failed to save group');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {initialData ? 'Edit Group' : 'New Group'}
            </h2>

            <Input
                label="Group Name"
                name="groupName"
                type="text"
                defaultValue={initialData?.name || ''}
                placeholder="e.g., Housing, Transportation"
                required
            />

            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Color
                </label>
                <div className="flex gap-2 flex-wrap">
                    {[
                        '#3B82F6', // Blue
                        '#EF4444', // Red
                        '#10B981', // Green
                        '#F59E0B', // Yellow
                        '#8B5CF6', // Purple
                        '#EC4899', // Pink
                        '#6366F1', // Indigo
                        '#14B8A6', // Teal
                    ].map((color) => (
                        <label key={color} className="cursor-pointer">
                            <input
                                type="radio"
                                name="groupColor"
                                value={color}
                                defaultChecked={initialData?.color === color || (!initialData && color === '#3B82F6')}
                                className="sr-only peer"
                            />
                            <div
                                className="w-8 h-8 rounded-full border-2 border-transparent peer-checked:border-gray-900 dark:peer-checked:border-white transition-all"
                                style={{ backgroundColor: color }}
                            />
                        </label>
                    ))}
                </div>
            </div>

            <div className="flex gap-2 pt-4">
                <Button
                    type="submit"
                    variant="primary"
                    loading={isSaving}
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
