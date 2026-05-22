import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type ReactNode } from 'react';
import type { SubPocket } from '../../types';

/**
 * Tests for {@link useSubPocketMutations}.
 *
 * The interesting case here is `toggleSubPocketEnabled`, which uses the
 * TanStack Query optimistic-update lifecycle (`onMutate` / `onError` /
 * `onSettled`):
 *   - `onMutate` cancels in-flight queries, snapshots the cache, then
 *     optimistically flips the `enabled` flag for the targeted sub-pocket.
 *   - `onError` rolls back to the snapshot if the mutation fails.
 *   - `onSettled` always invalidates `['subPockets']` regardless of outcome.
 *
 * The other four mutations (`create`, `update`, `delete`, `moveToGroup`) are
 * straightforward thin wrappers that call the service and invalidate
 * `['subPockets']` on success. Note that this hook does NOT use
 * `broadcastInvalidation` — sub-pocket changes are local-tab only — so we
 * don't mock `crossTabSync` here.
 */

const mocks = vi.hoisted(() => ({
    toast: {
        success: vi.fn(),
        error: vi.fn(),
        info: vi.fn(),
        warning: vi.fn(),
    },
}));

vi.mock('../../services/subPocketService', () => ({
    subPocketService: {
        createSubPocket: vi.fn(),
        updateSubPocket: vi.fn(),
        deleteSubPocket: vi.fn(),
        toggleSubPocketEnabled: vi.fn(),
        moveToGroup: vi.fn(),
    },
}));

vi.mock('../useToast', () => ({
    useToast: () => mocks.toast,
}));

import { useSubPocketMutations } from '../queries/useSubPocketMutations';
import { subPocketService } from '../../services/subPocketService';

interface WrapperFixture {
    wrapper: (props: { children: ReactNode }) => ReturnType<typeof createElement>;
    invalidateSpy: ReturnType<typeof vi.spyOn>;
    queryClient: QueryClient;
}

const createWrapper = (): WrapperFixture => {
    // Note: we deliberately don't set `gcTime: 0` here — this hook's
    // `toggleSubPocketEnabled` uses the optimistic update lifecycle
    // (`onMutate` → `onError` rollback / `onSettled` invalidate). With
    // `gcTime: 0` the cache entry we seed via `setQueryData` is GC'd
    // immediately because no `useQuery` observer has registered, which
    // makes the snapshot in `onMutate` undefined.
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: { retry: false },
            mutations: { retry: false },
        },
    });
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const wrapper = ({ children }: { children: ReactNode }) =>
        createElement(QueryClientProvider, { client: queryClient }, children);
    return { wrapper, invalidateSpy, queryClient };
};

const invalidatedKeys = (spy: ReturnType<typeof vi.spyOn>): string[][] =>
    spy.mock.calls.map((call) => (call[0] as { queryKey: string[] }).queryKey);

const makeSubPocket = (overrides: Partial<SubPocket> = {}): SubPocket => ({
    id: 'sub-1',
    pocketId: 'pkt-fixed',
    name: 'Netflix',
    valueTotal: 199,
    periodicityMonths: 1,
    balance: 0,
    enabled: true,
    ...overrides,
});

describe('useSubPocketMutations', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('createSubPocket', () => {
        it('forwards positional arguments to subPocketService.createSubPocket', async () => {
            const { wrapper } = createWrapper();
            vi.mocked(subPocketService.createSubPocket).mockResolvedValue(makeSubPocket());

            const { result } = renderHook(() => useSubPocketMutations(), { wrapper });
            await act(async () => {
                await result.current.createSubPocket.mutateAsync({
                    pocketId: 'pkt-fixed',
                    name: 'Netflix',
                    valueTotal: 199,
                    periodicityMonths: 1,
                });
            });

            expect(subPocketService.createSubPocket).toHaveBeenCalledWith(
                'pkt-fixed',
                'Netflix',
                199,
                1,
            );
        });

        it('invalidates only subPockets on success', async () => {
            const { wrapper, invalidateSpy } = createWrapper();
            vi.mocked(subPocketService.createSubPocket).mockResolvedValue(makeSubPocket());

            const { result } = renderHook(() => useSubPocketMutations(), { wrapper });
            await act(async () => {
                await result.current.createSubPocket.mutateAsync({
                    pocketId: 'pkt-fixed',
                    name: 'Netflix',
                    valueTotal: 199,
                    periodicityMonths: 1,
                });
            });

            expect(invalidatedKeys(invalidateSpy)).toEqual([['subPockets']]);
        });

        it('toasts the failure message and falls back when missing', async () => {
            const { wrapper } = createWrapper();
            vi.mocked(subPocketService.createSubPocket).mockRejectedValue(new Error(''));

            const { result } = renderHook(() => useSubPocketMutations(), { wrapper });
            await act(async () => {
                await expect(
                    result.current.createSubPocket.mutateAsync({
                        pocketId: 'pkt-fixed',
                        name: 'Netflix',
                        valueTotal: 199,
                        periodicityMonths: 1,
                    }),
                ).rejects.toBeDefined();
            });

            expect(mocks.toast.error).toHaveBeenCalledWith('Failed to create fixed expense');
        });
    });

    describe('updateSubPocket', () => {
        it('forwards id and updates payload', async () => {
            const { wrapper } = createWrapper();
            vi.mocked(subPocketService.updateSubPocket).mockResolvedValue(makeSubPocket());

            const { result } = renderHook(() => useSubPocketMutations(), { wrapper });
            await act(async () => {
                await result.current.updateSubPocket.mutateAsync({
                    id: 'sub-1',
                    updates: { name: 'Renamed', valueTotal: 250 },
                });
            });

            expect(subPocketService.updateSubPocket).toHaveBeenCalledWith('sub-1', {
                name: 'Renamed',
                valueTotal: 250,
            });
        });

        it('invalidates only subPockets on success', async () => {
            const { wrapper, invalidateSpy } = createWrapper();
            vi.mocked(subPocketService.updateSubPocket).mockResolvedValue(makeSubPocket());

            const { result } = renderHook(() => useSubPocketMutations(), { wrapper });
            await act(async () => {
                await result.current.updateSubPocket.mutateAsync({
                    id: 'sub-1',
                    updates: { name: 'Renamed' },
                });
            });

            expect(invalidatedKeys(invalidateSpy)).toEqual([['subPockets']]);
        });
    });

    describe('deleteSubPocket', () => {
        it('forwards the id to subPocketService.deleteSubPocket', async () => {
            const { wrapper } = createWrapper();
            vi.mocked(subPocketService.deleteSubPocket).mockResolvedValue(undefined as never);

            const { result } = renderHook(() => useSubPocketMutations(), { wrapper });
            await act(async () => {
                await result.current.deleteSubPocket.mutateAsync('sub-1');
            });

            expect(subPocketService.deleteSubPocket).toHaveBeenCalledWith('sub-1');
        });

        it('invalidates only subPockets and toasts on error', async () => {
            const { wrapper, invalidateSpy } = createWrapper();
            vi.mocked(subPocketService.deleteSubPocket).mockResolvedValue(undefined as never);

            const { result } = renderHook(() => useSubPocketMutations(), { wrapper });
            await act(async () => {
                await result.current.deleteSubPocket.mutateAsync('sub-1');
            });

            expect(invalidatedKeys(invalidateSpy)).toEqual([['subPockets']]);
        });
    });

    describe('toggleSubPocketEnabled', () => {
        it('optimistically flips the enabled flag in the cache before the service resolves', async () => {
            const { wrapper, queryClient } = createWrapper();
            const initial: SubPocket[] = [
                makeSubPocket({ id: 'sub-1', enabled: true }),
                makeSubPocket({ id: 'sub-2', enabled: false }),
            ];
            queryClient.setQueryData(['subPockets'], initial);

            // Block the service so we can observe the optimistic update mid-flight.
            let resolveService: (value: SubPocket) => void = () => {};
            vi.mocked(subPocketService.toggleSubPocketEnabled).mockImplementation(
                () => new Promise<SubPocket>((resolve) => { resolveService = resolve; }),
            );

            const { result } = renderHook(() => useSubPocketMutations(), { wrapper });

            let pending: Promise<unknown>;
            await act(async () => {
                pending = result.current.toggleSubPocketEnabled.mutateAsync('sub-1');
                // Yield once so onMutate can run before we inspect the cache.
                await Promise.resolve();
            });

            const optimistic = queryClient.getQueryData<SubPocket[]>(['subPockets']);
            expect(optimistic?.find((sp) => sp.id === 'sub-1')?.enabled).toBe(false);
            expect(optimistic?.find((sp) => sp.id === 'sub-2')?.enabled).toBe(false);

            await act(async () => {
                resolveService(makeSubPocket({ id: 'sub-1', enabled: false }));
                await pending;
            });

            expect(subPocketService.toggleSubPocketEnabled).toHaveBeenCalledWith('sub-1');
        });

        it('rolls back to the snapshot when the service rejects', async () => {
            const { wrapper, queryClient } = createWrapper();
            const initial: SubPocket[] = [
                makeSubPocket({ id: 'sub-1', enabled: true }),
            ];
            queryClient.setQueryData(['subPockets'], initial);

            vi.mocked(subPocketService.toggleSubPocketEnabled).mockRejectedValue(new Error('toggle failed'));

            const { result } = renderHook(() => useSubPocketMutations(), { wrapper });
            await act(async () => {
                await expect(
                    result.current.toggleSubPocketEnabled.mutateAsync('sub-1'),
                ).rejects.toThrow('toggle failed');
            });

            const restored = queryClient.getQueryData<SubPocket[]>(['subPockets']);
            expect(restored).toEqual(initial);
            expect(mocks.toast.error).toHaveBeenCalledWith('toggle failed');
        });

        it('invalidates subPockets on settle (success path)', async () => {
            const { wrapper, invalidateSpy, queryClient } = createWrapper();
            queryClient.setQueryData(['subPockets'], [makeSubPocket({ id: 'sub-1', enabled: true })]);
            vi.mocked(subPocketService.toggleSubPocketEnabled).mockResolvedValue(
                makeSubPocket({ id: 'sub-1', enabled: false }),
            );

            const { result } = renderHook(() => useSubPocketMutations(), { wrapper });
            await act(async () => {
                await result.current.toggleSubPocketEnabled.mutateAsync('sub-1');
            });

            expect(
                invalidatedKeys(invalidateSpy).some((k) => k.length === 1 && k[0] === 'subPockets'),
            ).toBe(true);
        });
    });

    describe('moveSubPocketToGroup', () => {
        it('forwards subPocketId and groupId to subPocketService.moveToGroup', async () => {
            const { wrapper } = createWrapper();
            vi.mocked(subPocketService.moveToGroup).mockResolvedValue(undefined as never);

            const { result } = renderHook(() => useSubPocketMutations(), { wrapper });
            await act(async () => {
                await result.current.moveSubPocketToGroup.mutateAsync({
                    subPocketId: 'sub-1',
                    groupId: 'grp-1',
                });
            });

            expect(subPocketService.moveToGroup).toHaveBeenCalledWith('sub-1', 'grp-1');
        });

        it('invalidates only subPockets on success', async () => {
            const { wrapper, invalidateSpy } = createWrapper();
            vi.mocked(subPocketService.moveToGroup).mockResolvedValue(undefined as never);

            const { result } = renderHook(() => useSubPocketMutations(), { wrapper });
            await act(async () => {
                await result.current.moveSubPocketToGroup.mutateAsync({
                    subPocketId: 'sub-1',
                    groupId: 'grp-1',
                });
            });

            expect(invalidatedKeys(invalidateSpy)).toEqual([['subPockets']]);
        });

        it('toasts the failure message and falls back when missing', async () => {
            const { wrapper } = createWrapper();
            vi.mocked(subPocketService.moveToGroup).mockRejectedValue(new Error(''));

            const { result } = renderHook(() => useSubPocketMutations(), { wrapper });
            await act(async () => {
                await expect(
                    result.current.moveSubPocketToGroup.mutateAsync({
                        subPocketId: 'sub-1',
                        groupId: 'grp-1',
                    }),
                ).rejects.toBeDefined();
            });

            expect(mocks.toast.error).toHaveBeenCalledWith('Failed to move expense');
        });
    });
});
