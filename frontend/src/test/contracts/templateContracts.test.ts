/**
 * API Contract Tests — Movement Template Service
 *
 * These tests validate that the payloads sent by movementTemplateService
 * conform to the shapes expected by the backend Zod schemas defined in
 * backend/src/modules/movements/presentation/templateSchemas.ts.
 *
 * The schemas are duplicated here (not imported from backend) because
 * frontend and backend are separate workspaces.
 *
 * If a backend schema changes, these tests should be updated to match.
 */
import { z } from 'zod';
import { describe, it, expect } from 'vitest';

// --- Recreated backend schemas (from backend/src/modules/movements/presentation/templateSchemas.ts) ---

const movementType = z.enum(['IngresoNormal', 'EgresoNormal', 'IngresoFijo', 'EgresoFijo']);

const createTemplateSchema = z.object({
  name: z.string().min(1).max(100),
  type: movementType,
  accountId: z.string().uuid(),
  pocketId: z.string().uuid(),
  subPocketId: z.string().uuid().nullable().optional(),
  defaultAmount: z.number().positive().nullable().optional(),
  notes: z.string().nullable().optional(),
}).strict();

const updateTemplateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  type: movementType.optional(),
  accountId: z.string().uuid().optional(),
  pocketId: z.string().uuid().optional(),
  subPocketId: z.string().uuid().nullable().optional(),
  defaultAmount: z.number().positive().nullable().optional(),
  notes: z.string().nullable().optional(),
}).strict();

// --- Test fixtures ---

const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000';
const ANOTHER_UUID = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

// --- createTemplate Contract Tests ---

describe('Movement Template API Contracts', () => {
  describe('createTemplate', () => {
    it('accepts a minimal valid payload (required fields only)', () => {
      const payload = {
        name: 'Monthly Salary',
        type: 'IngresoNormal' as const,
        accountId: VALID_UUID,
        pocketId: ANOTHER_UUID,
        subPocketId: null,
        defaultAmount: null,
        notes: null,
      };
      expect(createTemplateSchema.safeParse(payload).success).toBe(true);
    });

    it('accepts a payload with all optional fields populated', () => {
      const payload = {
        name: 'Rent Payment',
        type: 'EgresoFijo' as const,
        accountId: VALID_UUID,
        pocketId: ANOTHER_UUID,
        subPocketId: VALID_UUID,
        defaultAmount: 1500.5,
        notes: 'Monthly rent for apartment',
      };
      expect(createTemplateSchema.safeParse(payload).success).toBe(true);
    });

    it('accepts each valid movement type', () => {
      const types = ['IngresoNormal', 'EgresoNormal', 'IngresoFijo', 'EgresoFijo'] as const;
      for (const type of types) {
        const payload = {
          name: `Template ${type}`,
          type,
          accountId: VALID_UUID,
          pocketId: ANOTHER_UUID,
          subPocketId: null,
          defaultAmount: null,
          notes: null,
        };
        expect(createTemplateSchema.safeParse(payload).success).toBe(true);
      }
    });

    it('accepts payload omitting the optional nullable fields entirely', () => {
      const payload = {
        name: 'Bare Template',
        type: 'IngresoNormal' as const,
        accountId: VALID_UUID,
        pocketId: ANOTHER_UUID,
      };
      expect(createTemplateSchema.safeParse(payload).success).toBe(true);
    });

    it('accepts the exact payload shape sent by movementTemplateService.createTemplate', () => {
      // Mirrors the literal object built in createTemplate(): every optional
      // field is forwarded as null when the caller doesn't supply it.
      const payload = {
        name: 'Salary',
        type: 'IngresoNormal' as const,
        accountId: VALID_UUID,
        pocketId: ANOTHER_UUID,
        subPocketId: null,
        defaultAmount: null,
        notes: null,
      };
      expect(createTemplateSchema.safeParse(payload).success).toBe(true);
    });

    it('rejects empty name', () => {
      const payload = {
        name: '',
        type: 'IngresoNormal' as const,
        accountId: VALID_UUID,
        pocketId: ANOTHER_UUID,
      };
      expect(createTemplateSchema.safeParse(payload).success).toBe(false);
    });

    it('rejects name longer than 100 characters', () => {
      const payload = {
        name: 'a'.repeat(101),
        type: 'IngresoNormal' as const,
        accountId: VALID_UUID,
        pocketId: ANOTHER_UUID,
      };
      expect(createTemplateSchema.safeParse(payload).success).toBe(false);
    });

    it('accepts name at the 100-character boundary', () => {
      const payload = {
        name: 'a'.repeat(100),
        type: 'IngresoNormal' as const,
        accountId: VALID_UUID,
        pocketId: ANOTHER_UUID,
      };
      expect(createTemplateSchema.safeParse(payload).success).toBe(true);
    });

    it('rejects an invalid movement type', () => {
      const payload = {
        name: 'Invalid',
        type: 'Transfer',
        accountId: VALID_UUID,
        pocketId: ANOTHER_UUID,
      };
      expect(createTemplateSchema.safeParse(payload).success).toBe(false);
    });

    it('rejects a non-UUID accountId', () => {
      const payload = {
        name: 'Bad UUID',
        type: 'IngresoNormal' as const,
        accountId: 'not-a-uuid',
        pocketId: ANOTHER_UUID,
      };
      expect(createTemplateSchema.safeParse(payload).success).toBe(false);
    });

    it('rejects a non-UUID pocketId', () => {
      const payload = {
        name: 'Bad UUID',
        type: 'IngresoNormal' as const,
        accountId: VALID_UUID,
        pocketId: 'not-a-uuid',
      };
      expect(createTemplateSchema.safeParse(payload).success).toBe(false);
    });

    it('rejects a non-UUID subPocketId when provided', () => {
      const payload = {
        name: 'Bad SubPocket',
        type: 'IngresoNormal' as const,
        accountId: VALID_UUID,
        pocketId: ANOTHER_UUID,
        subPocketId: 'not-a-uuid',
      };
      expect(createTemplateSchema.safeParse(payload).success).toBe(false);
    });

    it('rejects negative defaultAmount', () => {
      const payload = {
        name: 'Negative Amount',
        type: 'EgresoNormal' as const,
        accountId: VALID_UUID,
        pocketId: ANOTHER_UUID,
        defaultAmount: -100,
      };
      expect(createTemplateSchema.safeParse(payload).success).toBe(false);
    });

    it('rejects zero defaultAmount (must be positive)', () => {
      const payload = {
        name: 'Zero Amount',
        type: 'EgresoNormal' as const,
        accountId: VALID_UUID,
        pocketId: ANOTHER_UUID,
        defaultAmount: 0,
      };
      expect(createTemplateSchema.safeParse(payload).success).toBe(false);
    });

    it('rejects missing required fields', () => {
      expect(createTemplateSchema.safeParse({}).success).toBe(false);
      expect(createTemplateSchema.safeParse({ name: 'Test' }).success).toBe(false);
      expect(createTemplateSchema.safeParse({
        name: 'Test', type: 'IngresoNormal',
      }).success).toBe(false);
      expect(createTemplateSchema.safeParse({
        name: 'Test', type: 'IngresoNormal', accountId: VALID_UUID,
      }).success).toBe(false);
    });

    it('rejects unknown fields (strict mode)', () => {
      const payload = {
        name: 'Test',
        type: 'IngresoNormal' as const,
        accountId: VALID_UUID,
        pocketId: ANOTHER_UUID,
        extraField: 'should not be allowed',
      };
      expect(createTemplateSchema.safeParse(payload).success).toBe(false);
    });

    it('rejects wrong types for fields', () => {
      const payload = {
        name: 123,
        type: 'IngresoNormal',
        accountId: VALID_UUID,
        pocketId: ANOTHER_UUID,
      };
      expect(createTemplateSchema.safeParse(payload).success).toBe(false);
    });

    it('rejects defaultAmount sent as a string', () => {
      const payload = {
        name: 'String Amount',
        type: 'EgresoNormal' as const,
        accountId: VALID_UUID,
        pocketId: ANOTHER_UUID,
        defaultAmount: '100',
      };
      expect(createTemplateSchema.safeParse(payload).success).toBe(false);
    });
  });

  describe('updateTemplate', () => {
    it('accepts an empty object (no updates)', () => {
      expect(updateTemplateSchema.safeParse({}).success).toBe(true);
    });

    it('accepts a single-field update for each field', () => {
      expect(updateTemplateSchema.safeParse({ name: 'Renamed' }).success).toBe(true);
      expect(updateTemplateSchema.safeParse({ type: 'EgresoFijo' as const }).success).toBe(true);
      expect(updateTemplateSchema.safeParse({ accountId: VALID_UUID }).success).toBe(true);
      expect(updateTemplateSchema.safeParse({ pocketId: VALID_UUID }).success).toBe(true);
      expect(updateTemplateSchema.safeParse({ subPocketId: VALID_UUID }).success).toBe(true);
      expect(updateTemplateSchema.safeParse({ defaultAmount: 250.75 }).success).toBe(true);
      expect(updateTemplateSchema.safeParse({ notes: 'Updated notes' }).success).toBe(true);
    });

    it('accepts null for nullable optional fields', () => {
      expect(updateTemplateSchema.safeParse({ subPocketId: null }).success).toBe(true);
      expect(updateTemplateSchema.safeParse({ defaultAmount: null }).success).toBe(true);
      expect(updateTemplateSchema.safeParse({ notes: null }).success).toBe(true);
    });

    it('accepts a multi-field update', () => {
      const payload = {
        name: 'Updated Template',
        type: 'IngresoFijo' as const,
        defaultAmount: 999.99,
        notes: 'New notes',
      };
      expect(updateTemplateSchema.safeParse(payload).success).toBe(true);
    });

    it('accepts the partial update shape sent by movementTemplateService.updateTemplate', () => {
      // updateTemplate forwards Partial<Pick<...>>; verify common combinations
      // pass validation.
      expect(updateTemplateSchema.safeParse({ name: 'New Name' }).success).toBe(true);
      expect(updateTemplateSchema.safeParse({
        accountId: VALID_UUID,
        pocketId: ANOTHER_UUID,
      }).success).toBe(true);
      expect(updateTemplateSchema.safeParse({
        subPocketId: null,
        defaultAmount: null,
        notes: null,
      }).success).toBe(true);
    });

    it('rejects empty name on update', () => {
      expect(updateTemplateSchema.safeParse({ name: '' }).success).toBe(false);
    });

    it('rejects name longer than 100 characters on update', () => {
      expect(updateTemplateSchema.safeParse({ name: 'a'.repeat(101) }).success).toBe(false);
    });

    it('rejects invalid movement type on update', () => {
      expect(updateTemplateSchema.safeParse({ type: 'Transfer' }).success).toBe(false);
    });

    it('rejects non-UUID accountId on update', () => {
      expect(updateTemplateSchema.safeParse({ accountId: 'not-a-uuid' }).success).toBe(false);
    });

    it('rejects non-UUID pocketId on update', () => {
      expect(updateTemplateSchema.safeParse({ pocketId: 'not-a-uuid' }).success).toBe(false);
    });

    it('rejects non-UUID subPocketId on update', () => {
      expect(updateTemplateSchema.safeParse({ subPocketId: 'not-a-uuid' }).success).toBe(false);
    });

    it('rejects negative defaultAmount on update', () => {
      expect(updateTemplateSchema.safeParse({ defaultAmount: -50 }).success).toBe(false);
    });

    it('rejects zero defaultAmount on update', () => {
      expect(updateTemplateSchema.safeParse({ defaultAmount: 0 }).success).toBe(false);
    });

    it('rejects unknown fields (strict mode)', () => {
      const payload = { name: 'Updated', extraField: 'nope' };
      expect(updateTemplateSchema.safeParse(payload).success).toBe(false);
    });

    it('rejects null for non-nullable fields', () => {
      // name, type, accountId, and pocketId are optional but NOT nullable
      // when present.
      expect(updateTemplateSchema.safeParse({ name: null }).success).toBe(false);
      expect(updateTemplateSchema.safeParse({ type: null }).success).toBe(false);
      expect(updateTemplateSchema.safeParse({ accountId: null }).success).toBe(false);
      expect(updateTemplateSchema.safeParse({ pocketId: null }).success).toBe(false);
    });
  });
});
