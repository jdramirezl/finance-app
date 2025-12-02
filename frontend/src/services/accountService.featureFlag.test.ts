import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { accountService } from './accountService';
import { apiClient } from './apiClient';
import { SupabaseStorageService } from './supabaseStorageService';
import type { Account } from '../types';

/**
 * Feature Flag Tests for Account Service
 * 
 * These tests verify that the feature flag (VITE_USE_BACKEND_ACCOUNTS) correctly
 * controls routing between backend API and direct Supabase calls, and that
 * fallback to Supabase works when backend fails.
 * 
 * Task: 6.3 Write unit tests for frontend service
 * - Test backend calls when flag enabled
 * - Test Supabase calls when flag disabled  
 * - Test fallback on backend error
 */

describe('accountService - Feature Flag Integration', () => {
    const mockAccount: Account = {
        id: 'test-id-123',
        name: 'Test Account',
        color: '#FF0000',
        currency: 'USD',
        balance: 100,
        type: 'normal',
    };

    const mockAccounts: Account[] = [mockAccount];

    beforeEach(() => {
        vi.clearAllMocks();
        vi.restoreAllMocks();
    });

    afterEach(() => {
        vi.unstubAllEnvs();
    });

    describe('when backend flag is ENABLED', () => {
        beforeEach(() => {
            // Enable backend flag
            vi.stubEnv('VITE_USE_BACKEND_ACCOUNTS', 'true');
            // Force re-evaluation of the flag by creating a new instance
            // Note: In real implementation, the flag is read once at class instantiation
        });

        it('should call backend API for getAllAccounts', async () => {
            const apiSpy = vi.spyOn(apiClient, 'get').mockResolvedValue(mockAccounts);
            const supabaseSpy = vi.spyOn(SupabaseStorageService, 'getAccounts');

            const result = await accountService.getAllAccounts();

            expect(apiSpy).toHaveBeenCalledWith('/api/accounts');
            expect(supabaseSpy).not.toHaveBeenCalled();
            expect(result).toEqual(mockAccounts);
        });

        it('should call backend API for getAccount', async () => {
            const apiSpy = vi.spyOn(apiClient, 'get').mockResolvedValue(mockAccount);
            const supabaseSpy = vi.spyOn(SupabaseStorageService, 'getAccounts');

            const result = await accountService.getAccount('test-id-123');

            expect(apiSpy).toHaveBeenCalledWith('/api/accounts/test-id-123');
            expect(supabaseSpy).not.toHaveBeenCalled();
            expect(result).toEqual(mockAccount);
        });

        it('should call backend API for createAccount', async () => {
            const apiSpy = vi.spyOn(apiClient, 'post').mockResolvedValue(mockAccount);
            const supabaseSpy = vi.spyOn(SupabaseStorageService, 'insertAccount');

            const result = await accountService.createAccount('Test Account', '#FF0000', 'USD');

            expect(apiSpy).toHaveBeenCalledWith('/api/accounts', {
                name: 'Test Account',
                color: '#FF0000',
                currency: 'USD',
                type: 'normal',
                stockSymbol: undefined,
            });
            expect(supabaseSpy).not.toHaveBeenCalled();
            expect(result).toEqual(mockAccount);
        });

        it('should call backend API for updateAccount', async () => {
            const updatedAccount = { ...mockAccount, name: 'Updated Name' };
            const apiSpy = vi.spyOn(apiClient, 'put').mockResolvedValue(updatedAccount);
            const supabaseSpy = vi.spyOn(SupabaseStorageService, 'updateAccount');

            const result = await accountService.updateAccount('test-id-123', { name: 'Updated Name' });

            expect(apiSpy).toHaveBeenCalledWith('/api/accounts/test-id-123', { name: 'Updated Name' });
            expect(supabaseSpy).not.toHaveBeenCalled();
            expect(result).toEqual(updatedAccount);
        });

        it('should call backend API for deleteAccount', async () => {
            const apiSpy = vi.spyOn(apiClient, 'delete').mockResolvedValue(undefined);
            const supabaseSpy = vi.spyOn(SupabaseStorageService, 'deleteAccount');

            await accountService.deleteAccount('test-id-123');

            expect(apiSpy).toHaveBeenCalledWith('/api/accounts/test-id-123');
            expect(supabaseSpy).not.toHaveBeenCalled();
        });

        it('should call backend API for deleteAccountCascade', async () => {
            const cascadeResult = {
                account: 'Test Account',
                pockets: 2,
                subPockets: 3,
                movements: 10,
            };
            const apiSpy = vi.spyOn(apiClient, 'post').mockResolvedValue(cascadeResult);
            const supabaseSpy = vi.spyOn(SupabaseStorageService, 'deleteAccount');

            const result = await accountService.deleteAccountCascade('test-id-123', true);

            expect(apiSpy).toHaveBeenCalledWith('/api/accounts/test-id-123/cascade', { deleteMovements: true });
            expect(supabaseSpy).not.toHaveBeenCalled();
            expect(result).toEqual(cascadeResult);
        });

        it('should call backend API for reorderAccounts', async () => {
            const accountIds = ['id1', 'id2', 'id3'];
            const apiSpy = vi.spyOn(apiClient, 'post').mockResolvedValue(undefined);
            const supabaseSpy = vi.spyOn(SupabaseStorageService, 'saveAccounts');

            await accountService.reorderAccounts(accountIds);

            expect(apiSpy).toHaveBeenCalledWith('/api/accounts/reorder', { accountIds });
            expect(supabaseSpy).not.toHaveBeenCalled();
        });
    });

    describe('when backend flag is DISABLED', () => {
        beforeEach(() => {
            // Disable backend flag
            vi.stubEnv('VITE_USE_BACKEND_ACCOUNTS', 'false');
        });

        it('should use direct Supabase calls for getAllAccounts', async () => {
            const apiSpy = vi.spyOn(apiClient, 'get');
            const supabaseSpy = vi.spyOn(SupabaseStorageService, 'getAccounts').mockResolvedValue(mockAccounts);

            const result = await accountService.getAllAccounts();

            expect(apiSpy).not.toHaveBeenCalled();
            expect(supabaseSpy).toHaveBeenCalled();
            expect(result).toEqual(mockAccounts);
        });

        it('should use direct Supabase calls for getAccount', async () => {
            const apiSpy = vi.spyOn(apiClient, 'get');
            const supabaseSpy = vi.spyOn(SupabaseStorageService, 'getAccounts').mockResolvedValue(mockAccounts);

            const result = await accountService.getAccount('test-id-123');

            expect(apiSpy).not.toHaveBeenCalled();
            expect(supabaseSpy).toHaveBeenCalled();
            expect(result).toEqual(mockAccount);
        });

        it('should use direct Supabase calls for createAccount', async () => {
            const apiSpy = vi.spyOn(apiClient, 'post');
            vi.spyOn(SupabaseStorageService, 'getAccounts').mockResolvedValue([]);
            const insertSpy = vi.spyOn(SupabaseStorageService, 'insertAccount').mockResolvedValue(undefined);

            const result = await accountService.createAccount('Test Account', '#FF0000', 'USD');

            expect(apiSpy).not.toHaveBeenCalled();
            expect(insertSpy).toHaveBeenCalled();
            expect(result.name).toBe('Test Account');
            expect(result.color).toBe('#FF0000');
            expect(result.currency).toBe('USD');
        });

        it('should use direct Supabase calls for updateAccount', async () => {
            const apiSpy = vi.spyOn(apiClient, 'put');
            vi.spyOn(SupabaseStorageService, 'getAccounts').mockResolvedValue(mockAccounts);
            const updateSpy = vi.spyOn(SupabaseStorageService, 'updateAccount').mockResolvedValue(undefined);
            // Mock pocket service to avoid circular dependency issues
            vi.mock('./pocketService', () => ({
                pocketService: {
                    getPocketsByAccount: vi.fn().mockResolvedValue([]),
                    getAllPockets: vi.fn().mockResolvedValue([]),
                },
            }));

            const result = await accountService.updateAccount('test-id-123', { name: 'Updated Name' });

            expect(apiSpy).not.toHaveBeenCalled();
            expect(updateSpy).toHaveBeenCalled();
            expect(result.name).toBe('Updated Name');
        });

        it('should use direct Supabase calls for deleteAccount', async () => {
            const apiSpy = vi.spyOn(apiClient, 'delete');
            vi.spyOn(SupabaseStorageService, 'getAccounts').mockResolvedValue(mockAccounts);
            const deleteSpy = vi.spyOn(SupabaseStorageService, 'deleteAccount').mockResolvedValue(undefined);
            // Mock pocket service
            vi.mock('./pocketService', () => ({
                pocketService: {
                    getPocketsByAccount: vi.fn().mockResolvedValue([]),
                },
            }));

            await accountService.deleteAccount('test-id-123');

            expect(apiSpy).not.toHaveBeenCalled();
            expect(deleteSpy).toHaveBeenCalled();
        });
    });

    describe('fallback on backend error', () => {
        beforeEach(() => {
            // Enable backend flag
            vi.stubEnv('VITE_USE_BACKEND_ACCOUNTS', 'true');
        });

        it('should fallback to Supabase when getAllAccounts fails', async () => {
            const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
            vi.spyOn(apiClient, 'get').mockRejectedValue(new Error('Backend unavailable'));
            const supabaseSpy = vi.spyOn(SupabaseStorageService, 'getAccounts').mockResolvedValue(mockAccounts);

            const result = await accountService.getAllAccounts();

            expect(consoleErrorSpy).toHaveBeenCalledWith(
                'Backend API failed, falling back to Supabase:',
                expect.any(Error)
            );
            expect(supabaseSpy).toHaveBeenCalled();
            expect(result).toEqual(mockAccounts);
        });

        it('should fallback to Supabase when getAccount fails', async () => {
            const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
            vi.spyOn(apiClient, 'get').mockRejectedValue(new Error('Backend unavailable'));
            const supabaseSpy = vi.spyOn(SupabaseStorageService, 'getAccounts').mockResolvedValue(mockAccounts);

            const result = await accountService.getAccount('test-id-123');

            expect(consoleErrorSpy).toHaveBeenCalled();
            expect(supabaseSpy).toHaveBeenCalled();
            expect(result).toEqual(mockAccount);
        });

        it('should fallback to Supabase when createAccount fails', async () => {
            const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
            vi.spyOn(apiClient, 'post').mockRejectedValue(new Error('Backend unavailable'));
            vi.spyOn(SupabaseStorageService, 'getAccounts').mockResolvedValue([]);
            const insertSpy = vi.spyOn(SupabaseStorageService, 'insertAccount').mockResolvedValue(undefined);

            const result = await accountService.createAccount('Test Account', '#FF0000', 'USD');

            expect(consoleErrorSpy).toHaveBeenCalled();
            expect(insertSpy).toHaveBeenCalled();
            expect(result.name).toBe('Test Account');
        });

        it('should fallback to Supabase when updateAccount fails', async () => {
            const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
            vi.spyOn(apiClient, 'put').mockRejectedValue(new Error('Backend unavailable'));
            vi.spyOn(SupabaseStorageService, 'getAccounts').mockResolvedValue(mockAccounts);
            const updateSpy = vi.spyOn(SupabaseStorageService, 'updateAccount').mockResolvedValue(undefined);
            // Mock pocket service
            vi.mock('./pocketService', () => ({
                pocketService: {
                    getPocketsByAccount: vi.fn().mockResolvedValue([]),
                    getAllPockets: vi.fn().mockResolvedValue([]),
                },
            }));

            const result = await accountService.updateAccount('test-id-123', { name: 'Updated Name' });

            expect(consoleErrorSpy).toHaveBeenCalled();
            expect(updateSpy).toHaveBeenCalled();
            expect(result.name).toBe('Updated Name');
        });

        it('should fallback to Supabase when deleteAccount fails', async () => {
            const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
            vi.spyOn(apiClient, 'delete').mockRejectedValue(new Error('Backend unavailable'));
            vi.spyOn(SupabaseStorageService, 'getAccounts').mockResolvedValue(mockAccounts);
            const deleteSpy = vi.spyOn(SupabaseStorageService, 'deleteAccount').mockResolvedValue(undefined);
            // Mock pocket service
            vi.mock('./pocketService', () => ({
                pocketService: {
                    getPocketsByAccount: vi.fn().mockResolvedValue([]),
                },
            }));

            await accountService.deleteAccount('test-id-123');

            expect(consoleErrorSpy).toHaveBeenCalled();
            expect(deleteSpy).toHaveBeenCalled();
        });

        it('should fallback to Supabase when deleteAccountCascade fails', async () => {
            const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
            vi.spyOn(apiClient, 'post').mockRejectedValue(new Error('Backend unavailable'));
            vi.spyOn(SupabaseStorageService, 'getAccounts').mockResolvedValue(mockAccounts);
            const deleteSpy = vi.spyOn(SupabaseStorageService, 'deleteAccount').mockResolvedValue(undefined);
            // Mock all required services
            vi.mock('./pocketService', () => ({
                pocketService: {
                    getPocketsByAccount: vi.fn().mockResolvedValue([]),
                },
            }));
            vi.mock('./subPocketService', () => ({
                subPocketService: {
                    getSubPocketsByPocket: vi.fn().mockResolvedValue([]),
                    deleteSubPocket: vi.fn().mockResolvedValue(undefined),
                },
            }));
            vi.mock('./movementService', () => ({
                movementService: {
                    markMovementsAsOrphaned: vi.fn().mockResolvedValue(0),
                    deleteMovementsByPocket: vi.fn().mockResolvedValue(0),
                    deleteMovementsByAccount: vi.fn().mockResolvedValue(0),
                },
            }));

            const result = await accountService.deleteAccountCascade('test-id-123', false);

            expect(consoleErrorSpy).toHaveBeenCalled();
            expect(deleteSpy).toHaveBeenCalled();
            expect(result.account).toBe('Test Account');
        });

        it('should fallback to Supabase when reorderAccounts fails', async () => {
            const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
            const accountIds = ['id1', 'id2', 'id3'];
            vi.spyOn(apiClient, 'post').mockRejectedValue(new Error('Backend unavailable'));
            vi.spyOn(SupabaseStorageService, 'getAccounts').mockResolvedValue(mockAccounts);
            const saveSpy = vi.spyOn(SupabaseStorageService, 'saveAccounts').mockResolvedValue(undefined);

            await accountService.reorderAccounts(accountIds);

            expect(consoleErrorSpy).toHaveBeenCalled();
            expect(saveSpy).toHaveBeenCalled();
        });

        it('should log error message with correct format when backend fails', async () => {
            const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
            const testError = new Error('Network timeout');
            vi.spyOn(apiClient, 'get').mockRejectedValue(testError);
            vi.spyOn(SupabaseStorageService, 'getAccounts').mockResolvedValue(mockAccounts);

            await accountService.getAllAccounts();

            expect(consoleErrorSpy).toHaveBeenCalledWith(
                'Backend API failed, falling back to Supabase:',
                testError
            );
        });

        it('should successfully complete operation after fallback', async () => {
            vi.spyOn(console, 'error').mockImplementation(() => {});
            vi.spyOn(apiClient, 'get').mockRejectedValue(new Error('Backend unavailable'));
            vi.spyOn(SupabaseStorageService, 'getAccounts').mockResolvedValue(mockAccounts);

            const result = await accountService.getAllAccounts();

            // Verify the operation completed successfully with fallback data
            expect(result).toEqual(mockAccounts);
            expect(result).toHaveLength(1);
            expect(result[0].name).toBe('Test Account');
        });
    });
});
