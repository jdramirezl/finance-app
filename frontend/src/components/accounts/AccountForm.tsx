import { useForm, Controller } from 'react-hook-form';
import type { Account, Currency } from '../../types';
import { CURRENCY_OPTIONS, DEFAULT_CURRENCY } from '../../constants';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import ColorSelector from '../ui/ColorSelector';
import { useUnsavedChanges } from '../../hooks/useUnsavedChanges';

export interface AccountFormData {
    name: string;
    color: string;
    currency: Currency;
    type: string;
    stockSymbol?: string;
}

interface AccountFormProps {
    initialData?: Account | null;
    onSubmit: (data: AccountFormData) => Promise<void>;
    onCancel: () => void;
    isSaving: boolean;
}

const AccountForm = ({
    initialData,
    onSubmit,
    onCancel,
    isSaving,
}: AccountFormProps) => {
    const isEditing = !!initialData;

    const { register, handleSubmit, control, watch, formState: { errors, isDirty } } = useForm<AccountFormData>({
        mode: 'onBlur',
        defaultValues: {
            name: initialData?.name || '',
            color: initialData?.color || '#3B82F6',
            currency: initialData?.currency || DEFAULT_CURRENCY,
            type: 'normal',
            stockSymbol: '',
        },
    });

    useUnsavedChanges(isDirty);

    const type = watch('type');

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
                label="Account Name"
                placeholder="e.g., Checking Account"
                required
                error={errors.name?.message}
                {...register('name', { required: 'Name is required' })}
            />

            <Controller
                name="color"
                control={control}
                render={({ field }) => (
                    <ColorSelector
                        label="Color"
                        value={field.value}
                        onChange={field.onChange}
                        accountType={type as 'normal' | 'investment' | 'cd'}
                        className={type === 'cd' ? 'opacity-50 pointer-events-none' : ''}
                    />
                )}
            />

            <Select
                label="Currency"
                required
                disabled={type === 'cd'}
                className={type === 'cd' ? 'opacity-50' : ''}
                options={CURRENCY_OPTIONS}
                error={errors.currency?.message}
                {...register('currency', { required: 'Currency is required' })}
            />

            {!isEditing && (
                <>
                    <Select
                        label="Account Type"
                        required
                        options={[
                            { value: 'normal', label: 'Normal' },
                            { value: 'investment', label: 'Investment' },
                            { value: 'cd', label: 'Certificate of Deposit (CD)' },
                        ]}
                        {...register('type')}
                    />

                    {type === 'investment' && (
                        <Input
                            label="Stock Ticker"
                            placeholder="e.g., VOO, AAPL"
                            {...register('stockSymbol')}
                        />
                    )}

                    {type === 'cd' && (
                        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                            <p className="text-sm text-blue-800 dark:text-blue-200">
                                <strong>Note:</strong> CD accounts require additional information like principal amount, interest rate, and term. 
                                You'll be able to configure these details after creating the account.
                            </p>
                        </div>
                    )}
                </>
            )}

            <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="secondary" onClick={onCancel}>
                    Cancel
                </Button>
                <Button type="submit" variant="primary" loading={isSaving}>
                    {isEditing ? 'Update Account' : 'Create Account'}
                </Button>
            </div>
        </form>
    );
};

export default AccountForm;
