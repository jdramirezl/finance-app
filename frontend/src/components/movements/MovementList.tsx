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
    if (isPending) return 'bg-primary/20 text-primary';
    switch (type) {
        case 'IngresoNormal':
        case 'IngresoFijo':
            return 'bg-primary-container/20 text-primary-container';
        case 'EgresoNormal':
        case 'EgresoFijo':
            return 'bg-tertiary-container/20 text-tertiary';
        default:
            return 'bg-outline/20 text-outline';
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
}

const MovementTableRow = memo(({
    movement, account, pocket, onEdit, onDelete, onApplyPending, onUpdateAmount,
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
                ? 'border border-dashed border-primary/30 bg-primary/5 hover:bg-primary/10'
                : 'hover:bg-white/[0.02] border-b border-white/5'
        }`}>
            {/* Date */}
            <td className="px-6 py-4">
                <p className={`font-mono text-xs uppercase ${isPending ? 'text-primary' : 'text-on-surface'}`}>
                    {format(date, 'MMM dd')}
                </p>
                <p className={`text-[10px] uppercase ${isPending ? 'text-primary/70' : 'text-on-surface-variant'}`}>
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
                        <p className="font-medium text-sm text-on-surface">
                            {movement.notes || 'Untitled Movement'}
                        </p>
                        {movement.tags && movement.tags.length > 0 && (
                            <p className="text-[11px] text-on-surface-variant truncate max-w-[200px]">
                                {movement.tags.join(', ')}
                            </p>
                        )}
                    </div>
                </div>
            </td>

            {/* Account -> Pocket */}
            <td className="px-6 py-4">
                <p className="text-xs font-medium text-on-surface">{account?.name || 'Unknown'}</p>
                <p className="text-[11px] text-on-surface-variant">{pocket?.name || 'Unknown'}</p>
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
                    <span className="px-2 py-1 bg-surface-container-highest text-[10px] rounded font-bold uppercase text-on-surface-variant">
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
                        className="text-on-surface-variant hover:text-primary transition-colors p-1"
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
                    <div className="bg-surface-container-high w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Filter className="w-8 h-8 text-on-surface-variant" />
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
        <div className="glass-card rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[900px]">
                    <thead>
                        <tr className="bg-surface-container-high/50 text-on-surface-variant">
                            <th
                                className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest border-b border-white/5 cursor-pointer hover:text-primary transition-colors"
                                onClick={() => handleSort('displayedDate')}
                            >
                                Date <SortIcon field="displayedDate" />
                            </th>
                            <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest border-b border-white/5">
                                Movement
                            </th>
                            <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest border-b border-white/5">
                                Account → Pocket
                            </th>
                            <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest border-b border-white/5">
                                Category
                            </th>
                            <th
                                className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest border-b border-white/5 cursor-pointer hover:text-primary transition-colors text-right"
                                onClick={() => handleSort('amount')}
                            >
                                Amount <SortIcon field="amount" />
                            </th>
                            <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest border-b border-white/5" />
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
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
                            />
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            <div className="p-4 bg-surface-container-high/30 flex justify-between items-center border-t border-white/5">
                <span className="text-xs text-on-surface-variant">
                    Showing {startItem}-{endItem} of {totalCount.toLocaleString()} movements
                </span>
                <div className="flex gap-2">
                    <button
                        onClick={() => onPageChange(page - 1)}
                        disabled={page <= 1}
                        className="w-8 h-8 flex items-center justify-center rounded border border-white/5 hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    {pageNumbers.map((p) => (
                        <button
                            key={p}
                            onClick={() => onPageChange(p)}
                            className={`w-8 h-8 flex items-center justify-center rounded text-xs font-bold ${
                                p === page
                                    ? 'bg-primary text-background'
                                    : 'border border-white/5 hover:bg-white/5'
                            }`}
                        >
                            {p}
                        </button>
                    ))}
                    <button
                        onClick={() => onPageChange(page + 1)}
                        disabled={page >= totalPages}
                        className="w-8 h-8 flex items-center justify-center rounded border border-white/5 hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default memo(MovementList);
