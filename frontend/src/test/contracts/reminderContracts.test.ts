/**
 * API Contract Tests — Reminder Service
 *
 * Validates that frontend reminder service payloads conform to the
 * backend Zod schemas. Schemas recreated here since frontend and
 * backend are separate workspaces.
 *
 * If a backend schema changes, these tests should be updated to match.
 */
import { z } from 'zod';
import { describe, it, expect } from 'vitest';

// --- Recreated backend schemas (from backend/src/modules/reminders/presentation/schemas.ts) ---

const recurrenceType = z.enum(['once', 'daily', 'weekly', 'monthly', 'yearly', 'custom']);
const recurrenceEndType = z.enum(['never', 'after', 'on_date']);

const recurrenceConfigSchema = z.object({
  type: recurrenceType,
  interval: z.number().int().positive(),
  daysOfWeek: z.array(z.number().int().min(0).max(6)).optional(),
  endType: recurrenceEndType,
  endCount: z.number().int().positive().optional(),
  endDate: z.string().optional(),
}).strict();

const createReminderSchema = z.object({
  title: z.string().min(1).max(200),
  amount: z.number().positive(),
  dueDate: z.string().min(1),
  recurrence: recurrenceConfigSchema,
  fixedExpenseId: z.string().uuid().optional(),
  templateId: z.string().uuid().optional(),
}).strict();

const updateReminderSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  amount: z.number().positive().optional(),
  dueDate: z.string().min(1).optional(),
  isPaid: z.boolean().optional(),
  recurrence: recurrenceConfigSchema.optional(),
  linkedMovementId: z.string().uuid().nullable().optional(),
  fixedExpenseId: z.string().uuid().optional(),
  templateId: z.string().uuid().optional(),
}).strict();

const markAsPaidSchema = z.object({
  movementId: z.string().uuid().optional(),
}).strict();

const createExceptionSchema = z.object({
  originalDate: z.string().min(1),
  action: z.enum(['deleted', 'modified']),
  newTitle: z.string().min(1).max(200).optional(),
  newAmount: z.number().positive().optional(),
  newDate: z.string().optional(),
  isPaid: z.boolean().optional(),
  linkedMovementId: z.string().uuid().optional(),
}).strict();

const splitSeriesSchema = z.object({
  splitDate: z.string().min(1),
  newDetails: createReminderSchema.omit({ fixedExpenseId: true, templateId: true }).optional(),
}).strict();

// --- Test helpers ---

const uuid = '550e8400-e29b-41d4-a716-446655440000';
const uuid2 = '660e8400-e29b-41d4-a716-446655440001';

const validRecurrence = {
  type: 'monthly' as const,
  interval: 1,
  endType: 'never' as const,
};

// --- RecurrenceConfig Contract Tests ---

describe('RecurrenceConfig API Contract', () => {
  it('accepts a minimal one-time recurrence', () => {
    const payload = { type: 'once' as const, interval: 1, endType: 'never' as const };
    expect(recurrenceConfigSchema.safeParse(payload).success).toBe(true);
  });

  it('accepts a weekly recurrence with daysOfWeek', () => {
    const payload = {
      type: 'weekly' as const,
      interval: 1,
      daysOfWeek: [1, 3, 5],
      endType: 'never' as const,
    };
    expect(recurrenceConfigSchema.safeParse(payload).success).toBe(true);
  });

  it('accepts an "after N occurrences" end type', () => {
    const payload = {
      type: 'monthly' as const,
      interval: 1,
      endType: 'after' as const,
      endCount: 12,
    };
    expect(recurrenceConfigSchema.safeParse(payload).success).toBe(true);
  });

  it('accepts an "on_date" end type', () => {
    const payload = {
      type: 'yearly' as const,
      interval: 1,
      endType: 'on_date' as const,
      endDate: '2030-01-01',
    };
    expect(recurrenceConfigSchema.safeParse(payload).success).toBe(true);
  });

  it('rejects invalid recurrence type', () => {
    const payload = { type: 'biweekly', interval: 1, endType: 'never' };
    expect(recurrenceConfigSchema.safeParse(payload).success).toBe(false);
  });

  it('rejects zero interval', () => {
    const payload = { type: 'monthly', interval: 0, endType: 'never' };
    expect(recurrenceConfigSchema.safeParse(payload).success).toBe(false);
  });

  it('rejects negative interval', () => {
    const payload = { type: 'monthly', interval: -1, endType: 'never' };
    expect(recurrenceConfigSchema.safeParse(payload).success).toBe(false);
  });

  it('rejects non-integer interval', () => {
    const payload = { type: 'monthly', interval: 1.5, endType: 'never' };
    expect(recurrenceConfigSchema.safeParse(payload).success).toBe(false);
  });

  it('rejects daysOfWeek values out of range', () => {
    const payload = {
      type: 'weekly', interval: 1,
      daysOfWeek: [7], endType: 'never',
    };
    expect(recurrenceConfigSchema.safeParse(payload).success).toBe(false);
  });

  it('rejects negative daysOfWeek values', () => {
    const payload = {
      type: 'weekly', interval: 1,
      daysOfWeek: [-1], endType: 'never',
    };
    expect(recurrenceConfigSchema.safeParse(payload).success).toBe(false);
  });

  it('rejects invalid endType', () => {
    const payload = { type: 'monthly', interval: 1, endType: 'forever' };
    expect(recurrenceConfigSchema.safeParse(payload).success).toBe(false);
  });

  it('rejects unknown fields (strict mode)', () => {
    const payload = {
      type: 'monthly', interval: 1, endType: 'never',
      customPeriod: 'weekly',
    };
    expect(recurrenceConfigSchema.safeParse(payload).success).toBe(false);
  });

  it('rejects missing required fields', () => {
    expect(recurrenceConfigSchema.safeParse({ type: 'monthly' }).success).toBe(false);
    expect(recurrenceConfigSchema.safeParse({ interval: 1, endType: 'never' }).success).toBe(false);
    expect(recurrenceConfigSchema.safeParse({ type: 'monthly', interval: 1 }).success).toBe(false);
  });
});

// --- Reminder Contract Tests ---

describe('Reminder API Contracts', () => {
  describe('createReminder', () => {
    it('accepts a minimal valid payload', () => {
      const payload = {
        title: 'Electric Bill',
        amount: 50,
        dueDate: '2026-06-01',
        recurrence: validRecurrence,
      };
      expect(createReminderSchema.safeParse(payload).success).toBe(true);
    });

    it('accepts payload with all optional fields', () => {
      const payload = {
        title: 'Rent',
        amount: 1200,
        dueDate: '2026-06-01',
        recurrence: {
          type: 'monthly' as const,
          interval: 1,
          endType: 'after' as const,
          endCount: 12,
        },
        fixedExpenseId: uuid,
        templateId: uuid2,
      };
      expect(createReminderSchema.safeParse(payload).success).toBe(true);
    });

    it('accepts max-length title (200 chars)', () => {
      const payload = {
        title: 'a'.repeat(200),
        amount: 10,
        dueDate: '2026-06-01',
        recurrence: validRecurrence,
      };
      expect(createReminderSchema.safeParse(payload).success).toBe(true);
    });

    it('rejects empty title', () => {
      const payload = {
        title: '', amount: 10, dueDate: '2026-06-01', recurrence: validRecurrence,
      };
      expect(createReminderSchema.safeParse(payload).success).toBe(false);
    });

    it('rejects title exceeding max length', () => {
      const payload = {
        title: 'a'.repeat(201),
        amount: 10, dueDate: '2026-06-01', recurrence: validRecurrence,
      };
      expect(createReminderSchema.safeParse(payload).success).toBe(false);
    });

    it('rejects zero amount', () => {
      const payload = {
        title: 'Bill', amount: 0, dueDate: '2026-06-01', recurrence: validRecurrence,
      };
      expect(createReminderSchema.safeParse(payload).success).toBe(false);
    });

    it('rejects negative amount', () => {
      const payload = {
        title: 'Bill', amount: -100, dueDate: '2026-06-01', recurrence: validRecurrence,
      };
      expect(createReminderSchema.safeParse(payload).success).toBe(false);
    });

    it('rejects empty dueDate', () => {
      const payload = {
        title: 'Bill', amount: 10, dueDate: '', recurrence: validRecurrence,
      };
      expect(createReminderSchema.safeParse(payload).success).toBe(false);
    });

    it('rejects missing recurrence', () => {
      const payload = { title: 'Bill', amount: 10, dueDate: '2026-06-01' };
      expect(createReminderSchema.safeParse(payload).success).toBe(false);
    });

    it('rejects invalid recurrence shape', () => {
      const payload = {
        title: 'Bill', amount: 10, dueDate: '2026-06-01',
        recurrence: { type: 'monthly' },
      };
      expect(createReminderSchema.safeParse(payload).success).toBe(false);
    });

    it('rejects non-UUID fixedExpenseId', () => {
      const payload = {
        title: 'Bill', amount: 10, dueDate: '2026-06-01',
        recurrence: validRecurrence,
        fixedExpenseId: 'not-uuid',
      };
      expect(createReminderSchema.safeParse(payload).success).toBe(false);
    });

    it('rejects non-UUID templateId', () => {
      const payload = {
        title: 'Bill', amount: 10, dueDate: '2026-06-01',
        recurrence: validRecurrence,
        templateId: 'not-uuid',
      };
      expect(createReminderSchema.safeParse(payload).success).toBe(false);
    });

    it('rejects unknown fields (strict mode)', () => {
      const payload = {
        title: 'Bill', amount: 10, dueDate: '2026-06-01',
        recurrence: validRecurrence,
        notes: 'unexpected field',
      };
      expect(createReminderSchema.safeParse(payload).success).toBe(false);
    });
  });

  describe('updateReminder', () => {
    it('accepts empty object (no updates)', () => {
      expect(updateReminderSchema.safeParse({}).success).toBe(true);
    });

    it('accepts partial title update', () => {
      expect(updateReminderSchema.safeParse({ title: 'New Title' }).success).toBe(true);
    });

    it('accepts partial amount update', () => {
      expect(updateReminderSchema.safeParse({ amount: 75 }).success).toBe(true);
    });

    it('accepts partial dueDate update', () => {
      expect(updateReminderSchema.safeParse({ dueDate: '2026-07-01' }).success).toBe(true);
    });

    it('accepts isPaid toggle', () => {
      expect(updateReminderSchema.safeParse({ isPaid: true }).success).toBe(true);
      expect(updateReminderSchema.safeParse({ isPaid: false }).success).toBe(true);
    });

    it('accepts recurrence update', () => {
      expect(updateReminderSchema.safeParse({ recurrence: validRecurrence }).success).toBe(true);
    });

    it('accepts linkedMovementId set to UUID', () => {
      expect(updateReminderSchema.safeParse({ linkedMovementId: uuid }).success).toBe(true);
    });

    it('accepts linkedMovementId set to null (unlink)', () => {
      expect(updateReminderSchema.safeParse({ linkedMovementId: null }).success).toBe(true);
    });

    it('accepts fixedExpenseId and templateId UUIDs', () => {
      expect(updateReminderSchema.safeParse({ fixedExpenseId: uuid }).success).toBe(true);
      expect(updateReminderSchema.safeParse({ templateId: uuid2 }).success).toBe(true);
    });

    it('rejects empty title', () => {
      expect(updateReminderSchema.safeParse({ title: '' }).success).toBe(false);
    });

    it('rejects zero or negative amount', () => {
      expect(updateReminderSchema.safeParse({ amount: 0 }).success).toBe(false);
      expect(updateReminderSchema.safeParse({ amount: -1 }).success).toBe(false);
    });

    it('rejects empty dueDate', () => {
      expect(updateReminderSchema.safeParse({ dueDate: '' }).success).toBe(false);
    });

    it('rejects non-UUID linkedMovementId', () => {
      expect(updateReminderSchema.safeParse({ linkedMovementId: 'not-uuid' }).success).toBe(false);
    });

    it('rejects unknown fields (strict mode)', () => {
      expect(updateReminderSchema.safeParse({ extraField: true }).success).toBe(false);
    });
  });

  describe('markAsPaid', () => {
    it('accepts empty payload (no movement linked)', () => {
      expect(markAsPaidSchema.safeParse({}).success).toBe(true);
    });

    it('accepts payload with movementId', () => {
      expect(markAsPaidSchema.safeParse({ movementId: uuid }).success).toBe(true);
    });

    it('accepts undefined movementId (frontend service shape)', () => {
      // Service sends { movementId: undefined } when not provided
      expect(markAsPaidSchema.safeParse({ movementId: undefined }).success).toBe(true);
    });

    it('rejects non-UUID movementId', () => {
      expect(markAsPaidSchema.safeParse({ movementId: 'not-uuid' }).success).toBe(false);
    });

    it('rejects unknown fields (strict mode)', () => {
      expect(markAsPaidSchema.safeParse({ movementId: uuid, extra: 1 }).success).toBe(false);
    });
  });

  describe('createException', () => {
    it('accepts a minimal "deleted" exception', () => {
      const payload = {
        originalDate: '2026-06-01',
        action: 'deleted' as const,
      };
      expect(createExceptionSchema.safeParse(payload).success).toBe(true);
    });

    it('accepts a "modified" exception with all fields', () => {
      const payload = {
        originalDate: '2026-06-01',
        action: 'modified' as const,
        newTitle: 'Updated Title',
        newAmount: 75,
        newDate: '2026-06-05',
        isPaid: true,
        linkedMovementId: uuid,
      };
      expect(createExceptionSchema.safeParse(payload).success).toBe(true);
    });

    it('rejects empty originalDate', () => {
      const payload = { originalDate: '', action: 'deleted' as const };
      expect(createExceptionSchema.safeParse(payload).success).toBe(false);
    });

    it('rejects invalid action', () => {
      const payload = { originalDate: '2026-06-01', action: 'skipped' };
      expect(createExceptionSchema.safeParse(payload).success).toBe(false);
    });

    it('rejects empty newTitle', () => {
      const payload = {
        originalDate: '2026-06-01',
        action: 'modified' as const,
        newTitle: '',
      };
      expect(createExceptionSchema.safeParse(payload).success).toBe(false);
    });

    it('rejects newTitle exceeding max length', () => {
      const payload = {
        originalDate: '2026-06-01',
        action: 'modified' as const,
        newTitle: 'a'.repeat(201),
      };
      expect(createExceptionSchema.safeParse(payload).success).toBe(false);
    });

    it('rejects zero or negative newAmount', () => {
      expect(createExceptionSchema.safeParse({
        originalDate: '2026-06-01', action: 'modified' as const, newAmount: 0,
      }).success).toBe(false);
      expect(createExceptionSchema.safeParse({
        originalDate: '2026-06-01', action: 'modified' as const, newAmount: -50,
      }).success).toBe(false);
    });

    it('rejects non-UUID linkedMovementId', () => {
      const payload = {
        originalDate: '2026-06-01',
        action: 'modified' as const,
        linkedMovementId: 'not-uuid',
      };
      expect(createExceptionSchema.safeParse(payload).success).toBe(false);
    });

    it('rejects reminderId field (frontend strips it before sending)', () => {
      // The frontend service uses Omit<CreateExceptionDTO, 'reminderId'>
      // before posting, so reminderId must NOT be in the payload.
      const payload = {
        reminderId: uuid,
        originalDate: '2026-06-01',
        action: 'deleted' as const,
      };
      expect(createExceptionSchema.safeParse(payload).success).toBe(false);
    });

    it('rejects unknown fields (strict mode)', () => {
      const payload = {
        originalDate: '2026-06-01',
        action: 'deleted' as const,
        extraField: 1,
      };
      expect(createExceptionSchema.safeParse(payload).success).toBe(false);
    });
  });

  describe('splitSeries', () => {
    it('accepts a minimal split payload (no newDetails)', () => {
      const payload = { splitDate: '2026-06-01' };
      expect(splitSeriesSchema.safeParse(payload).success).toBe(true);
    });

    it('accepts split with new details', () => {
      const payload = {
        splitDate: '2026-06-01',
        newDetails: {
          title: 'Updated Bill',
          amount: 100,
          dueDate: '2026-06-01',
          recurrence: validRecurrence,
        },
      };
      expect(splitSeriesSchema.safeParse(payload).success).toBe(true);
    });

    it('rejects empty splitDate', () => {
      expect(splitSeriesSchema.safeParse({ splitDate: '' }).success).toBe(false);
    });

    it('rejects missing splitDate', () => {
      expect(splitSeriesSchema.safeParse({}).success).toBe(false);
    });

    it('rejects newDetails containing fixedExpenseId (omitted by schema)', () => {
      const payload = {
        splitDate: '2026-06-01',
        newDetails: {
          title: 'Bill', amount: 10, dueDate: '2026-06-01',
          recurrence: validRecurrence,
          fixedExpenseId: uuid,
        },
      };
      expect(splitSeriesSchema.safeParse(payload).success).toBe(false);
    });

    it('rejects newDetails containing templateId (omitted by schema)', () => {
      const payload = {
        splitDate: '2026-06-01',
        newDetails: {
          title: 'Bill', amount: 10, dueDate: '2026-06-01',
          recurrence: validRecurrence,
          templateId: uuid,
        },
      };
      expect(splitSeriesSchema.safeParse(payload).success).toBe(false);
    });

    it('rejects newDetails missing required reminder fields', () => {
      const payload = {
        splitDate: '2026-06-01',
        newDetails: { title: 'Incomplete' },
      };
      expect(splitSeriesSchema.safeParse(payload).success).toBe(false);
    });

    it('rejects unknown top-level fields (strict mode)', () => {
      const payload = { splitDate: '2026-06-01', extraField: 'oops' };
      expect(splitSeriesSchema.safeParse(payload).success).toBe(false);
    });
  });
});
