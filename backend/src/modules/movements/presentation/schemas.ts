import { z } from 'zod';

const movementType = z.enum(['IngresoNormal', 'EgresoNormal', 'IngresoFijo', 'EgresoFijo']);

export const createMovementSchema = z.object({
  type: movementType,
  accountId: z.string().uuid(),
  pocketId: z.string().uuid(),
  amount: z.number().positive(),
  displayedDate: z.string().min(1),
  notes: z.string().optional(),
  subPocketId: z.string().uuid().optional(),
  isPending: z.boolean().optional(),
  category: z.string().max(50).optional(),
  tags: z.array(z.string().max(30)).max(10).optional(),
}).strict();

export const updateMovementSchema = z.object({
  type: movementType.optional(),
  amount: z.number().positive().optional(),
  displayedDate: z.string().min(1).optional(),
  notes: z.string().optional(),
  subPocketId: z.string().uuid().nullable().optional(),
  accountId: z.string().uuid().optional(),
  pocketId: z.string().uuid().optional(),
  category: z.string().max(50).nullable().optional(),
  tags: z.array(z.string().max(30)).max(10).nullable().optional(),
}).strict();

export const createTransferSchema = z.object({
  sourceAccountId: z.string().uuid(),
  sourcePocketId: z.string().uuid(),
  targetAccountId: z.string().uuid(),
  targetPocketId: z.string().uuid(),
  amount: z.number().positive(),
  displayedDate: z.string().min(1),
  notes: z.string().optional(),
}).strict();

export const batchMovementSchema = z.object({
  movements: z.array(z.object({
    type: movementType,
    accountId: z.string().uuid(),
    pocketId: z.string().uuid(),
    amount: z.number().positive(),
    displayedDate: z.string().min(1),
    notes: z.string().optional(),
    subPocketId: z.string().uuid().optional(),
    isPending: z.boolean().optional(),
    category: z.string().max(50).optional(),
    tags: z.array(z.string().max(30)).max(10).optional(),
  })).min(1),
}).strict();

export const markOrphanedSchema = z.object({
  entityId: z.string().uuid(),
  entityType: z.enum(['account', 'pocket']),
}).strict();

export const updateAccountForPocketSchema = z.object({
  pocketId: z.string().uuid(),
  newAccountId: z.string().uuid(),
}).strict();
