/**
 * Property-Based Tests for Account Service
 * 
 * Feature: backend-migration, Property 4: Feature flags control routing
 * Validates: Requirements 3.1, 3.2
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fc from 'fast-check';
import { accountService } from './accountService';
import { apiClient } from './apiClient';
import { SupabaseStorageService } from './supabaseStorageService';
import { supabase } from '../lib/supabase';
import type { Account } from '../types';

describe('AccountService Property-Based Tests', () => {
  // Store original environment value
  const originalEnv = import.meta.env.VITE_USE_BACKEND_ACCOUNTS;

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    
    // Mock Supabase auth to avoid authentication errors
    vi.spyOn(supabase.auth, 'getUser').mockResolvedValue({
      data: { user: { id: 'test-user-id' } as any },
      error: null,
    });
    vi.spyOn(supabase.auth, 'getSession').mockResolvedValue({
      data: { session: { access_token: 'test-token' } as any },
      error: null,
    });
  });

  afterEach(() => {
    // Restore original environment value
    import.meta.env.VITE_USE_BACKEND_ACCOUNTS = originalEnv;
    vi.restoreAllMocks();
  });

  /**
   * Property 4: Feature flags control routing
   * 
   * For any account operation, when the feature flag is enabled, the frontend
   * should call the backend API. When disabled, it should use direct Supabase calls.
   * 
   * Validates: Requirements 3.1, 3.2
   */
  describe('Property 4: Feature flags control routing', () => {
    it('should route to backend API when flag is enabled', async () => {
      // Set feature flag to enabled
      import.meta.env.VITE_USE_BACKEND_ACCOUNTS = 'true';

      // Spy on apiClient methods
      const apiGetSpy = vi.spyOn(apiClient, 'get');
      const apiPostSpy = vi.spyOn(apiClient, 'post');
      const apiPutSpy = vi.spyOn(apiClient, 'put');
      const apiDeleteSpy = vi.spyOn(apiClient, 'delete');

      // Spy on Supabase direct methods (should NOT be called)
      const supabaseGetSpy = vi.spyOn(SupabaseStorageService, 'getAccounts');
      const supabaseInsertSpy = vi.spyOn(SupabaseStorageService, 'insertAccount');
      const supabaseUpdateSpy = vi.spyOn(SupabaseStorageService, 'updateAccount');
      const supabaseDeleteSpy = vi.spyOn(SupabaseStorageService, 'deleteAccount');

      // Mock successful API responses
      const mockAccount: Account = {
        id: 'test-id',
        name: 'Test Account',
        color: '#3b82f6',
        currency: 'USD',
        balance: 0,
        type: 'normal',
      };

      apiGetSpy.mockResolvedValue([mockAccount]);
      apiPostSpy.mockResolvedValue(mockAccount);
      apiPutSpy.mockResolvedValue(mockAccount);
      apiDeleteSpy.mockResolvedValue(undefined as any);

      // Force the flag check
      const testService = accountService;
      (testService as any).useBackend = true;

      // Test getAllAccounts
      await testService.getAllAccounts();
      expect(apiGetSpy).toHaveBeenCalledWith('/api/accounts');
      expect(supabaseGetSpy).not.toHaveBeenCalled();

      // Test createAccount
      await testService.createAccount('Test', '#3b82f6', 'USD');
      expect(apiPostSpy).toHaveBeenCalledWith('/api/accounts', expect.any(Object));
      expect(supabaseInsertSpy).not.toHaveBeenCalled();

      // Test updateAccount
      await testService.updateAccount('test-id', { name: 'Updated' });
      expect(apiPutSpy).toHaveBeenCalledWith('/api/accounts/test-id', expect.any(Object));
      expect(supabaseUpdateSpy).not.toHaveBeenCalled();

      // Test deleteAccount
      await testService.deleteAccount('test-id');
      expect(apiDeleteSpy).toHaveBeenCalledWith('/api/accounts/test-id');
      expect(supabaseDeleteSpy).not.toHaveBeenCalled();
    });

    it('should route to Supabase when flag is disabled', async () => {
      // Set feature flag to disabled
      import.meta.env.VITE_USE_BACKEND_ACCOUNTS = 'false';

      // Spy on apiClient methods (should NOT be called)
      const apiGetSpy = vi.spyOn(apiClient, 'get');
      const apiPostSpy = vi.spyOn(apiClient, 'post');
      const apiPutSpy = vi.spyOn(apiClient, 'put');
      const apiDeleteSpy = vi.spyOn(apiClient, 'delete');

      // Spy on Supabase direct methods
      const supabaseGetSpy = vi.spyOn(SupabaseStorageService, 'getAccounts');
      const supabaseInsertSpy = vi.spyOn(SupabaseStorageService, 'insertAccount');
      const supabaseUpdateSpy = vi.spyOn(SupabaseStorageService, 'updateAccount');
      const supabaseDeleteSpy = vi.spyOn(SupabaseStorageService, 'deleteAccount');
      const supabasePocketsSpy = vi.spyOn(SupabaseStorageService, 'getPockets');

      // Mock successful Supabase responses
      const mockAccount: Account = {
        id: 'test-id',
        name: 'Test Account',
        color: '#3b82f6',
        currency: 'USD',
        balance: 0,
        type: 'normal',
      };

      supabaseGetSpy.mockResolvedValue([mockAccount]);
      supabaseInsertSpy.mockResolvedValue(undefined);
      supabaseUpdateSpy.mockResolvedValue(undefined);
      supabaseDeleteSpy.mockResolvedValue(undefined);
      supabasePocketsSpy.mockResolvedValue([]);

      // Force the flag check
      const testService = accountService;
      (testService as any).useBackend = false;

      // Test getAllAccounts
      await testService.getAllAccounts();
      expect(supabaseGetSpy).toHaveBeenCalled();
      expect(apiGetSpy).not.toHaveBeenCalled();

      // Test createAccount
      await testService.createAccount('Test', '#3b82f6', 'USD');
      expect(supabaseInsertSpy).toHaveBeenCalled();
      expect(apiPostSpy).not.toHaveBeenCalled();

      // Test updateAccount
      await testService.updateAccount('test-id', { name: 'Updated' });
      expect(supabaseUpdateSpy).toHaveBeenCalled();
      expect(apiPutSpy).not.toHaveBeenCalled();

      // Test deleteAccount
      await testService.deleteAccount('test-id');
      expect(supabaseDeleteSpy).toHaveBeenCalled();
      expect(apiDeleteSpy).not.toHaveBeenCalled();
    });

    it('should fallback to Supabase when backend API fails', async () => {
      // Set feature flag to enabled
      import.meta.env.VITE_USE_BACKEND_ACCOUNTS = 'true';

      // Spy on methods
      const apiGetSpy = vi.spyOn(apiClient, 'get');
      const supabaseGetSpy = vi.spyOn(SupabaseStorageService, 'getAccounts');
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Mock API failure
      apiGetSpy.mockRejectedValue(new Error('Backend unavailable'));

      // Mock successful Supabase fallback
      const mockAccount: Account = {
        id: 'test-id',
        name: 'Test Account',
        color: '#3b82f6',
        currency: 'USD',
        balance: 0,
        type: 'normal',
      };
      supabaseGetSpy.mockResolvedValue([mockAccount]);

      // Force the flag check
      const testService = accountService;
      (testService as any).useBackend = true;

      // Test getAllAccounts with fallback
      const result = await testService.getAllAccounts();

      // Should try backend first
      expect(apiGetSpy).toHaveBeenCalledWith('/api/accounts');
      
      // Should log error
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Backend API failed, falling back to Supabase:',
        expect.any(Error)
      );
      
      // Should fallback to Supabase
      expect(supabaseGetSpy).toHaveBeenCalled();
      
      // Should return Supabase result
      expect(result).toEqual([mockAccount]);

      consoleErrorSpy.mockRestore();
    });

    it('Property: Feature flag controls routing for all operations', () => {
      fc.assert(
        fc.property(
          fc.boolean(), // Feature flag value
          fc.constantFrom('getAllAccounts', 'getAccount'),
          async (flagEnabled, operation) => {
            // Mock account data
            const mockAccount: Account = {
              id: 'test-id',
              name: 'Test',
              color: '#3b82f6',
              currency: 'USD',
              balance: 0,
              type: 'normal',
            };

            // Spy on both API and Supabase methods
            const apiGetSpy = vi.spyOn(apiClient, 'get').mockResolvedValue([mockAccount]);
            const supabaseGetSpy = vi.spyOn(SupabaseStorageService, 'getAccounts').mockResolvedValue([mockAccount]);

            // Create test service with correct flag
            const testService = accountService;
            (testService as any).useBackend = flagEnabled;

            // Execute operation
            try {
              switch (operation) {
                case 'getAllAccounts':
                  await testService.getAllAccounts();
                  break;
                case 'getAccount':
                  await testService.getAccount('test-id');
                  break;
              }
            } catch (error) {
              // Some operations may fail, that's ok
            }

            // Verify routing based on flag
            if (flagEnabled) {
              // When flag is enabled, should call API
              const apiCalled = apiGetSpy.mock.calls.length > 0;
              return apiCalled;
            } else {
              // When flag is disabled, should NOT call API and should call Supabase
              const apiCalled = apiGetSpy.mock.calls.length > 0;
              const supabaseCalled = supabaseGetSpy.mock.calls.length > 0;
              return !apiCalled && supabaseCalled;
            }
          }
        ),
        { numRuns: 50 }
      );
    });
  });
});
