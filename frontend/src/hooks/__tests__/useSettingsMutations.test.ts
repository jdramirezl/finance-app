import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type ReactNode } from 'react';
import type { Settings } from '../../types';

/**
 * Tests for {@link useUpdateSettings}. The hook is a thin wrapper around
 * `settingsService.updateSettings` and:
 *   1. forwards the full settings payload to the service,
 *   2. invalidates the `['settings']` query on success (without firing a
 *      success toast — Settings has its own UI for the save state), and
 *   3. surfaces errors through the toast store with the documented
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

vi.mock('../../services/settingsService', () => ({
    settingsService: {
        getSettings: vi.fn(),
        updateSettings: vi.fn(),
    },
}));

vi.mock('../useToast', () => ({
    useToast: () => mocks.toast,
}));

import { useUpdateSettings } from '../queries/useSettingsMutations';
import { settingsService } from '../../services/settingsService';

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

const baseSettings: Settings = {
    primaryCurrency: 'USD',
    dateFormat: 'MM/dd/yyyy',
    movementsPerPage: 20,
    reminderAdvanceDays: 7,
    defaultCurrencyForNewAccounts: 'USD',
};

describe('useUpdateSettings', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('forwards the full settings payload to settingsService.updateSettings', async () => {
        const { wrapper } = createWrapper();
        vi.mocked(settingsService.updateSettings).mockResolvedValue(baseSettings);

        const updated: Settings = {
            ...baseSettings,
            primaryCurrency: 'MXN',
            movementsPerPage: 50,
        };

        const { result } = renderHook(() => useUpdateSettings(), { wrapper });
        await act(async () => {
            await result.current.mutateAsync(updated);
        });

        expect(settingsService.updateSettings).toHaveBeenCalledWith(updated);
    });

    it('invalidates ["settings"] on success and does NOT toast success', async () => {
        const { wrapper, invalidateSpy } = createWrapper();
        vi.mocked(settingsService.updateSettings).mockResolvedValue(baseSettings);

        const { result } = renderHook(() => useUpdateSettings(), { wrapper });
        await act(async () => {
            await result.current.mutateAsync(baseSettings);
        });

        expect(invalidatedKeys(invalidateSpy)).toEqual([['settings']]);
        expect(mocks.toast.success).not.toHaveBeenCalled();
        expect(mocks.toast.error).not.toHaveBeenCalled();
    });

    it('does not invalidate any queries when the mutation rejects', async () => {
        const { wrapper, invalidateSpy } = createWrapper();
        vi.mocked(settingsService.updateSettings).mockRejectedValue(new Error('bad currency'));

        const { result } = renderHook(() => useUpdateSettings(), { wrapper });
        await act(async () => {
            await expect(result.current.mutateAsync(baseSettings)).rejects.toThrow('bad currency');
        });

        expect(invalidatedKeys(invalidateSpy)).toEqual([]);
    });

    it('toasts the service error message on failure', async () => {
        const { wrapper } = createWrapper();
        vi.mocked(settingsService.updateSettings).mockRejectedValue(new Error('bad currency'));

        const { result } = renderHook(() => useUpdateSettings(), { wrapper });
        await act(async () => {
            await expect(result.current.mutateAsync(baseSettings)).rejects.toThrow('bad currency');
        });

        expect(mocks.toast.error).toHaveBeenCalledWith('bad currency');
        expect(mocks.toast.success).not.toHaveBeenCalled();
    });

    it('falls back to the default error message when the error has no message', async () => {
        const { wrapper } = createWrapper();
        vi.mocked(settingsService.updateSettings).mockRejectedValue(new Error(''));

        const { result } = renderHook(() => useUpdateSettings(), { wrapper });
        await act(async () => {
            await expect(result.current.mutateAsync(baseSettings)).rejects.toBeDefined();
        });

        expect(mocks.toast.error).toHaveBeenCalledWith('Failed to update settings');
    });

    it('falls back to the default error message when the rejection is not an Error instance', async () => {
        const { wrapper } = createWrapper();
        vi.mocked(settingsService.updateSettings).mockRejectedValue('plain string');

        const { result } = renderHook(() => useUpdateSettings(), { wrapper });
        await act(async () => {
            await expect(result.current.mutateAsync(baseSettings)).rejects.toBeDefined();
        });

        expect(mocks.toast.error).toHaveBeenCalledWith('Failed to update settings');
    });
});
