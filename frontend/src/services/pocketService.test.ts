import { describe, it, expect, beforeEach, vi } from 'vitest';
import { pocketService } from './pocketService';
import { apiClient } from './apiClient';
import type { Pocket } from '../types';

const mockPocket: Pocket = {
  id: 'pocket-1',
  accountId: 'acc-1',
  name: 'Savings',
  type: 'normal',
  balance: 0,
  currency: 'USD',
};

describe('pocketService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAllPockets', () => {
    it('should call apiClient.get with correct path', async () => {
      vi.spyOn(apiClient, 'get').mockResolvedValue([mockPocket]);
      const result = await pocketService.getAllPockets();
      expect(apiClient.get).toHaveBeenCalledWith('/api/pockets');
      expect(result).toEqual([mockPocket]);
    });

    it('should return empty array when no pockets', async () => {
      vi.spyOn(apiClient, 'get').mockResolvedValue([]);
      const result = await pocketService.getAllPockets();
      expect(result).toEqual([]);
    });

    it('should omit query string when includeArchived is false (default)', async () => {
      vi.spyOn(apiClient, 'get').mockResolvedValue([mockPocket]);
      await pocketService.getAllPockets(false);
      expect(apiClient.get).toHaveBeenCalledWith('/api/pockets');
    });

    it('should pass include_archived=true when requested', async () => {
      vi.spyOn(apiClient, 'get').mockResolvedValue([mockPocket]);
      await pocketService.getAllPockets(true);
      expect(apiClient.get).toHaveBeenCalledWith('/api/pockets?include_archived=true');
    });
  });

  describe('getPocket', () => {
    it('should retrieve pocket by ID', async () => {
      vi.spyOn(apiClient, 'get').mockResolvedValue(mockPocket);
      const result = await pocketService.getPocket('pocket-1');
      expect(apiClient.get).toHaveBeenCalledWith('/api/pockets/pocket-1');
      expect(result).toEqual(mockPocket);
    });

    it('should return null for non-existent ID', async () => {
      vi.spyOn(apiClient, 'get').mockResolvedValue(null);
      const result = await pocketService.getPocket('non-existent');
      expect(result).toBeNull();
    });
  });

  describe('getPocketsByAccount', () => {
    it('should filter pockets by account ID', async () => {
      vi.spyOn(apiClient, 'get').mockResolvedValue([mockPocket]);
      const result = await pocketService.getPocketsByAccount('acc-1');
      expect(apiClient.get).toHaveBeenCalledWith('/api/pockets?accountId=acc-1');
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
    it('should return the fixed pocket when it exists', async () => {
      const fixedPocket = { ...mockPocket, id: 'fixed-1', type: 'fixed' as const };
      vi.spyOn(apiClient, 'get').mockResolvedValue([mockPocket, fixedPocket]);
      const result = await pocketService.getFixedExpensesPocket();
      expect(result).toEqual(fixedPocket);
    });

    it('should return null when no fixed pocket exists', async () => {
      vi.spyOn(apiClient, 'get').mockResolvedValue([mockPocket]);
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
