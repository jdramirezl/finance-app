import { z } from 'zod';

const currency = z.enum(['USD', 'MXN', 'COP', 'EUR', 'GBP']);
const accountType = z.enum(['normal', 'investment', 'cd']);
const investmentType = z.enum(['stock', 'etf', 'cd']);
const compoundingFrequency = z.enum(['daily', 'monthly', 'quarterly', 'annually']);

export const createAccountSchema = z.object({
  name: z.string().min(1).max(100),
  color: z.string().min(1),
  currency: currency,
  type: accountType.optional(),
  stockSymbol: z.string().optional(),
  investmentType: investmentType.optional(),
  principal: z.number().positive().optional(),
  interestRate: z.number().min(0).optional(),
  termMonths: z.number().int().positive().optional(),
  maturityDate: z.string().optional(),
  compoundingFrequency: compoundingFrequency.optional(),
  earlyWithdrawalPenalty: z.number().min(0).optional(),
  withholdingTaxRate: z.number().min(0).max(1).optional(),
  cdCreatedAt: z.string().optional(),
}).strict();

export const updateAccountSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  color: z.string().min(1).optional(),
  currency: currency.optional(),
  principal: z.number().positive().optional(),
  interestRate: z.number().min(0).optional(),
  termMonths: z.number().int().positive().optional(),
  maturityDate: z.string().optional(),
  compoundingFrequency: compoundingFrequency.optional(),
  earlyWithdrawalPenalty: z.number().min(0).optional(),
  withholdingTaxRate: z.number().min(0).max(1).optional(),
}).strict();

export const cascadeDeleteSchema = z.object({
  deleteMovements: z.boolean(),
}).strict();

export const reorderAccountsSchema = z.object({
  accountIds: z.array(z.string().uuid()).min(1),
}).strict();
