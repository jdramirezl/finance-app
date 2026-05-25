import { describe, it, expect, beforeEach, vi } from 'vitest';
import { accountService } from './accountService';
import { apiClient } from './apiClient';
import type { Account } from '../types';

const mockAccount: Account = {
  id: 'test-id',
  name: 'Test Account',
  color: '#FF0000',
  currency: 'USD',
  balance: 0,
  type: 'normal',
};

describe('accountService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAllAccounts', () => {
    it('should call apiClient.get with correct path', async () => {
      vi.spyOn(apiClient, 'get').mockResolvedValue([mockAccount]);
      const result = await accountService.getAllAccounts();
      expect(apiClient.get).toHaveBeenCalledWith('/api/accounts');
      expect(result).toEqual([mockAccount]);
    });

    it('should return empty array when no accounts', async () => {
      vi.spyOn(apiClient, 'get').mockResolvedValue([]);
      const result = await accountService.getAllAccounts();
      expect(result).toEqual([]);
    });

    it('should omit query string when includeArchived is false (default)', async () => {
      vi.spyOn(apiClient, 'get').mockResolvedValue([mockAccount]);
      await accountService.getAllAccounts(false);
      expect(apiClient.get).toHaveBeenCalledWith('/api/accounts');
    });

    it('should pass include_archived=true when requested', async () => {
      vi.spyOn(apiClient, 'get').mockResolvedValue([mockAccount]);
      await accountService.getAllAccounts(true);
      expect(apiClient.get).toHaveBeenCalledWith('/api/accounts?include_archived=true');
    });
  });

  describe('getAccount', () => {
    it('should retrieve account by ID', async () => {
      vi.spyOn(apiClient, 'get').mockResolvedValue(mockAccount);
      const result = await accountService.getAccount('test-id');
      expect(apiClient.get).toHaveBeenCalledWith('/api/accounts/test-id');
      expect(result).toEqual(mockAccount);
    });

    it('should return null for non-existent ID', async () => {
      vi.spyOn(apiClient, 'get').mockResolvedValue(null);
      const result = await accountService.getAccount('non-existent');
      expect(result).toBeNull();
    });
  });

  describe('createAccount', () => {
    it('should create a normal account', async () => {
      vi.spyOn(apiClient, 'post').mockResolvedValue(mockAccount);
      const result = await accountService.createAccount('Test Account', '#FF0000', 'USD');
      expect(apiClient.post).toHaveBeenCalledWith('/api/accounts', {
        name: 'Test Account',
        color: '#FF0000',
        currency: 'USD',
        type: 'normal',
        stockSymbol: undefined,
        investmentType: undefined,
      });
      expect(result).toEqual(mockAccount);
    });

    it('should create an investment account', async () => {
      const investmentAccount = { ...mockAccount, type: 'investment' as const, stockSymbol: 'VOO' };
      vi.spyOn(apiClient, 'post').mockResolvedValue(investmentAccount);
      const result = await accountService.createAccount('VOO', '#8B5CF6', 'USD', 'investment', 'VOO');
      expect(apiClient.post).toHaveBeenCalledWith('/api/accounts', {
        name: 'VOO',
        color: '#8B5CF6',
        currency: 'USD',
        type: 'investment',
        stockSymbol: 'VOO',
        investmentType: undefined,
      });
      expect(result).toEqual(investmentAccount);
    });

    it('should pass investmentType when provided', async () => {
      vi.spyOn(apiClient, 'post').mockResolvedValue(mockAccount);
      await accountService.createAccount('CD', '#000', 'USD', 'cd', undefined, 'cd');
      expect(apiClient.post).toHaveBeenCalledWith('/api/accounts', expect.objectContaining({
        investmentType: 'cd',
      }));
    });
  });

  describe('createCDAccount', () => {
    it('should throw error for non-positive principal', async () => {
      await expect(
        accountService.createCDAccount('CD', '#000', 'USD', 0, 5, 12)
      ).rejects.toThrow('Principal amount must be greater than 0');
    });

    it('should throw error for invalid interest rate', async () => {
      await expect(
        accountService.createCDAccount('CD', '#000', 'USD', 1000, 0, 12)
      ).rejects.toThrow('Interest rate must be between 0 and 100');
      await expect(
        accountService.createCDAccount('CD', '#000', 'USD', 1000, 101, 12)
      ).rejects.toThrow('Interest rate must be between 0 and 100');
    });

    it('should throw error for invalid term', async () => {
      await expect(
        accountService.createCDAccount('CD', '#000', 'USD', 1000, 5, 0)
      ).rejects.toThrow('Term must be between 1 and 600 months');
      await expect(
        accountService.createCDAccount('CD', '#000', 'USD', 1000, 5, 601)
      ).rejects.toThrow('Term must be between 1 and 600 months');
    });

    it('should create CD account with valid params', async () => {
      const cdAccount = { ...mockAccount, type: 'cd' as const };
      vi.spyOn(apiClient, 'post').mockResolvedValue(cdAccount);
      const result = await accountService.createCDAccount('CD', '#000', 'USD', 1000, 5, 12);
      expect(apiClient.post).toHaveBeenCalledWith('/api/accounts', expect.objectContaining({
        name: 'CD',
        type: 'cd',
        principal: 1000,
        interestRate: 5,
        termMonths: 12,
      }));
      expect(result).toEqual(cdAccount);
    });
  });

  describe('updateAccount', () => {
    it('should call apiClient.put with correct path and data', async () => {
      const updated = { ...mockAccount, name: 'Updated Name' };
      vi.spyOn(apiClient, 'put').mockResolvedValue(updated);
      const result = await accountService.updateAccount('test-id', { name: 'Updated Name' });
      expect(apiClient.put).toHaveBeenCalledWith('/api/accounts/test-id', { name: 'Updated Name' });
      expect(result).toEqual(updated);
    });
  });

  describe('deleteAccount', () => {
    it('should call apiClient.delete with correct path', async () => {
      vi.spyOn(apiClient, 'delete').mockResolvedValue(undefined);
      await accountService.deleteAccount('test-id');
      expect(apiClient.delete).toHaveBeenCalledWith('/api/accounts/test-id');
    });
  });

  describe('archiveAccount', () => {
    it('should PATCH the archive endpoint', async () => {
      vi.spyOn(apiClient, 'patch').mockResolvedValue(undefined);
      await accountService.archiveAccount('test-id');
      expect(apiClient.patch).toHaveBeenCalledWith('/api/accounts/test-id/archive');
    });

    it('should resolve to void on success', async () => {
      vi.spyOn(apiClient, 'patch').mockResolvedValue(undefined);
      await expect(accountService.archiveAccount('test-id')).resolves.toBeUndefined();
    });

    it('should propagate errors from apiClient', async () => {
      vi.spyOn(apiClient, 'patch').mockRejectedValue(new Error('not found'));
      await expect(accountService.archiveAccount('missing')).rejects.toThrow('not found');
    });
  });

  describe('unarchiveAccount', () => {
    it('should PATCH the unarchive endpoint', async () => {
      vi.spyOn(apiClient, 'patch').mockResolvedValue(undefined);
      await accountService.unarchiveAccount('test-id');
      expect(apiClient.patch).toHaveBeenCalledWith('/api/accounts/test-id/unarchive');
    });

    it('should resolve to void on success', async () => {
      vi.spyOn(apiClient, 'patch').mockResolvedValue(undefined);
      await expect(accountService.unarchiveAccount('test-id')).resolves.toBeUndefined();
    });

    it('should propagate errors from apiClient', async () => {
      vi.spyOn(apiClient, 'patch').mockRejectedValue(new Error('not found'));
      await expect(accountService.unarchiveAccount('missing')).rejects.toThrow('not found');
    });
  });

  describe('deleteAccountCascade', () => {
    it('should call apiClient.post with cascade endpoint', async () => {
      const cascadeResult = { account: 'Test', pockets: 2, subPockets: 3, movements: 10 };
      vi.spyOn(apiClient, 'post').mockResolvedValue(cascadeResult);
      const result = await accountService.deleteAccountCascade('test-id', true);
      expect(apiClient.post).toHaveBeenCalledWith('/api/accounts/test-id/cascade', { deleteMovements: true });
      expect(result).toEqual(cascadeResult);
    });

    it('should default deleteMovements to false', async () => {
      vi.spyOn(apiClient, 'post').mockResolvedValue({ account: 'Test', pockets: 0, subPockets: 0, movements: 0 });
      await accountService.deleteAccountCascade('test-id');
      expect(apiClient.post).toHaveBeenCalledWith('/api/accounts/test-id/cascade', { deleteMovements: false });
    });
  });

  describe('reorderAccounts', () => {
    it('should call apiClient.post with account IDs', async () => {
      vi.spyOn(apiClient, 'post').mockResolvedValue(undefined);
      const ids = ['id1', 'id2', 'id3'];
      await accountService.reorderAccounts(ids);
      expect(apiClient.post).toHaveBeenCalledWith('/api/accounts/reorder', { accountIds: ids });
    });
  });

  describe('validateAccountUniqueness', () => {
    it('should return true when no duplicate exists', async () => {
      vi.spyOn(apiClient, 'get').mockResolvedValue([mockAccount]);
      const isUnique = await accountService.validateAccountUniqueness('Other', 'USD');
      expect(isUnique).toBe(true);
    });

    it('should return false when duplicate name+currency exists', async () => {
      vi.spyOn(apiClient, 'get').mockResolvedValue([mockAccount]);
      const isUnique = await accountService.validateAccountUniqueness('Test Account', 'USD');
      expect(isUnique).toBe(false);
    });

    it('should exclude specified ID from validation', async () => {
      vi.spyOn(apiClient, 'get').mockResolvedValue([mockAccount]);
      const isUnique = await accountService.validateAccountUniqueness('Test Account', 'USD', 'test-id');
      expect(isUnique).toBe(true);
    });

    it('should return true for same name different currency', async () => {
      vi.spyOn(apiClient, 'get').mockResolvedValue([mockAccount]);
      const isUnique = await accountService.validateAccountUniqueness('Test Account', 'MXN');
      expect(isUnique).toBe(true);
    });

    it('should query with include_archived=true so archived accounts still block reuse', async () => {
      const getSpy = vi.spyOn(apiClient, 'get').mockResolvedValue([mockAccount]);
      await accountService.validateAccountUniqueness('Other', 'USD');
      expect(getSpy).toHaveBeenCalledWith('/api/accounts?include_archived=true');
    });
  });

  describe('getCDAccounts', () => {
    it('should filter only CD accounts', async () => {
      const cdAccount = { ...mockAccount, id: 'cd-1', type: 'cd' as const, investmentType: 'cd' as const };
      vi.spyOn(apiClient, 'get').mockResolvedValue([mockAccount, cdAccount]);
      const result = await accountService.getCDAccounts();
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('cd-1');
    });
  });

  describe('calculateCDEarlyWithdrawal', () => {
    it('should throw for non-CD account', async () => {
      vi.spyOn(apiClient, 'get').mockResolvedValue(mockAccount);
      await expect(
        accountService.calculateCDEarlyWithdrawal('test-id')
      ).rejects.toThrow('Account is not a CD investment account');
    });

    it('should throw when account not found', async () => {
      vi.spyOn(apiClient, 'get').mockResolvedValue(null);
      await expect(
        accountService.calculateCDEarlyWithdrawal('non-existent')
      ).rejects.toThrow('Account is not a CD investment account');
    });
  });
});
