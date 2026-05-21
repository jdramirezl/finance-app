import { z } from 'zod';

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

export const createReminderSchema = z.object({
  title: z.string().min(1).max(200),
  amount: z.number().positive(),
  dueDate: z.string().min(1),
  recurrence: recurrenceConfigSchema,
  fixedExpenseId: z.string().uuid().optional(),
  templateId: z.string().uuid().optional(),
}).strict();

export const updateReminderSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  amount: z.number().positive().optional(),
  dueDate: z.string().min(1).optional(),
  isPaid: z.boolean().optional(),
  recurrence: recurrenceConfigSchema.optional(),
  linkedMovementId: z.string().uuid().nullable().optional(),
  fixedExpenseId: z.string().uuid().optional(),
  templateId: z.string().uuid().optional(),
}).strict();

export const markAsPaidSchema = z.object({
  movementId: z.string().uuid().optional(),
}).strict();

export const createExceptionSchema = z.object({
  originalDate: z.string().min(1),
  action: z.enum(['deleted', 'modified']),
  newTitle: z.string().min(1).max(200).optional(),
  newAmount: z.number().positive().optional(),
  newDate: z.string().optional(),
  isPaid: z.boolean().optional(),
  linkedMovementId: z.string().uuid().optional(),
}).strict();

export const splitSeriesSchema = z.object({
  splitDate: z.string().min(1),
  newDetails: createReminderSchema.omit({ fixedExpenseId: true, templateId: true }).optional(),
}).strict();
