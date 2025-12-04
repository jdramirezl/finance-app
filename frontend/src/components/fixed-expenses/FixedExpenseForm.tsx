import { useState } from 'react';
import type { SubPocket, Account } from '../../types';
import { useSubPocketMutations } from '../../hooks/queries';
import { useToast } from '../../hooks/useToast';
import Button from '../Button';
import Input from '../Input';
import { calculateAporteMensual } from '../../utils/fixedExpenseUtils';

interface FixedExpenseFormProps {
    fixedPocketId: string;
    fixedAccount: Account;
    initialData?: SubPocket | null;
    onClose: () => void;
    onSuccess: () => void;
}

const FixedExpenseForm = ({
    fixedPocketId,
    fixedAccount,
    initialData,
    onClose,
    onSuccess,
}: FixedExpenseFormProps) => {
    const { createSubPocket, updateSubPocket } = useSubPocketMutations();
    const toast = useToast();
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError(null);
        setIsSaving(true);
        const form = e.currentTarget;
        const formData = new FormData(form);

        const name = formData.get('name') as string;
        const valueTotal = parseFloat(formData.get('valueTotal') as string);
        const periodicityMonths = parseInt(formData.get('periodicityMonths') as string, 10);

        try {
            if (initialData) {
                await updateSubPocket.mutateAsync({
                    id: initialData.id,
                    updates: { name, valueTotal, periodicityMonths }
                });
                toast.success('Fixed expense updated successfully!');
            } else {
                await createSubPocket.mutateAsync({
                    pocketId: fixedPocketId,
                    name,
                    valueTotal,
                    periodicityMonths
                });
                toast.success('Fixed expense created successfully!');
            }
            onSuccess();
            onClose();
        } catch (err: any) {
            const errorMsg = err.message || 'Failed to save fixed expense';
            setError(errorMsg);
            toast.error(errorMsg);
        } finally {
            setIsSaving(false);
        }
    };

    // Watch form values for live calculation (simple implementation)
    const [formValues, setFormValues] = useState({
        valueTotal: initialData?.valueTotal || 0,
        periodicityMonths: initialData?.periodicityMonths || 12,
    });

    const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormValues(prev => ({
            ...prev,
            [name]: parseFloat(value) || 0
        }));
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                </div>
            )}

            <Input
                label="Name"
                name="name"
                type="text"
                defaultValue={initialData?.name || ''}
                placeholder="e.g., Car payment, Insurance"
                required
            />

            <Input
                label="Total Value"
                name="valueTotal"
                type="number"
                step="0.01"
                min="0"
                defaultValue={initialData?.valueTotal?.toString() || ''}
                onChange={handleValueChange}
                placeholder="Total amount to save/pay"
                helperText="The total amount you need to save or pay for this expense"
                required
            />

            <Input
                label="Periodicity (Months)"
                name="periodicityMonths"
                type="number"
                min="1"
                defaultValue={initialData?.periodicityMonths?.toString() || ''}
                onChange={handleValueChange}
                placeholder="e.g., 12 for monthly over a year"
                helperText="How many months to divide this expense over"
                required
            />

            <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-300">
                    <span className="font-medium">Monthly Contribution:</span>{' '}
                    {calculateAporteMensual(
                        formValues.valueTotal,
                        formValues.periodicityMonths
                    ).toLocaleString(undefined, {
                        style: 'currency',
                        currency: fixedAccount.currency,
                    })}
                </p>
            </div>

            <div className="flex gap-2">
                <Button
                    type="submit"
                    variant="primary"
                    loading={isSaving}
                    className="flex-1"
                >
                    {initialData ? 'Save Changes' : 'Create Fixed Expense'}
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

export default FixedExpenseForm;
