import { useMutation, useQueryClient } from '@tanstack/react-query';
import { movementService } from '../../services/movementService';
import type { MovementType } from '../../types';
import { useToast } from '../useToast';

const errorMessage = (error: unknown, fallback: string): string =>
    error instanceof Error && error.message ? error.message : fallback;

export const useMovementMutations = () => {
    const queryClient = useQueryClient();
    const toast = useToast();

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
        onSuccess: (_, variables) => {
            console.log(`💸 Created ${variables.type} movement: $${variables.amount}${variables.isPending ? ' (pending)' : ''}`);
            queryClient.invalidateQueries({ queryKey: ['movements'] });
            queryClient.invalidateQueries({ queryKey: ['accounts'] });
            queryClient.invalidateQueries({ queryKey: ['pockets'] });
            queryClient.invalidateQueries({ queryKey: ['subPockets'] });
        },
        onError: (error) => {
            toast.error(errorMessage(error, 'Failed to create movement'));
        },
    });

    const createTransfer = useMutation({
        mutationFn: (data: {
            sourceAccountId: string;
            sourcePocketId: string;
            targetAccountId: string;
            targetPocketId: string;
            amount: number;
            displayedDate: string;
            notes?: string;
        }) =>
            movementService.createTransfer(
                data.sourceAccountId,
                data.sourcePocketId,
                data.targetAccountId,
                data.targetPocketId,
                data.amount,
                data.displayedDate,
                data.notes
            ),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['movements'] });
            queryClient.invalidateQueries({ queryKey: ['accounts'] });
            queryClient.invalidateQueries({ queryKey: ['pockets'] });
        },
        onError: (error) => {
            toast.error(errorMessage(error, 'Failed to create transfer'));
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
                isPending: boolean;
            }>;
        }) => movementService.updateMovement(data.id, data.updates),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['movements'] });
            queryClient.invalidateQueries({ queryKey: ['accounts'] });
            queryClient.invalidateQueries({ queryKey: ['pockets'] });
            queryClient.invalidateQueries({ queryKey: ['subPockets'] });
        },
        onError: (error) => {
            toast.error(errorMessage(error, 'Failed to update movement'));
        },
    });

    const deleteMovement = useMutation({
        mutationFn: (id: string) => movementService.deleteMovement(id),
        onSuccess: (_, id) => {
            console.log(`🗑️ Deleted movement: ${id}`);
            queryClient.invalidateQueries({ queryKey: ['movements'] });
            queryClient.invalidateQueries({ queryKey: ['accounts'] });
            queryClient.invalidateQueries({ queryKey: ['pockets'] });
            queryClient.invalidateQueries({ queryKey: ['subPockets'] });
            // Invalidate reminders to ensure restored reminders appear instantly
            queryClient.invalidateQueries({ queryKey: ['reminders'] });
        },
        onError: (error) => {
            toast.error(errorMessage(error, 'Failed to delete movement'));
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
        onError: (error) => {
            toast.error(errorMessage(error, 'Failed to apply pending movement'));
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
        onError: (error) => {
            toast.error(errorMessage(error, 'Failed to mark movement as pending'));
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
        onError: (error) => {
            toast.error(errorMessage(error, 'Failed to restore movements'));
        },
    });

    return {
        createMovement,
        createTransfer,
        updateMovement,
        deleteMovement,
        applyPendingMovement,
        markAsPending,
        restoreOrphanedMovements,
    };
};
