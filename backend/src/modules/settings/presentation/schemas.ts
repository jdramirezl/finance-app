import { z } from 'zod';

const currency = z.enum(['USD', 'MXN', 'COP', 'EUR', 'GBP']);

export const updateSettingsSchema = z.object({
  primaryCurrency: currency.optional(),
  alphaVantageApiKey: z.string().min(1).optional(),
  snapshotFrequency: z.enum(['daily', 'weekly', 'monthly', 'manual']).optional(),
  defaultExpenseAccountId: z.string().optional(),
  defaultExpensePocketId: z.string().optional(),
  defaultIncomeAccountId: z.string().optional(),
  defaultIncomePocketId: z.string().optional(),
  dateFormat: z.enum(['MMM d, yyyy', 'dd/MM/yyyy', 'MM/dd/yyyy', 'yyyy-MM-dd']).optional(),
  movementsPerPage: z.number().int().min(10).max(200).optional(),
  reminderAdvanceDays: z.number().int().min(1).max(30).optional(),
  defaultCurrencyForNewAccounts: currency.optional(),
}).passthrough();

export const convertCurrencySchema = z.object({
  amount: z.number(),
  fromCurrency: currency,
  toCurrency: currency,
}).strict();

export const convertBatchSchema = z.object({
  conversions: z.array(z.object({
    amount: z.number(),
    from: currency,
    to: currency,
  })).min(1),
}).strict();

export const forceRefreshSchema = z.object({
  from: currency,
  to: currency,
});

export const updateInvestmentSchema = z.object({
  shares: z.number().min(0).optional(),
  montoInvertido: z.number().min(0).optional(),
}).strict();
