import { z } from 'zod';

const currency = z.enum(['USD', 'MXN', 'COP', 'EUR', 'GBP']);

export const updateSettingsSchema = z.object({
  primaryCurrency: currency.optional(),
  alphaVantageApiKey: z.string().min(1).optional(),
}).strict();

export const convertCurrencySchema = z.object({
  amount: z.number().positive(),
  fromCurrency: currency,
  toCurrency: currency,
}).strict();

export const convertBatchSchema = z.object({
  conversions: z.array(z.object({
    amount: z.number().positive(),
    from: currency,
    to: currency,
  })).min(1),
}).strict();

export const updateInvestmentSchema = z.object({
  shares: z.number().min(0).optional(),
  montoInvertido: z.number().min(0).optional(),
}).strict();
