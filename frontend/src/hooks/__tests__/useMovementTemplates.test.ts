import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type ReactNode } from 'react';
import type { MovementTemplate } from '../../types';

/**
 * Tests for {@link useMovementTemplatesQuery} and
 * {@link useMovementTemplateMutations}. The mutation hook is intentionally
 * silent on success — it only invalidates the `['movementTemplates']` query —
 * but it does surface errors via the toast store. We assert:
 *   1. arguments are forwarded to `movementTemplateService` (in particular
 *      that the create mutation expands the data object into the correct
 *      positional argument order),
 *   2. the templates query is invalidated on success,
 *   3. no success toast fires (the hook explicitly omits one), and
 *   4. error messages flow through the toast store with the documented
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

vi.mock('../../services/movementTemplateService', () => ({
    movementTemplateService: {
        getAllTemplates: vi.fn(),
        createTemplate: vi.fn(),
        updateTemplate: vi.fn(),
        deleteTemplate: vi.fn(),
    },
}));

vi.mock('../useToast', () => ({
    useToast: () => mocks.toast,
}));

import {
    useMovementTemplatesQuery,
    useMovementTemplateMutations,
} from '../queries/useMovementTemplates';
import { movementTemplateService } from '../../services/movementTemplateService';

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

const sampleTemplate: MovementTemplate = {
    id: 'tpl-1',
    name: 'Monthly Rent',
    type: 'EgresoFijo',
    accountId: 'acc-1',
    pocketId: 'pkt-1',
    subPocketId: null,
    defaultAmount: 1500,
    notes: null,
    createdAt: '2026-05-01T00:00:00Z',
    updatedAt: '2026-05-01T00:00:00Z',
};

describe('useMovementTemplatesQuery', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('calls movementTemplateService.getAllTemplates and exposes the data', async () => {
        const { wrapper } = createWrapper();
        vi.mocked(movementTemplateService.getAllTemplates).mockResolvedValue([sampleTemplate]);

        const { result } = renderHook(() => useMovementTemplatesQuery(), { wrapper });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(movementTemplateService.getAllTemplates).toHaveBeenCalledTimes(1);
        expect(result.current.data).toEqual([sampleTemplate]);
    });

    it('surfaces query errors on the result', async () => {
        const { wrapper } = createWrapper();
        vi.mocked(movementTemplateService.getAllTemplates).mockRejectedValue(new Error('500'));

        const { result } = renderHook(() => useMovementTemplatesQuery(), { wrapper });

        await waitFor(() => expect(result.current.isError).toBe(true));
        expect((result.current.error as Error).message).toBe('500');
    });
});

describe('useMovementTemplateMutations', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('createMovementTemplate', () => {
        it('expands the data object into positional arguments for createTemplate', async () => {
            const { wrapper } = createWrapper();
            vi.mocked(movementTemplateService.createTemplate).mockResolvedValue(sampleTemplate);

            const { result } = renderHook(() => useMovementTemplateMutations(), { wrapper });
            await act(async () => {
                await result.current.createMovementTemplate.mutateAsync({
                    name: 'Monthly Rent',
                    type: 'EgresoFijo',
                    accountId: 'acc-1',
                    pocketId: 'pkt-1',
                    defaultAmount: 1500,
                    notes: 'lease A',
                    subPocketId: 'sub-1',
                });
            });

            expect(movementTemplateService.createTemplate).toHaveBeenCalledWith(
                'Monthly Rent',
                'EgresoFijo',
                'acc-1',
                'pkt-1',
                1500,
                'lease A',
                'sub-1',
            );
        });

        it('forwards undefined for optional fields when omitted', async () => {
            const { wrapper } = createWrapper();
            vi.mocked(movementTemplateService.createTemplate).mockResolvedValue(sampleTemplate);

            const { result } = renderHook(() => useMovementTemplateMutations(), { wrapper });
            await act(async () => {
                await result.current.createMovementTemplate.mutateAsync({
                    name: 'Coffee',
                    type: 'EgresoNormal',
                    accountId: 'acc-2',
                    pocketId: 'pkt-2',
                });
            });

            expect(movementTemplateService.createTemplate).toHaveBeenCalledWith(
                'Coffee',
                'EgresoNormal',
                'acc-2',
                'pkt-2',
                undefined,
                undefined,
                undefined,
            );
        });

        it('invalidates ["movementTemplates"] on success and does NOT toast success', async () => {
            const { wrapper, invalidateSpy } = createWrapper();
            vi.mocked(movementTemplateService.createTemplate).mockResolvedValue(sampleTemplate);

            const { result } = renderHook(() => useMovementTemplateMutations(), { wrapper });
            await act(async () => {
                await result.current.createMovementTemplate.mutateAsync({
                    name: 'Coffee',
                    type: 'EgresoNormal',
                    accountId: 'acc-2',
                    pocketId: 'pkt-2',
                });
            });

            expect(invalidatedKeys(invalidateSpy)).toEqual([['movementTemplates']]);
            expect(mocks.toast.success).not.toHaveBeenCalled();
            expect(mocks.toast.error).not.toHaveBeenCalled();
        });

        it('toasts the service error message on failure', async () => {
            const { wrapper } = createWrapper();
            vi.mocked(movementTemplateService.createTemplate).mockRejectedValue(
                new Error('duplicate name'),
            );

            const { result } = renderHook(() => useMovementTemplateMutations(), { wrapper });
            await act(async () => {
                await expect(
                    result.current.createMovementTemplate.mutateAsync({
                        name: 'Coffee',
                        type: 'EgresoNormal',
                        accountId: 'acc-2',
                        pocketId: 'pkt-2',
                    }),
                ).rejects.toThrow('duplicate name');
            });

            expect(mocks.toast.error).toHaveBeenCalledWith('duplicate name');
        });

        it('falls back to the default error message when the error has no message', async () => {
            const { wrapper } = createWrapper();
            vi.mocked(movementTemplateService.createTemplate).mockRejectedValue('plain string');

            const { result } = renderHook(() => useMovementTemplateMutations(), { wrapper });
            await act(async () => {
                await expect(
                    result.current.createMovementTemplate.mutateAsync({
                        name: 'Coffee',
                        type: 'EgresoNormal',
                        accountId: 'acc-2',
                        pocketId: 'pkt-2',
                    }),
                ).rejects.toBeDefined();
            });

            expect(mocks.toast.error).toHaveBeenCalledWith('Failed to create template');
        });
    });

    describe('updateMovementTemplate', () => {
        it('forwards id and updates payload to updateTemplate', async () => {
            const { wrapper } = createWrapper();
            vi.mocked(movementTemplateService.updateTemplate).mockResolvedValue(sampleTemplate);

            const updates = { name: 'Renamed', defaultAmount: 2000 };

            const { result } = renderHook(() => useMovementTemplateMutations(), { wrapper });
            await act(async () => {
                await result.current.updateMovementTemplate.mutateAsync({
                    id: 'tpl-1',
                    updates,
                });
            });

            expect(movementTemplateService.updateTemplate).toHaveBeenCalledWith('tpl-1', updates);
        });

        it('invalidates ["movementTemplates"] on success and does NOT toast success', async () => {
            const { wrapper, invalidateSpy } = createWrapper();
            vi.mocked(movementTemplateService.updateTemplate).mockResolvedValue(sampleTemplate);

            const { result } = renderHook(() => useMovementTemplateMutations(), { wrapper });
            await act(async () => {
                await result.current.updateMovementTemplate.mutateAsync({
                    id: 'tpl-1',
                    updates: { name: 'Renamed' },
                });
            });

            expect(invalidatedKeys(invalidateSpy)).toEqual([['movementTemplates']]);
            expect(mocks.toast.success).not.toHaveBeenCalled();
        });

        it('toasts the service error message on failure', async () => {
            const { wrapper } = createWrapper();
            vi.mocked(movementTemplateService.updateTemplate).mockRejectedValue(
                new Error('not found'),
            );

            const { result } = renderHook(() => useMovementTemplateMutations(), { wrapper });
            await act(async () => {
                await expect(
                    result.current.updateMovementTemplate.mutateAsync({
                        id: 'tpl-1',
                        updates: { name: 'x' },
                    }),
                ).rejects.toThrow('not found');
            });

            expect(mocks.toast.error).toHaveBeenCalledWith('not found');
        });

        it('falls back to the default error message when the error has no message', async () => {
            const { wrapper } = createWrapper();
            vi.mocked(movementTemplateService.updateTemplate).mockRejectedValue(new Error(''));

            const { result } = renderHook(() => useMovementTemplateMutations(), { wrapper });
            await act(async () => {
                await expect(
                    result.current.updateMovementTemplate.mutateAsync({
                        id: 'tpl-1',
                        updates: { name: 'x' },
                    }),
                ).rejects.toBeDefined();
            });

            expect(mocks.toast.error).toHaveBeenCalledWith('Failed to update template');
        });
    });

    describe('deleteMovementTemplate', () => {
        it('forwards the id to deleteTemplate', async () => {
            const { wrapper } = createWrapper();
            vi.mocked(movementTemplateService.deleteTemplate).mockResolvedValue(undefined);

            const { result } = renderHook(() => useMovementTemplateMutations(), { wrapper });
            await act(async () => {
                await result.current.deleteMovementTemplate.mutateAsync('tpl-1');
            });

            expect(movementTemplateService.deleteTemplate).toHaveBeenCalledWith('tpl-1');
        });

        it('invalidates ["movementTemplates"] on success and does NOT toast success', async () => {
            const { wrapper, invalidateSpy } = createWrapper();
            vi.mocked(movementTemplateService.deleteTemplate).mockResolvedValue(undefined);

            const { result } = renderHook(() => useMovementTemplateMutations(), { wrapper });
            await act(async () => {
                await result.current.deleteMovementTemplate.mutateAsync('tpl-1');
            });

            expect(invalidatedKeys(invalidateSpy)).toEqual([['movementTemplates']]);
            expect(mocks.toast.success).not.toHaveBeenCalled();
        });

        it('toasts the service error message on failure', async () => {
            const { wrapper } = createWrapper();
            vi.mocked(movementTemplateService.deleteTemplate).mockRejectedValue(
                new Error('still in use'),
            );

            const { result } = renderHook(() => useMovementTemplateMutations(), { wrapper });
            await act(async () => {
                await expect(
                    result.current.deleteMovementTemplate.mutateAsync('tpl-1'),
                ).rejects.toThrow('still in use');
            });

            expect(mocks.toast.error).toHaveBeenCalledWith('still in use');
        });

        it('falls back to the default error message when the error has no message', async () => {
            const { wrapper } = createWrapper();
            vi.mocked(movementTemplateService.deleteTemplate).mockRejectedValue('plain string');

            const { result } = renderHook(() => useMovementTemplateMutations(), { wrapper });
            await act(async () => {
                await expect(
                    result.current.deleteMovementTemplate.mutateAsync('tpl-1'),
                ).rejects.toBeDefined();
            });

            expect(mocks.toast.error).toHaveBeenCalledWith('Failed to delete template');
        });
    });
});
