import { describe, it, expect, beforeEach, vi } from 'vitest';
import { subPocketService } from './subPocketService';
import { apiClient } from './apiClient';
import type { SubPocket } from '../types';

const mockSubPocket: SubPocket = {
  id: 'sp-1',
  pocketId: 'pocket-1',
  name: 'Rent',
  valueTotal: 12000,
  periodicityMonths: 1,
  balance: 0,
  enabled: true,
};

describe('subPocketService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAllSubPockets', () => {
    it('should call apiClient.get with correct path', async () => {
      vi.spyOn(apiClient, 'get').mockResolvedValue([mockSubPocket]);
      const result = await subPocketService.getAllSubPockets();
      expect(apiClient.get).toHaveBeenCalledWith('/api/sub-pockets');
      expect(result).toEqual([mockSubPocket]);
    });
  });

  describe('getSubPocket', () => {
    it('should retrieve sub-pocket by ID', async () => {
      vi.spyOn(apiClient, 'get').mockResolvedValue(mockSubPocket);
      const result = await subPocketService.getSubPocket('sp-1');
      expect(apiClient.get).toHaveBeenCalledWith('/api/sub-pockets/sp-1');
      expect(result).toEqual(mockSubPocket);
    });

    it('should return null for non-existent ID', async () => {
      vi.spyOn(apiClient, 'get').mockResolvedValue(null);
      const result = await subPocketService.getSubPocket('non-existent');
      expect(result).toBeNull();
    });
  });

  describe('getSubPocketsByPocket', () => {
    it('should pass pocketId as query param', async () => {
      vi.spyOn(apiClient, 'get').mockResolvedValue([mockSubPocket]);
      await subPocketService.getSubPocketsByPocket('pocket-1');
      expect(apiClient.get).toHaveBeenCalledWith('/api/sub-pockets?pocketId=pocket-1');
    });
  });

  describe('getSubPocketsByGroup', () => {
    it('should pass groupId as query param', async () => {
      vi.spyOn(apiClient, 'get').mockResolvedValue([mockSubPocket]);
      await subPocketService.getSubPocketsByGroup('group-1');
      expect(apiClient.get).toHaveBeenCalledWith('/api/sub-pockets?groupId=group-1');
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
    it('should sum contributions of enabled sub-pockets', async () => {
      const disabled = { ...mockSubPocket, id: 'sp-2', enabled: false };
      vi.spyOn(apiClient, 'get').mockResolvedValue([mockSubPocket, disabled]);
      const result = await subPocketService.calculateTotalFijosMes('pocket-1');
      expect(result).toBeGreaterThan(0);
    });

    it('should return 0 when no sub-pockets', async () => {
      vi.spyOn(apiClient, 'get').mockResolvedValue([]);
      const result = await subPocketService.calculateTotalFijosMes('pocket-1');
      expect(result).toBe(0);
    });

    it('should add debt repayment for negative balance', async () => {
      const withDebt = { ...mockSubPocket, balance: -500 };
      vi.spyOn(apiClient, 'get').mockResolvedValue([withDebt]);
      const result = await subPocketService.calculateTotalFijosMes('pocket-1');
      // Should include the regular contribution + 500 debt
      expect(result).toBeGreaterThanOrEqual(500);
    });
  });

  describe('calculateNextPayment', () => {
    it('should return 0 when sub-pocket not found', async () => {
      vi.spyOn(apiClient, 'get').mockResolvedValue(null);
      const result = await subPocketService.calculateNextPayment('non-existent');
      expect(result).toBe(0);
    });

    it('should return contribution amount for normal sub-pocket', async () => {
      vi.spyOn(apiClient, 'get').mockResolvedValue(mockSubPocket);
      const result = await subPocketService.calculateNextPayment('sp-1');
      expect(result).toBeGreaterThan(0);
    });

    it('should add debt repayment for negative balance', async () => {
      const withDebt = { ...mockSubPocket, balance: -500 };
      vi.spyOn(apiClient, 'get').mockResolvedValue(withDebt);
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

  describe('toggleSubPocketEnabled', () => {
    it('should call toggle endpoint', async () => {
      const toggled = { ...mockSubPocket, enabled: false };
      vi.spyOn(apiClient, 'post').mockResolvedValue(toggled);
      const result = await subPocketService.toggleSubPocketEnabled('sp-1');
      expect(apiClient.post).toHaveBeenCalledWith('/api/sub-pockets/sp-1/toggle', {});
      expect(result.enabled).toBe(false);
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
  });

  describe('toggleGroup', () => {
    it('should call group toggle endpoint', async () => {
      vi.spyOn(apiClient, 'post').mockResolvedValue(undefined);
      await subPocketService.toggleGroup('group-1', true);
      expect(apiClient.post).toHaveBeenCalledWith('/api/fixed-expense-groups/group-1/toggle', {});
    });
  });
});
