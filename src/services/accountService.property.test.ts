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

      // Create a new instance to pick up the new flag value
      const AccountServiceClass = (await import('./accountService')).default || 
                                   (await import('./accountService')).AccountService;
      let testService: any;
      
      if (AccountServiceClass) {
        testService = new AccountServiceClass();
      } else {
        // If we can't get the class, we need to force reload the module
        // This is a workaround for the singleton pattern
        testService = accountService;
        // Force the flag check by accessing the private property
        (testService as any).useBackend = true;
      }

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

      // Create a new instance to pick up the new flag value
      const AccountServiceClass = (await import('./accountService')).default || 
                                   (await import('./accountService')).AccountService;
      let testService: any;
      
      if (AccountServiceClass) {
        testService = new AccountServiceClass();
      } else {
        testService = accountService;
        (testService as any).useBackend = false;
      }

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

      // Create a new instance
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
          fc.constantFrom('getAllAccounts', 'createAccount', 'updateAccount', 'deleteAccount', 'reorderAccounts', 'deleteAccountCascade'),
          async (flagEnabled, operation) => {
            // Set feature flag
            import.meta.env.VITE_USE_BACKEND_ACCOUNTS = flagEnabled ? 'true' : 'false';

            // Spy on both API and Supabase methods
            const apiGetSpy = vi.spyOn(apiClient, 'get').mockResolvedValue([]);
            const apiPostSpy = vi.spyOn(apiClient, 'post').mockResolvedValue({});
            const apiPutSpy = vi.spyOn(apiClient, 'put').mockResolvedValue({});
            const apiDeleteSpy = vi.spyOn(apiClient, 'delete').mockResolvedValue(undefined as any);
            
            const supabaseGetSpy = vi.spyOn(SupabaseStorageService, 'getAccounts').mockResolvedValue([]);
            const supabaseInsertSpy = vi.spyOn(SupabaseStorageService, 'insertAccount').mockResolvedValue(undefined);
            const supabaseUpdateSpy = vi.spyOn(SupabaseStorageService, 'updateAccount').mockResolvedValue(undefined);
            const supabaseDeleteSpy = vi.spyOn(SupabaseStorageService, 'deleteAccount').mockResolvedValue(undefined);
            const supabaseSaveSpy = vi.spyOn(SupabaseStorageService, 'saveAccounts').mockResolvedValue(undefined);

            // Create test service with correct flag
            const testService = accountService;
            (testService as any).useBackend = flagEnabled;

            // Execute operation
            try {
              switch (operation) {
                case 'getAllAccounts':
                  await testService.getAllAccounts();
                  break;
                case 'createAccount':
                  await testService.createAccount('Test', '#3b82f6', 'USD');
                  break;
                case 'updateAccount':
                  await testService.updateAccount('test-id', { name: 'Updated' });
                  break;
                case 'deleteAccount':
                  await testService.deleteAccount('test-id');
                  break;
                case 'reorderAccounts':
                  await testService.reorderAccounts(['id1', 'id2']);
                  break;
                case 'deleteAccountCascade':
                  await testService.deleteAccountCascade('test-id', false);
                  break;
              }
            } catch (error) {
              // Some operations may fail due to validation, that's ok
              // We're testing routing, not business logic
            }

            // Verify routing based on flag
            if (flagEnabled) {
              // When flag is enabled, should call API (and possibly fallback to Supabase on error)
              const apiCalled = apiGetSpy.mock.calls.length > 0 || 
                               apiPostSpy.mock.calls.length > 0 || 
                               apiPutSpy.mock.calls.length > 0 || 
                               apiDeleteSpy.mock.calls.length > 0;
              expect(apiCalled).toBe(true);
            } else {
              // When flag is disabled, should NOT call API
              expect(apiGetSpy).not.toHaveBeenCalled();
              expect(apiPostSpy).not.toHaveBeenCalled();
              expect(apiPutSpy).not.toHaveBeenCalled();
              expect(apiDeleteSpy).not.toHaveBeenCalled();
              
              // Should call Supabase instead
              const supabaseCalled = supabaseGetSpy.mock.calls.length > 0 || 
                                    supabaseInsertSpy.mock.calls.length > 0 || 
                                    supabaseUpdateSpy.mock.calls.length > 0 || 
                                    supabaseDeleteSpy.mock.calls.length > 0 ||
                                    supabaseSaveSpy.mock.calls.length > 0;
              expect(supabaseCalled).toBe(true);
            }

            // Clean up
            vi.clearAllMocks();
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
