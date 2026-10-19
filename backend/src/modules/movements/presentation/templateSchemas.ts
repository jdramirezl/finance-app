import { z } from 'zod';

const movementType = z.enum(['IngresoNormal', 'EgresoNormal', 'IngresoFijo', 'EgresoFijo']);

export const createTemplateSchema = z.object({
  name: z.string().min(1).max(100),
  type: movementType,
  accountId: z.string().guid(),
  pocketId: z.string().guid(),
  subPocketId: z.string().guid().nullable().optional(),
  defaultAmount: z.number().positive().nullable().optional(),
  notes: z.string().nullable().optional(),
}).strict();

export const updateTemplateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  type: movementType.optional(),
  accountId: z.string().guid().optional(),
  pocketId: z.string().guid().optional(),
  subPocketId: z.string().guid().nullable().optional(),
  defaultAmount: z.number().positive().nullable().optional(),
  notes: z.string().nullable().optional(),
}).strict();
