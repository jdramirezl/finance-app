import { ReminderException } from './ReminderException';

export type RecurrenceType = 'once' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';
export type RecurrenceEndType = 'never' | 'after' | 'on_date';

export interface RecurrenceConfig {
    type: RecurrenceType;
    interval: number; // Every X days/weeks/months
    daysOfWeek?: number[]; // For weekly: [0,1,2,3,4,5,6] = Sun-Sat
    endType: RecurrenceEndType;
    endCount?: number; // End after X occurrences
    endDate?: string; // End on specific date
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
