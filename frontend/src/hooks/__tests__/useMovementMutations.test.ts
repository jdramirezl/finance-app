import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type ReactNode } from 'react';

/**
 * Tests for {@link useMovementMutations}. The hook is a thin wrapper around
 * `movementService` that:
 *   1. forwards the mutation arguments to the right service method,
 *   2. invalidates the right TanStack Query keys on success, and
 *   3. surfaces errors through the toast store.
 *
 * We mock the service module to assert (1), spy on the QueryClient to assert
 * (2), and capture the toast store via `vi.hoisted` to assert (3). The
 * cross-tab sync broadcaster is mocked so we can verify that the broadcast
 * payload mirrors the local invalidation set.
 */

const mocks = vi.hoisted(() => ({
    toast: {
        success: vi.fn(),
        error: vi.fn(),
        info: vi.fn(),
        warning: vi.fn(),
    },
    broadcastInvalidation: vi.fn(),
}));

vi.mock('../../services/movementService', () => ({
    movementService: {
        createMovement: vi.fn(),
        createTransfer: vi.fn(),
        updateMovement: vi.fn(),
        deleteMovement: vi.fn(),
        applyPendingMovement: vi.fn(),
        markAsPending: vi.fn(),
        restoreOrphanedMovements: vi.fn(),
    },
}));

vi.mock('../../lib/crossTabSync', () => ({
    broadcastInvalidation: mocks.broadcastInvalidation,
}));

vi.mock('../useToast', () => ({
    useToast: () => mocks.toast,
}));

import { useMovementMutations } from '../queries/useMovementMutations';
import { movementService } from '../../services/movementService';

interface WrapperFixture {
    wrapper: (props: { children: ReactNode }) => ReturnType<typeof createElement>;
    invalidateSpy: ReturnType<typeof vi.spyOn>;
}

const createWrapper = (): WrapperFixture => {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: { retry: false, gcTime: 0 },
            mutations: { retry: false },
        },
    });
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const wrapper = ({ children }: { children: ReactNode }) =>
        createElement(QueryClientProvider, { client: queryClient }, children);
    return { wrapper, invalidateSpy };
};

const invalidatedKeys = (spy: ReturnType<typeof vi.spyOn>): string[][] =>
    spy.mock.calls.map((call) => (call[0] as { queryKey: string[] }).queryKey);

const sortKeys = (keys: string[][]): string[][] =>
    [...keys].map((k) => [...k]).sort((a, b) => a.join('|').localeCompare(b.join('|')));

describe('useMovementMutations', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('createMovement', () => {
        it('forwards positional arguments to movementService.createMovement', async () => {
            const { wrapper } = createWrapper();
            vi.mocked(movementService.createMovement).mockResolvedValue({ id: 'mov-1' } as never);

            const { result } = renderHook(() => useMovementMutations(), { wrapper });
            await act(async () => {
                await result.current.createMovement.mutateAsync({
                    type: 'EgresoNormal',
                    accountId: 'acc-1',
                    pocketId: 'pkt-1',
                    amount: 100,
                    notes: 'lunch',
                    displayedDate: '2025-06-15',
                    subPocketId: 'sub-1',
                    isPending: false,
                });
            });

            expect(movementService.createMovement).toHaveBeenCalledWith(
                'EgresoNormal',
                'acc-1',
                'pkt-1',
                100,
                'lunch',
                '2025-06-15',
                'sub-1',
                false,
            );
        });

        it('invalidates movements + accounts + pockets when not pending', async () => {
            const { wrapper, invalidateSpy } = createWrapper();
            vi.mocked(movementService.createMovement).mockResolvedValue({ id: 'mov-1' } as never);

            const { result } = renderHook(() => useMovementMutations(), { wrapper });
            await act(async () => {
                await result.current.createMovement.mutateAsync({
                    type: 'EgresoNormal',
                    accountId: 'acc-1',
                    pocketId: 'pkt-1',
                    amount: 100,
                });
            });

            expect(sortKeys(invalidatedKeys(invalidateSpy))).toEqual(
                sortKeys([['movements'], ['accounts'], ['pockets']]),
            );
            expect(mocks.broadcastInvalidation).toHaveBeenCalledWith([
                ['movements'],
                ['accounts'],
                ['pockets'],
            ]);
        });

        it('only invalidates movements when the movement is pending', async () => {
            const { wrapper, invalidateSpy } = createWrapper();
            vi.mocked(movementService.createMovement).mockResolvedValue({ id: 'mov-1' } as never);

            const { result } = renderHook(() => useMovementMutations(), { wrapper });
            await act(async () => {
                await result.current.createMovement.mutateAsync({
                    type: 'EgresoNormal',
                    accountId: 'acc-1',
                    pocketId: 'pkt-1',
                    amount: 100,
                    isPending: true,
                });
            });

            expect(invalidatedKeys(invalidateSpy)).toEqual([['movements']]);
            expect(mocks.broadcastInvalidation).toHaveBeenCalledWith([['movements']]);
        });

        it('also invalidates subPockets when subPocketId is provided', async () => {
            const { wrapper, invalidateSpy } = createWrapper();
            vi.mocked(movementService.createMovement).mockResolvedValue({ id: 'mov-1' } as never);

            const { result } = renderHook(() => useMovementMutations(), { wrapper });
            await act(async () => {
                await result.current.createMovement.mutateAsync({
                    type: 'EgresoFijo',
                    accountId: 'acc-1',
                    pocketId: 'pkt-1',
                    subPocketId: 'sub-1',
                    amount: 50,
                });
            });

            expect(sortKeys(invalidatedKeys(invalidateSpy))).toEqual(
                sortKeys([['movements'], ['accounts'], ['pockets'], ['subPockets']]),
            );
        });

        it('shows the service error message via toast on failure', async () => {
            const { wrapper } = createWrapper();
            vi.mocked(movementService.createMovement).mockRejectedValue(new Error('boom'));

            const { result } = renderHook(() => useMovementMutations(), { wrapper });
            await act(async () => {
                await expect(
                    result.current.createMovement.mutateAsync({
                        type: 'EgresoNormal',
                        accountId: 'acc-1',
                        pocketId: 'pkt-1',
                        amount: 100,
                    }),
                ).rejects.toThrow('boom');
            });

            expect(mocks.toast.error).toHaveBeenCalledWith('boom');
        });

        it('falls back to the default error message when the error has no message', async () => {
            const { wrapper } = createWrapper();
            vi.mocked(movementService.createMovement).mockRejectedValue('not an error instance');

            const { result } = renderHook(() => useMovementMutations(), { wrapper });
            await act(async () => {
                await expect(
                    result.current.createMovement.mutateAsync({
                        type: 'EgresoNormal',
                        accountId: 'acc-1',
                        pocketId: 'pkt-1',
                        amount: 100,
                    }),
                ).rejects.toBeDefined();
            });

            expect(mocks.toast.error).toHaveBeenCalledWith('Failed to create movement');
        });
    });

    describe('createTransfer', () => {
        it('forwards positional arguments to movementService.createTransfer', async () => {
            const { wrapper } = createWrapper();
            vi.mocked(movementService.createTransfer).mockResolvedValue(undefined as never);

            const { result } = renderHook(() => useMovementMutations(), { wrapper });
            await act(async () => {
                await result.current.createTransfer.mutateAsync({
                    sourceAccountId: 'acc-1',
                    sourcePocketId: 'pkt-1',
                    targetAccountId: 'acc-2',
                    targetPocketId: 'pkt-2',
                    amount: 250,
                    displayedDate: '2025-06-20',
                    notes: 'rebalance',
                });
            });

            expect(movementService.createTransfer).toHaveBeenCalledWith(
                'acc-1',
                'pkt-1',
                'acc-2',
                'pkt-2',
                250,
                '2025-06-20',
                'rebalance',
            );
        });

        it('invalidates movements + accounts + pockets but not subPockets', async () => {
            const { wrapper, invalidateSpy } = createWrapper();
            vi.mocked(movementService.createTransfer).mockResolvedValue(undefined as never);

            const { result } = renderHook(() => useMovementMutations(), { wrapper });
            await act(async () => {
                await result.current.createTransfer.mutateAsync({
                    sourceAccountId: 'acc-1',
                    sourcePocketId: 'pkt-1',
                    targetAccountId: 'acc-2',
                    targetPocketId: 'pkt-2',
                    amount: 250,
                    displayedDate: '2025-06-20',
                });
            });

            expect(sortKeys(invalidatedKeys(invalidateSpy))).toEqual(
                sortKeys([['movements'], ['accounts'], ['pockets']]),
            );
            expect(mocks.broadcastInvalidation).toHaveBeenCalledWith([
                ['movements'],
                ['accounts'],
                ['pockets'],
            ]);
        });

        it('toasts the failure message on error', async () => {
            const { wrapper } = createWrapper();
            vi.mocked(movementService.createTransfer).mockRejectedValue(new Error('insufficient funds'));

            const { result } = renderHook(() => useMovementMutations(), { wrapper });
            await act(async () => {
                await expect(
                    result.current.createTransfer.mutateAsync({
                        sourceAccountId: 'acc-1',
                        sourcePocketId: 'pkt-1',
                        targetAccountId: 'acc-2',
                        targetPocketId: 'pkt-2',
                        amount: 250,
                        displayedDate: '2025-06-20',
                    }),
                ).rejects.toThrow('insufficient funds');
            });

            expect(mocks.toast.error).toHaveBeenCalledWith('insufficient funds');
        });
    });

    describe('updateMovement', () => {
        it('forwards id and updates payload to movementService.updateMovement', async () => {
            const { wrapper } = createWrapper();
            vi.mocked(movementService.updateMovement).mockResolvedValue({ id: 'mov-1' } as never);

            const { result } = renderHook(() => useMovementMutations(), { wrapper });
            const updates = { amount: 250, notes: 'edited' };
            await act(async () => {
                await result.current.updateMovement.mutateAsync({ id: 'mov-1', updates });
            });

            expect(movementService.updateMovement).toHaveBeenCalledWith('mov-1', updates);
        });

        it('invalidates movements only when the update marks the movement pending', async () => {
            const { wrapper, invalidateSpy } = createWrapper();
            vi.mocked(movementService.updateMovement).mockResolvedValue({ id: 'mov-1' } as never);

            const { result } = renderHook(() => useMovementMutations(), { wrapper });
            await act(async () => {
                await result.current.updateMovement.mutateAsync({
                    id: 'mov-1',
                    updates: { isPending: true },
                });
            });

            expect(invalidatedKeys(invalidateSpy)).toEqual([['movements']]);
        });

        it('invalidates subPockets when updates include subPocketId', async () => {
            const { wrapper, invalidateSpy } = createWrapper();
            vi.mocked(movementService.updateMovement).mockResolvedValue({ id: 'mov-1' } as never);

            const { result } = renderHook(() => useMovementMutations(), { wrapper });
            await act(async () => {
                await result.current.updateMovement.mutateAsync({
                    id: 'mov-1',
                    updates: { subPocketId: 'sub-9' },
                });
            });

            expect(sortKeys(invalidatedKeys(invalidateSpy))).toEqual(
                sortKeys([['movements'], ['accounts'], ['pockets'], ['subPockets']]),
            );
        });
    });

    describe('deleteMovement', () => {
        it('forwards the id to movementService.deleteMovement', async () => {
            const { wrapper } = createWrapper();
            vi.mocked(movementService.deleteMovement).mockResolvedValue(undefined as never);

            const { result } = renderHook(() => useMovementMutations(), { wrapper });
            await act(async () => {
                await result.current.deleteMovement.mutateAsync('mov-1');
            });

            expect(movementService.deleteMovement).toHaveBeenCalledWith('mov-1');
        });

        it('invalidates every dependent query (movements, balances, sub-pockets, reminders)', async () => {
            const { wrapper, invalidateSpy } = createWrapper();
            vi.mocked(movementService.deleteMovement).mockResolvedValue(undefined as never);

            const { result } = renderHook(() => useMovementMutations(), { wrapper });
            await act(async () => {
                await result.current.deleteMovement.mutateAsync('mov-1');
            });

            expect(sortKeys(invalidatedKeys(invalidateSpy))).toEqual(
                sortKeys([
                    ['movements'],
                    ['accounts'],
                    ['pockets'],
                    ['subPockets'],
                    ['reminders'],
                ]),
            );
            expect(mocks.broadcastInvalidation).toHaveBeenCalledWith([
                ['movements'],
                ['accounts'],
                ['pockets'],
                ['subPockets'],
                ['reminders'],
            ]);
        });
    });

    describe('applyPendingMovement / markAsPending', () => {
        it('applyPendingMovement invalidates movements, accounts, pockets', async () => {
            const { wrapper, invalidateSpy } = createWrapper();
            vi.mocked(movementService.applyPendingMovement).mockResolvedValue({ id: 'mov-1' } as never);

            const { result } = renderHook(() => useMovementMutations(), { wrapper });
            await act(async () => {
                await result.current.applyPendingMovement.mutateAsync('mov-1');
            });

            expect(movementService.applyPendingMovement).toHaveBeenCalledWith('mov-1');
            expect(sortKeys(invalidatedKeys(invalidateSpy))).toEqual(
                sortKeys([['movements'], ['accounts'], ['pockets']]),
            );
            expect(mocks.broadcastInvalidation).toHaveBeenCalledWith([
                ['movements'],
                ['accounts'],
                ['pockets'],
            ]);
        });

        it('markAsPending invalidates the same keys as applyPendingMovement', async () => {
            const { wrapper, invalidateSpy } = createWrapper();
            vi.mocked(movementService.markAsPending).mockResolvedValue({ id: 'mov-1' } as never);

            const { result } = renderHook(() => useMovementMutations(), { wrapper });
            await act(async () => {
                await result.current.markAsPending.mutateAsync('mov-1');
            });

            expect(movementService.markAsPending).toHaveBeenCalledWith('mov-1');
            expect(sortKeys(invalidatedKeys(invalidateSpy))).toEqual(
                sortKeys([['movements'], ['accounts'], ['pockets']]),
            );
        });
    });

    describe('restoreOrphanedMovements', () => {
        it('forwards arguments and invalidates movements + accounts + pockets', async () => {
            const { wrapper, invalidateSpy } = createWrapper();
            vi.mocked(movementService.restoreOrphanedMovements).mockResolvedValue(undefined as never);

            const { result } = renderHook(() => useMovementMutations(), { wrapper });
            await act(async () => {
                await result.current.restoreOrphanedMovements.mutateAsync({
                    movementIds: ['mov-1', 'mov-2'],
                    accountId: 'acc-1',
                    pocketId: 'pkt-1',
                });
            });

            expect(movementService.restoreOrphanedMovements).toHaveBeenCalledWith(
                ['mov-1', 'mov-2'],
                'acc-1',
                'pkt-1',
            );
            expect(sortKeys(invalidatedKeys(invalidateSpy))).toEqual(
                sortKeys([['movements'], ['accounts'], ['pockets']]),
            );
        });

        it('toasts a default message when the error has no message', async () => {
            const { wrapper } = createWrapper();
            vi.mocked(movementService.restoreOrphanedMovements).mockRejectedValue(new Error(''));

            const { result } = renderHook(() => useMovementMutations(), { wrapper });
            await act(async () => {
                await expect(
                    result.current.restoreOrphanedMovements.mutateAsync({
                        movementIds: ['mov-1'],
                        accountId: 'acc-1',
                        pocketId: 'pkt-1',
                    }),
                ).rejects.toBeDefined();
            });

            expect(mocks.toast.error).toHaveBeenCalledWith('Failed to restore movements');
        });
    });
});
