import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type ReactNode } from 'react';
import type { Account } from '../../types';

/**
 * Tests for {@link useAccountMutations}. The hook wraps `accountService` and
 * coordinates query invalidation for accounts (and, for cascade deletes,
 * pockets, sub-pockets, and movements). We verify that each mutation:
 *   1. forwards arguments to the right service method,
 *   2. invalidates only the queries documented in the hook's `onSuccess`,
 *   3. mirrors the invalidation set in `broadcastInvalidation`, and
 *   4. surfaces error messages through the toast store.
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

vi.mock('../../services/accountService', () => ({
    accountService: {
        createAccount: vi.fn(),
        updateAccount: vi.fn(),
        deleteAccount: vi.fn(),
        deleteAccountCascade: vi.fn(),
        reorderAccounts: vi.fn(),
    },
}));

vi.mock('../../lib/crossTabSync', () => ({
    broadcastInvalidation: mocks.broadcastInvalidation,
}));

vi.mock('../useToast', () => ({
    useToast: () => mocks.toast,
}));

import { useAccountMutations } from '../queries/useAccountMutations';
import { accountService } from '../../services/accountService';

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

const sampleAccount: Account = {
    id: 'acc-1',
    name: 'Checking',
    color: '#3B82F6',
    currency: 'USD',
    balance: 1500,
    type: 'normal',
    displayOrder: 0,
};

describe('useAccountMutations', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('createAccount', () => {
        it('forwards positional arguments to accountService.createAccount', async () => {
            const { wrapper } = createWrapper();
            vi.mocked(accountService.createAccount).mockResolvedValue(sampleAccount);

            const { result } = renderHook(() => useAccountMutations(), { wrapper });
            await act(async () => {
                await result.current.createAccount.mutateAsync({
                    name: 'Brokerage',
                    color: '#10B981',
                    currency: 'USD',
                    type: 'investment',
                    stockSymbol: 'VOO',
                });
            });

            expect(accountService.createAccount).toHaveBeenCalledWith(
                'Brokerage',
                '#10B981',
                'USD',
                'investment',
                'VOO',
            );
        });

        it('invalidates and broadcasts only the accounts query on success', async () => {
            const { wrapper, invalidateSpy } = createWrapper();
            vi.mocked(accountService.createAccount).mockResolvedValue(sampleAccount);

            const { result } = renderHook(() => useAccountMutations(), { wrapper });
            await act(async () => {
                await result.current.createAccount.mutateAsync({
                    name: 'Brokerage',
                    color: '#10B981',
                    currency: 'USD',
                });
            });

            expect(invalidatedKeys(invalidateSpy)).toEqual([['accounts']]);
            expect(mocks.broadcastInvalidation).toHaveBeenCalledWith([['accounts']]);
        });

        it('toasts the service error message on failure', async () => {
            const { wrapper } = createWrapper();
            vi.mocked(accountService.createAccount).mockRejectedValue(new Error('duplicate name'));

            const { result } = renderHook(() => useAccountMutations(), { wrapper });
            await act(async () => {
                await expect(
                    result.current.createAccount.mutateAsync({
                        name: 'Brokerage',
                        color: '#10B981',
                        currency: 'USD',
                    }),
                ).rejects.toThrow('duplicate name');
            });

            expect(mocks.toast.error).toHaveBeenCalledWith('duplicate name');
        });

        it('falls back to the default error message when the error has no message', async () => {
            const { wrapper } = createWrapper();
            vi.mocked(accountService.createAccount).mockRejectedValue('plain string');

            const { result } = renderHook(() => useAccountMutations(), { wrapper });
            await act(async () => {
                await expect(
                    result.current.createAccount.mutateAsync({
                        name: 'Brokerage',
                        color: '#10B981',
                        currency: 'USD',
                    }),
                ).rejects.toBeDefined();
            });

            expect(mocks.toast.error).toHaveBeenCalledWith('Failed to create account');
        });
    });

    describe('updateAccount', () => {
        it('forwards id and updates payload', async () => {
            const { wrapper } = createWrapper();
            vi.mocked(accountService.updateAccount).mockResolvedValue(sampleAccount);

            const { result } = renderHook(() => useAccountMutations(), { wrapper });
            const updates = { name: 'Renamed', color: '#FF0000' };
            await act(async () => {
                await result.current.updateAccount.mutateAsync({ id: 'acc-1', updates });
            });

            expect(accountService.updateAccount).toHaveBeenCalledWith('acc-1', updates);
        });

        it('invalidates only accounts on success', async () => {
            const { wrapper, invalidateSpy } = createWrapper();
            vi.mocked(accountService.updateAccount).mockResolvedValue(sampleAccount);

            const { result } = renderHook(() => useAccountMutations(), { wrapper });
            await act(async () => {
                await result.current.updateAccount.mutateAsync({ id: 'acc-1', updates: { name: 'Renamed' } });
            });

            expect(invalidatedKeys(invalidateSpy)).toEqual([['accounts']]);
            expect(mocks.broadcastInvalidation).toHaveBeenCalledWith([['accounts']]);
        });
    });

    describe('deleteAccount', () => {
        it('forwards the id to accountService.deleteAccount', async () => {
            const { wrapper } = createWrapper();
            vi.mocked(accountService.deleteAccount).mockResolvedValue(undefined as never);

            const { result } = renderHook(() => useAccountMutations(), { wrapper });
            await act(async () => {
                await result.current.deleteAccount.mutateAsync('acc-1');
            });

            expect(accountService.deleteAccount).toHaveBeenCalledWith('acc-1');
        });

        it('invalidates accounts and pockets (since pockets cascade)', async () => {
            const { wrapper, invalidateSpy } = createWrapper();
            vi.mocked(accountService.deleteAccount).mockResolvedValue(undefined as never);

            const { result } = renderHook(() => useAccountMutations(), { wrapper });
            await act(async () => {
                await result.current.deleteAccount.mutateAsync('acc-1');
            });

            expect(sortKeys(invalidatedKeys(invalidateSpy))).toEqual(
                sortKeys([['accounts'], ['pockets']]),
            );
            expect(mocks.broadcastInvalidation).toHaveBeenCalledWith([['accounts'], ['pockets']]);
        });
    });

    describe('deleteAccountCascade', () => {
        it('forwards id and deleteMovements flag', async () => {
            const { wrapper } = createWrapper();
            vi.mocked(accountService.deleteAccountCascade).mockResolvedValue({} as never);

            const { result } = renderHook(() => useAccountMutations(), { wrapper });
            await act(async () => {
                await result.current.deleteAccountCascade.mutateAsync({ id: 'acc-1', deleteMovements: true });
            });

            expect(accountService.deleteAccountCascade).toHaveBeenCalledWith('acc-1', true);
        });

        it('invalidates accounts, pockets, subPockets, and movements', async () => {
            const { wrapper, invalidateSpy } = createWrapper();
            vi.mocked(accountService.deleteAccountCascade).mockResolvedValue({} as never);

            const { result } = renderHook(() => useAccountMutations(), { wrapper });
            await act(async () => {
                await result.current.deleteAccountCascade.mutateAsync({ id: 'acc-1', deleteMovements: false });
            });

            expect(sortKeys(invalidatedKeys(invalidateSpy))).toEqual(
                sortKeys([['accounts'], ['pockets'], ['subPockets'], ['movements']]),
            );
            expect(mocks.broadcastInvalidation).toHaveBeenCalledWith([
                ['accounts'],
                ['pockets'],
                ['subPockets'],
                ['movements'],
            ]);
        });
    });

    describe('reorderAccounts', () => {
        it('passes only the ids (in order) to accountService.reorderAccounts', async () => {
            const { wrapper } = createWrapper();
            vi.mocked(accountService.reorderAccounts).mockResolvedValue(undefined as never);

            const accounts: Account[] = [
                { ...sampleAccount, id: 'acc-1' },
                { ...sampleAccount, id: 'acc-2' },
                { ...sampleAccount, id: 'acc-3' },
            ];

            const { result } = renderHook(() => useAccountMutations(), { wrapper });
            await act(async () => {
                await result.current.reorderAccounts.mutateAsync(accounts);
            });

            expect(accountService.reorderAccounts).toHaveBeenCalledWith(['acc-1', 'acc-2', 'acc-3']);
        });

        it('invalidates only accounts on success', async () => {
            const { wrapper, invalidateSpy } = createWrapper();
            vi.mocked(accountService.reorderAccounts).mockResolvedValue(undefined as never);

            const { result } = renderHook(() => useAccountMutations(), { wrapper });
            await act(async () => {
                await result.current.reorderAccounts.mutateAsync([sampleAccount]);
            });

            expect(invalidatedKeys(invalidateSpy)).toEqual([['accounts']]);
        });

        it('toasts the failure message on error', async () => {
            const { wrapper } = createWrapper();
            vi.mocked(accountService.reorderAccounts).mockRejectedValue(new Error('reorder failed'));

            const { result } = renderHook(() => useAccountMutations(), { wrapper });
            await act(async () => {
                await expect(
                    result.current.reorderAccounts.mutateAsync([sampleAccount]),
                ).rejects.toThrow('reorder failed');
            });

            expect(mocks.toast.error).toHaveBeenCalledWith('reorder failed');
        });
    });
});
