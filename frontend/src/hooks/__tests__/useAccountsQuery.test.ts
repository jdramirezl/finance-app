import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type ReactNode } from 'react';
import type { Account } from '../../types';

/**
 * Tests for {@link useAccountsWithArchived}. The hook is a sibling of
 * `useAccountsQuery` that:
 *   1. forwards `includeArchived = true` to `accountService.getAllAccounts`,
 *   2. uses a distinct query key (`['accounts', 'include-archived']`) so it
 *      caches independently from the default accounts query, and
 *   3. surfaces query errors on the result.
 */

vi.mock('../../services/accountService', () => ({
    accountService: {
        getAllAccounts: vi.fn(),
        getAccount: vi.fn(),
    },
}));

import { useAccountsWithArchived } from '../queries/useAccountsQuery';
import { accountService } from '../../services/accountService';

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

const sampleActive: Account = {
    id: 'acc-1',
    name: 'Checking',
    color: '#3B82F6',
    currency: 'USD',
    balance: 1500,
    type: 'normal',
    displayOrder: 0,
};

const sampleArchived: Account = {
    id: 'acc-2',
    name: 'Old Savings',
    color: '#10B981',
    currency: 'USD',
    balance: 0,
    type: 'normal',
    displayOrder: 1,
};

describe('useAccountsWithArchived', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('calls accountService.getAllAccounts(true) and returns both active and archived accounts', async () => {
        const { wrapper } = createWrapper();
        vi.mocked(accountService.getAllAccounts).mockResolvedValue([sampleActive, sampleArchived]);

        const { result } = renderHook(() => useAccountsWithArchived(), { wrapper });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(accountService.getAllAccounts).toHaveBeenCalledWith(true);
        expect(result.current.data).toEqual([sampleActive, sampleArchived]);
    });

    it('uses a distinct query key from the default accounts query', async () => {
        const { wrapper, queryClient } = createWrapper();
        vi.mocked(accountService.getAllAccounts).mockResolvedValue([sampleActive, sampleArchived]);

        const { result } = renderHook(() => useAccountsWithArchived(), { wrapper });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        // The cached entry must live under the include-archived key, not the
        // default `['accounts']` key — pages that opt in to archived accounts
        // should not poison the cache used by the default query.
        expect(queryClient.getQueryData(['accounts', 'include-archived'])).toEqual([
            sampleActive,
            sampleArchived,
        ]);
        expect(queryClient.getQueryData(['accounts'])).toBeUndefined();
    });

    it('surfaces query errors on the result', async () => {
        const { wrapper } = createWrapper();
        vi.mocked(accountService.getAllAccounts).mockRejectedValue(new Error('500'));

        const { result } = renderHook(() => useAccountsWithArchived(), { wrapper });

        await waitFor(() => expect(result.current.isError).toBe(true));
        expect((result.current.error as Error).message).toBe('500');
    });
});
