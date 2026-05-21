import { z } from 'zod';

const movementType = z.enum(['IngresoNormal', 'EgresoNormal', 'IngresoFijo', 'EgresoFijo']);

export const createTemplateSchema = z.object({
  name: z.string().min(1).max(100),
  type: movementType,
  accountId: z.string().uuid(),
  pocketId: z.string().uuid(),
  subPocketId: z.string().uuid().nullable().optional(),
  defaultAmount: z.number().positive().nullable().optional(),
  notes: z.string().nullable().optional(),
}).strict();

export const updateTemplateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  type: movementType.optional(),
  accountId: z.string().uuid().optional(),
  pocketId: z.string().uuid().optional(),
  subPocketId: z.string().uuid().nullable().optional(),
  defaultAmount: z.number().positive().nullable().optional(),
  notes: z.string().nullable().optional(),
}).strict();
