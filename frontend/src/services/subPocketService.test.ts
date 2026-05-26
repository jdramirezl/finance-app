import { describe, it, expect, beforeEach, vi } from 'vitest';
import { subPocketService } from './subPocketService';
import { apiClient } from './apiClient';
import { supabase } from '../lib/supabase';
import { makeSupabaseQuery } from '../test/supabaseQueryMock';
import type { SubPocket } from '../types';

// Override the global supabase mock from `test/setup.ts` so each read can
// configure its own resolved data/error pair via `makeSupabaseQuery`.
vi.mock('../lib/supabase', () => ({
  supabase: { from: vi.fn() },
}));

// Snake-case row shape returned by Supabase. `subPocketService` runs each
// row through `mapSubPocketRow` to produce the camelCase `SubPocket` type.
const mockSubPocketRow = {
  id: 'sp-1',
  pocket_id: 'pocket-1',
  name: 'Rent',
  value_total: 12000,
  periodicity_months: 1,
  balance: 0,
};

const mockSubPocket: SubPocket = {
  id: 'sp-1',
  pocketId: 'pocket-1',
  name: 'Rent',
  valueTotal: 12000,
  periodicityMonths: 1,
  balance: 0,
};

describe('subPocketService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAllSubPockets', () => {
    it('queries the sub_pockets table ordered by display_order', async () => {
      const query = makeSupabaseQuery({ data: [mockSubPocketRow], error: null });
      vi.mocked(supabase.from).mockReturnValue(query as unknown as ReturnType<typeof supabase.from>);

      const result = await subPocketService.getAllSubPockets();

      expect(supabase.from).toHaveBeenCalledWith('sub_pockets');
      expect(query.select).toHaveBeenCalledWith('*');
      expect(query.order).toHaveBeenCalledWith('display_order', { ascending: true, nullsFirst: false });
      expect(result).toEqual([mockSubPocket]);
    });

    it('throws when Supabase returns an error', async () => {
      const query = makeSupabaseQuery({ data: null, error: { message: 'denied' } });
      vi.mocked(supabase.from).mockReturnValue(query as unknown as ReturnType<typeof supabase.from>);

      await expect(subPocketService.getAllSubPockets()).rejects.toThrow('Failed to fetch sub-pockets: denied');
    });
  });

  describe('getSubPocket', () => {
    it('retrieves a single sub-pocket by id via .eq().single()', async () => {
      const query = makeSupabaseQuery({ data: mockSubPocketRow, error: null });
      vi.mocked(supabase.from).mockReturnValue(query as unknown as ReturnType<typeof supabase.from>);

      const result = await subPocketService.getSubPocket('sp-1');

      expect(supabase.from).toHaveBeenCalledWith('sub_pockets');
      expect(query.eq).toHaveBeenCalledWith('id', 'sp-1');
      expect(query.single).toHaveBeenCalled();
      expect(result).toEqual(mockSubPocket);
    });

    it('returns null when the row is missing (PGRST116)', async () => {
      const query = makeSupabaseQuery({ data: null, error: { message: 'no rows', code: 'PGRST116' } });
      vi.mocked(supabase.from).mockReturnValue(query as unknown as ReturnType<typeof supabase.from>);

      const result = await subPocketService.getSubPocket('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('getSubPocketsByPocket', () => {
    it('filters sub-pockets by pocket_id', async () => {
      const query = makeSupabaseQuery({ data: [mockSubPocketRow], error: null });
      vi.mocked(supabase.from).mockReturnValue(query as unknown as ReturnType<typeof supabase.from>);

      const result = await subPocketService.getSubPocketsByPocket('pocket-1');

      expect(query.eq).toHaveBeenCalledWith('pocket_id', 'pocket-1');
      expect(result).toEqual([mockSubPocket]);
    });
  });

  describe('getSubPocketsByGroup', () => {
    it('filters sub-pockets by group_id', async () => {
      const query = makeSupabaseQuery({ data: [mockSubPocketRow], error: null });
      vi.mocked(supabase.from).mockReturnValue(query as unknown as ReturnType<typeof supabase.from>);

      await subPocketService.getSubPocketsByGroup('group-1');

      expect(query.eq).toHaveBeenCalledWith('group_id', 'group-1');
    });
  });

  describe('calculateAporteMensual', () => {
    it('should calculate monthly contribution for monthly periodicity', () => {
      const result = subPocketService.calculateAporteMensual(12000, 1, 0);
      expect(result).toBe(12000);
    });

    it('should calculate monthly contribution for yearly periodicity', () => {
      const result = subPocketService.calculateAporteMensual(12000, 12, 0);
      expect(result).toBe(1000);
    });

    it('should account for existing balance', () => {
      const result = subPocketService.calculateAporteMensual(12000, 12, 6000);
      // With 6000 already saved toward 12000 over 12 months, contribution should be reduced
      expect(result).toBeLessThanOrEqual(1000);
    });

    it('should return 0 when balance meets target', () => {
      const result = subPocketService.calculateAporteMensual(12000, 12, 12000);
      expect(result).toBe(0);
    });
  });

  describe('calculateProgress', () => {
    it('should return 0 for zero target', () => {
      expect(subPocketService.calculateProgress(500, 0)).toBe(0);
    });

    it('should return fraction for partial progress', () => {
      expect(subPocketService.calculateProgress(6000, 12000)).toBe(0.5);
    });

    it('should return 1 when balance equals target', () => {
      expect(subPocketService.calculateProgress(12000, 12000)).toBe(1);
    });

    it('should return > 1 when balance exceeds target', () => {
      expect(subPocketService.calculateProgress(15000, 12000)).toBe(1.25);
    });
  });

  describe('calculateTotalFijosMes', () => {
    it('sums contributions across all sub-pockets', async () => {
      const secondRow = { ...mockSubPocketRow, id: 'sp-2' };
      const query = makeSupabaseQuery({ data: [mockSubPocketRow, secondRow], error: null });
      vi.mocked(supabase.from).mockReturnValue(query as unknown as ReturnType<typeof supabase.from>);

      const result = await subPocketService.calculateTotalFijosMes('pocket-1');

      expect(result).toBeGreaterThan(0);
    });

    it('should return 0 when no sub-pockets', async () => {
      const query = makeSupabaseQuery({ data: [], error: null });
      vi.mocked(supabase.from).mockReturnValue(query as unknown as ReturnType<typeof supabase.from>);

      const result = await subPocketService.calculateTotalFijosMes('pocket-1');

      expect(result).toBe(0);
    });

    it('should add debt repayment for negative balance', async () => {
      const withDebtRow = { ...mockSubPocketRow, balance: -500 };
      const query = makeSupabaseQuery({ data: [withDebtRow], error: null });
      vi.mocked(supabase.from).mockReturnValue(query as unknown as ReturnType<typeof supabase.from>);

      const result = await subPocketService.calculateTotalFijosMes('pocket-1');

      // Should include the regular contribution + 500 debt
      expect(result).toBeGreaterThanOrEqual(500);
    });
  });

  describe('calculateNextPayment', () => {
    it('should return 0 when sub-pocket not found', async () => {
      const query = makeSupabaseQuery({ data: null, error: { message: 'no rows', code: 'PGRST116' } });
      vi.mocked(supabase.from).mockReturnValue(query as unknown as ReturnType<typeof supabase.from>);

      const result = await subPocketService.calculateNextPayment('non-existent');

      expect(result).toBe(0);
    });

    it('should return contribution amount for normal sub-pocket', async () => {
      const query = makeSupabaseQuery({ data: mockSubPocketRow, error: null });
      vi.mocked(supabase.from).mockReturnValue(query as unknown as ReturnType<typeof supabase.from>);

      const result = await subPocketService.calculateNextPayment('sp-1');

      expect(result).toBeGreaterThan(0);
    });

    it('should add debt repayment for negative balance', async () => {
      const withDebtRow = { ...mockSubPocketRow, balance: -500 };
      const query = makeSupabaseQuery({ data: withDebtRow, error: null });
      vi.mocked(supabase.from).mockReturnValue(query as unknown as ReturnType<typeof supabase.from>);

      const result = await subPocketService.calculateNextPayment('sp-1');

      expect(result).toBeGreaterThanOrEqual(500);
    });
  });

  describe('createSubPocket', () => {
    it('should call apiClient.post with correct payload', async () => {
      vi.spyOn(apiClient, 'post').mockResolvedValue(mockSubPocket);
      const result = await subPocketService.createSubPocket('pocket-1', 'Rent', 12000, 1);
      expect(apiClient.post).toHaveBeenCalledWith('/api/sub-pockets', {
        pocketId: 'pocket-1',
        name: 'Rent',
        valueTotal: 12000,
        periodicityMonths: 1,
        groupId: undefined,
      });
      expect(result).toEqual(mockSubPocket);
    });

    it('should pass groupId when provided', async () => {
      vi.spyOn(apiClient, 'post').mockResolvedValue(mockSubPocket);
      await subPocketService.createSubPocket('pocket-1', 'Rent', 12000, 1, 'group-1');
      expect(apiClient.post).toHaveBeenCalledWith('/api/sub-pockets', expect.objectContaining({ groupId: 'group-1' }));
    });
  });

  describe('updateSubPocket', () => {
    it('should call apiClient.put with correct path and updates', async () => {
      const updated = { ...mockSubPocket, name: 'Updated' };
      vi.spyOn(apiClient, 'put').mockResolvedValue(updated);
      const result = await subPocketService.updateSubPocket('sp-1', { name: 'Updated' });
      expect(apiClient.put).toHaveBeenCalledWith('/api/sub-pockets/sp-1', { name: 'Updated' });
      expect(result.name).toBe('Updated');
    });
  });

  describe('deleteSubPocket', () => {
    it('should call apiClient.delete with correct path', async () => {
      vi.spyOn(apiClient, 'delete').mockResolvedValue(undefined);
      await subPocketService.deleteSubPocket('sp-1');
      expect(apiClient.delete).toHaveBeenCalledWith('/api/sub-pockets/sp-1');
    });
  });

  describe('reorderSubPockets', () => {
    it('should call reorder endpoint', async () => {
      vi.spyOn(apiClient, 'post').mockResolvedValue(undefined);
      await subPocketService.reorderSubPockets('pocket-1', ['sp-1', 'sp-2']);
      expect(apiClient.post).toHaveBeenCalledWith('/api/sub-pockets/reorder', { pocketId: 'pocket-1', subPocketIds: ['sp-1', 'sp-2'] });
    });
  });

  describe('moveToGroup', () => {
    it('should call move-to-group endpoint', async () => {
      vi.spyOn(apiClient, 'post').mockResolvedValue(undefined);
      await subPocketService.moveToGroup('sp-1', 'group-2');
      expect(apiClient.post).toHaveBeenCalledWith('/api/sub-pockets/sp-1/move-to-group', { groupId: 'group-2' });
    });

    it('should send null groupId to ungroup the sub-pocket', async () => {
      vi.spyOn(apiClient, 'post').mockResolvedValue(undefined);
      await subPocketService.moveToGroup('sp-1', null);
      expect(apiClient.post).toHaveBeenCalledWith('/api/sub-pockets/sp-1/move-to-group', { groupId: null });
    });
  });
});
