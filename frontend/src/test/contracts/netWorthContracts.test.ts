/**
 * API Contract Tests — Net Worth Snapshot Service
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

// --- Recreated backend schemas (from backend/src/modules/net-worth/presentation/schemas.ts) ---
//
// Note: the backend runs Zod 3, where `z.record(enum, value)` is a partial
// record (any subset of enum keys is allowed). The frontend runs Zod 4,
// where `z.record(enum, value)` is exhaustive (every enum key is required).
// To preserve the backend's runtime contract here we use `z.partialRecord`,
// the Zod 4 equivalent of Zod 3's `z.record` semantics for enum keys.

const currency = z.enum(['USD', 'MXN', 'COP', 'EUR', 'GBP']);

const createSnapshotSchema = z.object({
  totalNetWorth: z.number(),
  baseCurrency: currency,
  breakdown: z.partialRecord(currency, z.number()),
}).strict();

const updateSnapshotSchema = z.object({
  totalNetWorth: z.number().optional(),
  baseCurrency: currency.optional(),
  breakdown: z.partialRecord(currency, z.number()).optional(),
}).strict();

// --- Net Worth Snapshot Contract Tests ---

describe('Net Worth Snapshot API Contracts', () => {
  describe('createSnapshot', () => {
    it('accepts a valid payload with single-currency breakdown', () => {
      const payload = {
        totalNetWorth: 12500.75,
        baseCurrency: 'USD' as const,
        breakdown: { USD: 12500.75 },
      };
      expect(createSnapshotSchema.safeParse(payload).success).toBe(true);
    });

    it('accepts a valid payload with multi-currency breakdown', () => {
      const payload = {
        totalNetWorth: 50000,
        baseCurrency: 'USD' as const,
        breakdown: { USD: 30000, MXN: 350000, COP: 8000000, EUR: 2000, GBP: 1500 },
      };
      expect(createSnapshotSchema.safeParse(payload).success).toBe(true);
    });

    it('accepts an empty breakdown object', () => {
      const payload = {
        totalNetWorth: 0,
        baseCurrency: 'MXN' as const,
        breakdown: {},
      };
      expect(createSnapshotSchema.safeParse(payload).success).toBe(true);
    });

    it('accepts zero net worth', () => {
      const payload = {
        totalNetWorth: 0,
        baseCurrency: 'USD' as const,
        breakdown: { USD: 0 },
      };
      expect(createSnapshotSchema.safeParse(payload).success).toBe(true);
    });

    it('accepts negative net worth (debt scenario)', () => {
      const payload = {
        totalNetWorth: -5000,
        baseCurrency: 'USD' as const,
        breakdown: { USD: -5000 },
      };
      expect(createSnapshotSchema.safeParse(payload).success).toBe(true);
    });

    it('accepts negative breakdown values per currency', () => {
      const payload = {
        totalNetWorth: 1000,
        baseCurrency: 'USD' as const,
        breakdown: { USD: 5000, MXN: -4000 },
      };
      expect(createSnapshotSchema.safeParse(payload).success).toBe(true);
    });

    it('rejects missing totalNetWorth', () => {
      const payload = { baseCurrency: 'USD' as const, breakdown: { USD: 100 } };
      expect(createSnapshotSchema.safeParse(payload).success).toBe(false);
    });

    it('rejects missing baseCurrency', () => {
      const payload = { totalNetWorth: 100, breakdown: { USD: 100 } };
      expect(createSnapshotSchema.safeParse(payload).success).toBe(false);
    });

    it('rejects missing breakdown', () => {
      const payload = { totalNetWorth: 100, baseCurrency: 'USD' as const };
      expect(createSnapshotSchema.safeParse(payload).success).toBe(false);
    });

    it('rejects non-numeric totalNetWorth', () => {
      const payload = {
        totalNetWorth: '100' as unknown as number,
        baseCurrency: 'USD' as const,
        breakdown: { USD: 100 },
      };
      expect(createSnapshotSchema.safeParse(payload).success).toBe(false);
    });

    it('rejects invalid baseCurrency', () => {
      const payload = {
        totalNetWorth: 100,
        baseCurrency: 'BTC',
        breakdown: { USD: 100 },
      };
      expect(createSnapshotSchema.safeParse(payload).success).toBe(false);
    });

    it('rejects non-numeric breakdown values', () => {
      const payload = {
        totalNetWorth: 100,
        baseCurrency: 'USD' as const,
        breakdown: { USD: '100' as unknown as number },
      };
      expect(createSnapshotSchema.safeParse(payload).success).toBe(false);
    });

    it('rejects null breakdown values', () => {
      const payload = {
        totalNetWorth: 100,
        baseCurrency: 'USD' as const,
        breakdown: { USD: null as unknown as number },
      };
      expect(createSnapshotSchema.safeParse(payload).success).toBe(false);
    });

    it('rejects unknown fields (strict mode)', () => {
      const payload = {
        totalNetWorth: 100,
        baseCurrency: 'USD' as const,
        breakdown: { USD: 100 },
        snapshotDate: '2026-01-01T00:00:00.000Z',
      };
      expect(createSnapshotSchema.safeParse(payload).success).toBe(false);
    });

    it('rejects extra unknown nested keys at root', () => {
      const payload = {
        totalNetWorth: 100,
        baseCurrency: 'USD' as const,
        breakdown: { USD: 100 },
        userId: 'abc',
      };
      expect(createSnapshotSchema.safeParse(payload).success).toBe(false);
    });
  });

  describe('updateSnapshot', () => {
    it('accepts an empty object (no updates)', () => {
      expect(updateSnapshotSchema.safeParse({}).success).toBe(true);
    });

    it('accepts totalNetWorth-only update', () => {
      expect(updateSnapshotSchema.safeParse({ totalNetWorth: 99999.99 }).success).toBe(true);
    });

    it('accepts baseCurrency-only update', () => {
      expect(updateSnapshotSchema.safeParse({ baseCurrency: 'EUR' as const }).success).toBe(true);
    });

    it('accepts breakdown-only update', () => {
      const payload = { breakdown: { USD: 1000, EUR: 500 } };
      expect(updateSnapshotSchema.safeParse(payload).success).toBe(true);
    });

    it('accepts a full update payload', () => {
      const payload = {
        totalNetWorth: 75000,
        baseCurrency: 'GBP' as const,
        breakdown: { GBP: 60000, USD: 15000 },
      };
      expect(updateSnapshotSchema.safeParse(payload).success).toBe(true);
    });

    it('accepts negative totalNetWorth update', () => {
      expect(updateSnapshotSchema.safeParse({ totalNetWorth: -1000 }).success).toBe(true);
    });

    it('rejects invalid baseCurrency', () => {
      expect(updateSnapshotSchema.safeParse({ baseCurrency: 'JPY' }).success).toBe(false);
    });

    it('rejects non-numeric totalNetWorth', () => {
      expect(
        updateSnapshotSchema.safeParse({ totalNetWorth: 'abc' as unknown as number }).success,
      ).toBe(false);
    });

    it('rejects non-numeric breakdown values', () => {
      const payload = { breakdown: { USD: 'lots' as unknown as number } };
      expect(updateSnapshotSchema.safeParse(payload).success).toBe(false);
    });

    it('rejects unknown fields (strict mode)', () => {
      const payload = { totalNetWorth: 100, snapshotDate: '2026-01-01T00:00:00.000Z' };
      expect(updateSnapshotSchema.safeParse(payload).success).toBe(false);
    });

    it('rejects id field in body (id belongs in URL path)', () => {
      const payload = { id: '550e8400-e29b-41d4-a716-446655440000', totalNetWorth: 100 };
      expect(updateSnapshotSchema.safeParse(payload).success).toBe(false);
    });
  });

  describe('frontend service payload shape', () => {
    it("matches the CreateSnapshotDTO shape used by netWorthSnapshotService.create", () => {
      // Mirrors CreateSnapshotDTO from frontend/src/services/netWorthSnapshotService.ts
      const dto = {
        totalNetWorth: 42000,
        baseCurrency: 'USD',
        breakdown: { USD: 30000, MXN: 12000 },
      };
      expect(createSnapshotSchema.safeParse(dto).success).toBe(true);
    });

    it('matches the Partial<CreateSnapshotDTO> shape used by netWorthSnapshotService.update', () => {
      // The frontend service spreads Partial<CreateSnapshotDTO> into the PUT body.
      const partials: Array<Record<string, unknown>> = [
        {},
        { totalNetWorth: 1 },
        { baseCurrency: 'COP' },
        { breakdown: { COP: 1 } },
        { totalNetWorth: 1, baseCurrency: 'COP', breakdown: { COP: 1 } },
      ];
      for (const partial of partials) {
        expect(updateSnapshotSchema.safeParse(partial).success).toBe(true);
      }
    });
  });
});
