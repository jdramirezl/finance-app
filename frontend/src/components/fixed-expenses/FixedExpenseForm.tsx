import { useState } from 'react';
import { useForm } from 'react-hook-form';
import type { SubPocket, Account, Pocket } from '../../types';
import { useSubPocketMutations } from '../../hooks/queries';
import { useToast } from '../../hooks/useToast';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { calculateAporteMensual } from '../../utils/fixedExpenseUtils';
import { useUnsavedChanges } from '../../hooks/useUnsavedChanges';

interface FixedExpenseFormData {
    name: string;
    valueTotal: number;
    periodicityMonths: number;
    selectedPocketId: string;
}

interface FixedExpenseFormProps {
    fixedPockets: Pocket[];
    accounts: Account[];
    initialData?: SubPocket | null;
    onClose: () => void;
    onSuccess: () => void;
}

const FixedExpenseForm = ({
    fixedPockets,
    accounts,
    initialData,
    onClose,
    onSuccess,
}: FixedExpenseFormProps) => {
    const { createSubPocket, updateSubPocket } = useSubPocketMutations();
    const toast = useToast();
    const [error, setError] = useState<string | null>(null);

    const { register, handleSubmit, watch, formState: { errors, isDirty, isSubmitting } } = useForm<FixedExpenseFormData>({
        mode: 'onBlur',
        defaultValues: {
            name: initialData?.name || '',
            valueTotal: initialData?.valueTotal || 0,
            periodicityMonths: initialData?.periodicityMonths || 12,
            selectedPocketId: initialData?.pocketId || fixedPockets[0]?.id || '',
        },
    });

    useUnsavedChanges(isDirty);

    const valueTotal = watch('valueTotal');
    const periodicityMonths = watch('periodicityMonths');
    const selectedPocketId = watch('selectedPocketId');

    const selectedPocket = fixedPockets.find(p => p.id === selectedPocketId);
    const selectedAccount = accounts.find(a => a.id === selectedPocket?.accountId);

    const onSubmit = async (data: FixedExpenseFormData) => {
        setError(null);
        try {
            if (initialData) {
                await updateSubPocket.mutateAsync({
                    id: initialData.id,
                    updates: {
                        name: data.name,
                        valueTotal: data.valueTotal,
                        periodicityMonths: data.periodicityMonths,
                    },
                });
                toast.success('Fixed expense updated successfully!');
            } else {
                await createSubPocket.mutateAsync({
                    pocketId: data.selectedPocketId,
                    name: data.name,
                    valueTotal: data.valueTotal,
                    periodicityMonths: data.periodicityMonths,
                });
                toast.success('Fixed expense created successfully!');
            }
            onSuccess();
            onClose();
        } catch (err: unknown) {
            const errorMsg = err instanceof Error ? err.message : 'Failed to save fixed expense';
            setError(errorMsg);
        }
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                </div>
            )}

            {fixedPockets.length > 1 && (
                <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Account<span className="text-red-500 ml-0.5">*</span>
                    </label>
                    <select
                        className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                        {...register('selectedPocketId', { required: 'Account is required' })}
                    >
                        {fixedPockets.map(pocket => {
                            const account = accounts.find(a => a.id === pocket.accountId);
                            return (
                                <option key={pocket.id} value={pocket.id}>
                                    {account?.name} ({pocket.currency})
                                </option>
                            );
                        })}
                    </select>
                    {errors.selectedPocketId && (
                        <p className="text-sm text-red-600 dark:text-red-400">{errors.selectedPocketId.message}</p>
                    )}
                    {initialData && selectedPocketId !== initialData.pocketId && (
                        <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                            Warning: Changing the account will move the expense and all its movements to the new account.
                        </p>
                    )}
                </div>
            )}

            <Input
                label="Name"
                type="text"
                placeholder="e.g., Car payment, Insurance"
                required
                error={errors.name?.message}
                {...register('name', { required: 'Name is required' })}
            />

            <Input
                label="Total Value"
                type="number"
                step="0.01"
                min="0"
                placeholder="Total amount to save/pay"
                helperText="The total amount you need to save or pay for this expense"
                required
                error={errors.valueTotal?.message}
                {...register('valueTotal', {
                    required: 'Total value is required',
                    valueAsNumber: true,
                    min: { value: 0.01, message: 'Must be at least 0.01' },
                })}
            />

            <Input
                label="Periodicity (Months)"
                type="number"
                min="1"
                placeholder="e.g., 12 for monthly over a year"
                helperText="How many months to divide this expense over"
                required
                error={errors.periodicityMonths?.message}
                {...register('periodicityMonths', {
                    required: 'Periodicity is required',
                    valueAsNumber: true,
                    min: { value: 1, message: 'Must be at least 1 month' },
                })}
            />

            <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-300">
                    <span className="font-medium">Monthly Contribution:</span>{' '}
                    {calculateAporteMensual(
                        valueTotal || 0,
                        periodicityMonths || 1
                    ).toLocaleString(undefined, {
                        style: 'currency',
                        currency: selectedAccount?.currency || 'USD',
                    })}
                </p>
            </div>

            <div className="flex gap-2">
                <Button
                    type="submit"
                    variant="primary"
                    loading={isSubmitting}
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
