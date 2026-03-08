import { addDays, addWeeks, addMonths, addYears, startOfMonth, endOfMonth, isBefore, isAfter, parseISO, format } from 'date-fns';
import type { Reminder, RecurrenceConfig } from '../services/reminderService';

export interface ProjectedReminder extends Reminder {
    isProjected: boolean;
    originalReminderId: string;
}

export type ReminderWithProjection = Reminder & { isProjected?: boolean; originalReminderId?: string };

/**
 * Generate projected occurrences for a recurring reminder within a date range
 */
export function generateProjectedOccurrences(
    reminder: Reminder,
    monthsAhead: number = 2
): ProjectedReminder[] {
    const { recurrence } = reminder;

    // Non-recurring reminders don't generate additional projections
    if (recurrence.type === 'once') {
        return [];
    }

    const projections: ProjectedReminder[] = [];
    const baseDate = parseISO(reminder.dueDate);
    const endRange = addMonths(new Date(), monthsAhead + 1);

    // Check end conditions
    const hasEnded = (date: Date, occurrenceCount: number): boolean => {
        if (recurrence.endType === 'after' && recurrence.endCount) {
            return occurrenceCount >= recurrence.endCount;
        }
        if (recurrence.endType === 'on_date' && recurrence.endDate) {
            return isAfter(date, parseISO(recurrence.endDate));
        }
        return false;
    };

    let currentDate = baseDate;
    let occurrenceCount = 0;

    // Generate occurrences
    while (isBefore(currentDate, endRange) && !hasEnded(currentDate, occurrenceCount)) {
        // Skip current (base) date as it's handled separately in grouping
        if (occurrenceCount > 0) {
            const currentDateStr = format(currentDate, 'yyyy-MM-dd');
            const exception = reminder.exceptions?.find(e => e.originalDate === currentDateStr);

            if (exception) {
                if (exception.action === 'deleted') {
                    // Skip deleted
                } else if (isBefore(currentDate, endRange)) {
                    projections.push({
                        ...reminder,
                        id: `${reminder.id}_projected_${currentDateStr}`,
                        title: exception.newTitle || reminder.title,
                        amount: exception.newAmount ?? reminder.amount,
                        dueDate: exception.newDate || currentDateStr,
                        isPaid: exception.isPaid ?? false,
                        linkedMovementId: exception.linkedMovementId,
                        isProjected: true,
                        originalReminderId: reminder.id,
                    });
                }
            } else {
                // Normal projection
                if (isBefore(currentDate, endRange)) {
                    projections.push({
                        ...reminder,
                        id: `${reminder.id}_projected_${currentDateStr}`,
                        dueDate: currentDateStr,
                        isPaid: false,
                        isProjected: true,
                        originalReminderId: reminder.id,
                    });
                }
            }
        }
        
        // Get next occurrence date
        currentDate = getNextOccurrence(currentDate, recurrence);
        occurrenceCount++;
    }

    return projections;
}

/**
 * Get the next occurrence date based on recurrence config
 */
function getNextOccurrence(currentDate: Date, recurrence: RecurrenceConfig): Date {
    const interval = recurrence.interval || 1;

    switch (recurrence.type) {
        case 'daily':
            return addDays(currentDate, interval);
        case 'weekly':
            if (recurrence.daysOfWeek && recurrence.daysOfWeek.length > 0) {
                // Find next day in the daysOfWeek array
                return getNextWeekdayOccurrence(currentDate, recurrence.daysOfWeek, interval);
            }
            return addWeeks(currentDate, interval);
        case 'monthly':
            return addMonths(currentDate, interval);
        case 'yearly':
            return addYears(currentDate, interval);
        case 'custom':
            // Custom uses interval as days
            return addDays(currentDate, interval);
        default:
            return addMonths(currentDate, 1);
    }
}

/**
 * Get next occurrence for weekly reminders with specific days
 */
function getNextWeekdayOccurrence(currentDate: Date, daysOfWeek: number[], weekInterval: number): Date {
    const currentDayOfWeek = currentDate.getDay();
    const sortedDays = [...daysOfWeek].sort((a, b) => a - b);

    // Find next day in current week
    const nextDayInWeek = sortedDays.find(day => day > currentDayOfWeek);

    if (nextDayInWeek !== undefined) {
        return addDays(currentDate, nextDayInWeek - currentDayOfWeek);
    }

    // Move to next week interval and use first day
    const daysUntilNextWeek = 7 - currentDayOfWeek + sortedDays[0];
    const additionalWeeks = (weekInterval - 1) * 7;
    return addDays(currentDate, daysUntilNextWeek + additionalWeeks);
}

export interface MonthGroup {
    key: string; // e.g., "2025-12"
    label: string; // e.g., "December 2025"
    year: number;
    month: number;
    reminders: ReminderWithProjection[];
    isCurrentMonth: boolean;
    isPastMonth: boolean;
}

/**
 * Group reminders by month, including projections
 */
export function groupRemindersByMonth(
    reminders: Reminder[],
    monthsBack: number = 1,
    monthsAhead: number = 2
): MonthGroup[] {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    // Generate all reminders including projections
    const allReminders: ReminderWithProjection[] = [];

    reminders.forEach(reminder => {
        // Handle Base Reminder
        const baseDateISO = reminder.dueDate;
        const baseDateStr = baseDateISO.split('T')[0]; // Normalize to YYYY-MM-DD
        const baseException = reminder.exceptions?.find(e => e.originalDate === baseDateStr);

        if (baseException) {
            if (baseException.action === 'modified') {
                // Add modified base reminder
                allReminders.push({
                    ...reminder,
                    title: baseException.newTitle || reminder.title,
                    amount: baseException.newAmount ?? reminder.amount,
                    dueDate: baseException.newDate || baseDateISO, // Use newDate or original ISO
                    isPaid: baseException.isPaid ?? reminder.isPaid,
                    linkedMovementId: baseException.linkedMovementId || reminder.linkedMovementId,
                    isProjected: false
                });
            }
            // If deleted, do nothing (skip)
        } else {
            allReminders.push({ ...reminder, isProjected: false });
        }

        // Add projected occurrences (including past ones within range)
        if (reminder.recurrence.type !== 'once') {
            const projections = generateProjectedOccurrences(reminder, monthsAhead);
            allReminders.push(...projections);
        }
    });

    // Create month buckets
    const months: MonthGroup[] = [];
    let startMonth = addMonths(startOfMonth(now), -monthsBack);
    const endMonth = addMonths(endOfMonth(now), monthsAhead);

    // Ensure we include any month that has an overdue reminder
    allReminders.forEach(r => {
        if (getReminderStatus(r) === 'overdue') {
            const rMonth = startOfMonth(parseISO(r.dueDate));
            if (isBefore(rMonth, startMonth)) {
                startMonth = rMonth;
            }
        }
    });

    let currentMonthDate = startMonth;
    while (isBefore(currentMonthDate, endMonth) || format(currentMonthDate, 'yyyy-MM') === format(endMonth, 'yyyy-MM')) {
        const year = currentMonthDate.getFullYear();
        const month = currentMonthDate.getMonth();
        const key = format(currentMonthDate, 'yyyy-MM');
        const label = format(currentMonthDate, 'MMMM yyyy');

        const isCurrentMonth = year === currentYear && month === currentMonth;
        const isPastMonth = isBefore(endOfMonth(currentMonthDate), now);

        months.push({
            key,
            label,
            year,
            month,
            reminders: [],
            isCurrentMonth,
            isPastMonth,
        });

        currentMonthDate = addMonths(currentMonthDate, 1);
    }

    // Assign reminders to months
    allReminders.forEach(reminder => {
        const reminderDate = parseISO(reminder.dueDate);
        const reminderKey = format(reminderDate, 'yyyy-MM');

        const monthGroup = months.find(m => m.key === reminderKey);
        if (monthGroup) {
            monthGroup.reminders.push(reminder);
        }
    });

    // Sort reminders within each month by date
    months.forEach(month => {
        month.reminders.sort((a, b) =>
            new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
        );
    });

    return months;
}

export type ReminderStatus = 'overdue' | 'today' | 'this-week' | 'upcoming' | 'paid' | 'projected';

/**
 * Determine the status of a reminder for styling purposes
 */
export function getReminderStatus(reminder: ReminderWithProjection): ReminderStatus {
    if (reminder.isPaid) return 'paid';

    const now = new Date();
    const dueDate = parseISO(reminder.dueDate);

    // Check if overdue (past due date and not today)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDateNormalized = new Date(dueDate);
    dueDateNormalized.setHours(0, 0, 0, 0);

    if (dueDateNormalized < today) {
        return 'overdue';
    }

    if (reminder.isProjected) return 'projected';

    if (dueDateNormalized.getTime() === today.getTime()) {
        return 'today';
    }

    // Check if due within 7 days
    const weekFromNow = addDays(now, 7);
    if (isBefore(dueDate, weekFromNow)) {
        return 'this-week';
    }

    return 'upcoming';
}

/**
 * Count overdue reminders including projections
 */
export function countOverdueReminders(reminders: Reminder[]): number {
    // Generate projections to count missed recurring instances
    const monthsBack = 3; // Look back 3 months for overdue items
    const grouped = groupRemindersByMonth(reminders, monthsBack, 0);
    
    let overdueCount = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    grouped.forEach(month => {
        if (month.isCurrentMonth || month.isPastMonth) {
            month.reminders.forEach(r => {
                const status = getReminderStatus(r);
                if (status === 'overdue') {
                    overdueCount++;
                }
            });
        }
    });

    return overdueCount;
}
