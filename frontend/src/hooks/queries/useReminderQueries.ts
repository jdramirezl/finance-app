import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { reminderService, type CreateReminderDTO, type UpdateReminderDTO, type CreateExceptionDTO } from '../../services/reminderService';
import { useToast } from '../useToast';

export const useRemindersQuery = () => {
    return useQuery({
        queryKey: ['reminders'],
        queryFn: reminderService.getAll,
    });
};

export const useReminderMutations = () => {
    const queryClient = useQueryClient();
    const toast = useToast();

    const createMutation = useMutation({
        mutationFn: (data: CreateReminderDTO) => reminderService.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['reminders'] });
            toast.success('Reminder created successfully');
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.error || 'Failed to create reminder');
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: UpdateReminderDTO }) =>
            reminderService.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['reminders'] });
            toast.success('Reminder updated successfully');
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.error || 'Failed to update reminder');
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => reminderService.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['reminders'] });
            toast.success('Reminder deleted successfully');
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.error || 'Failed to delete reminder');
        },
    });

    const markAsPaidMutation = useMutation({
        mutationFn: ({ id, movementId }: { id: string; movementId?: string }) =>
            reminderService.markAsPaid(id, movementId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['reminders'] });
            toast.success('Reminder marked as paid');
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.error || 'Failed to mark reminder as paid');
        },
    });

    const createExceptionMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: Omit<CreateExceptionDTO, 'reminderId'> }) =>
            reminderService.createException(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['reminders'] });
            toast.success('Reminder series updated');
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.error || 'Failed to update reminder series');
        },
    });

    const splitMutation = useMutation({
        mutationFn: ({ id, splitDate, newDetails }: { id: string; splitDate: string; newDetails?: CreateReminderDTO }) =>
            reminderService.splitSeries(id, splitDate, newDetails),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['reminders'] });
            toast.success('Reminder series split updated');
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.error || 'Failed to split reminder series');
        },
    });

    return {
        createMutation,
        updateMutation,
        deleteMutation,
        markAsPaidMutation,
        createExceptionMutation,
        splitMutation,
    };
};
