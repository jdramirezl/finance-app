export type ExceptionAction = 'deleted' | 'modified';

export interface ReminderException {
    id: string;
    reminderId: string;
    originalDate: string; // ISO Date string (YYYY-MM-DD)
    action: ExceptionAction;
    newTitle?: string;
    newAmount?: number;
    newDate?: string; // If the occurrence was moved
    isPaid?: boolean;
    linkedMovementId?: string;
    createdAt: string;
    updatedAt: string;
}

export interface CreateExceptionDTO {
    reminderId: string;
    originalDate: string;
    action: ExceptionAction;
    newTitle?: string;
    newAmount?: number;
    newDate?: string;
    isPaid?: boolean;
    linkedMovementId?: string;
}
