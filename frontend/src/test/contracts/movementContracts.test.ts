/**
 * API Contract Tests — Movement Service
 *
 * Validates that frontend movement service payloads conform to the
 * backend Zod schemas. Schemas recreated here since frontend and
 * backend are separate workspaces.
 */
import { z } from 'zod';
import { describe, it, expect } from 'vitest';

// --- Recreated backend schemas (from backend/src/modules/movements/presentation/schemas.ts) ---

const movementType = z.enum(['IngresoNormal', 'EgresoNormal', 'IngresoFijo', 'EgresoFijo']);

const createMovementSchema = z.object({
  type: movementType,
  accountId: z.string().uuid(),
  pocketId: z.string().uuid(),
  amount: z.number().positive(),
  displayedDate: z.string().min(1),
  notes: z.string().optional(),
  subPocketId: z.string().uuid().optional(),
  isPending: z.boolean().optional(),
  category: z.string().max(50).optional(),
  tags: z.array(z.string().max(30)).max(10).optional(),
}).strict();

const updateMovementSchema = z.object({
  type: movementType.optional(),
  amount: z.number().positive().optional(),
  displayedDate: z.string().min(1).optional(),
  notes: z.string().optional(),
  subPocketId: z.string().uuid().nullable().optional(),
  accountId: z.string().uuid().optional(),
  pocketId: z.string().uuid().optional(),
  category: z.string().max(50).nullable().optional(),
  tags: z.array(z.string().max(30)).max(10).nullable().optional(),
}).strict();

const createTransferSchema = z.object({
  sourceAccountId: z.string().uuid(),
  sourcePocketId: z.string().uuid(),
  targetAccountId: z.string().uuid(),
  targetPocketId: z.string().uuid(),
  amount: z.number().positive(),
  displayedDate: z.string().min(1),
  notes: z.string().optional(),
}).strict();

const batchMovementSchema = z.object({
  movements: z.array(z.object({
    type: movementType,
    accountId: z.string().uuid(),
    pocketId: z.string().uuid(),
    amount: z.number().positive(),
    displayedDate: z.string().min(1),
    notes: z.string().optional(),
    subPocketId: z.string().uuid().optional(),
    isPending: z.boolean().optional(),
    category: z.string().max(50).optional(),
    tags: z.array(z.string().max(30)).max(10).optional(),
  })).min(1),
}).strict();

const markOrphanedSchema = z.object({
  entityId: z.string().uuid(),
  entityType: z.enum(['account', 'pocket']),
}).strict();

const updateAccountForPocketSchema = z.object({
  pocketId: z.string().uuid(),
  newAccountId: z.string().uuid(),
}).strict();

// --- Test helpers ---

const uuid = '550e8400-e29b-41d4-a716-446655440000';
const uuid2 = '660e8400-e29b-41d4-a716-446655440001';

// --- Movement Contract Tests ---

describe('Movement API Contracts', () => {
  describe('createMovement', () => {
    it('accepts a valid income payload', () => {
      const payload = {
        type: 'IngresoNormal' as const,
        accountId: uuid, pocketId: uuid,
        amount: 1500, displayedDate: '2026-05-21',
      };
      expect(createMovementSchema.safeParse(payload).success).toBe(true);
    });

    it('accepts payload with all optional fields', () => {
      const payload = {
        type: 'EgresoFijo' as const,
        accountId: uuid, pocketId: uuid,
        amount: 200, displayedDate: '2026-05-21',
        notes: 'Rent', subPocketId: uuid2,
        isPending: true, category: 'Housing',
        tags: ['rent', 'monthly'],
      };
      expect(createMovementSchema.safeParse(payload).success).toBe(true);
    });

    it('rejects zero amount', () => {
      const payload = {
        type: 'EgresoNormal' as const,
        accountId: uuid, pocketId: uuid,
        amount: 0, displayedDate: '2026-05-21',
      };
      expect(createMovementSchema.safeParse(payload).success).toBe(false);
    });

    it('rejects negative amount', () => {
      const payload = {
        type: 'EgresoNormal' as const,
        accountId: uuid, pocketId: uuid,
        amount: -100, displayedDate: '2026-05-21',
      };
      expect(createMovementSchema.safeParse(payload).success).toBe(false);
    });

    it('rejects invalid movement type', () => {
      const payload = {
        type: 'income', accountId: uuid, pocketId: uuid,
        amount: 100, displayedDate: '2026-05-21',
      };
      expect(createMovementSchema.safeParse(payload).success).toBe(false);
    });

    it('rejects non-UUID accountId', () => {
      const payload = {
        type: 'IngresoNormal' as const,
        accountId: 'not-uuid', pocketId: uuid,
        amount: 100, displayedDate: '2026-05-21',
      };
      expect(createMovementSchema.safeParse(payload).success).toBe(false);
    });

    it('rejects empty displayedDate', () => {
      const payload = {
        type: 'IngresoNormal' as const,
        accountId: uuid, pocketId: uuid,
        amount: 100, displayedDate: '',
      };
      expect(createMovementSchema.safeParse(payload).success).toBe(false);
    });

    it('rejects tags exceeding max count', () => {
      const payload = {
        type: 'IngresoNormal' as const,
        accountId: uuid, pocketId: uuid,
        amount: 100, displayedDate: '2026-05-21',
        tags: Array(11).fill('tag'),
      };
      expect(createMovementSchema.safeParse(payload).success).toBe(false);
    });

    it('rejects unknown fields (strict mode)', () => {
      const payload = {
        type: 'IngresoNormal' as const,
        accountId: uuid, pocketId: uuid,
        amount: 100, displayedDate: '2026-05-21',
        extraField: 'oops',
      };
      expect(createMovementSchema.safeParse(payload).success).toBe(false);
    });
  });

  describe('updateMovement', () => {
    it('accepts partial updates', () => {
      expect(updateMovementSchema.safeParse({ amount: 500 }).success).toBe(true);
      expect(updateMovementSchema.safeParse({ notes: 'Updated' }).success).toBe(true);
      expect(updateMovementSchema.safeParse({ type: 'EgresoNormal' as const }).success).toBe(true);
    });

    it('accepts nullable fields', () => {
      expect(updateMovementSchema.safeParse({ subPocketId: null }).success).toBe(true);
      expect(updateMovementSchema.safeParse({ category: null }).success).toBe(true);
      expect(updateMovementSchema.safeParse({ tags: null }).success).toBe(true);
    });

    it('accepts empty object', () => {
      expect(updateMovementSchema.safeParse({}).success).toBe(true);
    });

    it('rejects unknown fields', () => {
      expect(updateMovementSchema.safeParse({ isPending: true }).success).toBe(false);
    });
  });

  describe('createTransfer', () => {
    it('accepts valid transfer payload', () => {
      const payload = {
        sourceAccountId: uuid, sourcePocketId: uuid,
        targetAccountId: uuid2, targetPocketId: uuid2,
        amount: 1000, displayedDate: '2026-05-21',
      };
      expect(createTransferSchema.safeParse(payload).success).toBe(true);
    });

    it('accepts transfer with notes', () => {
      const payload = {
        sourceAccountId: uuid, sourcePocketId: uuid,
        targetAccountId: uuid2, targetPocketId: uuid2,
        amount: 500, displayedDate: '2026-05-21', notes: 'Monthly savings',
      };
      expect(createTransferSchema.safeParse(payload).success).toBe(true);
    });

    it('rejects missing required fields', () => {
      const payload = { sourceAccountId: uuid, amount: 100 };
      expect(createTransferSchema.safeParse(payload).success).toBe(false);
    });

    it('rejects zero amount', () => {
      const payload = {
        sourceAccountId: uuid, sourcePocketId: uuid,
        targetAccountId: uuid2, targetPocketId: uuid2,
        amount: 0, displayedDate: '2026-05-21',
      };
      expect(createTransferSchema.safeParse(payload).success).toBe(false);
    });
  });

  describe('batchCreateMovements', () => {
    it('accepts valid batch payload', () => {
      const payload = {
        movements: [{
          type: 'IngresoNormal' as const,
          accountId: uuid, pocketId: uuid,
          amount: 100, displayedDate: '2026-05-21',
        }],
      };
      expect(batchMovementSchema.safeParse(payload).success).toBe(true);
    });

    it('accepts multiple movements', () => {
      const payload = {
        movements: [
          { type: 'IngresoNormal' as const, accountId: uuid, pocketId: uuid, amount: 100, displayedDate: '2026-05-21' },
          { type: 'EgresoNormal' as const, accountId: uuid, pocketId: uuid2, amount: 50, displayedDate: '2026-05-21', isPending: true },
        ],
      };
      expect(batchMovementSchema.safeParse(payload).success).toBe(true);
    });

    it('rejects empty movements array', () => {
      expect(batchMovementSchema.safeParse({ movements: [] }).success).toBe(false);
    });

    it('rejects if any movement is invalid', () => {
      const payload = {
        movements: [
          { type: 'IngresoNormal' as const, accountId: uuid, pocketId: uuid, amount: 100, displayedDate: '2026-05-21' },
          { type: 'IngresoNormal' as const, accountId: 'bad', pocketId: uuid, amount: 100, displayedDate: '2026-05-21' },
        ],
      };
      expect(batchMovementSchema.safeParse(payload).success).toBe(false);
    });
  });

  describe('markOrphaned', () => {
    it('accepts valid account orphan payload', () => {
      const payload = { entityId: uuid, entityType: 'account' as const };
      expect(markOrphanedSchema.safeParse(payload).success).toBe(true);
    });

    it('accepts valid pocket orphan payload', () => {
      const payload = { entityId: uuid, entityType: 'pocket' as const };
      expect(markOrphanedSchema.safeParse(payload).success).toBe(true);
    });

    it('rejects invalid entityType', () => {
      const payload = { entityId: uuid, entityType: 'movement' };
      expect(markOrphanedSchema.safeParse(payload).success).toBe(false);
    });
  });

  describe('updateAccountForPocket', () => {
    it('accepts valid payload', () => {
      const payload = { pocketId: uuid, newAccountId: uuid2 };
      expect(updateAccountForPocketSchema.safeParse(payload).success).toBe(true);
    });

    it('rejects non-UUID values', () => {
      expect(updateAccountForPocketSchema.safeParse({ pocketId: 'abc', newAccountId: uuid }).success).toBe(false);
    });
  });
});
