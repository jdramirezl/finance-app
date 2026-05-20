import { useState, useMemo } from 'react';
import type { Movement } from '../types';
import { parseDate, toDateOnly } from '../utils/dateUtils';
import { MOVEMENT_TYPE_FILTER_ALL, type MovementTypeFilterValue } from '../components/selectors/MovementTypeSelect';

export type DateRangeOption = 'all' | '7days' | '30days' | '3months' | '6months' | 'year' | 'custom';
/**
 * Type filter value used by the movements list. Either the "all"
 * sentinel (no filter applied) or one of the four canonical
 * `MovementType` values matched exactly.
 */
export type FilterTypeOption = MovementTypeFilterValue;
export type ShowPendingOption = 'all' | 'applied' | 'pending';

interface UseMovementsFilterProps {
    movements: Movement[];
}

export const useMovementsFilter = ({ movements }: UseMovementsFilterProps) => {
    // Filter State
    const [filterAccount, setFilterAccount] = useState<string>('all');
    const [filterPocket, setFilterPocket] = useState<string>('all');
    const [filterType, setFilterType] = useState<FilterTypeOption>(MOVEMENT_TYPE_FILTER_ALL);
    const [filterDateRange, setFilterDateRange] = useState<DateRangeOption>('all');
    const [filterDateFrom, setFilterDateFrom] = useState<string>('');
    const [filterDateTo, setFilterDateTo] = useState<string>('');
    const [filterSearch, setFilterSearch] = useState<string>('');
    const [filterMinAmount, setFilterMinAmount] = useState<string>('');
    const [filterMaxAmount, setFilterMaxAmount] = useState<string>('');
    const [showPending, setShowPending] = useState<ShowPendingOption>('all');

    // Calculate date range based on filter
    const getDateRange = () => {
        const now = new Date();
        const ranges: Record<string, { from: Date; to: Date }> = {
            '7days': { from: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), to: now },
            '30days': { from: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), to: now },
            '3months': { from: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000), to: now },
            '6months': { from: new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000), to: now },
            'year': { from: new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000), to: now },
        };

        if (filterDateRange === 'custom' && filterDateFrom && filterDateTo) {
            // Normalize to YYYY-MM-DD via toDateOnly so values from either an
            // input element (already date-only) or a stored ISO string compare
            // consistently.
            const fromDateStr = toDateOnly(filterDateFrom);
            const toDateStr = toDateOnly(filterDateTo);

            // Build local-time bounds so the user's selected day is fully
            // inclusive in their timezone (and we don't accidentally include
            // adjacent days in negative offsets).
            const fromDate = parseDate(fromDateStr);
            const toDate = parseDate(toDateStr);
            toDate.setHours(23, 59, 59, 999);

            return { from: fromDate, to: toDate };
        }

        return filterDateRange !== 'all' ? ranges[filterDateRange] : null;
    };

    const filteredMovements = useMemo(() => {
        return movements.filter(movement => {
            // Pending status filter
            if (showPending === 'pending' && !movement.isPending) return false;
            if (showPending === 'applied' && movement.isPending) return false;

            // Account filter
            if (filterAccount !== 'all' && movement.accountId !== filterAccount) return false;

            // Pocket filter
            if (filterPocket !== 'all' && movement.pocketId !== filterPocket) return false;

            // Type filter — exact MovementType match. The "all" sentinel
            // skips this check so every type passes through.
            if (filterType !== MOVEMENT_TYPE_FILTER_ALL && movement.type !== filterType) return false;

            // Date range filter
            const dateRange = getDateRange();
            if (dateRange) {
                const movementDate = parseDate(movement.displayedDate);
                if (movementDate < dateRange.from || movementDate > dateRange.to) return false;
            }

            // Search filter (notes)
            if (filterSearch && movement.notes) {
                if (!movement.notes.toLowerCase().includes(filterSearch.toLowerCase())) return false;
            } else if (filterSearch && !movement.notes) {
                return false;
            }

            // Amount range filter
            if (filterMinAmount && movement.amount < parseFloat(filterMinAmount)) return false;
            if (filterMaxAmount && movement.amount > parseFloat(filterMaxAmount)) return false;

            return true;
        });
    }, [
        movements,
        showPending,
        filterAccount,
        filterPocket,
        filterType,
        filterDateRange,
        filterDateFrom,
        filterDateTo,
        filterSearch,
        filterMinAmount,
        filterMaxAmount
    ]);

    return {
        filteredMovements,
        filters: {
            account: filterAccount,
            pocket: filterPocket,
            type: filterType,
            dateRange: filterDateRange,
            dateFrom: filterDateFrom,
            dateTo: filterDateTo,
            search: filterSearch,
            minAmount: filterMinAmount,
            maxAmount: filterMaxAmount,
            showPending,
        },
        setFilters: {
            setAccount: setFilterAccount,
            setPocket: setFilterPocket,
            setType: setFilterType,
            setDateRange: setFilterDateRange,
            setDateFrom: setFilterDateFrom,
            setDateTo: setFilterDateTo,
            setSearch: setFilterSearch,
            setMinAmount: setFilterMinAmount,
            setMaxAmount: setFilterMaxAmount,
            setShowPending,
        }
    };
};
