import { useState } from 'react';
import { Plus } from 'lucide-react';
import Button from '../Button';
import Card from '../Card';
import BudgetEntryRow, { type DistributionEntry } from './BudgetEntryRow';
import { useToast } from '../../hooks/useToast';

interface BudgetDistributionProps {
    entries: DistributionEntry[];
    remaining: number;
    currency: string;
    primaryCurrency: string;
    showConversion: boolean;
    convertedAmounts: Map<string, number>;
    onEntriesChange: (entries: DistributionEntry[]) => void;
}

const BudgetDistribution = ({
    entries,
    remaining,
    currency,
    primaryCurrency,
    showConversion,
    convertedAmounts,
    onEntriesChange,
}: BudgetDistributionProps) => {
    const toast = useToast();
    const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
    const [editingEntryName, setEditingEntryName] = useState<string>('');
    const [editingEntryPercentage, setEditingEntryPercentage] = useState<number>(0);

    const totalPercentage = entries.reduce((sum, entry) => sum + entry.percentage, 0);

    const calculateEntryAmount = (percentage: number): number => {
        if (remaining <= 0) return 0;
        return (remaining * percentage) / 100;
    };

    const generateId = (): string => {
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    };

    const handleAddEntry = () => {
        const newEntry: DistributionEntry = {
            id: generateId(),
            name: '',
            percentage: 0,
        };
        onEntriesChange([...entries, newEntry]);
        setEditingEntryId(newEntry.id);
        setEditingEntryName('');
        setEditingEntryPercentage(0);
    };

    const handleSaveEntry = (id: string) => {
        if (!editingEntryName.trim()) {
            toast.warning('Please enter a name for this entry');
            return;
        }

        if (editingEntryPercentage < 0 || editingEntryPercentage > 100) {
            toast.warning('Percentage must be between 0 and 100');
            return;
        }

        onEntriesChange(
            entries.map((entry) =>
                entry.id === id
                    ? { ...entry, name: editingEntryName, percentage: editingEntryPercentage }
                    : entry
            )
        );
        setEditingEntryId(null);
        setEditingEntryName('');
        setEditingEntryPercentage(0);
    };

    const handleDeleteEntry = (id: string) => {
        onEntriesChange(entries.filter((entry) => entry.id !== id));
        if (editingEntryId === id) {
            setEditingEntryId(null);
            setEditingEntryName('');
            setEditingEntryPercentage(0);
        }
    };

    const handleStartEdit = (entry: DistributionEntry) => {
        setEditingEntryId(entry.id);
        setEditingEntryName(entry.name);
        setEditingEntryPercentage(entry.percentage);
    };

    const handleCancelEdit = () => {
        setEditingEntryId(null);
        setEditingEntryName('');
        setEditingEntryPercentage(0);
    };

    return (
        <Card padding="md">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Distribution</h2>
                <Button
                    variant="primary"
                    onClick={handleAddEntry}
                >
                    <Plus className="w-4 h-4" />
                    Add Entry
                </Button>
            </div>

            {entries.length === 0 ? (
                <div className="p-8 text-center text-gray-500 dark:text-gray-400 border-2 border-dashed dark:border-gray-700 rounded-lg">
                    No distribution entries yet. Click "Add Entry" to start planning your budget.
                </div>
            ) : (
                <div className="space-y-3">
                    {/* Header */}
                    <div className={`grid ${showConversion ? 'grid-cols-[2fr_1fr_1.5fr_1.5fr_1fr]' : 'grid-cols-12'} gap-4 pb-2 border-b dark:border-gray-700 font-semibold text-sm text-gray-600 dark:text-gray-400`}>
                        <div className={showConversion ? '' : 'col-span-4'}>Name</div>
                        <div className={showConversion ? '' : 'col-span-3'}>Percentage</div>
                        <div className={showConversion ? '' : 'col-span-3'}>Amount ({currency})</div>
                        {showConversion && <div>Amount ({primaryCurrency})</div>}
                        <div className={`text-right ${showConversion ? '' : 'col-span-2'}`}>Actions</div>
                    </div>

                    {/* Entries */}
                    {entries.map((entry) => (
                        <BudgetEntryRow
                            key={entry.id}
                            entry={entry}
                            amount={calculateEntryAmount(entry.percentage)}
                            convertedAmount={convertedAmounts.get(entry.id)}
                            currency={currency}
                            primaryCurrency={primaryCurrency}
                            showConversion={showConversion}
                            isEditing={editingEntryId === entry.id}
                            editName={editingEntryName}
                            editPercentage={editingEntryPercentage}
                            onEditNameChange={setEditingEntryName}
                            onEditPercentageChange={setEditingEntryPercentage}
                            onStartEdit={() => handleStartEdit(entry)}
                            onSave={() => handleSaveEntry(entry.id)}
                            onCancel={handleCancelEdit}
                            onDelete={() => handleDeleteEntry(entry.id)}
                        />
                    ))}

                    {/* Total Percentage Warning */}
                    {totalPercentage !== 100 && entries.length > 0 && (
                        <div
                            className={`mt-4 p-3 rounded-lg ${totalPercentage > 100
                                ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400'
                                : 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-400'
                                }`}
                        >
                            <p className="text-sm font-medium">
                                Total percentage: {totalPercentage.toFixed(1)}%
                                {totalPercentage > 100 && ' (exceeds 100%)'}
                                {totalPercentage < 100 && ` (${(100 - totalPercentage).toFixed(1)}% unallocated)`}
                            </p>
                        </div>
                    )}
                </div>
            )}
        </Card>
    );
};

export default BudgetDistribution;
