import { Edit2, Trash2, X, Save, Link2 } from 'lucide-react';
import Button from '../Button';
import type { Account, Pocket } from '../../types';

export interface DistributionEntry {
    id: string;
    name: string;
    percentage: number;
    /** Pocket this entry distributes into. Set when the user explicitly links a pocket. */
    pocketId?: string;
    /** Account that owns the linked pocket. Stored alongside pocketId for fast lookups. */
    accountId?: string;
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
    editPocketId: string;
    onEditNameChange: (value: string) => void;
    onEditPercentageChange: (value: number) => void;
    onEditPocketChange: (pocketId: string) => void;
    onStartEdit: () => void;
    onSave: () => void;
    onCancel: () => void;
    onDelete: () => void;
    /** Pockets available for linking. Empty list disables the pocket selector. */
    pockets: Pocket[];
    accounts: Account[];
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
    editPocketId,
    onEditNameChange,
    onEditPercentageChange,
    onEditPocketChange,
    onStartEdit,
    onSave,
    onCancel,
    onDelete,
    pockets,
    accounts,
}: BudgetEntryRowProps) => {
    // Find linked pocket details for badge / context display
    const linkedPocket = entry.pocketId ? pockets.find((p) => p.id === entry.pocketId) : undefined;
    const linkedAccount = linkedPocket
        ? accounts.find((a) => a.id === linkedPocket.accountId)
        : undefined;

    const accountById = (id: string) => accounts.find((a) => a.id === id);
    const pocketLabel = (pocket: Pocket) => {
        const account = accountById(pocket.accountId);
        const accountSuffix = account ? ` — ${account.name} (${account.currency})` : '';
        const typeSuffix = pocket.type === 'fixed' ? ' [fixed]' : '';
        return `${pocket.name}${typeSuffix}${accountSuffix}`;
    };

    return (
        <div
            className={`grid ${showConversion ? 'grid-cols-[2fr_1fr_1.5fr_1.5fr_1fr]' : 'grid-cols-12'} gap-4 items-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors`}
        >
            {isEditing ? (
                <>
                    <div className={`space-y-2 ${showConversion ? '' : 'col-span-4'}`}>
                        <select
                            value={editPocketId}
                            onChange={(e) => onEditPocketChange(e.target.value)}
                            className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                            aria-label="Link to pocket (optional)"
                        >
                            <option value="">Not linked to a pocket</option>
                            {pockets.map((pocket) => (
                                <option key={pocket.id} value={pocket.id}>
                                    {pocketLabel(pocket)}
                                </option>
                            ))}
                        </select>
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
                    <div className={`${showConversion ? '' : 'col-span-4'}`}>
                        <div className="font-medium text-gray-900 dark:text-gray-100">
                            {entry.name || <span className="text-gray-400 dark:text-gray-500 italic">Unnamed</span>}
                        </div>
                        {linkedPocket ? (
                            <div className="mt-0.5 text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1">
                                <Link2 className="w-3 h-3" />
                                <span className="truncate">
                                    {linkedPocket.name}
                                    {linkedAccount ? ` · ${linkedAccount.name}` : ''}
                                </span>
                            </div>
                        ) : entry.pocketId ? (
                            <div className="mt-0.5 text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                                <Link2 className="w-3 h-3" />
                                <span>Linked pocket no longer exists</span>
                            </div>
                        ) : null}
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
