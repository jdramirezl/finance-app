import { format, parseISO } from 'date-fns';
import { ChevronDown, ChevronUp, Edit2, Trash2, Bell } from 'lucide-react';
import Button from '../Button';
import Card from '../Card';
import { useAccountsQuery, usePocketsQuery, useRemindersQuery } from '../../hooks/queries';
import type { Movement, MovementType } from '../../types';
import type { SortField, SortOrder } from '../../hooks/useMovementsSort';
import { getSmartIcon, getDefaultIcon } from '../../utils/smartIcons';

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
    deletingId: string | null;
    applyingId: string | null;
}

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
    deletingId,
    applyingId,
}: MovementListProps) => {
    const { data: accounts = [] } = useAccountsQuery();
    const { data: pockets = [] } = usePocketsQuery();
    const { data: reminders = [] } = useRemindersQuery();

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortOrder('asc');
        }
    };

    const getSortIcon = (field: SortField) => {
        if (sortField !== field) return null;
        return sortOrder === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />;
    };

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

    if (movementsByMonth.length === 0) {
        return (
            <Card padding="lg">
                <div className="text-center py-12">
                    <div className="bg-gray-100 dark:bg-gray-800 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Filter className="w-8 h-8 text-gray-400" />
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

            {movementsByMonth.map(([monthKey, monthMovements]) => {
                const isExpanded = expandedMonths.has(monthKey);
                const monthDate = parseISO(monthKey + '-01');

                // Calculate totals for this month
                const income = monthMovements
                    .filter(m => m.type.includes('Ingreso'))
                    .reduce((sum, m) => sum + m.amount, 0);
                const expense = monthMovements
                    .filter(m => m.type.includes('Egreso'))
                    .reduce((sum, m) => sum + m.amount, 0);

                return (
                    <div key={monthKey} className="space-y-2">
                        <button
                            onClick={() => toggleMonth(monthKey)}
                            className="sticky top-0 z-10 w-full flex items-center justify-between p-4 bg-white/90 dark:bg-gray-800/90 backdrop-blur-lg rounded-lg shadow-md hover:shadow-lg border border-gray-200 dark:border-gray-700 transition-all"
                        >
                            <div className="flex items-center gap-4">
                                {isExpanded ? <ChevronUp className="w-5 h-5 text-gray-500" /> : <ChevronDown className="w-5 h-5 text-gray-500" />}
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                    {format(monthDate, 'MMMM yyyy')}
                                </h3>
                                <span className="text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">
                                    {monthMovements.length}
                                </span>
                            </div>
                            <div className="flex items-center gap-4 text-sm">
                                <span className="text-green-600 dark:text-green-400 font-medium">
                                    +${income.toLocaleString()}
                                </span>
                                <span className="text-red-600 dark:text-red-400 font-medium">
                                    -${expense.toLocaleString()}
                                </span>
                            </div>
                        </button>

                        {isExpanded && (
                            <div className="space-y-2 pl-4 border-l-2 border-gray-200 dark:border-gray-700 ml-4">
                                {monthMovements.map((movement) => {
                                    const account = accounts.find(a => a.id === movement.accountId);
                                    const pocket = pockets.find(p => p.id === movement.pocketId);
                                    const linkedReminder = reminders.find(r => r.linkedMovementId === movement.id);
                                    const isIncome = movement.type.includes('Ingreso');
                                    const isSelected = selectedMovementIds.has(movement.id);

                                    return (
                                        <div
                                            key={movement.id}
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
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onChange={() => toggleSelection(movement.id)}
                                                        className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                                    />
                                                </div>

                                                {(() => {
                                                    const smartIcon = getSmartIcon(movement.notes);
                                                    const iconData = smartIcon || getDefaultIcon(isIncome);
                                                    const IconComponent = iconData.icon;

                                                    return (
                                                        <div className={`p-2.5 rounded-xl bg-gradient-to-br ${isIncome ? 'from-green-50 to-emerald-100 dark:from-green-900/20 dark:to-emerald-900/30' : 'from-red-50 to-rose-100 dark:from-red-900/20 dark:to-rose-900/30'} shadow-sm`}>
                                                            <IconComponent className={`w-5 h-5 ${smartIcon ? iconData.color : (isIncome ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400')}`} />
                                                        </div>
                                                    );
                                                })()}

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
                                                                <Bell className="w-3 h-3" />
                                                                {linkedReminder.title}
                                                            </span>
                                                        )}
                                                        {movement.isPending && (
                                                            <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800 border border-yellow-200">
                                                                Pending
                                                            </span>
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
                                                <span className={`text-lg font-bold ${isIncome ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                                    {isIncome ? '+' : '-'}${movement.amount.toLocaleString()}
                                                </span>

                                                <div className="flex gap-2 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                                                    {movement.isPending && (
                                                        <Button
                                                            size="sm"
                                                            variant="secondary"
                                                            onClick={() => onApplyPending(movement.id)}
                                                            loading={applyingId === movement.id}
                                                            className="text-green-600 hover:text-green-700"
                                                            title="Apply Pending Movement"
                                                        >
                                                            Apply
                                                        </Button>
                                                    )}
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => onEdit(movement)}
                                                        className="text-gray-500 hover:text-blue-600"
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => onDelete(movement.id)}
                                                        loading={deletingId === movement.id}
                                                        className="text-gray-500 hover:text-red-600"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                );
            })}
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
                            {(() => {
                                const selectedMovements = movementsByMonth
                                    .flatMap(([, movements]) => movements)
                                    .filter(m => selectedMovementIds.has(m.id));

                                const sum = selectedMovements.reduce((acc, m) => {
                                    const isIncome = m.type.includes('Ingreso');
                                    return acc + (isIncome ? m.amount : -m.amount);
                                }, 0);

                                return (sum >= 0 ? '+' : '-') + Math.abs(sum).toLocaleString(undefined, {
                                    style: 'currency',
                                    currency: 'USD', // Ideally this should be dynamic based on account currency
                                });
                            })()}
                        </span>
                    </div>
                    <div className="w-px h-8 bg-gray-700"></div>
                    <div className="flex flex-col">
                        <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">Average</span>
                        <span className="font-bold text-lg leading-none">
                            {(() => {
                                const selectedMovements = movementsByMonth
                                    .flatMap(([, movements]) => movements)
                                    .filter(m => selectedMovementIds.has(m.id));

                                const sum = selectedMovements.reduce((acc, m) => {
                                    const isIncome = m.type.includes('Ingreso');
                                    return acc + (isIncome ? m.amount : -m.amount);
                                }, 0);

                                const avg = sum / selectedMovements.length;

                                return (avg >= 0 ? '+' : '-') + Math.abs(avg).toLocaleString(undefined, {
                                    style: 'currency',
                                    currency: 'USD',
                                });
                            })()}
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
};

// Helper for empty state
import { Filter } from 'lucide-react';

export default MovementList;
