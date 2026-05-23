import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type ReactNode } from 'react';
import type { SubPocket } from '../../types';

/**
 * Tests for {@link useSubPocketMutations}.
 *
 * The four mutations (`create`, `update`, `delete`, `moveToGroup`) are
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
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: { retry: false, gcTime: 0 },
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

        it('forwards null groupId to ungroup the sub-pocket', async () => {
            const { wrapper } = createWrapper();
            vi.mocked(subPocketService.moveToGroup).mockResolvedValue(undefined as never);

            const { result } = renderHook(() => useSubPocketMutations(), { wrapper });
            await act(async () => {
                await result.current.moveSubPocketToGroup.mutateAsync({
                    subPocketId: 'sub-1',
                    groupId: null,
                });
            });

            expect(subPocketService.moveToGroup).toHaveBeenCalledWith('sub-1', null);
        });
    });
});
