import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type ReactNode } from 'react';

/**
 * Tests for {@link useFixedExpenseGroupMutations}. The hook wraps
 * `fixedExpenseGroupService`. Behaviors we want pinned:
 *   - Each mutation forwards its arguments to the underlying service.
 *   - Each mutation invalidates the right query keys on success.
 *     - create / update / reorder → ['fixedExpenseGroups']
 *     - delete → ['fixedExpenseGroups'] + ['subPockets']
 *       (delete moves expenses into the Default group, so the sub-pocket
 *       cache must refetch)
 *   - On failure each mutation surfaces the error message via toast,
 *     falling back to a per-mutation default when the error has none.
 */

const mocks = vi.hoisted(() => ({
    toast: {
        success: vi.fn(),
        error: vi.fn(),
        info: vi.fn(),
        warning: vi.fn(),
    },
}));

vi.mock('../../services/fixedExpenseGroupService', () => ({
    fixedExpenseGroupService: {
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        reorder: vi.fn(),
    },
}));

vi.mock('../useToast', () => ({
    useToast: () => mocks.toast,
}));

import { useFixedExpenseGroupMutations } from '../queries/useFixedExpenseGroupMutations';
import { fixedExpenseGroupService } from '../../services/fixedExpenseGroupService';

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

describe('useFixedExpenseGroupMutations', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('createFixedExpenseGroup', () => {
        it('forwards name and color to fixedExpenseGroupService.create', async () => {
            const { wrapper } = createWrapper();
            vi.mocked(fixedExpenseGroupService.create).mockResolvedValue({
                id: 'grp-1',
                name: 'Utilities',
                color: '#3B82F6',
                displayOrder: 0,
            } as never);

            const { result } = renderHook(() => useFixedExpenseGroupMutations(), { wrapper });
            await act(async () => {
                await result.current.createFixedExpenseGroup.mutateAsync({
                    name: 'Utilities',
                    color: '#3B82F6',
                });
            });

            expect(fixedExpenseGroupService.create).toHaveBeenCalledWith('Utilities', '#3B82F6');
        });

        it('invalidates only the fixedExpenseGroups query', async () => {
            const { wrapper, invalidateSpy } = createWrapper();
            vi.mocked(fixedExpenseGroupService.create).mockResolvedValue({} as never);

            const { result } = renderHook(() => useFixedExpenseGroupMutations(), { wrapper });
            await act(async () => {
                await result.current.createFixedExpenseGroup.mutateAsync({
                    name: 'Utilities',
                    color: '#3B82F6',
                });
            });

            expect(invalidatedKeys(invalidateSpy)).toEqual([['fixedExpenseGroups']]);
        });

        it('toasts the service error message on failure', async () => {
            const { wrapper } = createWrapper();
            vi.mocked(fixedExpenseGroupService.create).mockRejectedValue(
                new Error('duplicate group'),
            );

            const { result } = renderHook(() => useFixedExpenseGroupMutations(), { wrapper });
            await act(async () => {
                await expect(
                    result.current.createFixedExpenseGroup.mutateAsync({
                        name: 'Utilities',
                        color: '#3B82F6',
                    }),
                ).rejects.toThrow('duplicate group');
            });

            expect(mocks.toast.error).toHaveBeenCalledWith('duplicate group');
        });

        it('falls back to "Failed to create group" when the error has no message', async () => {
            const { wrapper } = createWrapper();
            vi.mocked(fixedExpenseGroupService.create).mockRejectedValue(new Error(''));

            const { result } = renderHook(() => useFixedExpenseGroupMutations(), { wrapper });
            await act(async () => {
                await expect(
                    result.current.createFixedExpenseGroup.mutateAsync({
                        name: 'Utilities',
                        color: '#3B82F6',
                    }),
                ).rejects.toBeDefined();
            });

            expect(mocks.toast.error).toHaveBeenCalledWith('Failed to create group');
        });
    });

    describe('updateFixedExpenseGroup', () => {
        it('forwards id, name, and color to the service', async () => {
            const { wrapper } = createWrapper();
            vi.mocked(fixedExpenseGroupService.update).mockResolvedValue(undefined as never);

            const { result } = renderHook(() => useFixedExpenseGroupMutations(), { wrapper });
            await act(async () => {
                await result.current.updateFixedExpenseGroup.mutateAsync({
                    id: 'grp-1',
                    name: 'Renamed',
                    color: '#22C55E',
                });
            });

            expect(fixedExpenseGroupService.update).toHaveBeenCalledWith(
                'grp-1',
                'Renamed',
                '#22C55E',
            );
        });

        it('invalidates only the fixedExpenseGroups query', async () => {
            const { wrapper, invalidateSpy } = createWrapper();
            vi.mocked(fixedExpenseGroupService.update).mockResolvedValue(undefined as never);

            const { result } = renderHook(() => useFixedExpenseGroupMutations(), { wrapper });
            await act(async () => {
                await result.current.updateFixedExpenseGroup.mutateAsync({
                    id: 'grp-1',
                    name: 'Renamed',
                    color: '#22C55E',
                });
            });

            expect(invalidatedKeys(invalidateSpy)).toEqual([['fixedExpenseGroups']]);
        });

        it('falls back to "Failed to update group" on a message-less error', async () => {
            const { wrapper } = createWrapper();
            vi.mocked(fixedExpenseGroupService.update).mockRejectedValue(new Error(''));

            const { result } = renderHook(() => useFixedExpenseGroupMutations(), { wrapper });
            await act(async () => {
                await expect(
                    result.current.updateFixedExpenseGroup.mutateAsync({
                        id: 'grp-1',
                        name: 'X',
                        color: '#000',
                    }),
                ).rejects.toBeDefined();
            });

            expect(mocks.toast.error).toHaveBeenCalledWith('Failed to update group');
        });
    });

    describe('deleteFixedExpenseGroup', () => {
        it('forwards the id to fixedExpenseGroupService.delete', async () => {
            const { wrapper } = createWrapper();
            vi.mocked(fixedExpenseGroupService.delete).mockResolvedValue(undefined as never);

            const { result } = renderHook(() => useFixedExpenseGroupMutations(), { wrapper });
            await act(async () => {
                await result.current.deleteFixedExpenseGroup.mutateAsync('grp-1');
            });

            expect(fixedExpenseGroupService.delete).toHaveBeenCalledWith('grp-1');
        });

        it('invalidates fixedExpenseGroups AND subPockets (members move to Default)', async () => {
            const { wrapper, invalidateSpy } = createWrapper();
            vi.mocked(fixedExpenseGroupService.delete).mockResolvedValue(undefined as never);

            const { result } = renderHook(() => useFixedExpenseGroupMutations(), { wrapper });
            await act(async () => {
                await result.current.deleteFixedExpenseGroup.mutateAsync('grp-1');
            });

            expect(sortKeys(invalidatedKeys(invalidateSpy))).toEqual(
                sortKeys([['fixedExpenseGroups'], ['subPockets']]),
            );
        });

        it('falls back to "Failed to delete group" on a message-less error', async () => {
            const { wrapper } = createWrapper();
            vi.mocked(fixedExpenseGroupService.delete).mockRejectedValue(new Error(''));

            const { result } = renderHook(() => useFixedExpenseGroupMutations(), { wrapper });
            await act(async () => {
                await expect(
                    result.current.deleteFixedExpenseGroup.mutateAsync('grp-1'),
                ).rejects.toBeDefined();
            });

            expect(mocks.toast.error).toHaveBeenCalledWith('Failed to delete group');
        });
    });

    describe('reorderFixedExpenseGroups', () => {
        it('forwards the ordered ids array to fixedExpenseGroupService.reorder', async () => {
            const { wrapper } = createWrapper();
            vi.mocked(fixedExpenseGroupService.reorder).mockResolvedValue(undefined as never);

            const { result } = renderHook(() => useFixedExpenseGroupMutations(), { wrapper });
            await act(async () => {
                await result.current.reorderFixedExpenseGroups.mutateAsync([
                    'grp-3',
                    'grp-1',
                    'grp-2',
                ]);
            });

            expect(fixedExpenseGroupService.reorder).toHaveBeenCalledWith([
                'grp-3',
                'grp-1',
                'grp-2',
            ]);
        });

        it('invalidates only the fixedExpenseGroups query', async () => {
            const { wrapper, invalidateSpy } = createWrapper();
            vi.mocked(fixedExpenseGroupService.reorder).mockResolvedValue(undefined as never);

            const { result } = renderHook(() => useFixedExpenseGroupMutations(), { wrapper });
            await act(async () => {
                await result.current.reorderFixedExpenseGroups.mutateAsync(['grp-1', 'grp-2']);
            });

            expect(invalidatedKeys(invalidateSpy)).toEqual([['fixedExpenseGroups']]);
        });

        it('falls back to "Failed to reorder groups" on a message-less error', async () => {
            const { wrapper } = createWrapper();
            vi.mocked(fixedExpenseGroupService.reorder).mockRejectedValue(new Error(''));

            const { result } = renderHook(() => useFixedExpenseGroupMutations(), { wrapper });
            await act(async () => {
                await expect(
                    result.current.reorderFixedExpenseGroups.mutateAsync(['grp-1']),
                ).rejects.toBeDefined();
            });

            expect(mocks.toast.error).toHaveBeenCalledWith('Failed to reorder groups');
        });
    });
});
