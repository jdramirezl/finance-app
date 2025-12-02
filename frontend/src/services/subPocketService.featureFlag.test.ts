import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { subPocketService } from './subPocketService';
import { apiClient } from './apiClient';
import { SupabaseStorageService } from './supabaseStorageService';
import type { SubPocket } from '../types';

/**
 * Feature Flag Tests for SubPocket Service
 * 
 * These tests verify that the feature flag (VITE_USE_BACKEND_SUB_POCKETS) correctly
 * controls routing between backend API and direct Supabase calls, and that
 * fallback to Supabase works when backend fails.
 * 
 * Task: 21.3 Write tests for frontend services
 * - Test backend calls when flag enabled
 * - Test Supabase calls when flag disabled  
 * - Test fallback on backend error
 */

describe('subPocketService - Feature Flag Integration', () => {
    const mockSubPocket: SubPocket = {
        id: 'test-sp-123',
        pocketId: 'test-pocket-123',
        name: 'Internet',
        valueTotal: 1200,
        periodicityMonths: 12,
        balance: 100,
        enabled: true,
        groupId: 'test-group-123',
    };

    const mockSubPockets: SubPocket[] = [mockSubPocket];

    beforeEach(() => {
        vi.clearAllMocks();
        vi.restoreAllMocks();
    });

    afterEach(() => {
        vi.unstubAllEnvs();
    });

    describe('when backend flag is ENABLED', () => {
        beforeEach(() => {
            vi.stubEnv('VITE_USE_BACKEND_SUB_POCKETS', 'true');
        });

        it('should call backend API for getSubPocket', async () => {
            const apiSpy = vi.spyOn(apiClient, 'get').mockResolvedValue(mockSubPocket);
            const supabaseSpy = vi.spyOn(SupabaseStorageService, 'getSubPockets');

            const result = await subPocketService.getSubPocket('test-sp-123');

            expect(apiSpy).toHaveBeenCalledWith('/api/sub-pockets/test-sp-123');
            expect(supabaseSpy).not.toHaveBeenCalled();
            expect(result).toEqual(mockSubPocket);
        });

        it('should call backend API for getSubPocketsByPocket', async () => {
            const apiSpy = vi.spyOn(apiClient, 'get').mockResolvedValue(mockSubPockets);
            const supabaseSpy = vi.spyOn(SupabaseStorageService, 'getSubPockets');

            const result = await subPocketService.getSubPocketsByPocket('test-pocket-123');

            expect(apiSpy).toHaveBeenCalledWith('/api/sub-pockets?pocketId=test-pocket-123');
            expect(supabaseSpy).not.toHaveBeenCalled();
            expect(result).toEqual(mockSubPockets);
        });

        it('should call backend API for getSubPocketsByGroup', async () => {
            const apiSpy = vi.spyOn(apiClient, 'get').mockResolvedValue(mockSubPockets);
            const supabaseSpy = vi.spyOn(SupabaseStorageService, 'getSubPockets');

            const result = await subPocketService.getSubPocketsByGroup('test-group-123');

            expect(apiSpy).toHaveBeenCalledWith('/api/sub-pockets?groupId=test-group-123');
            expect(supabaseSpy).not.toHaveBeenCalled();
            expect(result).toEqual(mockSubPockets);
        });

        it('should call backend API for createSubPocket', async () => {
            const apiSpy = vi.spyOn(apiClient, 'post').mockResolvedValue(mockSubPocket);
            const supabaseSpy = vi.spyOn(SupabaseStorageService, 'insertSubPocket');

            const result = await subPocketService.createSubPocket(
                'test-pocket-123',
                'Internet',
                1200,
                12,
                'test-group-123'
            );

            expect(apiSpy).toHaveBeenCalledWith('/api/sub-pockets', {
                pocketId: 'test-pocket-123',
                name: 'Internet',
                valueTotal: 1200,
                periodicityMonths: 12,
                groupId: 'test-group-123',
            });
            expect(supabaseSpy).not.toHaveBeenCalled();
            expect(result).toEqual(mockSubPocket);
        });

        it('should call backend API for updateSubPocket', async () => {
            const updatedSubPocket = { ...mockSubPocket, name: 'Updated Name' };
            const apiSpy = vi.spyOn(apiClient, 'put').mockResolvedValue(updatedSubPocket);
            const supabaseSpy = vi.spyOn(SupabaseStorageService, 'updateSubPocket');

            const result = await subPocketService.updateSubPocket('test-sp-123', { name: 'Updated Name' });

            expect(apiSpy).toHaveBeenCalledWith('/api/sub-pockets/test-sp-123', { name: 'Updated Name' });
            expect(supabaseSpy).not.toHaveBeenCalled();
            expect(result).toEqual(updatedSubPocket);
        });

        it('should call backend API for deleteSubPocket', async () => {
            const apiSpy = vi.spyOn(apiClient, 'delete').mockResolvedValue(undefined);
            const supabaseSpy = vi.spyOn(SupabaseStorageService, 'deleteSubPocket');

            await subPocketService.deleteSubPocket('test-sp-123');

            expect(apiSpy).toHaveBeenCalledWith('/api/sub-pockets/test-sp-123');
            expect(supabaseSpy).not.toHaveBeenCalled();
        });

        it('should call backend API for toggleSubPocketEnabled', async () => {
            const toggledSubPocket = { ...mockSubPocket, enabled: false };
            const apiSpy = vi.spyOn(apiClient, 'post').mockResolvedValue(toggledSubPocket);
            const supabaseSpy = vi.spyOn(SupabaseStorageService, 'saveSubPockets');

            const result = await subPocketService.toggleSubPocketEnabled('test-sp-123');

            expect(apiSpy).toHaveBeenCalledWith('/api/sub-pockets/test-sp-123/toggle');
            expect(supabaseSpy).not.toHaveBeenCalled();
            expect(result).toEqual(toggledSubPocket);
        });

        it('should call backend API for moveToGroup', async () => {
            const apiSpy = vi.spyOn(apiClient, 'post').mockResolvedValue(undefined);
            const supabaseSpy = vi.spyOn(SupabaseStorageService, 'updateSubPocket');

            await subPocketService.moveToGroup('test-sp-123', 'new-group-123');

            expect(apiSpy).toHaveBeenCalledWith('/api/sub-pockets/test-sp-123/move-to-group', { groupId: 'new-group-123' });
            expect(supabaseSpy).not.toHaveBeenCalled();
        });
    });

    describe('when backend flag is DISABLED', () => {
        beforeEach(() => {
            vi.stubEnv('VITE_USE_BACKEND_SUB_POCKETS', 'false');
        });

        it('should use direct Supabase calls for getSubPocket', async () => {
            const apiSpy = vi.spyOn(apiClient, 'get');
            const supabaseSpy = vi.spyOn(SupabaseStorageService, 'getSubPockets').mockResolvedValue(mockSubPockets);

            const result = await subPocketService.getSubPocket('test-sp-123');

            expect(apiSpy).not.toHaveBeenCalled();
            expect(supabaseSpy).toHaveBeenCalled();
            expect(result).toEqual(mockSubPocket);
        });

        it('should use direct Supabase calls for getSubPocketsByPocket', async () => {
            const apiSpy = vi.spyOn(apiClient, 'get');
            const supabaseSpy = vi.spyOn(SupabaseStorageService, 'getSubPockets').mockResolvedValue(mockSubPockets);

            const result = await subPocketService.getSubPocketsByPocket('test-pocket-123');

            expect(apiSpy).not.toHaveBeenCalled();
            expect(supabaseSpy).toHaveBeenCalled();
            expect(result).toEqual(mockSubPockets);
        });

        it('should use direct Supabase calls for getSubPocketsByGroup', async () => {
            const apiSpy = vi.spyOn(apiClient, 'get');
            const supabaseSpy = vi.spyOn(SupabaseStorageService, 'getSubPockets').mockResolvedValue(mockSubPockets);

            const result = await subPocketService.getSubPocketsByGroup('test-group-123');

            expect(apiSpy).not.toHaveBeenCalled();
            expect(supabaseSpy).toHaveBeenCalled();
            expect(result).toEqual(mockSubPockets);
        });

        it('should use direct Supabase calls for createSubPocket', async () => {
            const apiSpy = vi.spyOn(apiClient, 'post');
            vi.spyOn(SupabaseStorageService, 'getSubPockets').mockResolvedValue([]);
            const insertSpy = vi.spyOn(SupabaseStorageService, 'insertSubPocket').mockResolvedValue(undefined);
            // Mock pocket service
            vi.mock('./pocketService', () => ({
                pocketService: {
                    getPocket: vi.fn().mockResolvedValue({ id: 'test-pocket-123', type: 'fixed' }),
                },
            }));

            const result = await subPocketService.createSubPocket('test-pocket-123', 'Internet', 1200, 12);

            expect(apiSpy).not.toHaveBeenCalled();
            expect(insertSpy).toHaveBeenCalled();
            expect(result.name).toBe('Internet');
        });

        it('should use direct Supabase calls for updateSubPocket', async () => {
            const apiSpy = vi.spyOn(apiClient, 'put');
            vi.spyOn(SupabaseStorageService, 'getSubPockets').mockResolvedValue(mockSubPockets);
            const updateSpy = vi.spyOn(SupabaseStorageService, 'updateSubPocket').mockResolvedValue(undefined);

            const result = await subPocketService.updateSubPocket('test-sp-123', { name: 'Updated Name' });

            expect(apiSpy).not.toHaveBeenCalled();
            expect(updateSpy).toHaveBeenCalled();
            expect(result.name).toBe('Updated Name');
        });

        it('should use direct Supabase calls for deleteSubPocket', async () => {
            const apiSpy = vi.spyOn(apiClient, 'delete');
            vi.spyOn(SupabaseStorageService, 'getSubPockets').mockResolvedValue(mockSubPockets);
            const deleteSpy = vi.spyOn(SupabaseStorageService, 'deleteSubPocket').mockResolvedValue(undefined);

            await subPocketService.deleteSubPocket('test-sp-123');

            expect(apiSpy).not.toHaveBeenCalled();
            expect(deleteSpy).toHaveBeenCalled();
        });

        it('should use direct Supabase calls for toggleSubPocketEnabled', async () => {
            const apiSpy = vi.spyOn(apiClient, 'post');
            vi.spyOn(SupabaseStorageService, 'getSubPockets').mockResolvedValue(mockSubPockets);
            const saveSpy = vi.spyOn(SupabaseStorageService, 'saveSubPockets').mockResolvedValue(undefined);

            const result = await subPocketService.toggleSubPocketEnabled('test-sp-123');

            expect(apiSpy).not.toHaveBeenCalled();
            expect(saveSpy).toHaveBeenCalled();
            expect(result.enabled).toBe(false);
        });

        it('should use direct Supabase calls for moveToGroup', async () => {
            const apiSpy = vi.spyOn(apiClient, 'post');
            vi.spyOn(SupabaseStorageService, 'getSubPockets').mockResolvedValue(mockSubPockets);
            const updateSpy = vi.spyOn(SupabaseStorageService, 'updateSubPocket').mockResolvedValue(undefined);

            await subPocketService.moveToGroup('test-sp-123', 'new-group-123');

            expect(apiSpy).not.toHaveBeenCalled();
            expect(updateSpy).toHaveBeenCalled();
        });
    });

    describe('fallback on backend error', () => {
        beforeEach(() => {
            vi.stubEnv('VITE_USE_BACKEND_SUB_POCKETS', 'true');
        });

        it('should fallback to Supabase when getSubPocket fails', async () => {
            const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
            vi.spyOn(apiClient, 'get').mockRejectedValue(new Error('Backend unavailable'));
            const supabaseSpy = vi.spyOn(SupabaseStorageService, 'getSubPockets').mockResolvedValue(mockSubPockets);

            const result = await subPocketService.getSubPocket('test-sp-123');

            expect(consoleErrorSpy).toHaveBeenCalledWith(
                '❌ Backend API failed, falling back to Supabase:',
                expect.any(Error)
            );
            expect(supabaseSpy).toHaveBeenCalled();
            expect(result).toEqual(mockSubPocket);
        });

        it('should fallback to Supabase when getSubPocketsByPocket fails', async () => {
            const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
            vi.spyOn(apiClient, 'get').mockRejectedValue(new Error('Backend unavailable'));
            const supabaseSpy = vi.spyOn(SupabaseStorageService, 'getSubPockets').mockResolvedValue(mockSubPockets);

            const result = await subPocketService.getSubPocketsByPocket('test-pocket-123');

            expect(consoleErrorSpy).toHaveBeenCalled();
            expect(supabaseSpy).toHaveBeenCalled();
            expect(result).toEqual(mockSubPockets);
        });

        it('should fallback to Supabase when getSubPocketsByGroup fails', async () => {
            const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
            vi.spyOn(apiClient, 'get').mockRejectedValue(new Error('Backend unavailable'));
            const supabaseSpy = vi.spyOn(SupabaseStorageService, 'getSubPockets').mockResolvedValue(mockSubPockets);

            const result = await subPocketService.getSubPocketsByGroup('test-group-123');

            expect(consoleErrorSpy).toHaveBeenCalled();
            expect(supabaseSpy).toHaveBeenCalled();
            expect(result).toEqual(mockSubPockets);
        });

        it('should fallback to Supabase when createSubPocket fails', async () => {
            const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
            vi.spyOn(apiClient, 'post').mockRejectedValue(new Error('Backend unavailable'));
            vi.spyOn(SupabaseStorageService, 'getSubPockets').mockResolvedValue([]);
            const insertSpy = vi.spyOn(SupabaseStorageService, 'insertSubPocket').mockResolvedValue(undefined);
            // Mock pocket service
            vi.mock('./pocketService', () => ({
                pocketService: {
                    getPocket: vi.fn().mockResolvedValue({ id: 'test-pocket-123', type: 'fixed' }),
                },
            }));

            const result = await subPocketService.createSubPocket('test-pocket-123', 'Internet', 1200, 12);

            expect(consoleErrorSpy).toHaveBeenCalled();
            expect(insertSpy).toHaveBeenCalled();
            expect(result.name).toBe('Internet');
        });

        it('should fallback to Supabase when updateSubPocket fails', async () => {
            const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
            vi.spyOn(apiClient, 'put').mockRejectedValue(new Error('Backend unavailable'));
            vi.spyOn(SupabaseStorageService, 'getSubPockets').mockResolvedValue(mockSubPockets);
            const updateSpy = vi.spyOn(SupabaseStorageService, 'updateSubPocket').mockResolvedValue(undefined);

            const result = await subPocketService.updateSubPocket('test-sp-123', { name: 'Updated Name' });

            expect(consoleErrorSpy).toHaveBeenCalled();
            expect(updateSpy).toHaveBeenCalled();
            expect(result.name).toBe('Updated Name');
        });

        it('should fallback to Supabase when deleteSubPocket fails', async () => {
            const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
            vi.spyOn(apiClient, 'delete').mockRejectedValue(new Error('Backend unavailable'));
            vi.spyOn(SupabaseStorageService, 'getSubPockets').mockResolvedValue(mockSubPockets);
            const deleteSpy = vi.spyOn(SupabaseStorageService, 'deleteSubPocket').mockResolvedValue(undefined);

            await subPocketService.deleteSubPocket('test-sp-123');

            expect(consoleErrorSpy).toHaveBeenCalled();
            expect(deleteSpy).toHaveBeenCalled();
        });

        it('should fallback to Supabase when toggleSubPocketEnabled fails', async () => {
            const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
            vi.spyOn(apiClient, 'post').mockRejectedValue(new Error('Backend unavailable'));
            vi.spyOn(SupabaseStorageService, 'getSubPockets').mockResolvedValue(mockSubPockets);
            const saveSpy = vi.spyOn(SupabaseStorageService, 'saveSubPockets').mockResolvedValue(undefined);

            const result = await subPocketService.toggleSubPocketEnabled('test-sp-123');

            expect(consoleErrorSpy).toHaveBeenCalled();
            expect(saveSpy).toHaveBeenCalled();
            expect(result.enabled).toBe(false);
        });

        it('should fallback to Supabase when moveToGroup fails', async () => {
            const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
            vi.spyOn(apiClient, 'post').mockRejectedValue(new Error('Backend unavailable'));
            vi.spyOn(SupabaseStorageService, 'getSubPockets').mockResolvedValue(mockSubPockets);
            const updateSpy = vi.spyOn(SupabaseStorageService, 'updateSubPocket').mockResolvedValue(undefined);

            await subPocketService.moveToGroup('test-sp-123', 'new-group-123');

            expect(consoleErrorSpy).toHaveBeenCalled();
            expect(updateSpy).toHaveBeenCalled();
        });

        it('should successfully complete operation after fallback', async () => {
            vi.spyOn(console, 'error').mockImplementation(() => {});
            vi.spyOn(apiClient, 'get').mockRejectedValue(new Error('Backend unavailable'));
            vi.spyOn(SupabaseStorageService, 'getSubPockets').mockResolvedValue(mockSubPockets);

            const result = await subPocketService.getSubPocketsByPocket('test-pocket-123');

            expect(result).toEqual(mockSubPockets);
            expect(result).toHaveLength(1);
            expect(result[0].name).toBe('Internet');
        });
    });
});
