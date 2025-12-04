import { useMutation, useQueryClient } from '@tanstack/react-query';
import { movementService } from '../../services/movementService';
import type { MovementType } from '../../types';

export const useMovementMutations = () => {
    const queryClient = useQueryClient();

    const createMovement = useMutation({
        mutationFn: (data: {
            type: MovementType;
            accountId: string;
            pocketId: string;
            amount: number;
            notes?: string;
            displayedDate?: string;
            subPocketId?: string;
            isPending?: boolean;
        }) =>
            movementService.createMovement(
                data.type,
                data.accountId,
                data.pocketId,
                data.amount,
                data.notes,
                data.displayedDate,
                data.subPocketId,
                data.isPending
            ),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['movements'] });
            queryClient.invalidateQueries({ queryKey: ['accounts'] });
            queryClient.invalidateQueries({ queryKey: ['pockets'] });
            queryClient.invalidateQueries({ queryKey: ['subPockets'] });
        },
    });

    const updateMovement = useMutation({
        mutationFn: (data: {
            id: string;
            updates: Partial<{
                type: MovementType;
                accountId: string;
                pocketId: string;
                subPocketId: string;
                amount: number;
                notes: string;
                displayedDate: string;
            }>;
        }) => movementService.updateMovement(data.id, data.updates),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['movements'] });
            queryClient.invalidateQueries({ queryKey: ['accounts'] });
            queryClient.invalidateQueries({ queryKey: ['pockets'] });
            queryClient.invalidateQueries({ queryKey: ['subPockets'] });
        },
    });

    const deleteMovement = useMutation({
        mutationFn: (id: string) => movementService.deleteMovement(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['movements'] });
            queryClient.invalidateQueries({ queryKey: ['accounts'] });
            queryClient.invalidateQueries({ queryKey: ['pockets'] });
            queryClient.invalidateQueries({ queryKey: ['subPockets'] });
        },
    });

    const applyPendingMovement = useMutation({
        mutationFn: (id: string) => movementService.applyPendingMovement(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['movements'] });
            queryClient.invalidateQueries({ queryKey: ['accounts'] });
            queryClient.invalidateQueries({ queryKey: ['pockets'] });
            queryClient.invalidateQueries({ queryKey: ['subPockets'] });
        },
    });

    const markAsPending = useMutation({
        mutationFn: (id: string) => movementService.markAsPending(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['movements'] });
            queryClient.invalidateQueries({ queryKey: ['accounts'] });
            queryClient.invalidateQueries({ queryKey: ['pockets'] });
            queryClient.invalidateQueries({ queryKey: ['subPockets'] });
        },
    });

    const restoreOrphanedMovements = useMutation({
        mutationFn: (data: { movementIds: string[]; accountId: string; pocketId: string }) =>
            movementService.restoreOrphanedMovements(data.movementIds, data.accountId, data.pocketId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['movements'] });
            queryClient.invalidateQueries({ queryKey: ['accounts'] });
            queryClient.invalidateQueries({ queryKey: ['pockets'] });
        },
    });

    return {
        createMovement,
        updateMovement,
        deleteMovement,
        applyPendingMovement,
        markAsPending,
        restoreOrphanedMovements,
    };
};
