import { memo } from 'react';
import { Edit2, Trash2, X, Save, Link2 } from 'lucide-react';
import Button from '../ui/Button';
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
    /**
     * Edit-form values. Only meaningful while `isEditing` is true. The
     * parent should pass empty defaults for non-editing rows so React.memo
     * sees stable props and skips re-renders for them when the user types
     * in another row.
     */
    editName: string;
    editPercentage: number;
    editPocketId: string;
    onEditNameChange: (value: string) => void;
    onEditPercentageChange: (value: number) => void;
    onEditPocketChange: (pocketId: string) => void;
    /**
     * Receive the entry/id so the parent can keep a single stable callback
     * via useCallback rather than creating a new arrow per row.
     */
    onStartEdit: (entry: DistributionEntry) => void;
    onSave: (id: string) => void;
    onCancel: () => void;
    onDelete: (id: string) => void;
    /** Pockets available for linking. Empty list disables the pocket selector. */
    pockets: Pocket[];
    accounts: Account[];
}

/**
 * Renders one row of the budget distribution table. Memoized so editing
 * the name/percentage of one row does not re-render every other row.
 */
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
            className={`grid ${showConversion ? 'grid-cols-[2fr_1fr_1.5fr_1.5fr_1fr]' : 'grid-cols-12'} gap-4 items-center p-3 bg-gray-700/50 rounded-lg hover:bg-gray-700 transition-colors`}
        >
            {isEditing ? (
                <>
                    <div className={`space-y-2 ${showConversion ? '' : 'col-span-4'}`}>
                        <select
                            value={editPocketId}
                            onChange={(e) => onEditPocketChange(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-600 rounded-lg text-sm bg-gray-900 text-gray-100"
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
                            className="w-full px-3 py-2 border border-gray-600 rounded-lg text-sm bg-gray-900 text-gray-100"
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
                            className="w-full px-3 py-2 border border-gray-600 rounded-lg text-sm bg-gray-900 text-gray-100"
                        />
                    </div>
                    <div className={showConversion ? '' : 'col-span-3'}>
                        <div className="text-sm font-medium text-gray-100">
                            {amount.toLocaleString(undefined, {
                                style: 'currency',
                                currency,
                            })}
                        </div>
                    </div>
                    {showConversion && (
                        <div className="text-sm font-medium text-blue-400">
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
                            onClick={() => onSave(entry.id)}
                            className="p-1.5 text-[#34d399] hover:bg-[#34d399]/10"
                            title="Save"
                        >
                            <Save className="w-4 h-4" aria-hidden="true" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onCancel}
                            className="p-1.5 text-gray-400 hover:bg-gray-700"
                            title="Cancel"
                        >
                            <X className="w-4 h-4" aria-hidden="true" />
                        </Button>
                    </div>
                </>
            ) : (
                <>
                    <div className={`${showConversion ? '' : 'col-span-4'}`}>
                        <div className="font-medium text-gray-100">
                            {entry.name || <span className="text-gray-500 italic">Unnamed</span>}
                        </div>
                        {linkedPocket ? (
                            <div className="mt-0.5 text-xs text-blue-400 flex items-center gap-1">
                                <Link2 className="w-3 h-3" aria-hidden="true" />
                                <span className="truncate">
                                    {linkedPocket.name}
                                    {linkedAccount ? ` · ${linkedAccount.name}` : ''}
                                </span>
                            </div>
                        ) : entry.pocketId ? (
                            <div className="mt-0.5 text-xs text-[#ffb873] flex items-center gap-1">
                                <Link2 className="w-3 h-3" aria-hidden="true" />
                                <span>Linked pocket no longer exists</span>
                            </div>
                        ) : null}
                    </div>
                    <div className={`text-gray-400 ${showConversion ? '' : 'col-span-3'}`}>{entry.percentage}%</div>
                    <div className={`font-semibold text-gray-100 ${showConversion ? '' : 'col-span-3'}`}>
                        {amount.toLocaleString(undefined, {
                            style: 'currency',
                            currency,
                        })}
                    </div>
                    {showConversion && (
                        <div className="font-semibold text-blue-400">
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
                            onClick={() => onStartEdit(entry)}
                            className="p-1.5 text-blue-400 hover:bg-blue-500/10"
                            title="Edit"
                        >
                            <Edit2 className="w-4 h-4" aria-hidden="true" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onDelete(entry.id)}
                            className="p-1.5 text-red-400 hover:bg-[#ffb4ab]/10"
                            title="Delete"
                        >
                            <Trash2 className="w-4 h-4" aria-hidden="true" />
                        </Button>
                    </div>
                </>
            )}
        </div>
    );
};

export default memo(BudgetEntryRow);
