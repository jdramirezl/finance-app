import { memo, useCallback, useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { ChevronDown, ChevronUp, Edit2, Trash2, Bell, Filter } from 'lucide-react';
import Button from '../ui/Button';
import Card from '../ui/Card';
import { useAccountsQuery, usePocketsQuery, useRemindersQuery } from '../../hooks/queries';
import type { Account, Movement, MovementType, Pocket } from '../../types';
import type { Reminder } from '../../services/reminderService';
import type { SortField, SortOrder } from '../../hooks/useMovementsSort';
import { getSmartIcon, getDefaultIcon } from '../../constants/smartIcons';
import { getCategoryColor } from '../../constants/categories';
import InlineEditableAmount from '../ui/InlineEditableAmount';

interface MovementListProps {
    movementsByMonth: [string, Movement[]][];
    sortField: SortField;
    sortOrder: SortOrder;
    setSortField: (field: SortField) => void;
    setSortOrder: (order: SortOrder) => void;
    expandedMonths: Set<string>;
    toggleMonth: (month: string) => void;
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
            return 'bg-success/10 text-success';
        case 'EgresoNormal':
            return 'bg-error/10 text-error';
        case 'IngresoFijo':
            return 'bg-secondary/10 text-secondary';
        case 'EgresoFijo':
            return 'bg-tertiary/10 text-tertiary';
        default:
            return 'bg-on-surface-variant/10 text-on-surface-variant';
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
                group relative flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg transition-all gap-4 sm:gap-0 border-b border-white/[0.06] last:border-b-0
                ${isSelected
                    ? 'bg-primary/10'
                    : 'hover:bg-surface-container-high'
                }
                ${movement.isPending ? 'opacity-75 border-dashed border-outline-variant' : ''}
            `}
        >
            <div className="flex items-start gap-4">
                <div className="pt-1">
                    <label className="flex items-center justify-center min-w-[44px] min-h-[44px] cursor-pointer">
                        <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => onToggleSelection(movement.id)}
                            className="w-5 h-5 text-primary rounded border-outline-variant focus:ring-primary"
                            aria-label={`Select movement: ${movement.notes || 'Untitled Movement'}`}
                        />
                    </label>
                </div>

                <div className={`p-2.5 rounded-xl ${isIncome ? 'bg-success/10' : 'bg-error/10'}`}>
                    <IconComponent className={`w-5 h-5 ${smartIcon ? iconData.color : (isIncome ? 'text-success' : 'text-error')}`} aria-hidden="true" />
                </div>

                <div>
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-on-surface">
                            {movement.notes || 'Untitled Movement'}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${getMovementTypeColor(movement.type)}`}>
                            {getMovementTypeLabel(movement.type)}
                        </span>
                        {linkedReminder && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-secondary/10 text-secondary flex items-center gap-1" title="Paid Reminder">
                                <Bell className="w-3 h-3" aria-hidden="true" />
                                {linkedReminder.title}
                            </span>
                        )}
                        {movement.isPending && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-tertiary/10 text-tertiary">
                                Pending
                            </span>
                        )}
                        {movement.category && (
                            <span
                                className="text-xs px-2 py-0.5 rounded-full"
                                style={{ backgroundColor: `${getCategoryColor(movement.category)}1a`, color: getCategoryColor(movement.category) }}
                            >
                                {movement.category}
                            </span>
                        )}
                        {movement.tags && movement.tags.length > 0 && (
                            <>
                                {movement.tags.slice(0, 3).map((tag) => (
                                    <span key={tag} className="text-xs px-2 py-0.5 rounded-full border border-outline-variant text-on-surface-variant">
                                        {tag}
                                    </span>
                                ))}
                                {movement.tags.length > 3 && (
                                    <span className="text-xs text-on-surface-variant">
                                        +{movement.tags.length - 3} more
                                    </span>
                                )}
                            </>
                        )}
                    </div>
                    <div className="text-sm text-on-surface-variant mt-1 flex flex-wrap items-center gap-2">
                        <span className="font-mono">{format(parseISO(movement.displayedDate), 'MMM d, yyyy')}</span>
                        <span className="hidden sm:inline">•</span>
                        <span>{account?.name || 'Unknown Account'}</span>
                        <span className="hidden sm:inline">•</span>
                        <span>{pocket?.name || 'Unknown Pocket'}</span>
                    </div>
                </div>
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto pl-12 sm:pl-0">
                <InlineEditableAmount
                    amount={movement.amount}
                    isIncome={isIncome}
                    onSave={(newAmount) => onUpdateAmount(movement.id, newAmount)}
                />

                <div className="flex gap-2 opacity-60 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                    {movement.isPending && (
                        <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => onApplyPending(movement.id)}
                            loading={isApplying}
                            className="text-success hover:text-success"
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
                        className="text-on-surface-variant hover:text-primary p-2.5"
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
                        className="text-on-surface-variant hover:text-error p-2.5"
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

const MovementList = ({
    movementsByMonth,
    sortField,
    sortOrder,
    setSortField,
    setSortOrder,
    expandedMonths,
    toggleMonth,
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

    // Per-month income/expense totals — only recompute when the grouping
    // itself changes, not when an unrelated piece of state (e.g. selection)
    // changes.
    const monthTotals = useMemo(() => {
        const map = new Map<string, { income: number; expense: number }>();
        movementsByMonth.forEach(([monthKey, monthMovements]) => {
            let income = 0;
            let expense = 0;
            for (const m of monthMovements) {
                if (m.type.includes('Ingreso')) income += m.amount;
                else if (m.type.includes('Egreso')) expense += m.amount;
            }
            map.set(monthKey, { income, expense });
        });
        return map;
    }, [movementsByMonth]);

    // Selection stats for the floating bar — keyed off the selection set
    // and the movements list.
    const selectionStats = useMemo(() => {
        if (selectedMovementIds.size === 0) {
            return { sum: 0, average: 0 };
        }
        const selectedMovements = movementsByMonth
            .flatMap(([, ms]) => ms)
            .filter((m) => selectedMovementIds.has(m.id));
        const sum = selectedMovements.reduce((acc, m) => {
            const isIncome = m.type.includes('Ingreso');
            return acc + (isIncome ? m.amount : -m.amount);
        }, 0);
        const average = selectedMovements.length > 0 ? sum / selectedMovements.length : 0;
        return { sum, average };
    }, [movementsByMonth, selectedMovementIds]);

    if (movementsByMonth.length === 0) {
        return (
            <Card padding="lg">
                <div className="text-center py-12">
                    <div className="bg-surface-container-high w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Filter className="w-8 h-8 text-on-surface-variant" aria-hidden="true" />
                    </div>
                    <h3 className="text-lg font-medium text-on-surface">No movements found</h3>
                    <p className="text-on-surface-variant mt-2">
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
                    className={sortField === 'displayedDate' ? 'bg-primary/10 text-primary' : ''}
                >
                    Date {getSortIcon('displayedDate')}
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort('amount')}
                    className={sortField === 'amount' ? 'bg-primary/10 text-primary' : ''}
                >
                    Amount {getSortIcon('amount')}
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort('type')}
                    className={sortField === 'type' ? 'bg-primary/10 text-primary' : ''}
                >
                    Type {getSortIcon('type')}
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort('createdAt')}
                    className={sortField === 'createdAt' ? 'bg-primary/10 text-primary' : ''}
                >
                    Created {getSortIcon('createdAt')}
                </Button>
            </div>

            {movementsByMonth.map(([monthKey, monthMovements]) => {
                const isExpanded = expandedMonths.has(monthKey);
                const monthDate = parseISO(monthKey + '-01');
                const totals = monthTotals.get(monthKey) ?? { income: 0, expense: 0 };

                return (
                    <div key={monthKey} className="space-y-2">
                        <button
                            onClick={() => toggleMonth(monthKey)}
                            className="sticky top-0 z-10 w-full flex items-center justify-between p-4 bg-surface-container/80 backdrop-blur-lg rounded-xl border border-white/[0.08] transition-all hover:bg-surface-container-high/80"
                            aria-expanded={isExpanded}
                            aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${format(monthDate, 'MMMM yyyy')}`}
                        >
                            <div className="flex items-center gap-4">
                                {isExpanded
                                    ? <ChevronUp className="w-5 h-5 text-on-surface-variant" aria-hidden="true" />
                                    : <ChevronDown className="w-5 h-5 text-on-surface-variant" aria-hidden="true" />}
                                <h3 className="text-sm font-semibold text-on-surface-variant uppercase tracking-wider">
                                    {format(monthDate, 'MMMM yyyy')}
                                </h3>
                                <span className="text-xs text-on-surface-variant bg-surface-container-high px-2 py-0.5 rounded-full font-mono">
                                    {monthMovements.length}
                                </span>
                            </div>
                            <div className="flex items-center gap-4 text-sm font-mono">
                                <span className="text-success font-medium">
                                    +${totals.income.toLocaleString()}
                                </span>
                                <span className="text-error font-medium">
                                    -${totals.expense.toLocaleString()}
                                </span>
                            </div>
                        </button>

                        {isExpanded && (
                            <div className="space-y-0 ml-4">
                                {monthMovements.map((movement) => (
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
                                ))}
                            </div>
                        )}
                    </div>
                );
            })}
            {/* Floating Stats Bar */}
            {selectedMovementIds.size > 0 && (
                <div className="fixed bottom-24 md:bottom-6 left-1/2 transform -translate-x-1/2 bg-surface-container/90 text-on-surface backdrop-blur-xl px-6 py-3 rounded-full z-50 flex items-center gap-6 animate-in slide-in-from-bottom-4 fade-in duration-200 border border-white/[0.08]">
                    <div className="flex flex-col">
                        <span className="text-xs text-on-surface-variant font-medium uppercase tracking-wider">Selected</span>
                        <span className="font-bold text-lg leading-none font-mono">{selectedMovementIds.size}</span>
                    </div>
                    <div className="w-px h-8 bg-outline-variant"></div>
                    <div className="flex flex-col">
                        <span className="text-xs text-on-surface-variant font-medium uppercase tracking-wider">Sum</span>
                        <span className="font-bold text-lg leading-none font-mono">
                            {(selectionStats.sum >= 0 ? '+' : '-') + Math.abs(selectionStats.sum).toLocaleString(undefined, {
                                style: 'currency',
                                currency: 'USD',
                            })}
                        </span>
                    </div>
                    <div className="w-px h-8 bg-outline-variant"></div>
                    <div className="flex flex-col">
                        <span className="text-xs text-on-surface-variant font-medium uppercase tracking-wider">Average</span>
                        <span className="font-bold text-lg leading-none font-mono">
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
