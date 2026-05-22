/**
 * API Contract Tests — Sub-Pocket & Fixed Expense Group Services
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

// --- Recreated backend schemas (from backend/src/modules/sub-pockets/presentation/schemas.ts) ---

// SubPocket schemas
const createSubPocketSchema = z.object({
  pocketId: z.string().uuid(),
  name: z.string().min(1).max(100),
  valueTotal: z.number().positive(),
  periodicityMonths: z.number().int().positive(),
  groupId: z.string().uuid().optional(),
}).strict();

const updateSubPocketSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  valueTotal: z.number().positive().optional(),
  periodicityMonths: z.number().int().positive().optional(),
}).strict();

const moveToGroupSchema = z.object({
  groupId: z.string().uuid().nullable(),
}).strict();

const reorderSubPocketsSchema = z.object({
  subPocketIds: z.array(z.string().uuid()).min(1),
}).strict();

// FixedExpenseGroup schemas
const createGroupSchema = z.object({
  name: z.string().min(1).max(100),
  color: z.string().min(1),
}).strict();

const updateGroupSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  color: z.string().min(1).optional(),
}).strict();

const reorderGroupsSchema = z.object({
  ids: z.array(z.string().uuid()).min(1),
}).strict();

// Reusable UUID samples
const UUID_A = '550e8400-e29b-41d4-a716-446655440000';
const UUID_B = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

// --- Sub-Pocket Contract Tests ---

describe('Sub-Pocket API Contracts', () => {
  describe('createSubPocket', () => {
    it('accepts a minimal valid payload (no groupId)', () => {
      const payload = {
        pocketId: UUID_A,
        name: 'Netflix',
        valueTotal: 199,
        periodicityMonths: 1,
      };
      expect(createSubPocketSchema.safeParse(payload).success).toBe(true);
    });

    it('accepts a payload with optional groupId', () => {
      const payload = {
        pocketId: UUID_A,
        name: 'Gym Membership',
        valueTotal: 600,
        periodicityMonths: 12,
        groupId: UUID_B,
      };
      expect(createSubPocketSchema.safeParse(payload).success).toBe(true);
    });

    it('rejects missing pocketId', () => {
      const payload = { name: 'Test', valueTotal: 100, periodicityMonths: 1 };
      expect(createSubPocketSchema.safeParse(payload).success).toBe(false);
    });

    it('rejects non-UUID pocketId', () => {
      const payload = {
        pocketId: 'not-a-uuid',
        name: 'Test',
        valueTotal: 100,
        periodicityMonths: 1,
      };
      expect(createSubPocketSchema.safeParse(payload).success).toBe(false);
    });

    it('rejects empty name', () => {
      const payload = {
        pocketId: UUID_A,
        name: '',
        valueTotal: 100,
        periodicityMonths: 1,
      };
      expect(createSubPocketSchema.safeParse(payload).success).toBe(false);
    });

    it('rejects name longer than 100 chars', () => {
      const payload = {
        pocketId: UUID_A,
        name: 'a'.repeat(101),
        valueTotal: 100,
        periodicityMonths: 1,
      };
      expect(createSubPocketSchema.safeParse(payload).success).toBe(false);
    });

    it('rejects zero or negative valueTotal', () => {
      const base = { pocketId: UUID_A, name: 'Test', periodicityMonths: 1 };
      expect(createSubPocketSchema.safeParse({ ...base, valueTotal: 0 }).success).toBe(false);
      expect(createSubPocketSchema.safeParse({ ...base, valueTotal: -10 }).success).toBe(false);
    });

    it('rejects non-integer or non-positive periodicityMonths', () => {
      const base = { pocketId: UUID_A, name: 'Test', valueTotal: 100 };
      expect(createSubPocketSchema.safeParse({ ...base, periodicityMonths: 1.5 }).success).toBe(false);
      expect(createSubPocketSchema.safeParse({ ...base, periodicityMonths: 0 }).success).toBe(false);
      expect(createSubPocketSchema.safeParse({ ...base, periodicityMonths: -1 }).success).toBe(false);
    });

    it('rejects non-UUID groupId', () => {
      const payload = {
        pocketId: UUID_A,
        name: 'Test',
        valueTotal: 100,
        periodicityMonths: 1,
        groupId: 'not-a-uuid',
      };
      expect(createSubPocketSchema.safeParse(payload).success).toBe(false);
    });

    it('rejects unknown fields (strict mode)', () => {
      const payload = {
        pocketId: UUID_A,
        name: 'Test',
        valueTotal: 100,
        periodicityMonths: 1,
        enabled: true,
      };
      expect(createSubPocketSchema.safeParse(payload).success).toBe(false);
    });
  });

  describe('updateSubPocket', () => {
    it('accepts partial updates', () => {
      expect(updateSubPocketSchema.safeParse({ name: 'Renamed' }).success).toBe(true);
      expect(updateSubPocketSchema.safeParse({ valueTotal: 250 }).success).toBe(true);
      expect(updateSubPocketSchema.safeParse({ periodicityMonths: 6 }).success).toBe(true);
    });

    it('accepts a combined update payload', () => {
      const payload = { name: 'Renamed', valueTotal: 500, periodicityMonths: 3 };
      expect(updateSubPocketSchema.safeParse(payload).success).toBe(true);
    });

    it('accepts empty object (no updates)', () => {
      expect(updateSubPocketSchema.safeParse({}).success).toBe(true);
    });

    it('rejects empty name', () => {
      expect(updateSubPocketSchema.safeParse({ name: '' }).success).toBe(false);
    });

    it('rejects zero or negative valueTotal', () => {
      expect(updateSubPocketSchema.safeParse({ valueTotal: 0 }).success).toBe(false);
      expect(updateSubPocketSchema.safeParse({ valueTotal: -5 }).success).toBe(false);
    });

    it('rejects non-integer periodicityMonths', () => {
      expect(updateSubPocketSchema.safeParse({ periodicityMonths: 2.5 }).success).toBe(false);
    });

    it('rejects unknown fields (strict mode)', () => {
      // pocketId and groupId are not part of update — must go through dedicated endpoints
      expect(updateSubPocketSchema.safeParse({ pocketId: UUID_A }).success).toBe(false);
      expect(updateSubPocketSchema.safeParse({ groupId: UUID_B }).success).toBe(false);
      expect(updateSubPocketSchema.safeParse({ enabled: true }).success).toBe(false);
    });
  });

  describe('moveToGroup', () => {
    it('accepts a valid UUID groupId', () => {
      expect(moveToGroupSchema.safeParse({ groupId: UUID_A }).success).toBe(true);
    });

    it('accepts null groupId (remove from group)', () => {
      expect(moveToGroupSchema.safeParse({ groupId: null }).success).toBe(true);
    });

    it('rejects missing groupId', () => {
      expect(moveToGroupSchema.safeParse({}).success).toBe(false);
    });

    it('rejects non-UUID groupId', () => {
      expect(moveToGroupSchema.safeParse({ groupId: 'abc' }).success).toBe(false);
    });

    it('rejects undefined groupId', () => {
      expect(moveToGroupSchema.safeParse({ groupId: undefined }).success).toBe(false);
    });

    it('rejects unknown fields (strict mode)', () => {
      const payload = { groupId: UUID_A, extra: 'field' };
      expect(moveToGroupSchema.safeParse(payload).success).toBe(false);
    });
  });

  describe('reorderSubPockets', () => {
    // CONTRACT MISMATCH: frontend subPocketService.reorderSubPockets sends
    // { pocketId, subPocketIds } but the backend reorderSubPocketsSchema is
    // .strict() and only accepts { subPocketIds }. The extra pocketId field
    // would be rejected by the backend. The tests below validate what the
    // backend actually expects; the frontend service should be updated to
    // drop pocketId from the payload (or the backend schema relaxed).
    it('accepts a valid UUID array', () => {
      const payload = { subPocketIds: [UUID_A, UUID_B] };
      expect(reorderSubPocketsSchema.safeParse(payload).success).toBe(true);
    });

    it('accepts a single-element array', () => {
      expect(reorderSubPocketsSchema.safeParse({ subPocketIds: [UUID_A] }).success).toBe(true);
    });

    it('rejects empty array', () => {
      expect(reorderSubPocketsSchema.safeParse({ subPocketIds: [] }).success).toBe(false);
    });

    it('rejects non-UUID strings', () => {
      expect(reorderSubPocketsSchema.safeParse({ subPocketIds: ['not-a-uuid'] }).success).toBe(false);
    });

    it('rejects missing subPocketIds', () => {
      expect(reorderSubPocketsSchema.safeParse({}).success).toBe(false);
    });

    it('documents the frontend mismatch — strict schema rejects extra pocketId', () => {
      // The frontend currently sends this shape; the backend strict schema
      // will reject it. Keep this test to surface the discrepancy until
      // either the frontend payload is trimmed or the schema is relaxed.
      const frontendPayload = { pocketId: UUID_A, subPocketIds: [UUID_B] };
      expect(reorderSubPocketsSchema.safeParse(frontendPayload).success).toBe(false);
    });
  });
});

// --- Fixed Expense Group Contract Tests ---

describe('Fixed Expense Group API Contracts', () => {
  describe('createGroup', () => {
    it('accepts a valid payload', () => {
      const payload = { name: 'Subscriptions', color: '#9C27B0' };
      expect(createGroupSchema.safeParse(payload).success).toBe(true);
    });

    it('rejects empty name', () => {
      expect(createGroupSchema.safeParse({ name: '', color: '#fff' }).success).toBe(false);
    });

    it('rejects name longer than 100 chars', () => {
      const payload = { name: 'a'.repeat(101), color: '#fff' };
      expect(createGroupSchema.safeParse(payload).success).toBe(false);
    });

    it('rejects empty color', () => {
      expect(createGroupSchema.safeParse({ name: 'Group', color: '' }).success).toBe(false);
    });

    it('rejects missing required fields', () => {
      expect(createGroupSchema.safeParse({ name: 'Group' }).success).toBe(false);
      expect(createGroupSchema.safeParse({ color: '#fff' }).success).toBe(false);
      expect(createGroupSchema.safeParse({}).success).toBe(false);
    });

    it('rejects unknown fields (strict mode)', () => {
      const payload = { name: 'Group', color: '#fff', icon: 'star' };
      expect(createGroupSchema.safeParse(payload).success).toBe(false);
    });
  });

  describe('updateGroup', () => {
    it('accepts partial updates', () => {
      expect(updateGroupSchema.safeParse({ name: 'Renamed' }).success).toBe(true);
      expect(updateGroupSchema.safeParse({ color: '#000' }).success).toBe(true);
    });

    it('accepts both fields together (frontend service sends name + color)', () => {
      const payload = { name: 'Renamed', color: '#FF5722' };
      expect(updateGroupSchema.safeParse(payload).success).toBe(true);
    });

    it('accepts empty object (no updates)', () => {
      expect(updateGroupSchema.safeParse({}).success).toBe(true);
    });

    it('rejects empty name', () => {
      expect(updateGroupSchema.safeParse({ name: '' }).success).toBe(false);
    });

    it('rejects empty color', () => {
      expect(updateGroupSchema.safeParse({ color: '' }).success).toBe(false);
    });

    it('rejects unknown fields (strict mode)', () => {
      expect(updateGroupSchema.safeParse({ enabled: true }).success).toBe(false);
    });
  });

  describe('reorderGroups', () => {
    it('accepts a valid UUID array', () => {
      const payload = { ids: [UUID_A, UUID_B] };
      expect(reorderGroupsSchema.safeParse(payload).success).toBe(true);
    });

    it('accepts a single-element array', () => {
      expect(reorderGroupsSchema.safeParse({ ids: [UUID_A] }).success).toBe(true);
    });

    it('rejects empty array', () => {
      expect(reorderGroupsSchema.safeParse({ ids: [] }).success).toBe(false);
    });

    it('rejects non-UUID strings', () => {
      expect(reorderGroupsSchema.safeParse({ ids: ['not-a-uuid'] }).success).toBe(false);
    });

    it('rejects missing ids', () => {
      expect(reorderGroupsSchema.safeParse({}).success).toBe(false);
    });

    it('rejects unknown fields (strict mode)', () => {
      const payload = { ids: [UUID_A], pocketId: UUID_B };
      expect(reorderGroupsSchema.safeParse(payload).success).toBe(false);
    });
  });
});
