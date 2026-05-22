import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type ReactNode } from 'react';
import type {
    CreateReminderDTO,
    Reminder,
    ReminderException,
    UpdateReminderDTO,
} from '../../services/reminderService';

/**
 * Tests for {@link useRemindersQuery} and {@link useReminderMutations}. The
 * hooks are thin wrappers around `reminderService`. We verify that each
 * mutation:
 *   1. forwards arguments to the right service method,
 *   2. invalidates the `['reminders']` query on success,
 *   3. shows the success toast described in the hook, and
 *   4. surfaces error messages through the toast store with the documented
 *      fallback when the error has no message.
 *
 * The query hook is verified to call the service and expose the resolved
 * data through the standard TanStack Query state.
 */

const mocks = vi.hoisted(() => ({
    toast: {
        success: vi.fn(),
        error: vi.fn(),
        info: vi.fn(),
        warning: vi.fn(),
    },
}));

vi.mock('../../services/reminderService', async () => {
    const actual = await vi.importActual<typeof import('../../services/reminderService')>(
        '../../services/reminderService',
    );
    return {
        ...actual,
        reminderService: {
            getAll: vi.fn(),
            create: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
            markAsPaid: vi.fn(),
            createException: vi.fn(),
            splitSeries: vi.fn(),
        },
    };
});

vi.mock('../useToast', () => ({
    useToast: () => mocks.toast,
}));

import {
    useRemindersQuery,
    useReminderMutations,
} from '../queries/useReminderQueries';
import { reminderService } from '../../services/reminderService';

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

const sampleRecurrence = {
    type: 'monthly' as const,
    interval: 1,
    endType: 'never' as const,
};

const sampleReminder: Reminder = {
    id: 'rem-1',
    userId: 'user-1',
    title: 'Rent',
    amount: 1500,
    dueDate: '2026-06-01',
    isPaid: false,
    recurrence: sampleRecurrence,
    createdAt: '2026-05-01T00:00:00Z',
    updatedAt: '2026-05-01T00:00:00Z',
};

const sampleException: ReminderException = {
    id: 'exc-1',
    reminderId: 'rem-1',
    originalDate: '2026-06-01',
    action: 'modified',
    newAmount: 1600,
    createdAt: '2026-05-15T00:00:00Z',
    updatedAt: '2026-05-15T00:00:00Z',
};

describe('useRemindersQuery', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('calls reminderService.getAll and exposes the returned data', async () => {
        const { wrapper } = createWrapper();
        vi.mocked(reminderService.getAll).mockResolvedValue([sampleReminder]);

        const { result } = renderHook(() => useRemindersQuery(), { wrapper });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(reminderService.getAll).toHaveBeenCalledTimes(1);
        expect(result.current.data).toEqual([sampleReminder]);
    });

    it('surfaces query errors on the result', async () => {
        const { wrapper } = createWrapper();
        vi.mocked(reminderService.getAll).mockRejectedValue(new Error('network'));

        const { result } = renderHook(() => useRemindersQuery(), { wrapper });

        await waitFor(() => expect(result.current.isError).toBe(true));
        expect((result.current.error as Error).message).toBe('network');
    });
});

describe('useReminderMutations', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('createMutation', () => {
        it('forwards the DTO to reminderService.create', async () => {
            const { wrapper } = createWrapper();
            vi.mocked(reminderService.create).mockResolvedValue(sampleReminder);

            const { result } = renderHook(() => useReminderMutations(), { wrapper });
            const dto: CreateReminderDTO = {
                title: 'Rent',
                amount: 1500,
                dueDate: '2026-06-01',
                recurrence: sampleRecurrence,
            };
            await act(async () => {
                await result.current.createMutation.mutateAsync(dto);
            });

            expect(reminderService.create).toHaveBeenCalledWith(dto);
        });

        it('invalidates ["reminders"] and shows success toast on success', async () => {
            const { wrapper, invalidateSpy } = createWrapper();
            vi.mocked(reminderService.create).mockResolvedValue(sampleReminder);

            const { result } = renderHook(() => useReminderMutations(), { wrapper });
            await act(async () => {
                await result.current.createMutation.mutateAsync({
                    title: 'Rent',
                    amount: 1500,
                    dueDate: '2026-06-01',
                    recurrence: sampleRecurrence,
                });
            });

            expect(invalidatedKeys(invalidateSpy)).toEqual([['reminders']]);
            expect(mocks.toast.success).toHaveBeenCalledWith('Reminder created successfully');
            expect(mocks.toast.error).not.toHaveBeenCalled();
        });

        it('toasts the service error message on failure', async () => {
            const { wrapper } = createWrapper();
            vi.mocked(reminderService.create).mockRejectedValue(new Error('boom'));

            const { result } = renderHook(() => useReminderMutations(), { wrapper });
            await act(async () => {
                await expect(
                    result.current.createMutation.mutateAsync({
                        title: 'Rent',
                        amount: 1500,
                        dueDate: '2026-06-01',
                        recurrence: sampleRecurrence,
                    }),
                ).rejects.toThrow('boom');
            });

            expect(mocks.toast.error).toHaveBeenCalledWith('boom');
            expect(mocks.toast.success).not.toHaveBeenCalled();
        });

        it('falls back to the default error message when the error has no message', async () => {
            const { wrapper } = createWrapper();
            vi.mocked(reminderService.create).mockRejectedValue('not an error');

            const { result } = renderHook(() => useReminderMutations(), { wrapper });
            await act(async () => {
                await expect(
                    result.current.createMutation.mutateAsync({
                        title: 'Rent',
                        amount: 1500,
                        dueDate: '2026-06-01',
                        recurrence: sampleRecurrence,
                    }),
                ).rejects.toBeDefined();
            });

            expect(mocks.toast.error).toHaveBeenCalledWith('Failed to create reminder');
        });
    });

    describe('updateMutation', () => {
        it('forwards id and update payload to reminderService.update', async () => {
            const { wrapper } = createWrapper();
            vi.mocked(reminderService.update).mockResolvedValue(sampleReminder);

            const { result } = renderHook(() => useReminderMutations(), { wrapper });
            const data: UpdateReminderDTO = { title: 'New title', amount: 2000 };
            await act(async () => {
                await result.current.updateMutation.mutateAsync({ id: 'rem-1', data });
            });

            expect(reminderService.update).toHaveBeenCalledWith('rem-1', data);
        });

        it('invalidates ["reminders"] and toasts success', async () => {
            const { wrapper, invalidateSpy } = createWrapper();
            vi.mocked(reminderService.update).mockResolvedValue(sampleReminder);

            const { result } = renderHook(() => useReminderMutations(), { wrapper });
            await act(async () => {
                await result.current.updateMutation.mutateAsync({
                    id: 'rem-1',
                    data: { title: 'New title' },
                });
            });

            expect(invalidatedKeys(invalidateSpy)).toEqual([['reminders']]);
            expect(mocks.toast.success).toHaveBeenCalledWith('Reminder updated successfully');
        });

        it('toasts default fallback when error lacks a message', async () => {
            const { wrapper } = createWrapper();
            vi.mocked(reminderService.update).mockRejectedValue(new Error(''));

            const { result } = renderHook(() => useReminderMutations(), { wrapper });
            await act(async () => {
                await expect(
                    result.current.updateMutation.mutateAsync({
                        id: 'rem-1',
                        data: { title: 'x' },
                    }),
                ).rejects.toBeDefined();
            });

            expect(mocks.toast.error).toHaveBeenCalledWith('Failed to update reminder');
        });
    });

    describe('deleteMutation', () => {
        it('forwards the id to reminderService.delete', async () => {
            const { wrapper } = createWrapper();
            vi.mocked(reminderService.delete).mockResolvedValue(undefined);

            const { result } = renderHook(() => useReminderMutations(), { wrapper });
            await act(async () => {
                await result.current.deleteMutation.mutateAsync('rem-1');
            });

            expect(reminderService.delete).toHaveBeenCalledWith('rem-1');
        });

        it('invalidates ["reminders"] and toasts success', async () => {
            const { wrapper, invalidateSpy } = createWrapper();
            vi.mocked(reminderService.delete).mockResolvedValue(undefined);

            const { result } = renderHook(() => useReminderMutations(), { wrapper });
            await act(async () => {
                await result.current.deleteMutation.mutateAsync('rem-1');
            });

            expect(invalidatedKeys(invalidateSpy)).toEqual([['reminders']]);
            expect(mocks.toast.success).toHaveBeenCalledWith('Reminder deleted successfully');
        });

        it('toasts the service error message on failure', async () => {
            const { wrapper } = createWrapper();
            vi.mocked(reminderService.delete).mockRejectedValue(new Error('not allowed'));

            const { result } = renderHook(() => useReminderMutations(), { wrapper });
            await act(async () => {
                await expect(
                    result.current.deleteMutation.mutateAsync('rem-1'),
                ).rejects.toThrow('not allowed');
            });

            expect(mocks.toast.error).toHaveBeenCalledWith('not allowed');
        });
    });

    describe('markAsPaidMutation', () => {
        it('forwards id and optional movementId to reminderService.markAsPaid', async () => {
            const { wrapper } = createWrapper();
            vi.mocked(reminderService.markAsPaid).mockResolvedValue(sampleReminder);

            const { result } = renderHook(() => useReminderMutations(), { wrapper });
            await act(async () => {
                await result.current.markAsPaidMutation.mutateAsync({
                    id: 'rem-1',
                    movementId: 'mov-9',
                });
            });

            expect(reminderService.markAsPaid).toHaveBeenCalledWith('rem-1', 'mov-9');
        });

        it('passes undefined for movementId when omitted', async () => {
            const { wrapper } = createWrapper();
            vi.mocked(reminderService.markAsPaid).mockResolvedValue(sampleReminder);

            const { result } = renderHook(() => useReminderMutations(), { wrapper });
            await act(async () => {
                await result.current.markAsPaidMutation.mutateAsync({ id: 'rem-1' });
            });

            expect(reminderService.markAsPaid).toHaveBeenCalledWith('rem-1', undefined);
        });

        it('invalidates ["reminders"] and toasts success', async () => {
            const { wrapper, invalidateSpy } = createWrapper();
            vi.mocked(reminderService.markAsPaid).mockResolvedValue(sampleReminder);

            const { result } = renderHook(() => useReminderMutations(), { wrapper });
            await act(async () => {
                await result.current.markAsPaidMutation.mutateAsync({ id: 'rem-1' });
            });

            expect(invalidatedKeys(invalidateSpy)).toEqual([['reminders']]);
            expect(mocks.toast.success).toHaveBeenCalledWith('Reminder marked as paid');
        });

        it('toasts default fallback when error lacks a message', async () => {
            const { wrapper } = createWrapper();
            vi.mocked(reminderService.markAsPaid).mockRejectedValue('plain string');

            const { result } = renderHook(() => useReminderMutations(), { wrapper });
            await act(async () => {
                await expect(
                    result.current.markAsPaidMutation.mutateAsync({ id: 'rem-1' }),
                ).rejects.toBeDefined();
            });

            expect(mocks.toast.error).toHaveBeenCalledWith('Failed to mark reminder as paid');
        });
    });

    describe('createExceptionMutation', () => {
        it('forwards id and exception payload to reminderService.createException', async () => {
            const { wrapper } = createWrapper();
            vi.mocked(reminderService.createException).mockResolvedValue(sampleException);

            const { result } = renderHook(() => useReminderMutations(), { wrapper });
            const data = {
                originalDate: '2026-06-01',
                action: 'modified' as const,
                newAmount: 1600,
            };
            await act(async () => {
                await result.current.createExceptionMutation.mutateAsync({
                    id: 'rem-1',
                    data,
                });
            });

            expect(reminderService.createException).toHaveBeenCalledWith('rem-1', data);
        });

        it('invalidates ["reminders"] and toasts the series-update success message', async () => {
            const { wrapper, invalidateSpy } = createWrapper();
            vi.mocked(reminderService.createException).mockResolvedValue(sampleException);

            const { result } = renderHook(() => useReminderMutations(), { wrapper });
            await act(async () => {
                await result.current.createExceptionMutation.mutateAsync({
                    id: 'rem-1',
                    data: { originalDate: '2026-06-01', action: 'deleted' },
                });
            });

            expect(invalidatedKeys(invalidateSpy)).toEqual([['reminders']]);
            expect(mocks.toast.success).toHaveBeenCalledWith('Reminder series updated');
        });

        it('toasts default fallback when error lacks a message', async () => {
            const { wrapper } = createWrapper();
            vi.mocked(reminderService.createException).mockRejectedValue(new Error(''));

            const { result } = renderHook(() => useReminderMutations(), { wrapper });
            await act(async () => {
                await expect(
                    result.current.createExceptionMutation.mutateAsync({
                        id: 'rem-1',
                        data: { originalDate: '2026-06-01', action: 'deleted' },
                    }),
                ).rejects.toBeDefined();
            });

            expect(mocks.toast.error).toHaveBeenCalledWith('Failed to update reminder series');
        });
    });

    describe('splitMutation', () => {
        it('forwards id, splitDate, and newDetails to reminderService.splitSeries', async () => {
            const { wrapper } = createWrapper();
            vi.mocked(reminderService.splitSeries).mockResolvedValue(sampleReminder);

            const newDetails: CreateReminderDTO = {
                title: 'Rent (new lease)',
                amount: 1700,
                dueDate: '2026-09-01',
                recurrence: sampleRecurrence,
            };

            const { result } = renderHook(() => useReminderMutations(), { wrapper });
            await act(async () => {
                await result.current.splitMutation.mutateAsync({
                    id: 'rem-1',
                    splitDate: '2026-09-01',
                    newDetails,
                });
            });

            expect(reminderService.splitSeries).toHaveBeenCalledWith(
                'rem-1',
                '2026-09-01',
                newDetails,
            );
        });

        it('passes undefined for newDetails when omitted', async () => {
            const { wrapper } = createWrapper();
            vi.mocked(reminderService.splitSeries).mockResolvedValue(sampleReminder);

            const { result } = renderHook(() => useReminderMutations(), { wrapper });
            await act(async () => {
                await result.current.splitMutation.mutateAsync({
                    id: 'rem-1',
                    splitDate: '2026-09-01',
                });
            });

            expect(reminderService.splitSeries).toHaveBeenCalledWith(
                'rem-1',
                '2026-09-01',
                undefined,
            );
        });

        it('invalidates ["reminders"] and toasts the split success message', async () => {
            const { wrapper, invalidateSpy } = createWrapper();
            vi.mocked(reminderService.splitSeries).mockResolvedValue(sampleReminder);

            const { result } = renderHook(() => useReminderMutations(), { wrapper });
            await act(async () => {
                await result.current.splitMutation.mutateAsync({
                    id: 'rem-1',
                    splitDate: '2026-09-01',
                });
            });

            expect(invalidatedKeys(invalidateSpy)).toEqual([['reminders']]);
            expect(mocks.toast.success).toHaveBeenCalledWith('Reminder series split updated');
        });

        it('toasts default fallback when error lacks a message', async () => {
            const { wrapper } = createWrapper();
            vi.mocked(reminderService.splitSeries).mockRejectedValue('plain string');

            const { result } = renderHook(() => useReminderMutations(), { wrapper });
            await act(async () => {
                await expect(
                    result.current.splitMutation.mutateAsync({
                        id: 'rem-1',
                        splitDate: '2026-09-01',
                    }),
                ).rejects.toBeDefined();
            });

            expect(mocks.toast.error).toHaveBeenCalledWith('Failed to split reminder series');
        });
    });
});
