import { describe, it, expect, beforeEach, vi } from 'vitest';
import { pocketService } from './pocketService';
import { apiClient } from './apiClient';
import { supabase } from '../lib/supabase';
import { makeSupabaseQuery } from '../test/supabaseQueryMock';
import type { Pocket } from '../types';

// Override the global supabase mock from `test/setup.ts` so each read can
// configure its own resolved data/error pair via `makeSupabaseQuery`.
vi.mock('../lib/supabase', () => ({
  supabase: { from: vi.fn() },
}));

// Snake-case row shape returned by Supabase. `pocketService` runs it through
// `mapPocketRow` to convert to the camelCase `Pocket` domain type.
const mockPocketRow = {
  id: 'pocket-1',
  account_id: 'acc-1',
  name: 'Savings',
  type: 'normal',
  balance: 0,
  currency: 'USD',
};

// Domain shape callers receive. Mirrors `mapPocketRow(mockPocketRow)`:
// `archivedAt` defaults to `null` rather than `undefined`.
const mockPocket: Pocket = {
  id: 'pocket-1',
  accountId: 'acc-1',
  name: 'Savings',
  type: 'normal',
  balance: 0,
  currency: 'USD',
  archivedAt: null,
};

describe('pocketService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAllPockets', () => {
    it('queries the pockets table and filters out archived rows by default', async () => {
      const query = makeSupabaseQuery({ data: [mockPocketRow], error: null });
      vi.mocked(supabase.from).mockReturnValue(query as unknown as ReturnType<typeof supabase.from>);

      const result = await pocketService.getAllPockets();

      expect(supabase.from).toHaveBeenCalledWith('pockets');
      expect(query.select).toHaveBeenCalledWith('*');
      expect(query.order).toHaveBeenCalledWith('display_order', { ascending: true, nullsFirst: false });
      expect(query.is).toHaveBeenCalledWith('archived_at', null);
      expect(result).toEqual([mockPocket]);
    });

    it('returns an empty array when the table has no rows', async () => {
      const query = makeSupabaseQuery({ data: [], error: null });
      vi.mocked(supabase.from).mockReturnValue(query as unknown as ReturnType<typeof supabase.from>);

      const result = await pocketService.getAllPockets();

      expect(result).toEqual([]);
    });

    it('skips the archived_at filter when includeArchived=true', async () => {
      const query = makeSupabaseQuery({ data: [mockPocketRow], error: null });
      vi.mocked(supabase.from).mockReturnValue(query as unknown as ReturnType<typeof supabase.from>);

      await pocketService.getAllPockets(true);

      expect(query.is).not.toHaveBeenCalled();
    });

    it('throws when Supabase returns an error', async () => {
      const query = makeSupabaseQuery({ data: null, error: { message: 'denied' } });
      vi.mocked(supabase.from).mockReturnValue(query as unknown as ReturnType<typeof supabase.from>);

      await expect(pocketService.getAllPockets()).rejects.toThrow('Failed to fetch pockets: denied');
    });
  });

  describe('getPocket', () => {
    it('retrieves a single pocket by id via .eq().single()', async () => {
      const query = makeSupabaseQuery({ data: mockPocketRow, error: null });
      vi.mocked(supabase.from).mockReturnValue(query as unknown as ReturnType<typeof supabase.from>);

      const result = await pocketService.getPocket('pocket-1');

      expect(supabase.from).toHaveBeenCalledWith('pockets');
      expect(query.eq).toHaveBeenCalledWith('id', 'pocket-1');
      expect(query.single).toHaveBeenCalled();
      expect(result).toEqual(mockPocket);
    });

    it('returns null when the row is missing (PGRST116)', async () => {
      const query = makeSupabaseQuery({ data: null, error: { message: 'no rows', code: 'PGRST116' } });
      vi.mocked(supabase.from).mockReturnValue(query as unknown as ReturnType<typeof supabase.from>);

      const result = await pocketService.getPocket('non-existent');

      expect(result).toBeNull();
    });

    it('throws on any other Supabase error', async () => {
      const query = makeSupabaseQuery({ data: null, error: { message: 'denied' } });
      vi.mocked(supabase.from).mockReturnValue(query as unknown as ReturnType<typeof supabase.from>);

      await expect(pocketService.getPocket('pocket-1')).rejects.toThrow('denied');
    });
  });

  describe('getPocketsByAccount', () => {
    it('filters pockets by account_id and orders by display_order', async () => {
      const query = makeSupabaseQuery({ data: [mockPocketRow], error: null });
      vi.mocked(supabase.from).mockReturnValue(query as unknown as ReturnType<typeof supabase.from>);

      const result = await pocketService.getPocketsByAccount('acc-1');

      expect(supabase.from).toHaveBeenCalledWith('pockets');
      expect(query.eq).toHaveBeenCalledWith('account_id', 'acc-1');
      expect(query.order).toHaveBeenCalledWith('display_order', { ascending: true, nullsFirst: false });
      expect(result).toEqual([mockPocket]);
    });
  });

  describe('createPocket', () => {
    it('should create a normal pocket', async () => {
      vi.spyOn(apiClient, 'post').mockResolvedValue(mockPocket);
      const result = await pocketService.createPocket('acc-1', 'Savings', 'normal');
      expect(apiClient.post).toHaveBeenCalledWith('/api/pockets', {
        accountId: 'acc-1',
        name: 'Savings',
        type: 'normal',
      });
      expect(result).toEqual(mockPocket);
    });

    it('should create a fixed pocket', async () => {
      const fixedPocket = { ...mockPocket, type: 'fixed' as const };
      vi.spyOn(apiClient, 'post').mockResolvedValue(fixedPocket);
      const result = await pocketService.createPocket('acc-1', 'Fixed Expenses', 'fixed');
      expect(apiClient.post).toHaveBeenCalledWith('/api/pockets', {
        accountId: 'acc-1',
        name: 'Fixed Expenses',
        type: 'fixed',
      });
      expect(result.type).toBe('fixed');
    });
  });

  describe('updatePocket', () => {
    it('should call apiClient.put with correct path and data', async () => {
      const updated = { ...mockPocket, name: 'Updated' };
      vi.spyOn(apiClient, 'put').mockResolvedValue(updated);
      const result = await pocketService.updatePocket('pocket-1', { name: 'Updated' });
      expect(apiClient.put).toHaveBeenCalledWith('/api/pockets/pocket-1', { name: 'Updated' });
      expect(result.name).toBe('Updated');
    });
  });

  describe('deletePocket', () => {
    it('should call apiClient.delete with correct path', async () => {
      vi.spyOn(apiClient, 'delete').mockResolvedValue(undefined);
      await pocketService.deletePocket('pocket-1');
      expect(apiClient.delete).toHaveBeenCalledWith('/api/pockets/pocket-1');
    });
  });

  describe('archivePocket', () => {
    it('should PATCH the archive endpoint', async () => {
      vi.spyOn(apiClient, 'patch').mockResolvedValue(undefined);
      await pocketService.archivePocket('pocket-1');
      expect(apiClient.patch).toHaveBeenCalledWith('/api/pockets/pocket-1/archive');
    });

    it('should resolve to void on success', async () => {
      vi.spyOn(apiClient, 'patch').mockResolvedValue(undefined);
      await expect(pocketService.archivePocket('pocket-1')).resolves.toBeUndefined();
    });

    it('should propagate errors from apiClient', async () => {
      vi.spyOn(apiClient, 'patch').mockRejectedValue(new Error('not found'));
      await expect(pocketService.archivePocket('missing')).rejects.toThrow('not found');
    });
  });

  describe('unarchivePocket', () => {
    it('should PATCH the unarchive endpoint', async () => {
      vi.spyOn(apiClient, 'patch').mockResolvedValue(undefined);
      await pocketService.unarchivePocket('pocket-1');
      expect(apiClient.patch).toHaveBeenCalledWith('/api/pockets/pocket-1/unarchive');
    });

    it('should resolve to void on success', async () => {
      vi.spyOn(apiClient, 'patch').mockResolvedValue(undefined);
      await expect(pocketService.unarchivePocket('pocket-1')).resolves.toBeUndefined();
    });

    it('should propagate errors from apiClient', async () => {
      vi.spyOn(apiClient, 'patch').mockRejectedValue(new Error('not found'));
      await expect(pocketService.unarchivePocket('missing')).rejects.toThrow('not found');
    });
  });

  describe('getFixedExpensesPocket', () => {
    it('returns the fixed pocket when one exists', async () => {
      const fixedPocketRow = { ...mockPocketRow, id: 'fixed-1', type: 'fixed' };
      const query = makeSupabaseQuery({ data: [mockPocketRow, fixedPocketRow], error: null });
      vi.mocked(supabase.from).mockReturnValue(query as unknown as ReturnType<typeof supabase.from>);

      const result = await pocketService.getFixedExpensesPocket();

      expect(result?.id).toBe('fixed-1');
      expect(result?.type).toBe('fixed');
    });

    it('returns null when no fixed pocket exists', async () => {
      const query = makeSupabaseQuery({ data: [mockPocketRow], error: null });
      vi.mocked(supabase.from).mockReturnValue(query as unknown as ReturnType<typeof supabase.from>);

      const result = await pocketService.getFixedExpensesPocket();

      expect(result).toBeNull();
    });
  });

  describe('migrateFixedPocketToAccount', () => {
    it('should call apiClient.post with migrate endpoint', async () => {
      const migrated = { ...mockPocket, accountId: 'acc-2' };
      vi.spyOn(apiClient, 'post').mockResolvedValue(migrated);
      const result = await pocketService.migrateFixedPocketToAccount('pocket-1', 'acc-2');
      expect(apiClient.post).toHaveBeenCalledWith('/api/pockets/pocket-1/migrate', { targetAccountId: 'acc-2' });
      expect(result.accountId).toBe('acc-2');
    });
  });

  describe('reorderPockets', () => {
    it('should call apiClient.post with reorder endpoint', async () => {
      vi.spyOn(apiClient, 'post').mockResolvedValue(undefined);
      const ids = ['p1', 'p2', 'p3'];
      await pocketService.reorderPockets('acc-1', ids);
      expect(apiClient.post).toHaveBeenCalledWith('/api/pockets/reorder', { accountId: 'acc-1', pocketIds: ids });
    });
  });
});
