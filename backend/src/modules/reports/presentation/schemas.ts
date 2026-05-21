import { z } from 'zod';

export const spendingByCategoryQuerySchema = z.object({
  startDate: z.string().min(1, 'startDate is required'),
  endDate: z.string().min(1, 'endDate is required'),
});

export const monthlyTrendQuerySchema = z.object({
  months: z.coerce.number().int().min(1).max(24).default(6),
});

export const categoryTrendQuerySchema = z.object({
  category: z.string().min(1, 'category is required'),
  months: z.coerce.number().int().min(1).max(24).default(6),
});
