import { Edit2, Trash2, X, Save } from 'lucide-react';
import Button from '../Button';

export interface DistributionEntry {
    id: string;
    name: string;
    percentage: number;
}

interface BudgetEntryRowProps {
    entry: DistributionEntry;
    amount: number;
    convertedAmount?: number;
    currency: string;
    primaryCurrency: string;
    showConversion: boolean;
    isEditing: boolean;
    editName: string;
    editPercentage: number;
    onEditNameChange: (value: string) => void;
    onEditPercentageChange: (value: number) => void;
    onStartEdit: () => void;
    onSave: () => void;
    onCancel: () => void;
    onDelete: () => void;
}

const BudgetEntryRow = ({
    entry,
    amount,
    convertedAmount,
    currency,
    primaryCurrency,
    showConversion,
    isEditing,
    editName,
    editPercentage,
    onEditNameChange,
    onEditPercentageChange,
    onStartEdit,
    onSave,
    onCancel,
    onDelete,
}: BudgetEntryRowProps) => {
    return (
        <div
            className={`grid ${showConversion ? 'grid-cols-[2fr_1fr_1.5fr_1.5fr_1fr]' : 'grid-cols-12'} gap-4 items-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors`}
        >
            {isEditing ? (
                <>
                    <div className={showConversion ? '' : 'col-span-4'}>
                        <input
                            type="text"
                            value={editName}
                            onChange={(e) => onEditNameChange(e.target.value)}
                            placeholder="Entry name"
                            className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                            autoFocus
                        />
                    </div>
                    <div className={showConversion ? '' : 'col-span-3'}>
                        <input
                            type="number"
                            step="0.1"
                            min="0"
                            max="100"
                            value={editPercentage || ''}
                            onChange={(e) => onEditPercentageChange(parseFloat(e.target.value) || 0)}
                            placeholder="%"
                            className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        />
                    </div>
                    <div className={showConversion ? '' : 'col-span-3'}>
                        <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {amount.toLocaleString(undefined, {
                                style: 'currency',
                                currency,
                            })}
                        </div>
                    </div>
                    {showConversion && (
                        <div className="text-sm font-medium text-blue-700 dark:text-blue-300">
                            {convertedAmount !== undefined
                                ? convertedAmount.toLocaleString(undefined, {
                                    style: 'currency',
                                    currency: primaryCurrency,
                                })
                                : '...'}
                        </div>
                    )}
                    <div className={`flex justify-end gap-2 ${showConversion ? '' : 'col-span-2'}`}>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onSave}
                            className="p-1.5 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30"
                            title="Save"
                        >
                            <Save className="w-4 h-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onCancel}
                            className="p-1.5 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600"
                            title="Cancel"
                        >
                            <X className="w-4 h-4" />
                        </Button>
                    </div>
                </>
            ) : (
                <>
                    <div className={`font-medium text-gray-900 dark:text-gray-100 ${showConversion ? '' : 'col-span-4'}`}>
                        {entry.name || <span className="text-gray-400 dark:text-gray-500 italic">Unnamed</span>}
                    </div>
                    <div className={`text-gray-700 dark:text-gray-300 ${showConversion ? '' : 'col-span-3'}`}>{entry.percentage}%</div>
                    <div className={`font-semibold text-gray-900 dark:text-gray-100 ${showConversion ? '' : 'col-span-3'}`}>
                        {amount.toLocaleString(undefined, {
                            style: 'currency',
                            currency,
                        })}
                    </div>
                    {showConversion && (
                        <div className="font-semibold text-blue-700 dark:text-blue-300">
                            {convertedAmount !== undefined
                                ? convertedAmount.toLocaleString(undefined, {
                                    style: 'currency',
                                    currency: primaryCurrency,
                                })
                                : '...'}
                        </div>
                    )}
                    <div className={`flex justify-end gap-2 ${showConversion ? '' : 'col-span-2'}`}>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onStartEdit}
                            className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30"
                            title="Edit"
                        >
                            <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onDelete}
                            className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30"
                            title="Delete"
                        >
                            <Trash2 className="w-4 h-4" />
                        </Button>
                    </div>
                </>
            )}
        </div>
    );
};

export default BudgetEntryRow;
