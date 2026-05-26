import { describe, it, expect, beforeEach, vi } from 'vitest';
import { accountService } from './accountService';
import { apiClient } from './apiClient';
import { supabase } from '../lib/supabase';
import { makeSupabaseQuery, type SupabaseQueryMock } from '../test/supabaseQueryMock';
import type { Account } from '../types';

// Override the global supabase mock from `test/setup.ts` so each read can
// configure its own resolved data/error pair via `makeSupabaseQuery`.
vi.mock('../lib/supabase', () => ({
  supabase: { from: vi.fn() },
}));

// Snake-case row shape returned by Supabase. `accountService` uses the
// shared `mapAccountRow` to convert this into the camelCase domain type.
const mockAccountRow = {
  id: 'test-id',
  name: 'Test Account',
  color: '#FF0000',
  currency: 'USD',
  balance: 0,
  type: 'normal',
};

// Domain shape callers receive. Mirrors `mapAccountRow(mockAccountRow)`:
// `archivedAt` defaults to `null` rather than `undefined`, so we declare
// it explicitly here for `toEqual` comparisons.
const mockAccount: Account = {
  id: 'test-id',
  name: 'Test Account',
  color: '#FF0000',
  currency: 'USD',
  balance: 0,
  type: 'normal',
  archivedAt: null,
};

describe('accountService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAllAccounts', () => {
    it('queries the accounts table and filters out archived rows by default', async () => {
      const query: SupabaseQueryMock = makeSupabaseQuery({ data: [mockAccountRow], error: null });
      vi.mocked(supabase.from).mockReturnValue(query as unknown as ReturnType<typeof supabase.from>);

      const result = await accountService.getAllAccounts();

      expect(supabase.from).toHaveBeenCalledWith('accounts');
      expect(query.select).toHaveBeenCalledWith('*');
      expect(query.order).toHaveBeenCalledWith('display_order', { ascending: true, nullsFirst: false });
      expect(query.is).toHaveBeenCalledWith('archived_at', null);
      expect(result).toEqual([mockAccount]);
    });

    it('returns an empty array when the table has no rows', async () => {
      const query = makeSupabaseQuery({ data: [], error: null });
      vi.mocked(supabase.from).mockReturnValue(query as unknown as ReturnType<typeof supabase.from>);

      const result = await accountService.getAllAccounts();

      expect(result).toEqual([]);
    });

    it('skips the archived_at filter when includeArchived=true', async () => {
      const query = makeSupabaseQuery({ data: [mockAccountRow], error: null });
      vi.mocked(supabase.from).mockReturnValue(query as unknown as ReturnType<typeof supabase.from>);

      await accountService.getAllAccounts(true);

      expect(query.is).not.toHaveBeenCalled();
    });

    it('throws when Supabase returns an error', async () => {
      const query = makeSupabaseQuery({ data: null, error: { message: 'boom' } });
      vi.mocked(supabase.from).mockReturnValue(query as unknown as ReturnType<typeof supabase.from>);

      await expect(accountService.getAllAccounts()).rejects.toThrow('Failed to fetch accounts: boom');
    });
  });

  describe('getAccount', () => {
    it('retrieves a single account by id via .eq().single()', async () => {
      const query = makeSupabaseQuery({ data: mockAccountRow, error: null });
      vi.mocked(supabase.from).mockReturnValue(query as unknown as ReturnType<typeof supabase.from>);

      const result = await accountService.getAccount('test-id');

      expect(supabase.from).toHaveBeenCalledWith('accounts');
      expect(query.eq).toHaveBeenCalledWith('id', 'test-id');
      expect(query.single).toHaveBeenCalled();
      expect(result).toEqual(mockAccount);
    });

    it('returns null when Supabase reports the row was not found (PGRST116)', async () => {
      const query = makeSupabaseQuery({ data: null, error: { message: 'no rows', code: 'PGRST116' } });
      vi.mocked(supabase.from).mockReturnValue(query as unknown as ReturnType<typeof supabase.from>);

      const result = await accountService.getAccount('non-existent');

      expect(result).toBeNull();
    });

    it('throws on any other Supabase error', async () => {
      const query = makeSupabaseQuery({ data: null, error: { message: 'denied', code: '42501' } });
      vi.mocked(supabase.from).mockReturnValue(query as unknown as ReturnType<typeof supabase.from>);

      await expect(accountService.getAccount('test-id')).rejects.toThrow('denied');
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
    it('returns true when no account with the same name+currency exists', async () => {
      const query = makeSupabaseQuery({ data: [mockAccountRow], error: null });
      vi.mocked(supabase.from).mockReturnValue(query as unknown as ReturnType<typeof supabase.from>);

      const isUnique = await accountService.validateAccountUniqueness('Other', 'USD');

      expect(isUnique).toBe(true);
    });

    it('returns false when a duplicate name+currency exists', async () => {
      const query = makeSupabaseQuery({ data: [mockAccountRow], error: null });
      vi.mocked(supabase.from).mockReturnValue(query as unknown as ReturnType<typeof supabase.from>);

      const isUnique = await accountService.validateAccountUniqueness('Test Account', 'USD');

      expect(isUnique).toBe(false);
    });

    it('excludes the supplied id when validating uniqueness', async () => {
      const query = makeSupabaseQuery({ data: [mockAccountRow], error: null });
      vi.mocked(supabase.from).mockReturnValue(query as unknown as ReturnType<typeof supabase.from>);

      const isUnique = await accountService.validateAccountUniqueness('Test Account', 'USD', 'test-id');

      expect(isUnique).toBe(true);
    });

    it('treats different currencies as distinct accounts', async () => {
      const query = makeSupabaseQuery({ data: [mockAccountRow], error: null });
      vi.mocked(supabase.from).mockReturnValue(query as unknown as ReturnType<typeof supabase.from>);

      const isUnique = await accountService.validateAccountUniqueness('Test Account', 'MXN');

      expect(isUnique).toBe(true);
    });

    it('includes archived rows so archived accounts still block reuse', async () => {
      const query = makeSupabaseQuery({ data: [mockAccountRow], error: null });
      vi.mocked(supabase.from).mockReturnValue(query as unknown as ReturnType<typeof supabase.from>);

      await accountService.validateAccountUniqueness('Other', 'USD');

      // includeArchived=true skips the `.is('archived_at', null)` filter so
      // archived rows surface alongside active ones.
      expect(query.is).not.toHaveBeenCalled();
    });
  });

  describe('getCDAccounts', () => {
    it('should filter only CD accounts', async () => {
      const cdRow = { ...mockAccountRow, id: 'cd-1', type: 'cd', investment_type: 'cd' };
      const query = makeSupabaseQuery({ data: [mockAccountRow, cdRow], error: null });
      vi.mocked(supabase.from).mockReturnValue(query as unknown as ReturnType<typeof supabase.from>);

      const result = await accountService.getCDAccounts();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('cd-1');
    });
  });

  describe('calculateCDEarlyWithdrawal', () => {
    it('should throw for non-CD account', async () => {
      const query = makeSupabaseQuery({ data: mockAccountRow, error: null });
      vi.mocked(supabase.from).mockReturnValue(query as unknown as ReturnType<typeof supabase.from>);

      await expect(
        accountService.calculateCDEarlyWithdrawal('test-id')
      ).rejects.toThrow('Account is not a CD investment account');
    });

    it('should throw when account not found', async () => {
      const query = makeSupabaseQuery({ data: null, error: { message: 'no rows', code: 'PGRST116' } });
      vi.mocked(supabase.from).mockReturnValue(query as unknown as ReturnType<typeof supabase.from>);

      await expect(
        accountService.calculateCDEarlyWithdrawal('non-existent')
      ).rejects.toThrow('Account is not a CD investment account');
    });
  });
});
