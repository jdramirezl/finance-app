import { describe, it, expect } from 'vitest';
import { format, addDays, subDays, subMonths } from 'date-fns';
import { getReminderStatus, groupRemindersByMonth } from '../reminderProjections';
import type { ReminderWithProjection } from '../reminderProjections';
import type { Reminder } from '../../services/reminderService';

const today = format(new Date(), 'yyyy-MM-dd');
const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd');
const nextWeek = format(addDays(new Date(), 5), 'yyyy-MM-dd');
const nextMonth = format(addDays(new Date(), 35), 'yyyy-MM-dd');
const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');
const threeMonthsAgo = format(subMonths(new Date(), 3), 'yyyy-MM-dd');

function makeReminder(overrides: Partial<ReminderWithProjection> = {}): ReminderWithProjection {
  return {
    id: 'rem-1',
    userId: 'user-1',
    title: 'Test',
    amount: 100,
    dueDate: tomorrow,
    isPaid: false,
    recurrence: { type: 'monthly', interval: 1, endType: 'never' },
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
    isProjected: false,
    ...overrides,
  };
}

describe('getReminderStatus', () => {
  it('returns "this-week" for next actionable projected occurrence due tomorrow', () => {
    const r = makeReminder({ isProjected: true, isNextActionable: true, dueDate: tomorrow });
    expect(getReminderStatus(r)).toBe('this-week');
  });

  it('returns "projected" for non-next-actionable projected occurrence', () => {
    const r = makeReminder({ isProjected: true, isNextActionable: false, dueDate: nextMonth });
    expect(getReminderStatus(r)).toBe('projected');
  });

  it('returns "overdue" for past unpaid projected occurrence', () => {
    const r = makeReminder({ isProjected: true, dueDate: yesterday });
    expect(getReminderStatus(r)).toBe('overdue');
  });

  it('returns "today" for next actionable projected occurrence due today', () => {
    const r = makeReminder({ isProjected: true, isNextActionable: true, dueDate: today });
    expect(getReminderStatus(r)).toBe('today');
  });

  it('returns "paid" for paid reminder regardless of projection', () => {
    const r = makeReminder({ isProjected: true, isNextActionable: true, isPaid: true });
    expect(getReminderStatus(r)).toBe('paid');
  });

  it('returns "upcoming" for next actionable projected occurrence far in future', () => {
    const r = makeReminder({ isProjected: true, isNextActionable: true, dueDate: nextMonth });
    expect(getReminderStatus(r)).toBe('upcoming');
  });
});

describe('groupRemindersByMonth — next actionable marking', () => {
  it('marks the first unpaid occurrence as isNextActionable', () => {
    const reminder: Reminder = {
      id: 'rem-1',
      userId: 'user-1',
      title: 'Rent',
      amount: 1000,
      dueDate: yesterday, // base occurrence is overdue
      isPaid: false,
      recurrence: { type: 'monthly', interval: 1, endType: 'never' },
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-01-01T00:00:00Z',
    };

    const groups = groupRemindersByMonth([reminder], 1, 2);
    const allReminders = groups.flatMap(g => g.reminders);

    // The base (overdue) should be next actionable since it's the first unpaid
    const base = allReminders.find(r => r.id === 'rem-1');
    expect(base?.isNextActionable).toBe(true);

    // Projected occurrences beyond the first unpaid should NOT be next actionable
    const projected = allReminders.filter(r => r.isProjected && r.id !== 'rem-1');
    const nonActionable = projected.filter(r => !r.isNextActionable);
    expect(nonActionable.length).toBeGreaterThan(0);
  });
});

describe('groupRemindersByMonth — paid history filter', () => {
  it('filters out paid occurrences older than 1 month', () => {
    const oldPaid: Reminder = {
      id: 'rem-old',
      userId: 'user-1',
      title: 'Old Bill',
      amount: 50,
      dueDate: threeMonthsAgo,
      isPaid: true,
      recurrence: { type: 'once', interval: 1, endType: 'never' },
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-01-01T00:00:00Z',
    };

    const groups = groupRemindersByMonth([oldPaid], 6, 0);
    const allReminders = groups.flatMap(g => g.reminders);

    expect(allReminders.find(r => r.id === 'rem-old')).toBeUndefined();
  });

  it('hides paid occurrences by default', () => {
    const recentPaid: Reminder = {
      id: 'rem-recent',
      userId: 'user-1',
      title: 'Recent Bill',
      amount: 50,
      dueDate: format(subDays(new Date(), 5), 'yyyy-MM-dd'),
      isPaid: true,
      recurrence: { type: 'once', interval: 1, endType: 'never' },
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-01-01T00:00:00Z',
    };

    // Default: paid reminders are hidden
    const groups = groupRemindersByMonth([recentPaid], 1, 0);
    const allReminders = groups.flatMap(g => g.reminders);
    expect(allReminders.find(r => r.id === 'rem-recent')).toBeUndefined();

    // With showPaid=true: paid reminders are visible
    const groupsWithPaid = groupRemindersByMonth([recentPaid], 1, 0, true);
    const allWithPaid = groupsWithPaid.flatMap(g => g.reminders);
    expect(allWithPaid.find(r => r.id === 'rem-recent')).toBeDefined();
  });
});
