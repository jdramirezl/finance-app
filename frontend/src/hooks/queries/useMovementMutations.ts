import { useMutation, useQueryClient } from '@tanstack/react-query';
import { movementService } from '../../services/movementService';
import { broadcastInvalidation } from '../../lib/crossTabSync';
import type { MovementType } from '../../types';
import { useToast } from '../useToast';

const errorMessage = (error: unknown, fallback: string): string =>
    error instanceof Error && error.message ? error.message : fallback;

/**
 * Mutation hooks for movement-related operations.
 *
 * Cache invalidation is intentionally targeted: each mutation only invalidates
 * the query keys whose data actually changed. The rules below are documented
 * inline alongside each `onSuccess` so future maintainers don't widen the
 * invalidation set without thinking about it.
 *
 * - `['movements']` — invalidated by every mutation that creates/updates/deletes
 *   a movement record.
 * - `['accounts']`, `['pockets']` — only invalidated when account/pocket
 *   balances change (i.e. the movement is NOT pending). Pending movements are
 *   excluded from balance calculations.
 * - `['subPockets']` — only invalidated when a sub-pocket is involved
 *   (`subPocketId` is set on the relevant payload).
 * - `['reminders']` — only invalidated by `deleteMovement`, since deleting a
 *   movement may restore a previously-completed reminder.
 */
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
            category?: string;
            tags?: string[];
        }) =>
            movementService.createMovement(
                data.type,
                data.accountId,
                data.pocketId,
                data.amount,
                data.notes,
                data.displayedDate,
                data.subPocketId,
                data.isPending,
                data.category,
                data.tags
            ),
        onSuccess: (_result, variables) => {
            // Movements list always changes.
            queryClient.invalidateQueries({ queryKey: ['movements'] });
            // Account / pocket balances only change for non-pending movements.
            if (!variables.isPending) {
                queryClient.invalidateQueries({ queryKey: ['accounts'] });
                queryClient.invalidateQueries({ queryKey: ['pockets'] });
            }
            // Sub-pocket totals only change when a sub-pocket was targeted.
            if (variables.subPocketId) {
                queryClient.invalidateQueries({ queryKey: ['subPockets'] });
            }
            const keys: string[][] = [['movements']];
            if (!variables.isPending) { keys.push(['accounts'], ['pockets']); }
            if (variables.subPocketId) { keys.push(['subPockets']); }
            broadcastInvalidation(keys);
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
            // Transfers always shift money between two account/pocket pairs, so
            // both balances and the movements list always change. Sub-pockets
            // are not currently supported as transfer endpoints, so we don't
            // invalidate `['subPockets']` here.
            queryClient.invalidateQueries({ queryKey: ['movements'] });
            queryClient.invalidateQueries({ queryKey: ['accounts'] });
            queryClient.invalidateQueries({ queryKey: ['pockets'] });
            broadcastInvalidation([['movements'], ['accounts'], ['pockets']]);
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
                category: string;
                tags: string[];
            }>;
        }) => movementService.updateMovement(data.id, data.updates),
        onSuccess: (_result, variables) => {
            // Same conditional logic as `createMovement`: invalidate balance
            // queries only when the updated movement is not pending, and only
            // touch sub-pockets when the update references one.
            queryClient.invalidateQueries({ queryKey: ['movements'] });
            if (!variables.updates.isPending) {
                queryClient.invalidateQueries({ queryKey: ['accounts'] });
                queryClient.invalidateQueries({ queryKey: ['pockets'] });
            }
            if (variables.updates.subPocketId) {
                queryClient.invalidateQueries({ queryKey: ['subPockets'] });
            }
            const keys: string[][] = [['movements']];
            if (!variables.updates.isPending) { keys.push(['accounts'], ['pockets']); }
            if (variables.updates.subPocketId) { keys.push(['subPockets']); }
            broadcastInvalidation(keys);
        },
        onError: (error) => {
            toast.error(errorMessage(error, 'Failed to update movement'));
        },
    });

    const deleteMovement = useMutation({
        mutationFn: (id: string) => movementService.deleteMovement(id),
        onSuccess: () => {
            // Deletion can affect every cached slice: the movement disappears
            // from lists, account/pocket/sub-pocket balances change if the
            // movement was real (not pending), and a previously-completed
            // reminder may be restored. We don't have the original movement
            // payload here, so we conservatively invalidate everything that
            // could plausibly have changed.
            queryClient.invalidateQueries({ queryKey: ['movements'] });
            queryClient.invalidateQueries({ queryKey: ['accounts'] });
            queryClient.invalidateQueries({ queryKey: ['pockets'] });
            queryClient.invalidateQueries({ queryKey: ['subPockets'] });
            queryClient.invalidateQueries({ queryKey: ['reminders'] });
            broadcastInvalidation([['movements'], ['accounts'], ['pockets'], ['subPockets'], ['reminders']]);
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
            broadcastInvalidation([['movements'], ['accounts'], ['pockets'], ['subPockets']]);
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
            broadcastInvalidation([['movements'], ['accounts'], ['pockets'], ['subPockets']]);
        },
        onError: (error) => {
            toast.error(errorMessage(error, 'Failed to mark movement as pending'));
        },
    });

    const restoreOrphanedMovements = useMutation({
        mutationFn: (data: { movementIds: string[]; accountId: string; pocketId: string }) =>
            movementService.restoreOrphanedMovements(data.movementIds, data.accountId, data.pocketId),
        onSuccess: () => {
            // Restoring orphans rewires movements onto an existing account /
            // pocket, so balances change and the movements list changes.
            queryClient.invalidateQueries({ queryKey: ['movements'] });
            queryClient.invalidateQueries({ queryKey: ['accounts'] });
            queryClient.invalidateQueries({ queryKey: ['pockets'] });
            broadcastInvalidation([['movements'], ['accounts'], ['pockets']]);
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
