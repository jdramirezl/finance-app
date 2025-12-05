import { apiClient as api } from './apiClient';

export type RecurrenceType = 'once' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';
export type RecurrenceEndType = 'never' | 'after' | 'on_date';

export interface RecurrenceConfig {
    type: RecurrenceType;
    interval: number;
    daysOfWeek?: number[];
    endType: RecurrenceEndType;
    endCount?: number;
    endDate?: string;
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
        const response = await api.get<Reminder[]>('/api/reminders');
        return response;
    },

    create: async (data: CreateReminderDTO): Promise<Reminder> => {
        const response = await api.post<Reminder>('/api/reminders', data);
        return response;
    },

    update: async (id: string, data: UpdateReminderDTO): Promise<Reminder> => {
        const response = await api.put<Reminder>(`/api/reminders/${id}`, data);
        return response;
    },

    delete: async (id: string): Promise<void> => {
        await api.delete(`/api/reminders/${id}`);
    },

    markAsPaid: async (id: string, movementId?: string): Promise<Reminder> => {
        const response = await api.post<Reminder>(`/api/reminders/${id}/pay`, { movementId });
        return response;
    }
};
