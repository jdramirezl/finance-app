import { useState, useMemo, useEffect } from 'react';
import type { Movement } from '../types';
import { format, parseISO } from 'date-fns';

export type SortField = 'createdAt' | 'displayedDate' | 'amount' | 'type';
export type SortOrder = 'asc' | 'desc';

interface UseMovementsSortProps {
    movements: Movement[];
    initialSortField?: SortField;
    initialSortOrder?: SortOrder;
}

export const useMovementsSort = ({
    movements,
    initialSortField = 'createdAt',
    initialSortOrder = 'asc'
}: UseMovementsSortProps) => {

    const [sortField, setSortField] = useState<SortField>(() => {
        const saved = localStorage.getItem('movementSortField');
        return (saved as SortField) || initialSortField;
    });

    const [sortOrder, setSortOrder] = useState<SortOrder>(() => {
        const saved = localStorage.getItem('movementSortOrder');
        return (saved as SortOrder) || initialSortOrder;
    });

    // Persist sort preferences
    useEffect(() => {
        localStorage.setItem('movementSortField', sortField);
        localStorage.setItem('movementSortOrder', sortOrder);
    }, [sortField, sortOrder]);

    const sortedMovementsByMonth = useMemo(() => {
        const grouped = Array.from(
            movements.reduce((acc, movement) => {
                const date = parseISO(movement.displayedDate);
                const monthKey = format(date, 'yyyy-MM');
                if (!acc.has(monthKey)) {
                    acc.set(monthKey, []);
                }
                acc.get(monthKey)!.push(movement);
                return acc;
            }, new Map<string, Movement[]>())
        ).sort((a, b) => b[0].localeCompare(a[0])); // Sort months descending

        // Sort movements within each month based on selected sort field and order
        grouped.forEach(([, monthMovements]) => {
            monthMovements.sort((a, b) => {
                let comparison = 0;

                switch (sortField) {
                    case 'createdAt':
                        comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
                        break;
                    case 'displayedDate':
                        comparison = new Date(a.displayedDate).getTime() - new Date(b.displayedDate).getTime();
                        break;
                    case 'amount':
                        comparison = a.amount - b.amount;
                        break;
                    case 'type':
                        // Sort by type: Income types first, then expense types
                        const typeOrder = { IngresoNormal: 0, IngresoFijo: 1, EgresoNormal: 2, EgresoFijo: 3 };
                        comparison = typeOrder[a.type] - typeOrder[b.type];
                        break;
                }

                return sortOrder === 'asc' ? comparison : -comparison;
            });
        });

        return grouped;
    }, [movements, sortField, sortOrder]);

    return {
        sortedMovementsByMonth,
        sortField,
        sortOrder,
        setSortField,
        setSortOrder
    };
};
