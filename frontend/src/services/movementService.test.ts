import { describe, it, expect, beforeEach, vi } from 'vitest';
import { movementService } from './movementService';
import { apiClient } from './apiClient';
import { supabase } from '../lib/supabase';
import { makeSupabaseQuery } from '../test/supabaseQueryMock';
import type { Movement } from '../types';

// Override the global supabase mock from `test/setup.ts` so each read can
// configure its own resolved data/error pair via `makeSupabaseQuery`.
vi.mock('../lib/supabase', () => ({
  supabase: { from: vi.fn() },
}));

// Snake-case row shape returned by Supabase. `movementService` runs each
// row through `mapMovementRow` to produce the camelCase `Movement` domain
// type that callers consume.
const mockMovementRow = {
  id: 'mov-1',
  type: 'IngresoNormal',
  account_id: 'acc-1',
  pocket_id: 'pocket-1',
  amount: 1000,
  notes: 'Salary',
  displayed_date: '2026-01-15T00:00:00.000Z',
  created_at: '2026-01-15T00:00:00.000Z',
  is_pending: false,
  is_orphaned: false,
};

const mockMovement: Movement = {
  id: 'mov-1',
  type: 'IngresoNormal',
  accountId: 'acc-1',
  pocketId: 'pocket-1',
  amount: 1000,
  notes: 'Salary',
  displayedDate: '2026-01-15T00:00:00.000Z',
  createdAt: '2026-01-15T00:00:00.000Z',
  isPending: false,
  isOrphaned: false,
};

describe('movementService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAllMovements', () => {
    it('returns the data array from the paginated Supabase response', async () => {
      const query = makeSupabaseQuery({ data: [mockMovementRow], count: 1, error: null });
      vi.mocked(supabase.from).mockReturnValue(query as unknown as ReturnType<typeof supabase.from>);

      const result = await movementService.getAllMovements();

      expect(supabase.from).toHaveBeenCalledWith('movements');
      expect(query.select).toHaveBeenCalledWith('*', { count: 'exact' });
      expect(query.order).toHaveBeenCalledWith('displayed_date', { ascending: false });
      expect(result).toEqual([mockMovement]);
    });

    it('uses the requested page/limit to compute the range offset', async () => {
      const query = makeSupabaseQuery({ data: [mockMovementRow], count: 1, error: null });
      vi.mocked(supabase.from).mockReturnValue(query as unknown as ReturnType<typeof supabase.from>);

      await movementService.getAllMovements(2, 10);

      // page=2 with limit=10 ⇒ offset=10, range=[10, 19].
      expect(query.range).toHaveBeenCalledWith(10, 19);
    });
  });

  describe('getAllMovementsPaginated', () => {
    it('returns the full paginated envelope with hasMore=false when no more pages', async () => {
      const query = makeSupabaseQuery({ data: [mockMovementRow], count: 1, error: null });
      vi.mocked(supabase.from).mockReturnValue(query as unknown as ReturnType<typeof supabase.from>);

      const result = await movementService.getAllMovementsPaginated(1, 20);

      expect(result).toEqual({
        data: [mockMovement],
        total: 1,
        page: 1,
        limit: 20,
        hasMore: false,
      });
    });

    it('forwards optional category and tag filters to the query builder', async () => {
      const query = makeSupabaseQuery({ data: [mockMovementRow], count: 1, error: null });
      vi.mocked(supabase.from).mockReturnValue(query as unknown as ReturnType<typeof supabase.from>);

      await movementService.getAllMovementsPaginated(1, 20, { category: 'food', tags: ['lunch'] });

      expect(query.eq).toHaveBeenCalledWith('category', 'food');
      expect(query.overlaps).toHaveBeenCalledWith('tags', ['lunch']);
    });
  });

  describe('getActiveMovements', () => {
    it('filters out orphaned movements', async () => {
      const orphanedRow = { ...mockMovementRow, id: 'mov-2', is_orphaned: true };
      const query = makeSupabaseQuery({ data: [mockMovementRow, orphanedRow], count: 2, error: null });
      vi.mocked(supabase.from).mockReturnValue(query as unknown as ReturnType<typeof supabase.from>);

      const result = await movementService.getActiveMovements();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('mov-1');
    });
  });

  describe('getOrphanedMovements', () => {
    it('queries movements with is_orphaned=true', async () => {
      const orphanedRow = { ...mockMovementRow, id: 'mov-9', is_orphaned: true };
      const query = makeSupabaseQuery({ data: [orphanedRow], error: null });
      vi.mocked(supabase.from).mockReturnValue(query as unknown as ReturnType<typeof supabase.from>);

      const result = await movementService.getOrphanedMovements();

      expect(supabase.from).toHaveBeenCalledWith('movements');
      expect(query.eq).toHaveBeenCalledWith('is_orphaned', true);
      expect(query.order).toHaveBeenCalledWith('displayed_date', { ascending: false });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('mov-9');
      expect(result[0].isOrphaned).toBe(true);
    });
  });

  describe('getMovementsByAccount', () => {
    it('filters movements by account_id', async () => {
      const query = makeSupabaseQuery({ data: [mockMovementRow], error: null });
      vi.mocked(supabase.from).mockReturnValue(query as unknown as ReturnType<typeof supabase.from>);

      const result = await movementService.getMovementsByAccount('acc-1');

      expect(supabase.from).toHaveBeenCalledWith('movements');
      expect(query.eq).toHaveBeenCalledWith('account_id', 'acc-1');
      expect(query.order).toHaveBeenCalledWith('displayed_date', { ascending: false });
      expect(query.range).not.toHaveBeenCalled();
      expect(result).toEqual([mockMovement]);
    });

    it('applies pagination range when both page and limit are supplied', async () => {
      const query = makeSupabaseQuery({ data: [mockMovementRow], error: null });
      vi.mocked(supabase.from).mockReturnValue(query as unknown as ReturnType<typeof supabase.from>);

      await movementService.getMovementsByAccount('acc-1', 2, 5);

      // page=2 with limit=5 ⇒ offset=5, range=[5, 9].
      expect(query.range).toHaveBeenCalledWith(5, 9);
    });
  });

  describe('getMovementsByPocket', () => {
    it('filters movements by pocket_id', async () => {
      const query = makeSupabaseQuery({ data: [mockMovementRow], error: null });
      vi.mocked(supabase.from).mockReturnValue(query as unknown as ReturnType<typeof supabase.from>);

      await movementService.getMovementsByPocket('pocket-1');

      expect(query.eq).toHaveBeenCalledWith('pocket_id', 'pocket-1');
    });
  });

  describe('getMovementsByMonth', () => {
    it('queries movements within the requested month using gte/lte', async () => {
      const query = makeSupabaseQuery({ data: [mockMovementRow], count: 1, error: null });
      vi.mocked(supabase.from).mockReturnValue(query as unknown as ReturnType<typeof supabase.from>);

      const result = await movementService.getMovementsByMonth(2026, 1);

      expect(supabase.from).toHaveBeenCalledWith('movements');
      expect(query.gte).toHaveBeenCalledWith('displayed_date', '2026-01-01');
      // The service generates an end-of-month timestamp via `new Date(year, month, 0)`.
      // Assert just the prefix to keep the test stable across timezone differences.
      expect(query.lte).toHaveBeenCalledWith('displayed_date', expect.stringMatching(/^2026-01-31T23:59:59\.999Z$/));
      expect(result.data).toEqual([mockMovement]);
      expect(result.total).toBe(1);
    });
  });

  describe('createMovement', () => {
    it('should call apiClient.post with correct payload', async () => {
      vi.spyOn(apiClient, 'post').mockResolvedValue(mockMovement);
      const result = await movementService.createMovement(
        'IngresoNormal', 'acc-1', 'pocket-1', 1000, 'Salary', '2026-01-15'
      );
      expect(apiClient.post).toHaveBeenCalledWith('/api/movements', {
        type: 'IngresoNormal',
        accountId: 'acc-1',
        pocketId: 'pocket-1',
        amount: 1000,
        notes: 'Salary',
        displayedDate: '2026-01-15',
        subPocketId: undefined,
        isPending: undefined,
        category: undefined,
        tags: undefined,
      });
      expect(result).toEqual(mockMovement);
    });

    it('should support pending movements', async () => {
      vi.spyOn(apiClient, 'post').mockResolvedValue({ ...mockMovement, isPending: true });
      await movementService.createMovement('EgresoNormal', 'acc-1', 'pocket-1', 500, undefined, undefined, undefined, true);
      expect(apiClient.post).toHaveBeenCalledWith('/api/movements', expect.objectContaining({ isPending: true }));
    });
  });

  describe('createTransfer', () => {
    it('should call transfer endpoint and map response', async () => {
      vi.spyOn(apiClient, 'post').mockResolvedValue({
        expense: { id: 'e1', type: 'EgresoNormal', account_id: 'acc-1', pocket_id: 'p1', amount: 100, displayed_date: '2026-01-15', created_at: '2026-01-15', is_pending: false, is_orphaned: false },
        income: { id: 'i1', type: 'IngresoNormal', account_id: 'acc-2', pocket_id: 'p2', amount: 100, displayed_date: '2026-01-15', created_at: '2026-01-15', is_pending: false, is_orphaned: false },
      });
      const result = await movementService.createTransfer('acc-1', 'p1', 'acc-2', 'p2', 100, '2026-01-15');
      expect(apiClient.post).toHaveBeenCalledWith('/api/movements/transfer', expect.objectContaining({ amount: 100 }));
      expect(result.expense.id).toBe('e1');
      expect(result.income.id).toBe('i1');
    });
  });

  describe('updateMovement', () => {
    it('should call apiClient.put with correct path and updates', async () => {
      const updated = { ...mockMovement, amount: 2000 };
      vi.spyOn(apiClient, 'put').mockResolvedValue(updated);
      const result = await movementService.updateMovement('mov-1', { amount: 2000 });
      expect(apiClient.put).toHaveBeenCalledWith('/api/movements/mov-1', { amount: 2000 });
      expect(result.amount).toBe(2000);
    });
  });

  describe('deleteMovement', () => {
    it('should call apiClient.delete with correct path', async () => {
      vi.spyOn(apiClient, 'delete').mockResolvedValue(undefined);
      await movementService.deleteMovement('mov-1');
      expect(apiClient.delete).toHaveBeenCalledWith('/api/movements/mov-1');
    });
  });

  describe('getPendingMovements', () => {
    it('queries movements with is_pending=true', async () => {
      const pendingRow = { ...mockMovementRow, id: 'mov-pending', is_pending: true };
      const query = makeSupabaseQuery({ data: [pendingRow], error: null });
      vi.mocked(supabase.from).mockReturnValue(query as unknown as ReturnType<typeof supabase.from>);

      const result = await movementService.getPendingMovements();

      expect(supabase.from).toHaveBeenCalledWith('movements');
      expect(query.eq).toHaveBeenCalledWith('is_pending', true);
      expect(query.order).toHaveBeenCalledWith('displayed_date', { ascending: false });
      expect(result).toHaveLength(1);
      expect(result[0].isPending).toBe(true);
    });
  });

  describe('applyPendingMovement', () => {
    it('should call apply endpoint', async () => {
      vi.spyOn(apiClient, 'post').mockResolvedValue({ ...mockMovement, isPending: false });
      const result = await movementService.applyPendingMovement('mov-1');
      expect(apiClient.post).toHaveBeenCalledWith('/api/movements/mov-1/apply', {});
      expect(result.isPending).toBe(false);
    });
  });

  describe('markAsPending', () => {
    it('should call mark-pending endpoint', async () => {
      vi.spyOn(apiClient, 'post').mockResolvedValue({ ...mockMovement, isPending: true });
      const result = await movementService.markAsPending('mov-1');
      expect(apiClient.post).toHaveBeenCalledWith('/api/movements/mov-1/mark-pending', {});
      expect(result.isPending).toBe(true);
    });
  });

  describe('restoreOrphanedMovements', () => {
    it('should call restore endpoint with correct payload', async () => {
      vi.spyOn(apiClient, 'post').mockResolvedValue({ restored: 3, failed: 0 });
      const result = await movementService.restoreOrphanedMovements(['m1', 'm2', 'm3'], 'acc-1', 'p1');
      expect(apiClient.post).toHaveBeenCalledWith('/api/movements/restore-orphaned', {
        movementIds: ['m1', 'm2', 'm3'],
        accountId: 'acc-1',
        pocketId: 'p1',
      });
      expect(result.restored).toBe(3);
    });
  });

  describe('bulk operations', () => {
    it('deleteMovementsByAccount should return count', async () => {
      vi.spyOn(apiClient, 'delete').mockResolvedValue({ count: 5 });
      const result = await movementService.deleteMovementsByAccount('acc-1');
      expect(apiClient.delete).toHaveBeenCalledWith('/api/movements/by-account/acc-1');
      expect(result).toBe(5);
    });

    it('deleteMovementsByPocket should return count', async () => {
      vi.spyOn(apiClient, 'delete').mockResolvedValue({ count: 3 });
      const result = await movementService.deleteMovementsByPocket('p1');
      expect(apiClient.delete).toHaveBeenCalledWith('/api/movements/by-pocket/p1');
      expect(result).toBe(3);
    });

    it('markMovementsAsOrphaned should return count', async () => {
      vi.spyOn(apiClient, 'post').mockResolvedValue({ count: 2 });
      const result = await movementService.markMovementsAsOrphaned('acc-1', 'account');
      expect(apiClient.post).toHaveBeenCalledWith('/api/movements/mark-orphaned', { entityId: 'acc-1', entityType: 'account' });
      expect(result).toBe(2);
    });

    it('updateMovementsAccountForPocket should return count', async () => {
      vi.spyOn(apiClient, 'post').mockResolvedValue({ count: 4 });
      const result = await movementService.updateMovementsAccountForPocket('p1', 'acc-2');
      expect(apiClient.post).toHaveBeenCalledWith('/api/movements/update-account', { pocketId: 'p1', newAccountId: 'acc-2' });
      expect(result).toBe(4);
    });
  });
});
