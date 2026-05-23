import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type ReactNode } from 'react';
import type {
    CreateSnapshotDTO,
    NetWorthSnapshot,
} from '../../services/netWorthSnapshotService';

/**
 * Tests for {@link useNetWorthSnapshotsQuery}, {@link useLatestSnapshotQuery}
 * and {@link useNetWorthSnapshotMutations}. The hooks wrap
 * `netWorthSnapshotService` and:
 *   1. forward arguments to the right service methods,
 *   2. invalidate `['netWorthSnapshots']` on every successful mutation
 *      (which also invalidates the `['netWorthSnapshots', 'latest']`
 *      sub-key thanks to TanStack's prefix matching),
 *   3. fire success toasts with the documented messages, and
 *   4. surface errors through the toast store with the documented
 *      fallback when the error has no message.
 */

const mocks = vi.hoisted(() => ({
    toast: {
        success: vi.fn(),
        error: vi.fn(),
        info: vi.fn(),
        warning: vi.fn(),
    },
}));

vi.mock('../../services/netWorthSnapshotService', () => ({
    netWorthSnapshotService: {
        getAll: vi.fn(),
        getLatest: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
    },
}));

vi.mock('../useToast', () => ({
    useToast: () => mocks.toast,
}));

import {
    useNetWorthSnapshotsQuery,
    useLatestSnapshotQuery,
    useNetWorthSnapshotMutations,
} from '../queries/useNetWorthSnapshotQueries';
import { netWorthSnapshotService } from '../../services/netWorthSnapshotService';

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

const sampleSnapshot: NetWorthSnapshot = {
    id: 'snap-1',
    userId: 'user-1',
    snapshotDate: '2026-05-22',
    totalNetWorth: 12345.67,
    baseCurrency: 'USD',
    breakdown: { USD: 10000, MXN: 2345.67 },
    createdAt: '2026-05-22T00:00:00Z',
};

const sampleDto: CreateSnapshotDTO = {
    totalNetWorth: 12345.67,
    baseCurrency: 'USD',
    breakdown: { USD: 10000, MXN: 2345.67 },
};

describe('useNetWorthSnapshotsQuery', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('calls netWorthSnapshotService.getAll and exposes the data', async () => {
        const { wrapper } = createWrapper();
        vi.mocked(netWorthSnapshotService.getAll).mockResolvedValue([sampleSnapshot]);

        const { result } = renderHook(() => useNetWorthSnapshotsQuery(), { wrapper });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(netWorthSnapshotService.getAll).toHaveBeenCalledTimes(1);
        expect(result.current.data).toEqual([sampleSnapshot]);
    });

    it('surfaces query errors on the result', async () => {
        const { wrapper } = createWrapper();
        vi.mocked(netWorthSnapshotService.getAll).mockRejectedValue(new Error('500'));

        const { result } = renderHook(() => useNetWorthSnapshotsQuery(), { wrapper });

        await waitFor(() => expect(result.current.isError).toBe(true));
        expect((result.current.error as Error).message).toBe('500');
    });
});

describe('useLatestSnapshotQuery', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('calls netWorthSnapshotService.getLatest and exposes the data', async () => {
        const { wrapper } = createWrapper();
        vi.mocked(netWorthSnapshotService.getLatest).mockResolvedValue(sampleSnapshot);

        const { result } = renderHook(() => useLatestSnapshotQuery(), { wrapper });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(netWorthSnapshotService.getLatest).toHaveBeenCalledTimes(1);
        expect(result.current.data).toEqual(sampleSnapshot);
    });

    it('returns null when the user has no snapshots yet', async () => {
        const { wrapper } = createWrapper();
        vi.mocked(netWorthSnapshotService.getLatest).mockResolvedValue(null);

        const { result } = renderHook(() => useLatestSnapshotQuery(), { wrapper });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toBeNull();
    });
});

describe('useNetWorthSnapshotMutations', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('createMutation', () => {
        it('forwards the DTO to netWorthSnapshotService.create', async () => {
            const { wrapper } = createWrapper();
            vi.mocked(netWorthSnapshotService.create).mockResolvedValue(sampleSnapshot);

            const { result } = renderHook(() => useNetWorthSnapshotMutations(), { wrapper });
            await act(async () => {
                await result.current.createMutation.mutateAsync(sampleDto);
            });

            expect(netWorthSnapshotService.create).toHaveBeenCalledWith(sampleDto);
        });

        it('invalidates ["netWorthSnapshots"] and toasts success on success', async () => {
            const { wrapper, invalidateSpy } = createWrapper();
            vi.mocked(netWorthSnapshotService.create).mockResolvedValue(sampleSnapshot);

            const { result } = renderHook(() => useNetWorthSnapshotMutations(), { wrapper });
            await act(async () => {
                await result.current.createMutation.mutateAsync(sampleDto);
            });

            expect(invalidatedKeys(invalidateSpy)).toEqual([['netWorthSnapshots']]);
            expect(mocks.toast.success).toHaveBeenCalledWith('Snapshot created');
        });

        it('toasts the service error message on failure', async () => {
            const { wrapper } = createWrapper();
            vi.mocked(netWorthSnapshotService.create).mockRejectedValue(new Error('boom'));

            const { result } = renderHook(() => useNetWorthSnapshotMutations(), { wrapper });
            await act(async () => {
                await expect(
                    result.current.createMutation.mutateAsync(sampleDto),
                ).rejects.toThrow('boom');
            });

            expect(mocks.toast.error).toHaveBeenCalledWith('boom');
        });

        it('falls back to the default error message when the error has no message', async () => {
            const { wrapper } = createWrapper();
            vi.mocked(netWorthSnapshotService.create).mockRejectedValue('plain string');

            const { result } = renderHook(() => useNetWorthSnapshotMutations(), { wrapper });
            await act(async () => {
                await expect(
                    result.current.createMutation.mutateAsync(sampleDto),
                ).rejects.toBeDefined();
            });

            expect(mocks.toast.error).toHaveBeenCalledWith('Failed to create snapshot');
        });
    });

    describe('updateMutation', () => {
        it('forwards id and partial DTO to netWorthSnapshotService.update', async () => {
            const { wrapper } = createWrapper();
            vi.mocked(netWorthSnapshotService.update).mockResolvedValue(sampleSnapshot);

            const data: Partial<CreateSnapshotDTO> = { totalNetWorth: 99999 };

            const { result } = renderHook(() => useNetWorthSnapshotMutations(), { wrapper });
            await act(async () => {
                await result.current.updateMutation.mutateAsync({ id: 'snap-1', data });
            });

            expect(netWorthSnapshotService.update).toHaveBeenCalledWith('snap-1', data);
        });

        it('invalidates ["netWorthSnapshots"] and toasts success', async () => {
            const { wrapper, invalidateSpy } = createWrapper();
            vi.mocked(netWorthSnapshotService.update).mockResolvedValue(sampleSnapshot);

            const { result } = renderHook(() => useNetWorthSnapshotMutations(), { wrapper });
            await act(async () => {
                await result.current.updateMutation.mutateAsync({
                    id: 'snap-1',
                    data: { totalNetWorth: 99999 },
                });
            });

            expect(invalidatedKeys(invalidateSpy)).toEqual([['netWorthSnapshots']]);
            expect(mocks.toast.success).toHaveBeenCalledWith('Snapshot updated');
        });

        it('falls back to the default error message when the error has no message', async () => {
            const { wrapper } = createWrapper();
            vi.mocked(netWorthSnapshotService.update).mockRejectedValue(new Error(''));

            const { result } = renderHook(() => useNetWorthSnapshotMutations(), { wrapper });
            await act(async () => {
                await expect(
                    result.current.updateMutation.mutateAsync({
                        id: 'snap-1',
                        data: { totalNetWorth: 1 },
                    }),
                ).rejects.toBeDefined();
            });

            expect(mocks.toast.error).toHaveBeenCalledWith('Failed to update snapshot');
        });
    });

    describe('deleteMutation', () => {
        it('forwards the id to netWorthSnapshotService.delete', async () => {
            const { wrapper } = createWrapper();
            vi.mocked(netWorthSnapshotService.delete).mockResolvedValue(undefined);

            const { result } = renderHook(() => useNetWorthSnapshotMutations(), { wrapper });
            await act(async () => {
                await result.current.deleteMutation.mutateAsync('snap-1');
            });

            expect(netWorthSnapshotService.delete).toHaveBeenCalledWith('snap-1');
        });

        it('invalidates ["netWorthSnapshots"] and toasts success', async () => {
            const { wrapper, invalidateSpy } = createWrapper();
            vi.mocked(netWorthSnapshotService.delete).mockResolvedValue(undefined);

            const { result } = renderHook(() => useNetWorthSnapshotMutations(), { wrapper });
            await act(async () => {
                await result.current.deleteMutation.mutateAsync('snap-1');
            });

            expect(invalidatedKeys(invalidateSpy)).toEqual([['netWorthSnapshots']]);
            expect(mocks.toast.success).toHaveBeenCalledWith('Snapshot deleted');
        });

        it('toasts the service error message on failure', async () => {
            const { wrapper } = createWrapper();
            vi.mocked(netWorthSnapshotService.delete).mockRejectedValue(new Error('not found'));

            const { result } = renderHook(() => useNetWorthSnapshotMutations(), { wrapper });
            await act(async () => {
                await expect(
                    result.current.deleteMutation.mutateAsync('snap-1'),
                ).rejects.toThrow('not found');
            });

            expect(mocks.toast.error).toHaveBeenCalledWith('not found');
        });

        it('falls back to the default error message when the error has no message', async () => {
            const { wrapper } = createWrapper();
            vi.mocked(netWorthSnapshotService.delete).mockRejectedValue('plain string');

            const { result } = renderHook(() => useNetWorthSnapshotMutations(), { wrapper });
            await act(async () => {
                await expect(
                    result.current.deleteMutation.mutateAsync('snap-1'),
                ).rejects.toBeDefined();
            });

            expect(mocks.toast.error).toHaveBeenCalledWith('Failed to delete snapshot');
        });
    });
});
