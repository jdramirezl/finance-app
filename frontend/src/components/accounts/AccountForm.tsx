import type { Account, Currency } from '../../types';
import Button from '../Button';
import Input from '../Input';
import Select from '../Select';

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

            <Input
                label="Color"
                name="color"
                type="color"
                defaultValue={initialData?.color || '#3B82F6'}
                required
            />

            <Select
                label="Currency"
                name="currency"
                defaultValue={initialData?.currency || 'USD'}
                required
                options={currencies.map(c => ({ value: c, label: c }))}
            />

            {!isEditing && (
                <>
                    <Select
                        label="Account Type"
                        name="type"
                        defaultValue="normal"
                        required
                        options={[
                            { value: 'normal', label: 'Normal' },
                            { value: 'investment', label: 'Investment' },
                        ] as { value: string; label: string }[]}
                    />

                    <Input
                        label="Stock Symbol (for investment accounts)"
                        name="stockSymbol"
                        placeholder="e.g., VOO, AAPL"
                    />
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
