import { apiClient as api } from './apiClient';
import { supabase } from '../lib/supabase';
import { mapReminderRow } from './mappers';

export type RecurrenceType = 'once' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';
export type RecurrenceEndType = 'never' | 'after' | 'on_date';
export type RecurrencePeriod = Exclude<RecurrenceType, 'once' | 'custom'>;

export interface RecurrenceConfig {
    type: RecurrenceType;
    interval: number;
    daysOfWeek?: number[];
    endType: RecurrenceEndType;
    endCount?: number;
    endDate?: string;
    // For custom recurrence: the unit that `interval` is measured in
    // (e.g. interval=3, customPeriod='weekly' = "every 3 weeks")
    customPeriod?: RecurrencePeriod;
}

export interface ReminderException {
    id: string;
    reminderId: string;
    originalDate: string;
    action: 'deleted' | 'modified';
    newTitle?: string;
    newAmount?: number;
    newDate?: string;
    isPaid?: boolean;
    linkedMovementId?: string;
    createdAt: string;
    updatedAt: string;
}

export interface CreateExceptionDTO {
    reminderId: string;
    originalDate: string;
    action: 'deleted' | 'modified';
    newTitle?: string;
    newAmount?: number;
    newDate?: string;
    isPaid?: boolean;
    linkedMovementId?: string;
}

export interface Reminder {
    id: string;
    userId: string;
    title: string;
    amount: number;
    dueDate: string;
    isPaid: boolean;
    recurrence: RecurrenceConfig;
    linkedMovementId?: string;
    fixedExpenseId?: string;
    templateId?: string;
    exceptions?: ReminderException[];
    createdAt: string;
    updatedAt: string;
}

export interface CreateReminderDTO {
    title: string;
    amount: number;
    dueDate: string;
    recurrence: RecurrenceConfig;
    fixedExpenseId?: string;
    templateId?: string;
}

export interface UpdateReminderDTO {
    title?: string;
    amount?: number;
    dueDate?: string;
    isPaid?: boolean;
    recurrence?: RecurrenceConfig;
    linkedMovementId?: string;
    fixedExpenseId?: string;
    templateId?: string;
}

export const reminderService = {
    getAll: async (): Promise<Reminder[]> => {
        const { data, error } = await supabase
            .from('reminders')
            .select('*, reminder_exceptions(*)')
            .order('due_date', { ascending: true });
        if (error) throw new Error(error.message);
        return (data ?? []).map(mapReminderRow);
    },

    create: async (data: CreateReminderDTO): Promise<Reminder> => {
        const response = await api.post<Reminder>('/api/reminders', { ...data });
        return response;
    },

    update: async (id: string, data: UpdateReminderDTO): Promise<Reminder> => {
        const response = await api.put<Reminder>(`/api/reminders/${id}`, { ...data });
        return response;
    },

    delete: async (id: string): Promise<void> => {
        await api.delete(`/api/reminders/${id}`);
    },

    markAsPaid: async (id: string, movementId?: string): Promise<Reminder> => {
        const response = await api.post<Reminder>(`/api/reminders/${id}/pay`, { movementId });
        return response;
    },

    createException: async (id: string, data: Omit<CreateExceptionDTO, 'reminderId'>): Promise<ReminderException> => {
        const response = await api.post<ReminderException>(`/api/reminders/${id}/exceptions`, data);
        return response;
    },

    splitSeries: async (id: string, splitDate: string, newDetails?: CreateReminderDTO): Promise<Reminder> => {
        const payload: Record<string, unknown> = { splitDate };
        if (newDetails !== undefined) {
            payload.newDetails = newDetails as unknown as Record<string, unknown>;
        }
        const response = await api.post<Reminder>(`/api/reminders/${id}/split`, payload);
        return response;
    }
};
