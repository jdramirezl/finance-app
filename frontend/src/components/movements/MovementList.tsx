import { memo, useCallback, useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { ChevronDown, ChevronUp, Edit2, Trash2, Bell, Filter, ArrowRightLeft } from 'lucide-react';
import Button from '../ui/Button';
import Card from '../ui/Card';
import { useAccountsQuery, usePocketsQuery, useRemindersQuery } from '../../hooks/queries';
import type { Account, Movement, MovementType, Pocket } from '../../types';
import type { Reminder } from '../../services/reminderService';
import type { SortField, SortOrder } from '../../hooks/useMovementsSort';
import { getSmartIcon, getDefaultIcon } from '../../constants/smartIcons';
import { getCategoryColor } from '../../constants/categories';
import InlineEditableAmount from '../ui/InlineEditableAmount';
import SelectableValue from '../ui/SelectableValue';

interface MovementListProps {
    movements: Movement[];
    sortField: SortField;
    sortOrder: SortOrder;
    setSortField: (field: SortField) => void;
    setSortOrder: (order: SortOrder) => void;
    selectedMovementIds: Set<string>;
    toggleSelection: (id: string) => void;
    onEdit: (movement: Movement) => void;
    onDelete: (id: string) => void;
    onApplyPending: (id: string) => void;
    onUpdateAmount: (id: string, amount: number) => Promise<void>;
    deletingId: string | null;
    applyingId: string | null;
}

const getMovementTypeColor = (type: MovementType): string => {
    switch (type) {
        case 'IngresoNormal':
            return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-green-300 dark:border-green-700';
        case 'EgresoNormal':
            return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-red-300 dark:border-red-700';
        case 'IngresoFijo':
            return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border-blue-300 dark:border-blue-700';
        case 'EgresoFijo':
            return 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 border-orange-300 dark:border-orange-700';
        default:
            return 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300 border-gray-300 dark:border-gray-700';
    }
};

const getMovementTypeLabel = (type: MovementType): string => {
    switch (type) {
        case 'IngresoNormal': return 'Income';
        case 'EgresoNormal': return 'Expense';
        case 'IngresoFijo': return 'Fixed Income';
        case 'EgresoFijo': return 'Fixed Expense';
        default: return type;
    }
};

interface MovementRowProps {
    movement: Movement;
    account: Account | undefined;
    pocket: Pocket | undefined;
    linkedReminder: Reminder | undefined;
    isSelected: boolean;
    isDeleting: boolean;
    isApplying: boolean;
    onToggleSelection: (id: string) => void;
    onEdit: (movement: Movement) => void;
    onDelete: (id: string) => void;
    onApplyPending: (id: string) => void;
    onUpdateAmount: (id: string, amount: number) => Promise<void>;
}

/**
 * Renders a single movement row. Memoized so that updating one row (e.g.
 * marking it deleted) does not re-render every other row in the list.
 *
 * Account, pocket and linkedReminder are looked up once in the parent and
 * passed in directly, so per-row work stays O(1) even on large lists.
 */
const MovementRow = memo(({
    movement,
    account,
    pocket,
    linkedReminder,
    isSelected,
    isDeleting,
    isApplying,
    onToggleSelection,
    onEdit,
    onDelete,
    onApplyPending,
    onUpdateAmount,
}: MovementRowProps) => {
    const isIncome = movement.type.includes('Ingreso');
    const smartIcon = getSmartIcon(movement.notes);
    const iconData = smartIcon || getDefaultIcon(isIncome);
    const IconComponent = iconData.icon;

    return (
        <div
            className={`
                group relative flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg border transition-all gap-4 sm:gap-0
                ${isSelected
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }
                ${movement.isPending ? 'opacity-75 border-dashed' : ''}
            `}
        >
            <div className="flex items-start gap-4">
                <div className="pt-1">
                    <label className="flex items-center justify-center min-w-[44px] min-h-[44px] cursor-pointer">
                        <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => onToggleSelection(movement.id)}
                            className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                            aria-label={`Select movement: ${movement.notes || 'Untitled Movement'}`}
                        />
                    </label>
                </div>

                <div className={`p-2.5 rounded-xl bg-gradient-to-br ${isIncome ? 'from-green-50 to-emerald-100 dark:from-green-900/20 dark:to-emerald-900/30' : 'from-red-50 to-rose-100 dark:from-red-900/20 dark:to-rose-900/30'} shadow-sm`}>
                    <IconComponent className={`w-5 h-5 ${smartIcon ? iconData.color : (isIncome ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400')}`} aria-hidden="true" />
                </div>

                <div>
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-gray-900 dark:text-gray-100">
                            {movement.notes || 'Untitled Movement'}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${getMovementTypeColor(movement.type)}`}>
                            {getMovementTypeLabel(movement.type)}
                        </span>
                        {linkedReminder && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 flex items-center gap-1" title="Paid Reminder">
                                <Bell className="w-3 h-3" aria-hidden="true" />
                                {linkedReminder.title}
                            </span>
                        )}
                        {movement.isPending && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800 border border-yellow-200">
                                Pending
                            </span>
                        )}
                        {movement.transferPairId && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                                Transfer
                            </span>
                        )}
                        {movement.category && (
                            <span
                                className="text-xs px-2 py-0.5 rounded-full text-white flex items-center gap-1"
                                style={{ backgroundColor: getCategoryColor(movement.category) }}
                            >
                                {movement.category}
                            </span>
                        )}
                        {movement.tags && movement.tags.length > 0 && (
                            <>
                                {movement.tags.slice(0, 3).map((tag) => (
                                    <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600">
                                        {tag}
                                    </span>
                                ))}
                                {movement.tags.length > 3 && (
                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                        +{movement.tags.length - 3} more
                                    </span>
                                )}
                            </>
                        )}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 mt-1 flex flex-wrap items-center gap-2">
                        <span>{format(parseISO(movement.displayedDate), 'MMM d, yyyy')}</span>
                        <span className="hidden sm:inline">•</span>
                        <span>{account?.name || 'Unknown Account'}</span>
                        <span className="hidden sm:inline">•</span>
                        <span>{pocket?.name || 'Unknown Pocket'}</span>
                    </div>
                </div>
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto pl-12 sm:pl-0">
                <SelectableValue
                    id={`movement-${movement.id}`}
                    value={movement.amount}
                >
                    <InlineEditableAmount
                        amount={movement.amount}
                        isIncome={isIncome}
                        onSave={(newAmount) => onUpdateAmount(movement.id, newAmount)}
                        triggerMode="icon"
                    />
                </SelectableValue>

                <div className="flex gap-2 opacity-60 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                    {movement.isPending && (
                        <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => onApplyPending(movement.id)}
                            loading={isApplying}
                            className="text-green-600 hover:text-green-700"
                            title="Apply Pending Movement"
                            aria-label={`Apply pending movement: ${movement.notes || 'Untitled Movement'}`}
                        >
                            Apply
                        </Button>
                    )}
                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onEdit(movement)}
                        className="text-gray-500 hover:text-blue-600 p-2.5"
                        title="Edit"
                        aria-label={`Edit movement: ${movement.notes || 'Untitled Movement'}`}
                    >
                        <Edit2 className="w-5 h-5" aria-hidden="true" />
                    </Button>
                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onDelete(movement.id)}
                        loading={isDeleting}
                        className="text-gray-500 hover:text-red-600 p-2.5"
                        title="Delete"
                        aria-label={`Delete movement: ${movement.notes || 'Untitled Movement'}`}
                    >
                        <Trash2 className="w-5 h-5" aria-hidden="true" />
                    </Button>
                </div>
            </div>
        </div>
    );
});

MovementRow.displayName = 'MovementRow';

interface TransferCardProps {
    expense: Movement;
    sourcePocket: Pocket | undefined;
    targetPocket: Pocket | undefined;
    sourceAccount: Account | undefined;
    targetAccount: Account | undefined;
    isSelected: boolean;
    onToggleSelection: (id: string) => void;
    onEdit: (movement: Movement) => void;
    onDelete: (id: string) => void;
    isDeleting: boolean;
}

const TransferCard = memo(({
    expense,
    sourcePocket,
    targetPocket,
    sourceAccount,
    targetAccount,
    isSelected,
    onToggleSelection,
    onEdit,
    onDelete,
    isDeleting,
}: TransferCardProps) => {
    const sourceName = sourcePocket?.name || 'Unknown';
    const targetName = targetPocket?.name || 'Unknown';
    const sourceLabel = sourceAccount && sourceAccount.id !== targetAccount?.id
        ? `${sourceName} (${sourceAccount.name})`
        : sourceName;
    const targetLabel = targetAccount && targetAccount.id !== sourceAccount?.id
        ? `${targetName} (${targetAccount.name})`
        : targetName;

    return (
        <div
            className={`
                group relative flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg border-l-4 border-l-indigo-500 border border-gray-200 dark:border-gray-700 bg-indigo-900/5 dark:bg-indigo-900/10 transition-all gap-4 sm:gap-0
                ${isSelected ? 'ring-2 ring-blue-500' : ''}
            `}
        >
            <div className="flex items-start gap-4">
                <div className="pt-1">
                    <label className="flex items-center justify-center min-w-[44px] min-h-[44px] cursor-pointer">
                        <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => onToggleSelection(expense.id)}
                            className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                            aria-label={`Select transfer: ${sourceLabel} → ${targetLabel}`}
                        />
                    </label>
                </div>

                <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-900/20 dark:to-indigo-900/30 shadow-sm">
                    <ArrowRightLeft className="w-5 h-5 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
                </div>

                <div>
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-gray-900 dark:text-gray-100">
                            {sourceLabel} → {targetLabel}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                            Transfer
                        </span>
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 mt-1 flex flex-wrap items-center gap-2">
                        <span>{format(parseISO(expense.displayedDate), 'MMM d, yyyy')}</span>
                        {expense.notes && (
                            <>
                                <span className="hidden sm:inline">•</span>
                                <span>{expense.notes}</span>
                            </>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto pl-12 sm:pl-0">
                <span className="font-semibold text-indigo-700 dark:text-indigo-300">
                    {expense.amount.toLocaleString(undefined, { style: 'currency', currency: sourceAccount?.currency || 'USD' })}
                </span>

                <div className="flex gap-2 opacity-60 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onEdit(expense)}
                        className="text-gray-500 hover:text-blue-600 p-2.5"
                        title="Edit Transfer"
                        aria-label={`Edit transfer: ${sourceLabel} → ${targetLabel}`}
                    >
                        <Edit2 className="w-5 h-5" aria-hidden="true" />
                    </Button>
                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onDelete(expense.id)}
                        loading={isDeleting}
                        className="text-gray-500 hover:text-red-600 p-2.5"
                        title="Delete Transfer"
                        aria-label={`Delete transfer: ${sourceLabel} → ${targetLabel}`}
                    >
                        <Trash2 className="w-5 h-5" aria-hidden="true" />
                    </Button>
                </div>
            </div>
        </div>
    );
});

TransferCard.displayName = 'TransferCard';

const MovementList = ({
    movements,
    sortField,
    sortOrder,
    setSortField,
    setSortOrder,
    selectedMovementIds,
    toggleSelection,
    onEdit,
    onDelete,
    onApplyPending,
    onUpdateAmount,
    deletingId,
    applyingId,
}: MovementListProps) => {
    const { data: accounts = [] } = useAccountsQuery();
    const { data: pockets = [] } = usePocketsQuery();
    const { data: reminders = [] } = useRemindersQuery();

    // Build O(1) lookup maps so each row's account/pocket/reminder lookup
    // doesn't require a linear scan on every render.
    const accountById = useMemo(() => {
        const map = new Map<string, Account>();
        accounts.forEach((a) => map.set(a.id, a));
        return map;
    }, [accounts]);

    const pocketById = useMemo(() => {
        const map = new Map<string, Pocket>();
        pockets.forEach((p) => map.set(p.id, p));
        return map;
    }, [pockets]);

    const reminderByMovementId = useMemo(() => {
        const map = new Map<string, Reminder>();
        reminders.forEach((r) => {
            if (r.linkedMovementId) map.set(r.linkedMovementId, r);
        });
        return map;
    }, [reminders]);

    const handleSort = useCallback((field: SortField) => {
        if (sortField === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortOrder('asc');
        }
    }, [sortField, sortOrder, setSortField, setSortOrder]);

    const getSortIcon = (field: SortField) => {
        if (sortField !== field) return null;
        return sortOrder === 'asc'
            ? <ChevronUp className="w-4 h-4" aria-hidden="true" />
            : <ChevronDown className="w-4 h-4" aria-hidden="true" />;
    };

    // Selection stats for the floating bar
    const selectionStats = useMemo(() => {
        if (selectedMovementIds.size === 0) {
            return { sum: 0, average: 0 };
        }
        const selectedMovements = movements.filter((m) => selectedMovementIds.has(m.id));
        const sum = selectedMovements.reduce((acc, m) => {
            const isIncome = m.type.includes('Ingreso');
            return acc + (isIncome ? m.amount : -m.amount);
        }, 0);
        const average = selectedMovements.length > 0 ? sum / selectedMovements.length : 0;
        return { sum, average };
    }, [movements, selectedMovementIds]);

    if (movements.length === 0) {
        return (
            <Card padding="lg">
                <div className="text-center py-12">
                    <div className="bg-gray-100 dark:bg-gray-800 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Filter className="w-8 h-8 text-gray-400" aria-hidden="true" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">No movements found</h3>
                    <p className="text-gray-500 dark:text-gray-400 mt-2">
                        Try adjusting your filters or create a new movement.
                    </p>
                </div>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            {/* Sort Controls */}
            <div className="flex gap-2 overflow-x-auto pb-2">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort('displayedDate')}
                    className={sortField === 'displayedDate' ? 'bg-gray-100 dark:bg-gray-800' : ''}
                >
                    Date {getSortIcon('displayedDate')}
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort('amount')}
                    className={sortField === 'amount' ? 'bg-gray-100 dark:bg-gray-800' : ''}
                >
                    Amount {getSortIcon('amount')}
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort('type')}
                    className={sortField === 'type' ? 'bg-gray-100 dark:bg-gray-800' : ''}
                >
                    Type {getSortIcon('type')}
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort('createdAt')}
                    className={sortField === 'createdAt' ? 'bg-gray-100 dark:bg-gray-800' : ''}
                >
                    Created {getSortIcon('createdAt')}
                </Button>
            </div>

            <div className="space-y-2">
                {(() => {
                    const renderedPairIds = new Set<string>();
                    return movements.map((movement) => {
                        // Transfer pair grouping
                        if (movement.transferPairId) {
                            if (renderedPairIds.has(movement.transferPairId)) return null;
                            renderedPairIds.add(movement.transferPairId);
                            const pair = movements.find(
                                (m) => m.transferPairId === movement.transferPairId && m.id !== movement.id
                            );
                            if (pair) {
                                const expense = movement.type.includes('Egreso') ? movement : pair;
                                const income = movement.type.includes('Egreso') ? pair : movement;
                                return (
                                    <TransferCard
                                        key={expense.id}
                                        expense={expense}
                                        sourcePocket={pocketById.get(expense.pocketId)}
                                        targetPocket={pocketById.get(income.pocketId)}
                                        sourceAccount={accountById.get(expense.accountId)}
                                        targetAccount={accountById.get(income.accountId)}
                                        isSelected={selectedMovementIds.has(expense.id) || selectedMovementIds.has(income.id)}
                                        onToggleSelection={toggleSelection}
                                        onEdit={onEdit}
                                        onDelete={onDelete}
                                        isDeleting={deletingId === expense.id || deletingId === income.id}
                                    />
                                );
                            }
                            // Pair not on this page — render normally with badge (handled by MovementRow via transferPairId presence)
                        }
                        return (
                            <MovementRow
                                key={movement.id}
                                movement={movement}
                                account={accountById.get(movement.accountId)}
                                pocket={pocketById.get(movement.pocketId)}
                                linkedReminder={reminderByMovementId.get(movement.id)}
                                isSelected={selectedMovementIds.has(movement.id)}
                                isDeleting={deletingId === movement.id}
                                isApplying={applyingId === movement.id}
                                onToggleSelection={toggleSelection}
                                onEdit={onEdit}
                                onDelete={onDelete}
                                onApplyPending={onApplyPending}
                                onUpdateAmount={onUpdateAmount}
                            />
                        );
                    });
                })()}
            </div>
            {/* Floating Stats Bar */}
            {selectedMovementIds.size > 0 && (
                <div className="fixed bottom-24 md:bottom-6 left-1/2 transform -translate-x-1/2 bg-gray-900/90 dark:bg-gray-800/90 text-white backdrop-blur-md px-6 py-3 rounded-full shadow-xl z-50 flex items-center gap-6 animate-in slide-in-from-bottom-4 fade-in duration-200 border border-gray-700/50">
                    <div className="flex flex-col">
                        <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">Selected</span>
                        <span className="font-bold text-lg leading-none">{selectedMovementIds.size}</span>
                    </div>
                    <div className="w-px h-8 bg-gray-700"></div>
                    <div className="flex flex-col">
                        <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">Sum</span>
                        <span className="font-bold text-lg leading-none">
                            {(selectionStats.sum >= 0 ? '+' : '-') + Math.abs(selectionStats.sum).toLocaleString(undefined, {
                                style: 'currency',
                                currency: 'USD',
                            })}
                        </span>
                    </div>
                    <div className="w-px h-8 bg-gray-700"></div>
                    <div className="flex flex-col">
                        <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">Average</span>
                        <span className="font-bold text-lg leading-none">
                            {(selectionStats.average >= 0 ? '+' : '-') + Math.abs(selectionStats.average).toLocaleString(undefined, {
                                style: 'currency',
                                currency: 'USD',
                            })}
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default memo(MovementList);
