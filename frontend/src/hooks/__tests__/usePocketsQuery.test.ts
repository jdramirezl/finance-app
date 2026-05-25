import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type ReactNode } from 'react';
import type { Pocket } from '../../types';

/**
 * Tests for {@link usePocketsWithArchived}. The hook is a sibling of
 * `usePocketsQuery` that:
 *   1. forwards `includeArchived = true` to `pocketService.getAllPockets`,
 *   2. uses a distinct query key (`['pockets', 'include-archived']`) so it
 *      caches independently from the default pockets query, and
 *   3. surfaces query errors on the result.
 */

vi.mock('../../services/pocketService', () => ({
    pocketService: {
        getAllPockets: vi.fn(),
        getPocket: vi.fn(),
        getPocketsByAccount: vi.fn(),
    },
}));

import { usePocketsWithArchived } from '../queries/usePocketsQuery';
import { pocketService } from '../../services/pocketService';

const createWrapper = () => {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: { retry: false, gcTime: 0 },
        },
    });
    const wrapper = ({ children }: { children: ReactNode }) =>
        createElement(QueryClientProvider, { client: queryClient }, children);
    return { wrapper, queryClient };
};

const sampleActive: Pocket = {
    id: 'pkt-1',
    accountId: 'acc-1',
    name: 'Savings',
    type: 'normal',
    balance: 100,
    currency: 'USD',
    displayOrder: 0,
};

const sampleArchived: Pocket = {
    id: 'pkt-2',
    accountId: 'acc-1',
    name: 'Old Travel',
    type: 'normal',
    balance: 0,
    currency: 'USD',
    displayOrder: 1,
    archivedAt: '2024-01-01T00:00:00.000Z',
};

describe('usePocketsWithArchived', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('calls pocketService.getAllPockets(true) and returns both active and archived pockets', async () => {
        const { wrapper } = createWrapper();
        vi.mocked(pocketService.getAllPockets).mockResolvedValue([sampleActive, sampleArchived]);

        const { result } = renderHook(() => usePocketsWithArchived(), { wrapper });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(pocketService.getAllPockets).toHaveBeenCalledWith(true);
        expect(result.current.data).toEqual([sampleActive, sampleArchived]);
    });

    it('uses a distinct query key from the default pockets query', async () => {
        const { wrapper, queryClient } = createWrapper();
        vi.mocked(pocketService.getAllPockets).mockResolvedValue([sampleActive, sampleArchived]);

        const { result } = renderHook(() => usePocketsWithArchived(), { wrapper });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        // The cached entry must live under the include-archived key, not the
        // default `['pockets']` key — pages that opt in to archived pockets
        // should not poison the cache used by the default query.
        expect(queryClient.getQueryData(['pockets', 'include-archived'])).toEqual([
            sampleActive,
            sampleArchived,
        ]);
        expect(queryClient.getQueryData(['pockets'])).toBeUndefined();
    });

    it('surfaces query errors on the result', async () => {
        const { wrapper } = createWrapper();
        vi.mocked(pocketService.getAllPockets).mockRejectedValue(new Error('500'));

        const { result } = renderHook(() => usePocketsWithArchived(), { wrapper });

        await waitFor(() => expect(result.current.isError).toBe(true));
        expect((result.current.error as Error).message).toBe('500');
    });
});
