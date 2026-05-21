import { z } from 'zod';

const currency = z.enum(['USD', 'MXN', 'COP', 'EUR', 'GBP']);
const pocketType = z.enum(['normal', 'fixed']);

export const createPocketSchema = z.object({
  accountId: z.string().uuid(),
  name: z.string().min(1).max(100),
  type: pocketType,
  currency: currency.optional(),
}).strict();

export const updatePocketSchema = z.object({
  name: z.string().min(1).max(100).optional(),
}).strict();

export const migratePocketSchema = z.object({
  targetAccountId: z.string().uuid(),
}).strict();

export const reorderPocketsSchema = z.object({
  pocketIds: z.array(z.string().uuid()).min(1),
}).strict();
