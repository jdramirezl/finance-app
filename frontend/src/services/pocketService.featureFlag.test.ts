import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { pocketService } from './pocketService';
import { apiClient } from './apiClient';
import { SupabaseStorageService } from './supabaseStorageService';
import type { Pocket } from '../types';

/**
 * Feature Flag Tests for Pocket Service
 * 
 * These tests verify that the feature flag (VITE_USE_BACKEND_POCKETS) correctly
 * controls routing between backend API and direct Supabase calls, and that
 * fallback to Supabase works when backend fails.
 * 
 * Task: 13.2 Write tests for frontend service
 * - Test backend calls when flag enabled
 * - Test Supabase calls when flag disabled  
 * - Test fallback on backend error
 */

describe('pocketService - Feature Flag Integration', () => {
    const mockPocket: Pocket = {
        id: 'pocket-id-123',
        accountId: 'account-id-123',
        name: 'Test Pocket',
        type: 'normal',
        balance: 50,
        currency: 'USD',
    };

    const mockPockets: Pocket[] = [mockPocket];

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
            vi.stubEnv('VITE_USE_BACKEND_POCKETS', 'true');
        });

        it('should call backend API for getPocket', async () => {
            const apiSpy = vi.spyOn(apiClient, 'get').mockResolvedValue(mockPocket);
            const supabaseSpy = vi.spyOn(SupabaseStorageService, 'getPockets');

            const result = await pocketService.getPocket('pocket-id-123');

            expect(apiSpy).toHaveBeenCalledWith('/api/pockets/pocket-id-123');
            expect(supabaseSpy).not.toHaveBeenCalled();
            expect(result).toEqual(mockPocket);
        });

        it('should call backend API for getPocketsByAccount', async () => {
            const apiSpy = vi.spyOn(apiClient, 'get').mockResolvedValue(mockPockets);
            const supabaseSpy = vi.spyOn(SupabaseStorageService, 'getPockets');

            const result = await pocketService.getPocketsByAccount('account-id-123');

            expect(apiSpy).toHaveBeenCalledWith('/api/pockets?accountId=account-id-123');
            expect(supabaseSpy).not.toHaveBeenCalled();
            expect(result).toEqual(mockPockets);
        });

        it('should call backend API for createPocket', async () => {
            const apiSpy = vi.spyOn(apiClient, 'post').mockResolvedValue(mockPocket);
            const supabaseSpy = vi.spyOn(SupabaseStorageService, 'insertPocket');

            const result = await pocketService.createPocket('account-id-123', 'Test Pocket', 'normal');

            expect(apiSpy).toHaveBeenCalledWith('/api/pockets', {
                accountId: 'account-id-123',
                name: 'Test Pocket',
                type: 'normal',
            });
            expect(supabaseSpy).not.toHaveBeenCalled();
            expect(result).toEqual(mockPocket);
        });

        it('should call backend API for updatePocket', async () => {
            const updatedPocket = { ...mockPocket, name: 'Updated Name' };
            const apiSpy = vi.spyOn(apiClient, 'put').mockResolvedValue(updatedPocket);
            const supabaseSpy = vi.spyOn(SupabaseStorageService, 'updatePocket');

            const result = await pocketService.updatePocket('pocket-id-123', { name: 'Updated Name' });

            expect(apiSpy).toHaveBeenCalledWith('/api/pockets/pocket-id-123', { name: 'Updated Name' });
            expect(supabaseSpy).not.toHaveBeenCalled();
            expect(result).toEqual(updatedPocket);
        });

        it('should call backend API for deletePocket', async () => {
            const apiSpy = vi.spyOn(apiClient, 'delete').mockResolvedValue(undefined);
            const supabaseSpy = vi.spyOn(SupabaseStorageService, 'deletePocket');

            await pocketService.deletePocket('pocket-id-123');

            expect(apiSpy).toHaveBeenCalledWith('/api/pockets/pocket-id-123');
            expect(supabaseSpy).not.toHaveBeenCalled();
        });

        it('should call backend API for migrateFixedPocketToAccount', async () => {
            const migratedPocket = { ...mockPocket, accountId: 'new-account-id' };
            const apiSpy = vi.spyOn(apiClient, 'post').mockResolvedValue(migratedPocket);
            const supabaseSpy = vi.spyOn(SupabaseStorageService, 'updatePocket');

            const result = await pocketService.migrateFixedPocketToAccount('pocket-id-123', 'new-account-id');

            expect(apiSpy).toHaveBeenCalledWith('/api/pockets/pocket-id-123/migrate', {
                targetAccountId: 'new-account-id',
            });
            expect(supabaseSpy).not.toHaveBeenCalled();
            expect(result).toEqual(migratedPocket);
        });

        it('should call backend API for reorderPockets', async () => {
            const pocketIds = ['id1', 'id2', 'id3'];
            const apiSpy = vi.spyOn(apiClient, 'post').mockResolvedValue(undefined);
            const supabaseSpy = vi.spyOn(SupabaseStorageService, 'savePockets');

            await pocketService.reorderPockets(pocketIds);

            expect(apiSpy).toHaveBeenCalledWith('/api/pockets/reorder', { pocketIds });
            expect(supabaseSpy).not.toHaveBeenCalled();
        });
    });

    describe('when backend flag is DISABLED', () => {
        beforeEach(() => {
            // Disable backend flag
            vi.stubEnv('VITE_USE_BACKEND_POCKETS', 'false');
        });

        it('should use direct Supabase calls for getPocket', async () => {
            const apiSpy = vi.spyOn(apiClient, 'get');
            const supabaseSpy = vi.spyOn(SupabaseStorageService, 'getPockets').mockResolvedValue(mockPockets);

            const result = await pocketService.getPocket('pocket-id-123');

            expect(apiSpy).not.toHaveBeenCalled();
            expect(supabaseSpy).toHaveBeenCalled();
            expect(result).toEqual(mockPocket);
        });

        it('should use direct Supabase calls for getPocketsByAccount', async () => {
            const apiSpy = vi.spyOn(apiClient, 'get');
            const supabaseSpy = vi.spyOn(SupabaseStorageService, 'getPockets').mockResolvedValue(mockPockets);

            const result = await pocketService.getPocketsByAccount('account-id-123');

            expect(apiSpy).not.toHaveBeenCalled();
            expect(supabaseSpy).toHaveBeenCalled();
            expect(result).toEqual(mockPockets);
        });

        it('should use direct Supabase calls for createPocket', async () => {
            const apiSpy = vi.spyOn(apiClient, 'post');
            vi.spyOn(SupabaseStorageService, 'getPockets').mockResolvedValue([]);
            const insertSpy = vi.spyOn(SupabaseStorageService, 'insertPocket').mockResolvedValue(undefined);
            // Mock account service
            vi.mock('./accountService', () => ({
                accountService: {
                    getAccount: vi.fn().mockResolvedValue({
                        id: 'account-id-123',
                        name: 'Test Account',
                        currency: 'USD',
                        type: 'normal',
                    }),
                },
            }));

            const result = await pocketService.createPocket('account-id-123', 'Test Pocket', 'normal');

            expect(apiSpy).not.toHaveBeenCalled();
            expect(insertSpy).toHaveBeenCalled();
            expect(result.name).toBe('Test Pocket');
            expect(result.type).toBe('normal');
        });

        it('should use direct Supabase calls for updatePocket', async () => {
            const apiSpy = vi.spyOn(apiClient, 'put');
            vi.spyOn(SupabaseStorageService, 'getPockets').mockResolvedValue(mockPockets);
            const updateSpy = vi.spyOn(SupabaseStorageService, 'updatePocket').mockResolvedValue(undefined);
            // Mock sub-pocket service
            vi.mock('./subPocketService', () => ({
                subPocketService: {
                    getSubPocketsByPocket: vi.fn().mockResolvedValue([]),
                },
            }));

            const result = await pocketService.updatePocket('pocket-id-123', { name: 'Updated Name' });

            expect(apiSpy).not.toHaveBeenCalled();
            expect(updateSpy).toHaveBeenCalled();
            expect(result.name).toBe('Updated Name');
        });

        it('should use direct Supabase calls for deletePocket', async () => {
            const apiSpy = vi.spyOn(apiClient, 'delete');
            vi.spyOn(SupabaseStorageService, 'getPockets').mockResolvedValue(mockPockets);
            const deleteSpy = vi.spyOn(SupabaseStorageService, 'deletePocket').mockResolvedValue(undefined);
            // Mock sub-pocket service
            vi.mock('./subPocketService', () => ({
                subPocketService: {
                    getSubPocketsByPocket: vi.fn().mockResolvedValue([]),
                },
            }));

            await pocketService.deletePocket('pocket-id-123');

            expect(apiSpy).not.toHaveBeenCalled();
            expect(deleteSpy).toHaveBeenCalled();
        });
    });

    describe('fallback on backend error', () => {
        beforeEach(() => {
            // Enable backend flag
            vi.stubEnv('VITE_USE_BACKEND_POCKETS', 'true');
        });

        it('should fallback to Supabase when getPocket fails', async () => {
            const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
            vi.spyOn(apiClient, 'get').mockRejectedValue(new Error('Backend unavailable'));
            const supabaseSpy = vi.spyOn(SupabaseStorageService, 'getPockets').mockResolvedValue(mockPockets);

            const result = await pocketService.getPocket('pocket-id-123');

            expect(consoleErrorSpy).toHaveBeenCalledWith(
                '❌ Backend API failed, falling back to Supabase:',
                expect.any(Error)
            );
            expect(supabaseSpy).toHaveBeenCalled();
            expect(result).toEqual(mockPocket);
        });

        it('should fallback to Supabase when getPocketsByAccount fails', async () => {
            const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
            vi.spyOn(apiClient, 'get').mockRejectedValue(new Error('Backend unavailable'));
            const supabaseSpy = vi.spyOn(SupabaseStorageService, 'getPockets').mockResolvedValue(mockPockets);

            const result = await pocketService.getPocketsByAccount('account-id-123');

            expect(consoleErrorSpy).toHaveBeenCalled();
            expect(supabaseSpy).toHaveBeenCalled();
            expect(result).toEqual(mockPockets);
        });

        it('should fallback to Supabase when createPocket fails', async () => {
            const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
            vi.spyOn(apiClient, 'post').mockRejectedValue(new Error('Backend unavailable'));
            vi.spyOn(SupabaseStorageService, 'getPockets').mockResolvedValue([]);
            const insertSpy = vi.spyOn(SupabaseStorageService, 'insertPocket').mockResolvedValue(undefined);
            // Mock account service
            vi.mock('./accountService', () => ({
                accountService: {
                    getAccount: vi.fn().mockResolvedValue({
                        id: 'account-id-123',
                        name: 'Test Account',
                        currency: 'USD',
                        type: 'normal',
                    }),
                },
            }));

            const result = await pocketService.createPocket('account-id-123', 'Test Pocket', 'normal');

            expect(consoleErrorSpy).toHaveBeenCalled();
            expect(insertSpy).toHaveBeenCalled();
            expect(result.name).toBe('Test Pocket');
        });

        it('should fallback to Supabase when updatePocket fails', async () => {
            const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
            vi.spyOn(apiClient, 'put').mockRejectedValue(new Error('Backend unavailable'));
            vi.spyOn(SupabaseStorageService, 'getPockets').mockResolvedValue(mockPockets);
            const updateSpy = vi.spyOn(SupabaseStorageService, 'updatePocket').mockResolvedValue(undefined);
            // Mock sub-pocket service
            vi.mock('./subPocketService', () => ({
                subPocketService: {
                    getSubPocketsByPocket: vi.fn().mockResolvedValue([]),
                },
            }));

            const result = await pocketService.updatePocket('pocket-id-123', { name: 'Updated Name' });

            expect(consoleErrorSpy).toHaveBeenCalled();
            expect(updateSpy).toHaveBeenCalled();
            expect(result.name).toBe('Updated Name');
        });

        it('should fallback to Supabase when deletePocket fails', async () => {
            const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
            vi.spyOn(apiClient, 'delete').mockRejectedValue(new Error('Backend unavailable'));
            vi.spyOn(SupabaseStorageService, 'getPockets').mockResolvedValue(mockPockets);
            const deleteSpy = vi.spyOn(SupabaseStorageService, 'deletePocket').mockResolvedValue(undefined);
            // Mock sub-pocket service
            vi.mock('./subPocketService', () => ({
                subPocketService: {
                    getSubPocketsByPocket: vi.fn().mockResolvedValue([]),
                },
            }));

            await pocketService.deletePocket('pocket-id-123');

            expect(consoleErrorSpy).toHaveBeenCalled();
            expect(deleteSpy).toHaveBeenCalled();
        });

        it('should fallback to Supabase when migrateFixedPocketToAccount fails', async () => {
            const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
            const fixedPocket = { ...mockPocket, type: 'fixed' as const };
            vi.spyOn(apiClient, 'post').mockRejectedValue(new Error('Backend unavailable'));
            vi.spyOn(SupabaseStorageService, 'getPockets').mockResolvedValue([fixedPocket]);
            const updateSpy = vi.spyOn(SupabaseStorageService, 'updatePocket').mockResolvedValue(undefined);
            // Mock account service
            vi.mock('./accountService', () => ({
                accountService: {
                    getAccount: vi.fn().mockResolvedValue({
                        id: 'new-account-id',
                        name: 'New Account',
                        currency: 'USD',
                        type: 'normal',
                    }),
                },
            }));
            // Mock movement service
            vi.mock('./movementService', () => ({
                movementService: {
                    updateMovementsAccountForPocket: vi.fn().mockResolvedValue(0),
                },
            }));

            const result = await pocketService.migrateFixedPocketToAccount('pocket-id-123', 'new-account-id');

            expect(consoleErrorSpy).toHaveBeenCalled();
            expect(updateSpy).toHaveBeenCalled();
            expect(result.accountId).toBe('new-account-id');
        });

        it('should fallback to Supabase when reorderPockets fails', async () => {
            const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
            const pocketIds = ['id1', 'id2', 'id3'];
            vi.spyOn(apiClient, 'post').mockRejectedValue(new Error('Backend unavailable'));
            vi.spyOn(SupabaseStorageService, 'getPockets').mockResolvedValue(mockPockets);
            const saveSpy = vi.spyOn(SupabaseStorageService, 'savePockets').mockResolvedValue(undefined);

            await pocketService.reorderPockets(pocketIds);

            expect(consoleErrorSpy).toHaveBeenCalled();
            expect(saveSpy).toHaveBeenCalled();
        });

        it('should log error message with correct format when backend fails', async () => {
            const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
            const testError = new Error('Network timeout');
            vi.spyOn(apiClient, 'get').mockRejectedValue(testError);
            vi.spyOn(SupabaseStorageService, 'getPockets').mockResolvedValue(mockPockets);

            await pocketService.getPocket('pocket-id-123');

            expect(consoleErrorSpy).toHaveBeenCalledWith(
                '❌ Backend API failed, falling back to Supabase:',
                testError
            );
        });

        it('should successfully complete operation after fallback', async () => {
            vi.spyOn(console, 'error').mockImplementation(() => {});
            vi.spyOn(apiClient, 'get').mockRejectedValue(new Error('Backend unavailable'));
            vi.spyOn(SupabaseStorageService, 'getPockets').mockResolvedValue(mockPockets);

            const result = await pocketService.getPocketsByAccount('account-id-123');

            // Verify the operation completed successfully with fallback data
            expect(result).toEqual(mockPockets);
            expect(result).toHaveLength(1);
            expect(result[0].name).toBe('Test Pocket');
        });
    });
});
