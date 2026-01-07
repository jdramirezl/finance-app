import { useState } from 'react';
import type { Account, Currency } from '../../types';
import Button from '../Button';
import Input from '../Input';
import Select from '../Select';
import ColorSelector from '../ColorSelector';

interface AccountFormProps {
    initialData?: Account | null;
    onSubmit: (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
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
    const [type, setType] = useState('normal');
    const [color, setColor] = useState(initialData?.color || '#3B82F6');

    const currencies: Currency[] = ['USD', 'MXN', 'COP', 'EUR', 'GBP'];

    return (
        <form onSubmit={onSubmit} className="space-y-4">
            <Input
                label="Account Name"
                name="name"
                defaultValue={initialData?.name}
                required
                placeholder="e.g., Checking Account"
            />

            <ColorSelector
                label="Color"
                value={color}
                onChange={setColor}
                accountType={type as 'normal' | 'investment' | 'cd'}
                className={type === 'cd' ? 'opacity-50 pointer-events-none' : ''}
            />
            
            {/* Hidden input for form submission */}
            <input type="hidden" name="color" value={color} />

            <Select
                label="Currency"
                name="currency"
                defaultValue={initialData?.currency || 'USD'}
                required
                disabled={type === 'cd'}
                className={type === 'cd' ? 'opacity-50' : ''}
                options={currencies.map(c => ({ value: c, label: c }))}
            />

            {!isEditing && (
                <>
                    <Select
                        label="Account Type"
                        name="type"
                        value={type}
                        onChange={(e) => setType(e.target.value)}
                        required
                        options={[
                            { value: 'normal', label: 'Normal' },
                            { value: 'investment', label: 'Investment' },
                            { value: 'cd', label: 'Certificate of Deposit (CD)' },
                        ] as { value: string; label: string }[]}
                    />

                    {type === 'investment' && (
                        <Input
                            label="Stock Ticker"
                            name="stockSymbol"
                            placeholder="e.g., VOO, AAPL"
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
