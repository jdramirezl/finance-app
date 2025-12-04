import { format, parseISO } from 'date-fns';
import { ChevronDown, ChevronUp, Edit2, Trash2, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import Button from '../Button';
import Card from '../Card';
import { useAccountsQuery, usePocketsQuery } from '../../hooks/queries';
import type { Movement, MovementType } from '../../types';
import type { SortField, SortOrder } from '../../hooks/useMovementsSort';

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
                            className="w-full flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
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
                                    const isIncome = movement.type.includes('Ingreso');
                                    const isSelected = selectedMovementIds.has(movement.id);

                                    return (
                                        <div
                                            key={movement.id}
                                            className={`
                        group relative flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg border transition-all
                        ${isSelected
                                                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                                                }
                        ${movement.isPending ? 'opacity-75 border-dashed' : ''}
                      `}
                                        >
                                            <div className="flex items-center gap-4">
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() => toggleSelection(movement.id)}
                                                    className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                                />

                                                <div className={`p-2 rounded-full ${isIncome ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                                    {isIncome ? <ArrowUpCircle className="w-6 h-6" /> : <ArrowDownCircle className="w-6 h-6" />}
                                                </div>

                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-medium text-gray-900 dark:text-gray-100">
                                                            {movement.notes || 'Untitled Movement'}
                                                        </span>
                                                        <span className={`text-xs px-2 py-0.5 rounded-full border ${getMovementTypeColor(movement.type)}`}>
                                                            {getMovementTypeLabel(movement.type)}
                                                        </span>
                                                        {movement.isPending && (
                                                            <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800 border border-yellow-200">
                                                                Pending
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="text-sm text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-2">
                                                        <span>{format(parseISO(movement.displayedDate), 'MMM d, yyyy')}</span>
                                                        <span>•</span>
                                                        <span>{account?.name || 'Unknown Account'}</span>
                                                        <span>•</span>
                                                        <span>{pocket?.name || 'Unknown Pocket'}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-4">
                                                <span className={`text-lg font-bold ${isIncome ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                                    {isIncome ? '+' : '-'}${movement.amount.toLocaleString()}
                                                </span>

                                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
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
        </div>
    );
};

// Helper for empty state
import { Filter } from 'lucide-react';

export default MovementList;
