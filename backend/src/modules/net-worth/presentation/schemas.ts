import { z } from 'zod';

const currency = z.enum(['USD', 'MXN', 'COP', 'EUR', 'GBP']);

export const createSnapshotSchema = z.object({
  totalNetWorth: z.number(),
  baseCurrency: currency,
  breakdown: z.partialRecord(currency, z.number()),
}).strict();

export const updateSnapshotSchema = z.object({
  totalNetWorth: z.number().optional(),
  baseCurrency: currency.optional(),
  breakdown: z.partialRecord(currency, z.number()).optional(),
}).strict();
