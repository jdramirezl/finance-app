/**
 * API Contract Tests — Account & Pocket Services
 *
 * These tests validate that the payloads sent by frontend service methods
 * conform to the shapes expected by the backend Zod schemas. The schemas
 * are duplicated here (not imported from backend) because frontend and
 * backend are separate workspaces.
 *
 * If a backend schema changes, these tests should be updated to match.
 */
import { z } from 'zod';
import { describe, it, expect } from 'vitest';

// --- Recreated backend schemas (from backend/src/modules/accounts/presentation/schemas.ts) ---

const currency = z.enum(['USD', 'MXN', 'COP', 'EUR', 'GBP']);
const accountType = z.enum(['normal', 'investment', 'cd']);
const investmentType = z.enum(['stock', 'etf', 'cd']);
const compoundingFrequency = z.enum(['daily', 'monthly', 'quarterly', 'annually']);

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

const cascadeDeleteSchema = z.object({
  deleteMovements: z.boolean(),
}).strict();

const reorderAccountsSchema = z.object({
  accountIds: z.array(z.string().uuid()).min(1),
}).strict();

// --- Recreated pocket schemas (from backend/src/modules/pockets/presentation/schemas.ts) ---

const pocketType = z.enum(['normal', 'fixed']);

const createPocketSchema = z.object({
  accountId: z.string().uuid(),
  name: z.string().min(1).max(100),
  type: pocketType,
  currency: currency.optional(),
}).strict();

const updatePocketSchema = z.object({
  name: z.string().min(1).max(100).optional(),
}).strict();

const reorderPocketsSchema = z.object({
  pocketIds: z.array(z.string().uuid()).min(1),
}).strict();

// --- Account Contract Tests ---

describe('Account API Contracts', () => {
  describe('createAccount', () => {
    it('accepts a valid normal account payload', () => {
      const payload = { name: 'Savings', color: '#4CAF50', currency: 'USD' as const };
      expect(createAccountSchema.safeParse(payload).success).toBe(true);
    });

    it('accepts a valid investment account payload', () => {
      const payload = {
        name: 'VOO ETF', color: '#2196F3', currency: 'USD' as const,
        type: 'investment' as const, stockSymbol: 'VOO', investmentType: 'etf' as const,
      };
      expect(createAccountSchema.safeParse(payload).success).toBe(true);
    });

    it('accepts a valid CD account payload', () => {
      const payload = {
        name: 'CD 12mo', color: '#FF9800', currency: 'MXN' as const,
        type: 'cd' as const, investmentType: 'cd' as const,
        principal: 10000, interestRate: 5.5, termMonths: 12,
        maturityDate: '2027-01-01T00:00:00.000Z',
        compoundingFrequency: 'monthly' as const,
        earlyWithdrawalPenalty: 3, withholdingTaxRate: 0.2,
        cdCreatedAt: '2026-01-01T00:00:00.000Z',
      };
      expect(createAccountSchema.safeParse(payload).success).toBe(true);
    });

    it('rejects empty name', () => {
      const payload = { name: '', color: '#fff', currency: 'USD' as const };
      expect(createAccountSchema.safeParse(payload).success).toBe(false);
    });

    it('rejects invalid currency', () => {
      const payload = { name: 'Test', color: '#fff', currency: 'BTC' };
      expect(createAccountSchema.safeParse(payload).success).toBe(false);
    });

    it('rejects unknown fields (strict mode)', () => {
      const payload = { name: 'Test', color: '#fff', currency: 'USD', unknownField: true };
      expect(createAccountSchema.safeParse(payload).success).toBe(false);
    });
  });

  describe('updateAccount', () => {
    it('accepts partial updates', () => {
      expect(updateAccountSchema.safeParse({ name: 'New Name' }).success).toBe(true);
      expect(updateAccountSchema.safeParse({ color: '#000' }).success).toBe(true);
      expect(updateAccountSchema.safeParse({ currency: 'EUR' as const }).success).toBe(true);
    });

    it('accepts empty object (no updates)', () => {
      expect(updateAccountSchema.safeParse({}).success).toBe(true);
    });

    it('rejects unknown fields', () => {
      expect(updateAccountSchema.safeParse({ type: 'normal' }).success).toBe(false);
    });
  });

  describe('cascadeDelete', () => {
    it('accepts valid payload', () => {
      expect(cascadeDeleteSchema.safeParse({ deleteMovements: true }).success).toBe(true);
      expect(cascadeDeleteSchema.safeParse({ deleteMovements: false }).success).toBe(true);
    });

    it('rejects missing deleteMovements', () => {
      expect(cascadeDeleteSchema.safeParse({}).success).toBe(false);
    });
  });

  describe('reorderAccounts', () => {
    it('accepts valid UUID array', () => {
      const payload = { accountIds: ['550e8400-e29b-41d4-a716-446655440000'] };
      expect(reorderAccountsSchema.safeParse(payload).success).toBe(true);
    });

    it('rejects empty array', () => {
      expect(reorderAccountsSchema.safeParse({ accountIds: [] }).success).toBe(false);
    });

    it('rejects non-UUID strings', () => {
      expect(reorderAccountsSchema.safeParse({ accountIds: ['not-a-uuid'] }).success).toBe(false);
    });
  });
});

// --- Pocket Contract Tests ---

describe('Pocket API Contracts', () => {
  describe('createPocket', () => {
    it('accepts valid payload', () => {
      const payload = {
        accountId: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Travel Fund', type: 'normal' as const,
      };
      expect(createPocketSchema.safeParse(payload).success).toBe(true);
    });

    it('accepts fixed type', () => {
      const payload = {
        accountId: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Fixed Expenses', type: 'fixed' as const,
      };
      expect(createPocketSchema.safeParse(payload).success).toBe(true);
    });

    it('rejects missing accountId', () => {
      expect(createPocketSchema.safeParse({ name: 'Test', type: 'normal' }).success).toBe(false);
    });

    it('rejects non-UUID accountId', () => {
      const payload = { accountId: 'abc', name: 'Test', type: 'normal' as const };
      expect(createPocketSchema.safeParse(payload).success).toBe(false);
    });
  });

  describe('updatePocket', () => {
    it('accepts name update', () => {
      expect(updatePocketSchema.safeParse({ name: 'Renamed' }).success).toBe(true);
    });

    it('rejects empty name', () => {
      expect(updatePocketSchema.safeParse({ name: '' }).success).toBe(false);
    });
  });

  describe('reorderPockets', () => {
    it('accepts valid UUID array', () => {
      const payload = { pocketIds: ['550e8400-e29b-41d4-a716-446655440000'] };
      expect(reorderPocketsSchema.safeParse(payload).success).toBe(true);
    });

    it('rejects empty array', () => {
      expect(reorderPocketsSchema.safeParse({ pocketIds: [] }).success).toBe(false);
    });
  });
});
