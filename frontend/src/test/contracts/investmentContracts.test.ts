/**
 * API Contract Tests — Investment & CD Account Services
 *
 * These tests validate that the payloads sent (or sendable) by frontend
 * service methods conform to the shapes expected by the backend Zod
 * schemas for investment-related endpoints. The schemas are duplicated
 * here (not imported from backend) because frontend and backend are
 * separate workspaces.
 *
 * Schemas covered:
 *   - updateInvestmentSchema      → POST /api/investments/:accountId/update
 *                                   (backend/src/modules/settings/presentation/schemas.ts)
 *   - createAccountSchema (inv.)  → POST /api/accounts (type=investment)
 *   - createAccountSchema (cd)    → POST /api/accounts (type=cd)
 *   - updateAccountSchema (cd)    → PUT  /api/accounts/:id  (CD-specific fields)
 *                                   (backend/src/modules/accounts/presentation/schemas.ts)
 *
 * If a backend schema changes, these tests should be updated to match.
 */
import { z } from 'zod';
import { describe, it, expect } from 'vitest';

// --- Recreated backend schemas ---

const currency = z.enum(['USD', 'MXN', 'COP', 'EUR', 'GBP']);
const accountType = z.enum(['normal', 'investment', 'cd']);
const investmentType = z.enum(['stock', 'etf', 'cd']);
const compoundingFrequency = z.enum(['daily', 'monthly', 'quarterly', 'annually']);

// From backend/src/modules/settings/presentation/schemas.ts
const updateInvestmentSchema = z.object({
  shares: z.number().min(0).optional(),
  montoInvertido: z.number().min(0).optional(),
}).strict();

// From backend/src/modules/accounts/presentation/schemas.ts
const createAccountSchema = z.object({
  name: z.string().min(1).max(100),
  color: z.string().min(1),
  currency,
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

const updateAccountSchema = z.object({
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

// --- updateInvestmentSchema Contract Tests ---

describe('Investment API Contracts — updateInvestmentSchema', () => {
  describe('happy path', () => {
    it('accepts shares-only update', () => {
      expect(updateInvestmentSchema.safeParse({ shares: 10 }).success).toBe(true);
    });

    it('accepts montoInvertido-only update', () => {
      expect(updateInvestmentSchema.safeParse({ montoInvertido: 5000 }).success).toBe(true);
    });

    it('accepts both fields together', () => {
      const payload = { shares: 25.5, montoInvertido: 12500.75 };
      expect(updateInvestmentSchema.safeParse(payload).success).toBe(true);
    });

    it('accepts an empty object (no-op update)', () => {
      expect(updateInvestmentSchema.safeParse({}).success).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('accepts zero shares (min is 0, inclusive)', () => {
      expect(updateInvestmentSchema.safeParse({ shares: 0 }).success).toBe(true);
    });

    it('accepts zero montoInvertido (min is 0, inclusive)', () => {
      expect(updateInvestmentSchema.safeParse({ montoInvertido: 0 }).success).toBe(true);
    });

    it('accepts fractional share counts', () => {
      expect(updateInvestmentSchema.safeParse({ shares: 0.0001 }).success).toBe(true);
    });

    it('accepts very large invested amounts', () => {
      expect(updateInvestmentSchema.safeParse({ montoInvertido: 1_000_000_000 }).success).toBe(true);
    });
  });

  describe('invalid values', () => {
    it('rejects negative shares', () => {
      expect(updateInvestmentSchema.safeParse({ shares: -1 }).success).toBe(false);
    });

    it('rejects negative montoInvertido', () => {
      expect(updateInvestmentSchema.safeParse({ montoInvertido: -100 }).success).toBe(false);
    });

    it('rejects non-numeric shares', () => {
      expect(updateInvestmentSchema.safeParse({ shares: '10' }).success).toBe(false);
    });

    it('rejects non-numeric montoInvertido', () => {
      expect(updateInvestmentSchema.safeParse({ montoInvertido: '5000' }).success).toBe(false);
    });

    it('rejects null shares', () => {
      expect(updateInvestmentSchema.safeParse({ shares: null }).success).toBe(false);
    });
  });

  describe('strict mode', () => {
    it('rejects unknown fields', () => {
      const payload = { shares: 10, stockSymbol: 'VOO' };
      expect(updateInvestmentSchema.safeParse(payload).success).toBe(false);
    });

    it('rejects nested unknown objects', () => {
      const payload = { shares: 10, metadata: { source: 'manual' } };
      expect(updateInvestmentSchema.safeParse(payload).success).toBe(false);
    });
  });
});

// --- Investment account creation contract tests ---

describe('Investment API Contracts — createAccount (investment)', () => {
  const baseInvestment = {
    name: 'VOO ETF',
    color: '#2196F3',
    currency: 'USD' as const,
    type: 'investment' as const,
  };

  describe('happy path', () => {
    it('accepts a stock investment payload', () => {
      const payload = { ...baseInvestment, stockSymbol: 'AAPL', investmentType: 'stock' as const };
      expect(createAccountSchema.safeParse(payload).success).toBe(true);
    });

    it('accepts an ETF investment payload', () => {
      const payload = { ...baseInvestment, stockSymbol: 'VOO', investmentType: 'etf' as const };
      expect(createAccountSchema.safeParse(payload).success).toBe(true);
    });

    it('accepts an investment account without stockSymbol or investmentType (both optional)', () => {
      expect(createAccountSchema.safeParse(baseInvestment).success).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('accepts long stock symbols', () => {
      const payload = { ...baseInvestment, stockSymbol: 'BRK.A', investmentType: 'stock' as const };
      expect(createAccountSchema.safeParse(payload).success).toBe(true);
    });

    it('accepts lowercase stock symbols (no casing constraint at schema level)', () => {
      const payload = { ...baseInvestment, stockSymbol: 'voo', investmentType: 'etf' as const };
      expect(createAccountSchema.safeParse(payload).success).toBe(true);
    });
  });

  describe('invalid values', () => {
    it('rejects an unsupported investmentType', () => {
      const payload = { ...baseInvestment, stockSymbol: 'BTC', investmentType: 'crypto' };
      expect(createAccountSchema.safeParse(payload).success).toBe(false);
    });

    it('rejects an unsupported account type', () => {
      const payload = { ...baseInvestment, type: 'crypto' };
      expect(createAccountSchema.safeParse(payload).success).toBe(false);
    });

    it('rejects non-string stockSymbol', () => {
      const payload = { ...baseInvestment, stockSymbol: 123 };
      expect(createAccountSchema.safeParse(payload).success).toBe(false);
    });
  });

  describe('strict mode', () => {
    it('rejects unknown investment-specific fields', () => {
      const payload = { ...baseInvestment, stockSymbol: 'VOO', exchange: 'NYSE' };
      expect(createAccountSchema.safeParse(payload).success).toBe(false);
    });
  });
});

// --- CD account creation contract tests ---

describe('Investment API Contracts — createAccount (CD)', () => {
  const fullCD = {
    name: 'CD 12mo',
    color: '#FF9800',
    currency: 'MXN' as const,
    type: 'cd' as const,
    investmentType: 'cd' as const,
    principal: 10000,
    interestRate: 5.5,
    termMonths: 12,
    maturityDate: '2027-01-01T00:00:00.000Z',
    compoundingFrequency: 'monthly' as const,
    earlyWithdrawalPenalty: 3,
    withholdingTaxRate: 0.2,
    cdCreatedAt: '2026-01-01T00:00:00.000Z',
  };

  describe('happy path', () => {
    it('accepts a fully-specified CD payload', () => {
      expect(createAccountSchema.safeParse(fullCD).success).toBe(true);
    });

    it('accepts a CD with all optional CD fields omitted', () => {
      const minimal = {
        name: 'CD',
        color: '#fff',
        currency: 'USD' as const,
        type: 'cd' as const,
      };
      expect(createAccountSchema.safeParse(minimal).success).toBe(true);
    });

    it('accepts each compoundingFrequency value', () => {
      for (const freq of ['daily', 'monthly', 'quarterly', 'annually'] as const) {
        const payload = { ...fullCD, compoundingFrequency: freq };
        expect(createAccountSchema.safeParse(payload).success).toBe(true);
      }
    });
  });

  describe('edge cases', () => {
    it('accepts zero interestRate (min is 0, inclusive)', () => {
      expect(createAccountSchema.safeParse({ ...fullCD, interestRate: 0 }).success).toBe(true);
    });

    it('accepts zero earlyWithdrawalPenalty', () => {
      expect(createAccountSchema.safeParse({ ...fullCD, earlyWithdrawalPenalty: 0 }).success).toBe(true);
    });

    it('accepts withholdingTaxRate at lower bound (0)', () => {
      expect(createAccountSchema.safeParse({ ...fullCD, withholdingTaxRate: 0 }).success).toBe(true);
    });

    it('accepts withholdingTaxRate at upper bound (1)', () => {
      expect(createAccountSchema.safeParse({ ...fullCD, withholdingTaxRate: 1 }).success).toBe(true);
    });

    it('accepts very long term', () => {
      expect(createAccountSchema.safeParse({ ...fullCD, termMonths: 360 }).success).toBe(true);
    });
  });

  describe('invalid values', () => {
    it('rejects zero principal (must be strictly positive)', () => {
      expect(createAccountSchema.safeParse({ ...fullCD, principal: 0 }).success).toBe(false);
    });

    it('rejects negative principal', () => {
      expect(createAccountSchema.safeParse({ ...fullCD, principal: -100 }).success).toBe(false);
    });

    it('rejects negative interestRate', () => {
      expect(createAccountSchema.safeParse({ ...fullCD, interestRate: -1 }).success).toBe(false);
    });

    it('rejects non-integer termMonths', () => {
      expect(createAccountSchema.safeParse({ ...fullCD, termMonths: 12.5 }).success).toBe(false);
    });

    it('rejects zero termMonths (must be strictly positive)', () => {
      expect(createAccountSchema.safeParse({ ...fullCD, termMonths: 0 }).success).toBe(false);
    });

    it('rejects negative termMonths', () => {
      expect(createAccountSchema.safeParse({ ...fullCD, termMonths: -6 }).success).toBe(false);
    });

    it('rejects negative earlyWithdrawalPenalty', () => {
      expect(createAccountSchema.safeParse({ ...fullCD, earlyWithdrawalPenalty: -1 }).success).toBe(false);
    });

    it('rejects withholdingTaxRate above 1', () => {
      expect(createAccountSchema.safeParse({ ...fullCD, withholdingTaxRate: 1.5 }).success).toBe(false);
    });

    it('rejects negative withholdingTaxRate', () => {
      expect(createAccountSchema.safeParse({ ...fullCD, withholdingTaxRate: -0.1 }).success).toBe(false);
    });

    it('rejects an unsupported compoundingFrequency', () => {
      const payload = { ...fullCD, compoundingFrequency: 'biweekly' };
      expect(createAccountSchema.safeParse(payload).success).toBe(false);
    });

    it('rejects non-string maturityDate', () => {
      expect(createAccountSchema.safeParse({ ...fullCD, maturityDate: 1735689600000 }).success).toBe(false);
    });

    it('rejects non-string cdCreatedAt', () => {
      expect(createAccountSchema.safeParse({ ...fullCD, cdCreatedAt: new Date() }).success).toBe(false);
    });
  });

  describe('strict mode', () => {
    it('rejects unknown CD-specific fields', () => {
      const payload = { ...fullCD, autoRenew: true };
      expect(createAccountSchema.safeParse(payload).success).toBe(false);
    });
  });
});

// --- CD account update contract tests ---

describe('Investment API Contracts — updateAccount (CD fields)', () => {
  describe('happy path', () => {
    it('accepts a partial principal update', () => {
      expect(updateAccountSchema.safeParse({ principal: 15000 }).success).toBe(true);
    });

    it('accepts a partial interestRate update', () => {
      expect(updateAccountSchema.safeParse({ interestRate: 6.25 }).success).toBe(true);
    });

    it('accepts a maturityDate update', () => {
      const payload = { maturityDate: '2028-06-15T00:00:00.000Z' };
      expect(updateAccountSchema.safeParse(payload).success).toBe(true);
    });

    it('accepts a compoundingFrequency update', () => {
      expect(updateAccountSchema.safeParse({ compoundingFrequency: 'quarterly' as const }).success).toBe(true);
    });

    it('accepts an earlyWithdrawalPenalty update', () => {
      expect(updateAccountSchema.safeParse({ earlyWithdrawalPenalty: 2.5 }).success).toBe(true);
    });

    it('accepts a withholdingTaxRate update', () => {
      expect(updateAccountSchema.safeParse({ withholdingTaxRate: 0.15 }).success).toBe(true);
    });

    it('accepts multiple CD fields combined', () => {
      const payload = {
        principal: 20000,
        interestRate: 5.0,
        termMonths: 24,
        compoundingFrequency: 'monthly' as const,
      };
      expect(updateAccountSchema.safeParse(payload).success).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('accepts an empty object (no updates)', () => {
      expect(updateAccountSchema.safeParse({}).success).toBe(true);
    });

    it('accepts zero interestRate', () => {
      expect(updateAccountSchema.safeParse({ interestRate: 0 }).success).toBe(true);
    });
  });

  describe('invalid values', () => {
    it('rejects zero principal', () => {
      expect(updateAccountSchema.safeParse({ principal: 0 }).success).toBe(false);
    });

    it('rejects negative principal', () => {
      expect(updateAccountSchema.safeParse({ principal: -1 }).success).toBe(false);
    });

    it('rejects negative interestRate', () => {
      expect(updateAccountSchema.safeParse({ interestRate: -0.5 }).success).toBe(false);
    });

    it('rejects non-integer termMonths', () => {
      expect(updateAccountSchema.safeParse({ termMonths: 6.5 }).success).toBe(false);
    });

    it('rejects withholdingTaxRate above 1', () => {
      expect(updateAccountSchema.safeParse({ withholdingTaxRate: 2 }).success).toBe(false);
    });
  });

  describe('strict mode', () => {
    it('rejects investment-account fields not in updateAccountSchema (type)', () => {
      // updateAccountSchema does NOT allow type — type is set at creation only.
      expect(updateAccountSchema.safeParse({ type: 'cd' }).success).toBe(false);
    });

    it('rejects stockSymbol (not in updateAccountSchema)', () => {
      expect(updateAccountSchema.safeParse({ stockSymbol: 'VOO' }).success).toBe(false);
    });

    it('rejects investmentType (not in updateAccountSchema)', () => {
      expect(updateAccountSchema.safeParse({ investmentType: 'cd' }).success).toBe(false);
    });

    it('rejects cdCreatedAt (not in updateAccountSchema)', () => {
      expect(updateAccountSchema.safeParse({ cdCreatedAt: '2026-01-01T00:00:00.000Z' }).success).toBe(false);
    });

    it('rejects arbitrary unknown fields', () => {
      expect(updateAccountSchema.safeParse({ foo: 'bar' }).success).toBe(false);
    });
  });
});
