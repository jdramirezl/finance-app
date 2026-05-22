import { memo, useCallback, useMemo } from 'react';
import { format, parseISO, formatDistanceToNow } from 'date-fns';
import { ChevronDown, ChevronUp, ChevronLeft, ChevronRight, MoreVertical, Filter } from 'lucide-react';
import Card from '../ui/Card';
import { useAccountsQuery, usePocketsQuery } from '../../hooks/queries';
import type { Account, Movement, MovementType, Pocket } from '../../types';
import type { SortField, SortOrder } from '../../hooks/useMovementsSort';
import { getSmartIcon, getDefaultIcon } from '../../constants/smartIcons';
import { getCategoryColor } from '../../constants/categories';
import InlineEditableAmount from '../ui/InlineEditableAmount';

interface MovementListProps {
    movements: Movement[];
    totalCount: number;
    page: number;
    pageSize: number;
    onPageChange: (page: number) => void;
    sortField: SortField;
    sortOrder: SortOrder;
    setSortField: (field: SortField) => void;
    setSortOrder: (order: SortOrder) => void;
    onEdit: (movement: Movement) => void;
    onDelete: (id: string) => void;
    onApplyPending: (id: string) => void;
    onUpdateAmount: (id: string, amount: number) => Promise<void>;
    deletingId: string | null;
    applyingId: string | null;
    isSelected?: (id: string) => boolean;
    onToggleSelection?: (id: string) => void;
    onSelectAll?: (ids: string[]) => void;
    selectedCount?: number;
}

const getTypeIcon = (type: MovementType, isPending?: boolean) => {
    if (isPending) return 'bolt';
    switch (type) {
        case 'IngresoNormal': return 'add_circle';
        case 'IngresoFijo': return 'account_balance_wallet';
        case 'EgresoNormal': return 'remove_circle';
        case 'EgresoFijo': return 'receipt_long';
        default: return 'swap_horiz';
    }
};

const getTypeIconColor = (type: MovementType, isPending?: boolean) => {
    if (isPending) return 'bg-blue-500/20 text-blue-400';
    switch (type) {
        case 'IngresoNormal':
        case 'IngresoFijo':
            return 'bg-blue-600/20 text-blue-400';
        case 'EgresoNormal':
        case 'EgresoFijo':
            return 'bg-amber-500/20 text-amber-400';
        default:
            return 'bg-gray-500/20 text-gray-400';
    }
};

interface MovementTableRowProps {
    movement: Movement;
    account: Account | undefined;
    pocket: Pocket | undefined;
    onEdit: (movement: Movement) => void;
    onDelete: (id: string) => void;
    onApplyPending: (id: string) => void;
    onUpdateAmount: (id: string, amount: number) => Promise<void>;
    isSelected?: boolean;
    onToggleSelection?: (id: string) => void;
}

const MovementTableRow = memo(({
    movement, account, pocket, onEdit, onDelete, onApplyPending, onUpdateAmount, isSelected, onToggleSelection,
}: MovementTableRowProps) => {
    const isIncome = movement.type.includes('Ingreso');
    const isPending = movement.isPending;
    const date = parseISO(movement.displayedDate);
    const relativeTime = formatDistanceToNow(date, { addSuffix: true });

    const smartIcon = getSmartIcon(movement.notes);
    const iconData = smartIcon || getDefaultIcon(isIncome);
    const IconComponent = iconData.icon;
    const useLucideIcon = !!smartIcon || true; // We have lucide icons from smartIcons

    return (
        <tr className={`group transition-colors ${
            isPending
                ? 'border border-dashed border-blue-500/30 bg-blue-500/5 hover:bg-blue-500/10'
                : 'hover:bg-gray-700/50 border-b border-gray-700'
        }`}>
            {/* Checkbox */}
            {onToggleSelection && (
                <td className="px-3 py-4 w-10">
                    <input
                        type="checkbox"
                        checked={!!isSelected}
                        onChange={() => onToggleSelection(movement.id)}
                        className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500 focus:ring-offset-0 cursor-pointer"
                        aria-label={`Select ${movement.notes || 'movement'}`}
                    />
                </td>
            )}
            <td className="px-6 py-4">
                <p className={`text-xs uppercase ${isPending ? 'text-blue-400' : 'text-gray-100'}`}>
                    {format(date, 'MMM dd')}
                </p>
                <p className={`text-[10px] uppercase ${isPending ? 'text-blue-400/70' : 'text-gray-400'}`}>
                    {relativeTime}
                </p>
            </td>

            {/* Movement (icon + title + notes) */}
            <td className="px-6 py-4">
                <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${getTypeIconColor(movement.type, isPending)}`}>
                        <IconComponent className="w-4 h-4" />
                    </div>
                    <div>
                        <p className="font-medium text-sm text-gray-100">
                            {movement.notes || 'Untitled Movement'}
                        </p>
                        {movement.tags && movement.tags.length > 0 && (
                            <p className="text-[11px] text-gray-400 truncate max-w-[200px]">
                                {movement.tags.join(', ')}
                            </p>
                        )}
                    </div>
                </div>
            </td>

            {/* Account -> Pocket */}
            <td className="px-6 py-4">
                <p className="text-xs font-medium text-gray-100">{account?.name || 'Unknown'}</p>
                <p className="text-[11px] text-gray-400">{pocket?.name || 'Unknown'}</p>
            </td>

            {/* Category */}
            <td className="px-6 py-4">
                {movement.category ? (
                    <span
                        className="px-2 py-1 rounded text-[10px] font-bold uppercase"
                        style={{
                            backgroundColor: `${getCategoryColor(movement.category)}1a`,
                            color: getCategoryColor(movement.category),
                        }}
                    >
                        {movement.category}
                    </span>
                ) : (
                    <span className="px-2 py-1 bg-gray-600 text-[10px] rounded font-bold uppercase text-gray-400">
                        —
                    </span>
                )}
            </td>

            {/* Amount */}
            <td className="px-6 py-4 text-right">
                <InlineEditableAmount
                    amount={movement.amount}
                    isIncome={isIncome}
                    onSave={(newAmount) => onUpdateAmount(movement.id, newAmount)}
                />
            </td>

            {/* Actions */}
            <td className="px-6 py-4 text-right">
                <div className="relative inline-block">
                    <button
                        onClick={() => onEdit(movement)}
                        className="text-gray-400 hover:text-blue-400 transition-colors p-1"
                        aria-label={`Actions for ${movement.notes || 'movement'}`}
                    >
                        <MoreVertical className="w-4 h-4" />
                    </button>
                </div>
            </td>
        </tr>
    );
});

MovementTableRow.displayName = 'MovementTableRow';

const MovementList = ({
    movements,
    totalCount,
    page,
    pageSize,
    onPageChange,
    sortField,
    sortOrder,
    setSortField,
    setSortOrder,
    onEdit,
    onDelete,
    onApplyPending,
    onUpdateAmount,
    deletingId,
    applyingId,
    isSelected,
    onToggleSelection,
    onSelectAll,
    selectedCount,
}: MovementListProps) => {
    const { data: accounts = [] } = useAccountsQuery();
    const { data: pockets = [] } = usePocketsQuery();

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

    const handleSort = useCallback((field: SortField) => {
        if (sortField === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortOrder('desc');
        }
    }, [sortField, sortOrder, setSortField, setSortOrder]);

    const SortIcon = ({ field }: { field: SortField }) => {
        if (sortField !== field) return null;
        return sortOrder === 'asc'
            ? <ChevronUp className="w-3 h-3 inline ml-1" />
            : <ChevronDown className="w-3 h-3 inline ml-1" />;
    };

    const totalPages = Math.ceil(totalCount / pageSize);
    const startItem = (page - 1) * pageSize + 1;
    const endItem = Math.min(page * pageSize, totalCount);

    // Generate page numbers to display
    const pageNumbers = useMemo(() => {
        const pages: number[] = [];
        const maxVisible = 5;
        let start = Math.max(1, page - Math.floor(maxVisible / 2));
        const end = Math.min(totalPages, start + maxVisible - 1);
        start = Math.max(1, end - maxVisible + 1);
        for (let i = start; i <= end; i++) pages.push(i);
        return pages;
    }, [page, totalPages]);

    if (movements.length === 0) {
        return (
            <Card padding="lg">
                <div className="text-center py-12">
                    <div className="bg-gray-700 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Filter className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-100">No movements found</h3>
                    <p className="text-gray-400 mt-2">
                        Try adjusting your filters or create a new movement.
                    </p>
                </div>
            </Card>
        );
    }

    return (
        <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[900px]">
                    <thead>
                        <tr className="bg-gray-700/50 text-gray-400">
                            {onToggleSelection && (
                                <th className="px-3 py-4 w-10 border-b border-gray-700">
                                    <input
                                        type="checkbox"
                                        checked={movements.length > 0 && selectedCount === movements.length}
                                        ref={(el) => { if (el) el.indeterminate = (selectedCount ?? 0) > 0 && (selectedCount ?? 0) < movements.length; }}
                                        onChange={() => {
                                            if (selectedCount === movements.length) {
                                                onSelectAll?.([]);
                                            } else {
                                                onSelectAll?.(movements.map((m) => m.id));
                                            }
                                        }}
                                        className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500 focus:ring-offset-0 cursor-pointer"
                                        aria-label="Select all movements"
                                    />
                                </th>
                            )}
                            <th
                                className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest border-b border-gray-700 cursor-pointer hover:text-blue-400 transition-colors"
                                onClick={() => handleSort('displayedDate')}
                            >
                                Date <SortIcon field="displayedDate" />
                            </th>
                            <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest border-b border-gray-700">
                                Movement
                            </th>
                            <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest border-b border-gray-700">
                                Account → Pocket
                            </th>
                            <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest border-b border-gray-700">
                                Category
                            </th>
                            <th
                                className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest border-b border-gray-700 cursor-pointer hover:text-blue-400 transition-colors text-right"
                                onClick={() => handleSort('amount')}
                            >
                                Amount <SortIcon field="amount" />
                            </th>
                            <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest border-b border-gray-700" />
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                        {movements.map((movement) => (
                            <MovementTableRow
                                key={movement.id}
                                movement={movement}
                                account={accountById.get(movement.accountId)}
                                pocket={pocketById.get(movement.pocketId)}
                                onEdit={onEdit}
                                onDelete={onDelete}
                                onApplyPending={onApplyPending}
                                onUpdateAmount={onUpdateAmount}
                                isSelected={isSelected?.(movement.id)}
                                onToggleSelection={onToggleSelection}
                            />
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            <div className="p-4 bg-gray-700/30 flex justify-between items-center border-t border-gray-700">
                <span className="text-xs text-gray-400">
                    Showing {startItem}-{endItem} of {totalCount.toLocaleString()} movements
                </span>
                <div className="flex gap-2">
                    <button
                        onClick={() => onPageChange(page - 1)}
                        disabled={page <= 1}
                        className="w-8 h-8 flex items-center justify-center rounded border border-gray-700 hover:bg-gray-700/50 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    {pageNumbers.map((p) => (
                        <button
                            key={p}
                            onClick={() => onPageChange(p)}
                            className={`w-8 h-8 flex items-center justify-center rounded text-xs font-bold ${
                                p === page
                                    ? 'bg-blue-500 text-white'
                                    : 'border border-gray-700 hover:bg-gray-700/50'
                            }`}
                        >
                            {p}
                        </button>
                    ))}
                    <button
                        onClick={() => onPageChange(page + 1)}
                        disabled={page >= totalPages}
                        className="w-8 h-8 flex items-center justify-center rounded border border-gray-700 hover:bg-gray-700/50 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default memo(MovementList);
