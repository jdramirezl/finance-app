/**
 * API Contract Tests — Settings & Currency Services
 *
 * These tests validate that the payloads sent by frontend service methods
 * (settingsService, currencyService, and the investment update path) conform
 * to the shapes expected by the backend Zod schemas defined in
 * `backend/src/modules/settings/presentation/schemas.ts`.
 *
 * The schemas are duplicated here (not imported from backend) because frontend
 * and backend are separate workspaces. If a backend schema changes, these
 * tests should be updated to match.
 */
import { z } from 'zod';
import { describe, it, expect } from 'vitest';

// --- Recreated backend schemas (from backend/src/modules/settings/presentation/schemas.ts) ---

const currency = z.enum(['USD', 'MXN', 'COP', 'EUR', 'GBP']);

const updateSettingsSchema = z.object({
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

const convertCurrencySchema = z.object({
  amount: z.number(),
  fromCurrency: currency,
  toCurrency: currency,
}).strict();

const convertBatchSchema = z.object({
  conversions: z.array(z.object({
    amount: z.number(),
    from: currency,
    to: currency,
  })).min(1),
}).strict();

const updateInvestmentSchema = z.object({
  shares: z.number().min(0).optional(),
  montoInvertido: z.number().min(0).optional(),
}).strict();

// --- updateSettings Contract Tests ---

describe('Settings API Contracts', () => {
  describe('updateSettings', () => {
    it('accepts an empty object (no updates)', () => {
      expect(updateSettingsSchema.safeParse({}).success).toBe(true);
    });

    it('accepts a single primaryCurrency update', () => {
      expect(updateSettingsSchema.safeParse({ primaryCurrency: 'USD' as const }).success).toBe(true);
      expect(updateSettingsSchema.safeParse({ primaryCurrency: 'MXN' as const }).success).toBe(true);
      expect(updateSettingsSchema.safeParse({ primaryCurrency: 'COP' as const }).success).toBe(true);
      expect(updateSettingsSchema.safeParse({ primaryCurrency: 'EUR' as const }).success).toBe(true);
      expect(updateSettingsSchema.safeParse({ primaryCurrency: 'GBP' as const }).success).toBe(true);
    });

    it('accepts a fully-populated payload', () => {
      const payload = {
        primaryCurrency: 'USD' as const,
        alphaVantageApiKey: 'ABC123',
        snapshotFrequency: 'weekly' as const,
        defaultExpenseAccountId: 'acct-expense-1',
        defaultExpensePocketId: 'pocket-expense-1',
        defaultIncomeAccountId: 'acct-income-1',
        defaultIncomePocketId: 'pocket-income-1',
        dateFormat: 'MMM d, yyyy' as const,
        movementsPerPage: 50,
        reminderAdvanceDays: 7,
        defaultCurrencyForNewAccounts: 'MXN' as const,
      };
      expect(updateSettingsSchema.safeParse(payload).success).toBe(true);
    });

    it('accepts each snapshotFrequency value', () => {
      for (const freq of ['daily', 'weekly', 'monthly', 'manual'] as const) {
        expect(updateSettingsSchema.safeParse({ snapshotFrequency: freq }).success).toBe(true);
      }
    });

    it('accepts each dateFormat value', () => {
      for (const fmt of ['MMM d, yyyy', 'dd/MM/yyyy', 'MM/dd/yyyy', 'yyyy-MM-dd'] as const) {
        expect(updateSettingsSchema.safeParse({ dateFormat: fmt }).success).toBe(true);
      }
    });

    it('rejects invalid currency', () => {
      expect(updateSettingsSchema.safeParse({ primaryCurrency: 'BTC' }).success).toBe(false);
      expect(updateSettingsSchema.safeParse({ defaultCurrencyForNewAccounts: 'JPY' }).success).toBe(false);
    });

    it('rejects empty alphaVantageApiKey', () => {
      expect(updateSettingsSchema.safeParse({ alphaVantageApiKey: '' }).success).toBe(false);
    });

    it('rejects invalid snapshotFrequency', () => {
      expect(updateSettingsSchema.safeParse({ snapshotFrequency: 'hourly' }).success).toBe(false);
    });

    it('rejects invalid dateFormat', () => {
      expect(updateSettingsSchema.safeParse({ dateFormat: 'not-a-format' }).success).toBe(false);
    });

    it('enforces movementsPerPage bounds', () => {
      expect(updateSettingsSchema.safeParse({ movementsPerPage: 10 }).success).toBe(true);
      expect(updateSettingsSchema.safeParse({ movementsPerPage: 200 }).success).toBe(true);
      expect(updateSettingsSchema.safeParse({ movementsPerPage: 100 }).success).toBe(true);
      expect(updateSettingsSchema.safeParse({ movementsPerPage: 9 }).success).toBe(false);
      expect(updateSettingsSchema.safeParse({ movementsPerPage: 201 }).success).toBe(false);
      expect(updateSettingsSchema.safeParse({ movementsPerPage: 50.5 }).success).toBe(false);
    });

    it('enforces reminderAdvanceDays bounds', () => {
      expect(updateSettingsSchema.safeParse({ reminderAdvanceDays: 1 }).success).toBe(true);
      expect(updateSettingsSchema.safeParse({ reminderAdvanceDays: 30 }).success).toBe(true);
      expect(updateSettingsSchema.safeParse({ reminderAdvanceDays: 0 }).success).toBe(false);
      expect(updateSettingsSchema.safeParse({ reminderAdvanceDays: 31 }).success).toBe(false);
      expect(updateSettingsSchema.safeParse({ reminderAdvanceDays: 7.5 }).success).toBe(false);
    });

    it('allows unknown fields (passthrough mode)', () => {
      // updateSettingsSchema uses .passthrough() so unknown fields like
      // `accountCardDisplay` (sent by setAccountCardDisplaySettings) are accepted
      // and forwarded to the backend untouched.
      const payload = {
        primaryCurrency: 'USD' as const,
        accountCardDisplay: { normal: 'detailed', investment: 'compact', cd: 'detailed' },
        someFutureField: 'value',
      };
      expect(updateSettingsSchema.safeParse(payload).success).toBe(true);
    });

    it('rejects wrong types for known fields even in passthrough mode', () => {
      expect(updateSettingsSchema.safeParse({ movementsPerPage: '50' }).success).toBe(false);
      expect(updateSettingsSchema.safeParse({ reminderAdvanceDays: '7' }).success).toBe(false);
      expect(updateSettingsSchema.safeParse({ alphaVantageApiKey: 123 }).success).toBe(false);
    });
  });
});

// --- Currency Contract Tests ---

describe('Currency API Contracts', () => {
  describe('convertCurrency', () => {
    it('accepts a valid conversion payload', () => {
      // Mirrors currencyService.convert(amount, from, to)
      const payload = {
        amount: 100,
        fromCurrency: 'USD' as const,
        toCurrency: 'MXN' as const,
      };
      expect(convertCurrencySchema.safeParse(payload).success).toBe(true);
    });

    it('accepts negative and zero amounts', () => {
      // The schema does not constrain sign; conversion of refunds/zero is allowed.
      expect(convertCurrencySchema.safeParse({
        amount: 0, fromCurrency: 'USD' as const, toCurrency: 'EUR' as const,
      }).success).toBe(true);
      expect(convertCurrencySchema.safeParse({
        amount: -50.25, fromCurrency: 'USD' as const, toCurrency: 'EUR' as const,
      }).success).toBe(true);
    });

    it('accepts same-currency conversions', () => {
      const payload = {
        amount: 100,
        fromCurrency: 'USD' as const,
        toCurrency: 'USD' as const,
      };
      expect(convertCurrencySchema.safeParse(payload).success).toBe(true);
    });

    it('rejects missing fields', () => {
      expect(convertCurrencySchema.safeParse({ amount: 100, fromCurrency: 'USD' }).success).toBe(false);
      expect(convertCurrencySchema.safeParse({ amount: 100, toCurrency: 'MXN' }).success).toBe(false);
      expect(convertCurrencySchema.safeParse({ fromCurrency: 'USD', toCurrency: 'MXN' }).success).toBe(false);
    });

    it('rejects non-numeric amount', () => {
      const payload = { amount: '100', fromCurrency: 'USD', toCurrency: 'MXN' };
      expect(convertCurrencySchema.safeParse(payload).success).toBe(false);
    });

    it('rejects invalid currency codes', () => {
      const payload = { amount: 100, fromCurrency: 'BTC', toCurrency: 'MXN' };
      expect(convertCurrencySchema.safeParse(payload).success).toBe(false);
    });

    it('rejects unknown fields (strict mode)', () => {
      const payload = {
        amount: 100,
        fromCurrency: 'USD',
        toCurrency: 'MXN',
        // Frontend uses {from, to} in batch but {fromCurrency, toCurrency} for single
        // conversion. Sending the batch field names should be rejected here.
        from: 'USD',
        to: 'MXN',
      };
      expect(convertCurrencySchema.safeParse(payload).success).toBe(false);
    });
  });

  describe('convertBatch', () => {
    it('accepts a valid batch payload', () => {
      // Mirrors currencyService.convertBatch(conversions)
      const payload = {
        conversions: [
          { amount: 100, from: 'USD' as const, to: 'MXN' as const },
          { amount: 50, from: 'EUR' as const, to: 'USD' as const },
          { amount: 1000, from: 'COP' as const, to: 'USD' as const },
        ],
      };
      expect(convertBatchSchema.safeParse(payload).success).toBe(true);
    });

    it('accepts a single-item batch', () => {
      const payload = {
        conversions: [{ amount: 1, from: 'GBP' as const, to: 'USD' as const }],
      };
      expect(convertBatchSchema.safeParse(payload).success).toBe(true);
    });

    it('rejects empty conversions array', () => {
      expect(convertBatchSchema.safeParse({ conversions: [] }).success).toBe(false);
    });

    it('rejects missing conversions field', () => {
      expect(convertBatchSchema.safeParse({}).success).toBe(false);
    });

    it('rejects items with the single-conversion field names', () => {
      // The batch endpoint uses {from, to}, NOT {fromCurrency, toCurrency}.
      const payload = {
        conversions: [{ amount: 100, fromCurrency: 'USD', toCurrency: 'MXN' }],
      };
      expect(convertBatchSchema.safeParse(payload).success).toBe(false);
    });

    it('rejects items with invalid currency codes', () => {
      const payload = {
        conversions: [{ amount: 100, from: 'USD', to: 'XYZ' }],
      };
      expect(convertBatchSchema.safeParse(payload).success).toBe(false);
    });

    it('rejects items missing amount', () => {
      const payload = {
        conversions: [{ from: 'USD', to: 'MXN' }],
      };
      expect(convertBatchSchema.safeParse(payload).success).toBe(false);
    });

    it('rejects unknown top-level fields (strict mode)', () => {
      const payload = {
        conversions: [{ amount: 100, from: 'USD', to: 'MXN' }],
        cacheKey: 'foo',
      };
      expect(convertBatchSchema.safeParse(payload).success).toBe(false);
    });

    it('rejects non-array conversions', () => {
      const payload = { conversions: { amount: 100, from: 'USD', to: 'MXN' } };
      expect(convertBatchSchema.safeParse(payload).success).toBe(false);
    });
  });
});

// --- Investment Update Contract Tests ---
//
// updateInvestmentSchema lives in the settings module's schemas.ts but is
// consumed by the accounts module's POST /api/accounts/:accountId/update
// route. It is included here to keep all schemas defined in settings/presentation/schemas.ts
// covered by a contract test.

describe('Investment Update API Contracts', () => {
  describe('updateInvestment', () => {
    it('accepts shares-only update', () => {
      expect(updateInvestmentSchema.safeParse({ shares: 10 }).success).toBe(true);
    });

    it('accepts montoInvertido-only update', () => {
      expect(updateInvestmentSchema.safeParse({ montoInvertido: 1000.5 }).success).toBe(true);
    });

    it('accepts both fields together', () => {
      expect(updateInvestmentSchema.safeParse({ shares: 10, montoInvertido: 5000 }).success).toBe(true);
    });

    it('accepts zero values', () => {
      expect(updateInvestmentSchema.safeParse({ shares: 0, montoInvertido: 0 }).success).toBe(true);
    });

    it('accepts an empty object (no updates)', () => {
      expect(updateInvestmentSchema.safeParse({}).success).toBe(true);
    });

    it('rejects negative shares', () => {
      expect(updateInvestmentSchema.safeParse({ shares: -1 }).success).toBe(false);
    });

    it('rejects negative montoInvertido', () => {
      expect(updateInvestmentSchema.safeParse({ montoInvertido: -100 }).success).toBe(false);
    });

    it('rejects non-numeric values', () => {
      expect(updateInvestmentSchema.safeParse({ shares: '10' }).success).toBe(false);
      expect(updateInvestmentSchema.safeParse({ montoInvertido: '1000' }).success).toBe(false);
    });

    it('rejects unknown fields (strict mode)', () => {
      const payload = { shares: 10, symbol: 'VOO' };
      expect(updateInvestmentSchema.safeParse(payload).success).toBe(false);
    });
  });
});
