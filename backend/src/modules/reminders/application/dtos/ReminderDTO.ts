import { RecurrenceConfig } from '../../domain/Reminder';

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
