import { describe, it, expect, beforeEach, vi } from 'vitest';
import { movementService } from './movementService';
import { apiClient } from './apiClient';
import type { Movement } from '../types';

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

const mockPaginatedResponse = {
  data: [mockMovement],
  total: 1,
  page: 1,
  limit: 20,
  hasMore: false,
};

describe('movementService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAllMovements', () => {
    it('should return movements array from paginated response', async () => {
      vi.spyOn(apiClient, 'get').mockResolvedValue(mockPaginatedResponse);
      const result = await movementService.getAllMovements();
      expect(apiClient.get).toHaveBeenCalledWith(expect.stringContaining('/api/movements?'));
      expect(result).toEqual([mockMovement]);
    });

    it('should pass page and limit when provided', async () => {
      vi.spyOn(apiClient, 'get').mockResolvedValue(mockPaginatedResponse);
      await movementService.getAllMovements(2, 10);
      expect(apiClient.get).toHaveBeenCalledWith(expect.stringContaining('page=2'));
      expect(apiClient.get).toHaveBeenCalledWith(expect.stringContaining('limit=10'));
    });
  });

  describe('getAllMovementsPaginated', () => {
    it('should return full paginated response', async () => {
      vi.spyOn(apiClient, 'get').mockResolvedValue(mockPaginatedResponse);
      const result = await movementService.getAllMovementsPaginated(1, 20);
      expect(result).toEqual(mockPaginatedResponse);
      expect(result.hasMore).toBe(false);
    });
  });

  describe('getActiveMovements', () => {
    it('should filter out orphaned movements', async () => {
      const orphaned = { ...mockMovement, id: 'mov-2', isOrphaned: true };
      vi.spyOn(apiClient, 'get').mockResolvedValue({ ...mockPaginatedResponse, data: [mockMovement, orphaned] });
      const result = await movementService.getActiveMovements();
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('mov-1');
    });
  });

  describe('getOrphanedMovements', () => {
    it('should call correct endpoint', async () => {
      vi.spyOn(apiClient, 'get').mockResolvedValue([]);
      await movementService.getOrphanedMovements();
      expect(apiClient.get).toHaveBeenCalledWith('/api/movements/orphaned');
    });
  });

  describe('getMovementsByAccount', () => {
    it('should pass accountId as query param', async () => {
      vi.spyOn(apiClient, 'get').mockResolvedValue([mockMovement]);
      await movementService.getMovementsByAccount('acc-1');
      expect(apiClient.get).toHaveBeenCalledWith(expect.stringContaining('accountId=acc-1'));
    });
  });

  describe('getMovementsByPocket', () => {
    it('should pass pocketId as query param', async () => {
      vi.spyOn(apiClient, 'get').mockResolvedValue([mockMovement]);
      await movementService.getMovementsByPocket('pocket-1');
      expect(apiClient.get).toHaveBeenCalledWith(expect.stringContaining('pocketId=pocket-1'));
    });
  });

  describe('getMovementsByMonth', () => {
    it('should pass year and month as query params', async () => {
      vi.spyOn(apiClient, 'get').mockResolvedValue([mockMovement]);
      await movementService.getMovementsByMonth(2026, 1);
      expect(apiClient.get).toHaveBeenCalledWith('/api/movements?year=2026&month=1');
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
    it('should call correct endpoint', async () => {
      vi.spyOn(apiClient, 'get').mockResolvedValue([]);
      await movementService.getPendingMovements();
      expect(apiClient.get).toHaveBeenCalledWith('/api/movements/pending');
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
