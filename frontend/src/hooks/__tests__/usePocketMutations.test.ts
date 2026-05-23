import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type ReactNode } from 'react';
import type { Pocket } from '../../types';

/**
 * Tests for {@link usePocketMutations}. The hook wraps `pocketService` and
 * has a few non-obvious invalidation rules we want to lock down:
 *   - createPocket / updatePocket / reorderPockets only touch `['pockets']`.
 *   - deletePocket also invalidates `['accounts']` because deleting a pocket
 *     changes the parent account's calculated balance.
 *   - migrateFixedPocketToAccount invalidates `['pockets']`, `['accounts']`,
 *     and `['movements']` because the migration rewires balances and
 *     movement records.
 *   - reorderPockets is a no-op when called with an empty array (the hook
 *     short-circuits to `Promise.resolve()`).
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

vi.mock('../../services/pocketService', () => ({
    pocketService: {
        createPocket: vi.fn(),
        updatePocket: vi.fn(),
        deletePocket: vi.fn(),
        reorderPockets: vi.fn(),
        migrateFixedPocketToAccount: vi.fn(),
    },
}));

vi.mock('../../lib/crossTabSync', () => ({
    broadcastInvalidation: mocks.broadcastInvalidation,
}));

vi.mock('../useToast', () => ({
    useToast: () => mocks.toast,
}));

import { usePocketMutations } from '../queries/usePocketMutations';
import { pocketService } from '../../services/pocketService';

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
    // Cast through `unknown` because vitest's typed `MockInstance` for the
    // generic `invalidateQueries` overload is not assignable to the base
    // `MockInstance` shape declared on `WrapperFixture`.
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries') as unknown as ReturnType<typeof vi.spyOn>;
    const wrapper = ({ children }: { children: ReactNode }) =>
        createElement(QueryClientProvider, { client: queryClient }, children);
    return { wrapper, invalidateSpy };
};

const invalidatedKeys = (spy: ReturnType<typeof vi.spyOn>): string[][] =>
    spy.mock.calls.map((call) => (call[0] as { queryKey: string[] }).queryKey);

const sortKeys = (keys: string[][]): string[][] =>
    [...keys].map((k) => [...k]).sort((a, b) => a.join('|').localeCompare(b.join('|')));

const samplePocket: Pocket = {
    id: 'pkt-1',
    accountId: 'acc-1',
    name: 'Savings',
    type: 'normal',
    balance: 0,
    currency: 'USD',
    displayOrder: 0,
};

describe('usePocketMutations', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('createPocket', () => {
        it('forwards positional arguments to pocketService.createPocket', async () => {
            const { wrapper } = createWrapper();
            vi.mocked(pocketService.createPocket).mockResolvedValue(samplePocket);

            const { result } = renderHook(() => usePocketMutations(), { wrapper });
            await act(async () => {
                await result.current.createPocket.mutateAsync({
                    accountId: 'acc-1',
                    name: 'Savings',
                    type: 'normal',
                });
            });

            expect(pocketService.createPocket).toHaveBeenCalledWith('acc-1', 'Savings', 'normal');
        });

        it('invalidates only pockets (creating a pocket does not change balances)', async () => {
            const { wrapper, invalidateSpy } = createWrapper();
            vi.mocked(pocketService.createPocket).mockResolvedValue(samplePocket);

            const { result } = renderHook(() => usePocketMutations(), { wrapper });
            await act(async () => {
                await result.current.createPocket.mutateAsync({
                    accountId: 'acc-1',
                    name: 'Savings',
                    type: 'normal',
                });
            });

            expect(invalidatedKeys(invalidateSpy)).toEqual([['pockets']]);
            expect(mocks.broadcastInvalidation).toHaveBeenCalledWith([['pockets']]);
        });

        it('toasts the service error message on failure', async () => {
            const { wrapper } = createWrapper();
            vi.mocked(pocketService.createPocket).mockRejectedValue(new Error('duplicate pocket'));

            const { result } = renderHook(() => usePocketMutations(), { wrapper });
            await act(async () => {
                await expect(
                    result.current.createPocket.mutateAsync({
                        accountId: 'acc-1',
                        name: 'Savings',
                        type: 'normal',
                    }),
                ).rejects.toThrow('duplicate pocket');
            });

            expect(mocks.toast.error).toHaveBeenCalledWith('duplicate pocket');
        });

        it('falls back to the default error message when the error has no message', async () => {
            const { wrapper } = createWrapper();
            vi.mocked(pocketService.createPocket).mockRejectedValue(new Error(''));

            const { result } = renderHook(() => usePocketMutations(), { wrapper });
            await act(async () => {
                await expect(
                    result.current.createPocket.mutateAsync({
                        accountId: 'acc-1',
                        name: 'Savings',
                        type: 'normal',
                    }),
                ).rejects.toBeDefined();
            });

            expect(mocks.toast.error).toHaveBeenCalledWith('Failed to create pocket');
        });
    });

    describe('updatePocket', () => {
        it('forwards id and updates payload', async () => {
            const { wrapper } = createWrapper();
            vi.mocked(pocketService.updatePocket).mockResolvedValue(samplePocket);

            const { result } = renderHook(() => usePocketMutations(), { wrapper });
            await act(async () => {
                await result.current.updatePocket.mutateAsync({
                    id: 'pkt-1',
                    updates: { name: 'Renamed' },
                });
            });

            expect(pocketService.updatePocket).toHaveBeenCalledWith('pkt-1', { name: 'Renamed' });
        });

        it('invalidates only pockets', async () => {
            const { wrapper, invalidateSpy } = createWrapper();
            vi.mocked(pocketService.updatePocket).mockResolvedValue(samplePocket);

            const { result } = renderHook(() => usePocketMutations(), { wrapper });
            await act(async () => {
                await result.current.updatePocket.mutateAsync({
                    id: 'pkt-1',
                    updates: { name: 'Renamed' },
                });
            });

            expect(invalidatedKeys(invalidateSpy)).toEqual([['pockets']]);
            expect(mocks.broadcastInvalidation).toHaveBeenCalledWith([['pockets']]);
        });
    });

    describe('deletePocket', () => {
        it('forwards the id to pocketService.deletePocket', async () => {
            const { wrapper } = createWrapper();
            vi.mocked(pocketService.deletePocket).mockResolvedValue(undefined as never);

            const { result } = renderHook(() => usePocketMutations(), { wrapper });
            await act(async () => {
                await result.current.deletePocket.mutateAsync('pkt-1');
            });

            expect(pocketService.deletePocket).toHaveBeenCalledWith('pkt-1');
        });

        it('invalidates pockets and accounts (account total shifts)', async () => {
            const { wrapper, invalidateSpy } = createWrapper();
            vi.mocked(pocketService.deletePocket).mockResolvedValue(undefined as never);

            const { result } = renderHook(() => usePocketMutations(), { wrapper });
            await act(async () => {
                await result.current.deletePocket.mutateAsync('pkt-1');
            });

            expect(sortKeys(invalidatedKeys(invalidateSpy))).toEqual(
                sortKeys([['pockets'], ['accounts']]),
            );
            expect(mocks.broadcastInvalidation).toHaveBeenCalledWith([['pockets'], ['accounts']]);
        });
    });

    describe('reorderPockets', () => {
        it('calls reorderPockets with the parent account id and ordered pocket ids', async () => {
            const { wrapper } = createWrapper();
            vi.mocked(pocketService.reorderPockets).mockResolvedValue(undefined as never);

            const pockets: Pocket[] = [
                { ...samplePocket, id: 'pkt-1', accountId: 'acc-1' },
                { ...samplePocket, id: 'pkt-2', accountId: 'acc-1' },
                { ...samplePocket, id: 'pkt-3', accountId: 'acc-1' },
            ];

            const { result } = renderHook(() => usePocketMutations(), { wrapper });
            await act(async () => {
                await result.current.reorderPockets.mutateAsync(pockets);
            });

            expect(pocketService.reorderPockets).toHaveBeenCalledWith('acc-1', ['pkt-1', 'pkt-2', 'pkt-3']);
        });

        it('short-circuits when called with an empty array (no service call)', async () => {
            const { wrapper, invalidateSpy } = createWrapper();
            vi.mocked(pocketService.reorderPockets).mockResolvedValue(undefined as never);

            const { result } = renderHook(() => usePocketMutations(), { wrapper });
            await act(async () => {
                await result.current.reorderPockets.mutateAsync([]);
            });

            expect(pocketService.reorderPockets).not.toHaveBeenCalled();
            // onSuccess still runs and invalidates pockets even for the no-op case.
            expect(invalidatedKeys(invalidateSpy)).toEqual([['pockets']]);
        });

        it('invalidates only pockets on success', async () => {
            const { wrapper, invalidateSpy } = createWrapper();
            vi.mocked(pocketService.reorderPockets).mockResolvedValue(undefined as never);

            const { result } = renderHook(() => usePocketMutations(), { wrapper });
            await act(async () => {
                await result.current.reorderPockets.mutateAsync([samplePocket]);
            });

            expect(invalidatedKeys(invalidateSpy)).toEqual([['pockets']]);
            expect(mocks.broadcastInvalidation).toHaveBeenCalledWith([['pockets']]);
        });
    });

    describe('migrateFixedPocketToAccount', () => {
        it('forwards pocketId and targetAccountId to the service', async () => {
            const { wrapper } = createWrapper();
            vi.mocked(pocketService.migrateFixedPocketToAccount).mockResolvedValue(samplePocket);

            const { result } = renderHook(() => usePocketMutations(), { wrapper });
            await act(async () => {
                await result.current.migrateFixedPocketToAccount.mutateAsync({
                    pocketId: 'pkt-1',
                    targetAccountId: 'acc-2',
                });
            });

            expect(pocketService.migrateFixedPocketToAccount).toHaveBeenCalledWith('pkt-1', 'acc-2');
        });

        it('invalidates pockets, accounts, and movements', async () => {
            const { wrapper, invalidateSpy } = createWrapper();
            vi.mocked(pocketService.migrateFixedPocketToAccount).mockResolvedValue(samplePocket);

            const { result } = renderHook(() => usePocketMutations(), { wrapper });
            await act(async () => {
                await result.current.migrateFixedPocketToAccount.mutateAsync({
                    pocketId: 'pkt-1',
                    targetAccountId: 'acc-2',
                });
            });

            expect(sortKeys(invalidatedKeys(invalidateSpy))).toEqual(
                sortKeys([['pockets'], ['accounts'], ['movements']]),
            );
            expect(mocks.broadcastInvalidation).toHaveBeenCalledWith([
                ['pockets'],
                ['accounts'],
                ['movements'],
            ]);
        });

        it('toasts a default message when the migration fails without a message', async () => {
            const { wrapper } = createWrapper();
            vi.mocked(pocketService.migrateFixedPocketToAccount).mockRejectedValue(new Error(''));

            const { result } = renderHook(() => usePocketMutations(), { wrapper });
            await act(async () => {
                await expect(
                    result.current.migrateFixedPocketToAccount.mutateAsync({
                        pocketId: 'pkt-1',
                        targetAccountId: 'acc-2',
                    }),
                ).rejects.toBeDefined();
            });

            expect(mocks.toast.error).toHaveBeenCalledWith('Failed to migrate pocket');
        });
    });
});
