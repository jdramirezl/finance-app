import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { movementService } from './movementService';
import { apiClient } from './apiClient';
import { SupabaseStorageService } from './supabaseStorageService';
import type { Movement } from '../types';

/**
 * Feature Flag Tests for Movement Service
 * 
 * These tests verify that the feature flag (VITE_USE_BACKEND_MOVEMENTS) correctly
 * controls routing between backend API and direct Supabase calls, and that
 * fallback to Supabase works when backend fails.
 * 
 * Task: 28.2 Write tests for frontend service
 * - Test backend calls when flag enabled
 * - Test Supabase calls when flag disabled  
 * - Test fallback on backend error
 */

describe('movementService - Feature Flag Integration', () => {
    const mockMovement: Movement = {
        id: 'test-movement-123',
        type: 'IngresoNormal',
        accountId: 'account-123',
        pocketId: 'pocket-123',
        amount: 500,
        notes: 'Test movement',
        displayedDate: '2024-01-15T00:00:00.000Z',
        createdAt: '2024-01-15T00:00:00.000Z',
        isPending: false,
    };

    const mockMovements: Movement[] = [mockMovement];

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
            vi.stubEnv('VITE_USE_BACKEND_MOVEMENTS', 'true');
        });

        it('should call backend API for createMovement', async () => {
            const apiSpy = vi.spyOn(apiClient, 'post').mockResolvedValue(mockMovement);
            const supabaseSpy = vi.spyOn(SupabaseStorageService, 'insertMovement');

            const result = await movementService.createMovement(
                'IngresoNormal',
                'account-123',
                'pocket-123',
                500,
                'Test movement'
            );

            expect(apiSpy).toHaveBeenCalledWith('/api/movements', {
                type: 'IngresoNormal',
                accountId: 'account-123',
                pocketId: 'pocket-123',
                amount: 500,
                notes: 'Test movement',
                displayedDate: undefined,
                subPocketId: undefined,
                isPending: undefined,
            });
            expect(supabaseSpy).not.toHaveBeenCalled();
            expect(result).toEqual(mockMovement);
        });

        it('should call backend API for updateMovement', async () => {
            const updatedMovement = { ...mockMovement, amount: 600 };
            const apiSpy = vi.spyOn(apiClient, 'put').mockResolvedValue(updatedMovement);
            const supabaseSpy = vi.spyOn(SupabaseStorageService, 'updateMovement');

            const result = await movementService.updateMovement('test-movement-123', { amount: 600 });

            expect(apiSpy).toHaveBeenCalledWith('/api/movements/test-movement-123', { amount: 600 });
            expect(supabaseSpy).not.toHaveBeenCalled();
            expect(result).toEqual(updatedMovement);
        });

        it('should call backend API for deleteMovement', async () => {
            const apiSpy = vi.spyOn(apiClient, 'delete').mockResolvedValue(undefined);
            const supabaseSpy = vi.spyOn(SupabaseStorageService, 'deleteMovement');

            await movementService.deleteMovement('test-movement-123');

            expect(apiSpy).toHaveBeenCalledWith('/api/movements/test-movement-123');
            expect(supabaseSpy).not.toHaveBeenCalled();
        });

        it('should call backend API for getPendingMovements', async () => {
            const apiSpy = vi.spyOn(apiClient, 'get').mockResolvedValue(mockMovements);
            const supabaseSpy = vi.spyOn(SupabaseStorageService, 'getMovements');

            const result = await movementService.getPendingMovements();

            expect(apiSpy).toHaveBeenCalledWith('/api/movements/pending');
            expect(supabaseSpy).not.toHaveBeenCalled();
            expect(result).toEqual(mockMovements);
        });

        it('should call backend API for getOrphanedMovements', async () => {
            const apiSpy = vi.spyOn(apiClient, 'get').mockResolvedValue(mockMovements);
            const supabaseSpy = vi.spyOn(SupabaseStorageService, 'getMovements');

            const result = await movementService.getOrphanedMovements();

            expect(apiSpy).toHaveBeenCalledWith('/api/movements/orphaned');
            expect(supabaseSpy).not.toHaveBeenCalled();
            expect(result).toEqual(mockMovements);
        });

        it('should call backend API for applyPendingMovement', async () => {
            const appliedMovement = { ...mockMovement, isPending: false };
            const apiSpy = vi.spyOn(apiClient, 'post').mockResolvedValue(appliedMovement);
            const supabaseSpy = vi.spyOn(SupabaseStorageService, 'updateMovement');

            const result = await movementService.applyPendingMovement('test-movement-123');

            expect(apiSpy).toHaveBeenCalledWith('/api/movements/test-movement-123/apply', {});
            expect(supabaseSpy).not.toHaveBeenCalled();
            expect(result).toEqual(appliedMovement);
        });

        it('should call backend API for markAsPending', async () => {
            const pendingMovement = { ...mockMovement, isPending: true };
            const apiSpy = vi.spyOn(apiClient, 'post').mockResolvedValue(pendingMovement);
            const supabaseSpy = vi.spyOn(SupabaseStorageService, 'updateMovement');

            const result = await movementService.markAsPending('test-movement-123');

            expect(apiSpy).toHaveBeenCalledWith('/api/movements/test-movement-123/mark-pending', {});
            expect(supabaseSpy).not.toHaveBeenCalled();
            expect(result).toEqual(pendingMovement);
        });

        it('should call backend API for getMovementsByAccount', async () => {
            const apiSpy = vi.spyOn(apiClient, 'get').mockResolvedValue(mockMovements);
            const supabaseSpy = vi.spyOn(SupabaseStorageService, 'getMovements');

            const result = await movementService.getMovementsByAccount('account-123');

            expect(apiSpy).toHaveBeenCalledWith('/api/movements?accountId=account-123');
            expect(supabaseSpy).not.toHaveBeenCalled();
            expect(result).toEqual(mockMovements);
        });

        it('should call backend API for getMovementsByPocket', async () => {
            const apiSpy = vi.spyOn(apiClient, 'get').mockResolvedValue(mockMovements);
            const supabaseSpy = vi.spyOn(SupabaseStorageService, 'getMovements');

            const result = await movementService.getMovementsByPocket('pocket-123');

            expect(apiSpy).toHaveBeenCalledWith('/api/movements?pocketId=pocket-123');
            expect(supabaseSpy).not.toHaveBeenCalled();
            expect(result).toEqual(mockMovements);
        });

        it('should call backend API for getMovementsByMonth', async () => {
            const apiSpy = vi.spyOn(apiClient, 'get').mockResolvedValue(mockMovements);
            const supabaseSpy = vi.spyOn(SupabaseStorageService, 'getMovements');

            const result = await movementService.getMovementsByMonth(2024, 1);

            expect(apiSpy).toHaveBeenCalledWith('/api/movements?year=2024&month=1');
            expect(supabaseSpy).not.toHaveBeenCalled();
            expect(result).toEqual(mockMovements);
        });

        it('should call backend API for restoreAllOrphanedMovements', async () => {
            const restoreResult = { restored: 5, failed: 2 };
            const apiSpy = vi.spyOn(apiClient, 'post').mockResolvedValue(restoreResult);

            const result = await movementService.restoreAllOrphanedMovements();

            expect(apiSpy).toHaveBeenCalledWith('/api/movements/restore-orphaned', {});
            expect(result).toEqual(restoreResult);
        });
    });

    describe('when backend flag is DISABLED', () => {
        beforeEach(() => {
            // Disable backend flag
            vi.stubEnv('VITE_USE_BACKEND_MOVEMENTS', 'false');
        });

        it('should use direct Supabase calls for createMovement', async () => {
            const apiSpy = vi.spyOn(apiClient, 'post');
            const insertSpy = vi.spyOn(SupabaseStorageService, 'insertMovement').mockResolvedValue(undefined);
            
            // Mock dependencies
            vi.mock('./accountService', () => ({
                accountService: {
                    getAccount: vi.fn().mockResolvedValue({ id: 'account-123', type: 'normal' }),
                },
            }));
            vi.mock('./pocketService', () => ({
                pocketService: {
                    getPocket: vi.fn().mockResolvedValue({ id: 'pocket-123' }),
                },
            }));

            const result = await movementService.createMovement(
                'IngresoNormal',
                'account-123',
                'pocket-123',
                500,
                'Test movement'
            );

            expect(apiSpy).not.toHaveBeenCalled();
            expect(insertSpy).toHaveBeenCalled();
            expect(result.type).toBe('IngresoNormal');
            expect(result.amount).toBe(500);
        });

        it('should use direct Supabase calls for getPendingMovements', async () => {
            const apiSpy = vi.spyOn(apiClient, 'get');
            const supabaseSpy = vi.spyOn(SupabaseStorageService, 'getMovements').mockResolvedValue(mockMovements);

            const result = await movementService.getPendingMovements();

            expect(apiSpy).not.toHaveBeenCalled();
            expect(supabaseSpy).toHaveBeenCalled();
            expect(result).toEqual(mockMovements);
        });

        it('should use direct Supabase calls for getOrphanedMovements', async () => {
            const apiSpy = vi.spyOn(apiClient, 'get');
            const supabaseSpy = vi.spyOn(SupabaseStorageService, 'getMovements').mockResolvedValue(mockMovements);

            const result = await movementService.getOrphanedMovements();

            expect(apiSpy).not.toHaveBeenCalled();
            expect(supabaseSpy).toHaveBeenCalled();
            expect(result).toEqual(mockMovements);
        });

        it('should use direct Supabase calls for getMovementsByAccount', async () => {
            const apiSpy = vi.spyOn(apiClient, 'get');
            const supabaseSpy = vi.spyOn(SupabaseStorageService, 'getMovements').mockResolvedValue(mockMovements);

            const result = await movementService.getMovementsByAccount('account-123');

            expect(apiSpy).not.toHaveBeenCalled();
            expect(supabaseSpy).toHaveBeenCalled();
            expect(result).toEqual(mockMovements);
        });

        it('should use direct Supabase calls for getMovementsByPocket', async () => {
            const apiSpy = vi.spyOn(apiClient, 'get');
            const supabaseSpy = vi.spyOn(SupabaseStorageService, 'getMovements').mockResolvedValue(mockMovements);

            const result = await movementService.getMovementsByPocket('pocket-123');

            expect(apiSpy).not.toHaveBeenCalled();
            expect(supabaseSpy).toHaveBeenCalled();
            expect(result).toEqual(mockMovements);
        });

        it('should use direct Supabase calls for getMovementsByMonth', async () => {
            const apiSpy = vi.spyOn(apiClient, 'get');
            const supabaseSpy = vi.spyOn(SupabaseStorageService, 'getMovements').mockResolvedValue(mockMovements);

            const result = await movementService.getMovementsByMonth(2024, 1);

            expect(apiSpy).not.toHaveBeenCalled();
            expect(supabaseSpy).toHaveBeenCalled();
            expect(result).toEqual(mockMovements);
        });
    });

    describe('fallback on backend error', () => {
        beforeEach(() => {
            // Enable backend flag
            vi.stubEnv('VITE_USE_BACKEND_MOVEMENTS', 'true');
        });

        it('should fallback to Supabase when createMovement fails', async () => {
            const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
            vi.spyOn(apiClient, 'post').mockRejectedValue(new Error('Backend unavailable'));
            const insertSpy = vi.spyOn(SupabaseStorageService, 'insertMovement').mockResolvedValue(undefined);
            
            // Mock dependencies
            vi.mock('./accountService', () => ({
                accountService: {
                    getAccount: vi.fn().mockResolvedValue({ id: 'account-123', type: 'normal' }),
                },
            }));
            vi.mock('./pocketService', () => ({
                pocketService: {
                    getPocket: vi.fn().mockResolvedValue({ id: 'pocket-123' }),
                },
            }));

            const result = await movementService.createMovement(
                'IngresoNormal',
                'account-123',
                'pocket-123',
                500,
                'Test movement'
            );

            expect(consoleErrorSpy).toHaveBeenCalledWith(
                '❌ Backend API failed, falling back to Supabase:',
                expect.any(Error)
            );
            expect(insertSpy).toHaveBeenCalled();
            expect(result.type).toBe('IngresoNormal');
        });

        it('should fallback to Supabase when updateMovement fails', async () => {
            const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
            vi.spyOn(apiClient, 'put').mockRejectedValue(new Error('Backend unavailable'));
            vi.spyOn(SupabaseStorageService, 'getMovements').mockResolvedValue(mockMovements);
            const updateSpy = vi.spyOn(SupabaseStorageService, 'updateMovement').mockResolvedValue(undefined);
            
            // Mock dependencies
            vi.mock('./accountService', () => ({
                accountService: {
                    getAccount: vi.fn().mockResolvedValue({ id: 'account-123', type: 'normal' }),
                },
            }));

            const result = await movementService.updateMovement('test-movement-123', { amount: 600 });

            expect(consoleErrorSpy).toHaveBeenCalled();
            expect(updateSpy).toHaveBeenCalled();
            expect(result.amount).toBe(600);
        });

        it('should fallback to Supabase when deleteMovement fails', async () => {
            const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
            vi.spyOn(apiClient, 'delete').mockRejectedValue(new Error('Backend unavailable'));
            vi.spyOn(SupabaseStorageService, 'getMovements').mockResolvedValue(mockMovements);
            const deleteSpy = vi.spyOn(SupabaseStorageService, 'deleteMovement').mockResolvedValue(undefined);
            
            // Mock dependencies
            vi.mock('./accountService', () => ({
                accountService: {
                    getAccount: vi.fn().mockResolvedValue({ id: 'account-123', type: 'normal' }),
                },
            }));

            await movementService.deleteMovement('test-movement-123');

            expect(consoleErrorSpy).toHaveBeenCalled();
            expect(deleteSpy).toHaveBeenCalled();
        });

        it('should fallback to Supabase when getPendingMovements fails', async () => {
            const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
            vi.spyOn(apiClient, 'get').mockRejectedValue(new Error('Backend unavailable'));
            const supabaseSpy = vi.spyOn(SupabaseStorageService, 'getMovements').mockResolvedValue(mockMovements);

            const result = await movementService.getPendingMovements();

            expect(consoleErrorSpy).toHaveBeenCalled();
            expect(supabaseSpy).toHaveBeenCalled();
            expect(result).toEqual(mockMovements);
        });

        it('should fallback to Supabase when getOrphanedMovements fails', async () => {
            const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
            vi.spyOn(apiClient, 'get').mockRejectedValue(new Error('Backend unavailable'));
            const supabaseSpy = vi.spyOn(SupabaseStorageService, 'getMovements').mockResolvedValue(mockMovements);

            const result = await movementService.getOrphanedMovements();

            expect(consoleErrorSpy).toHaveBeenCalled();
            expect(supabaseSpy).toHaveBeenCalled();
            expect(result).toEqual(mockMovements);
        });

        it('should fallback to Supabase when applyPendingMovement fails', async () => {
            const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
            vi.spyOn(apiClient, 'post').mockRejectedValue(new Error('Backend unavailable'));
            vi.spyOn(SupabaseStorageService, 'getMovements').mockResolvedValue(mockMovements);
            const updateSpy = vi.spyOn(SupabaseStorageService, 'updateMovement').mockResolvedValue(undefined);
            
            // Mock dependencies
            vi.mock('./accountService', () => ({
                accountService: {
                    getAccount: vi.fn().mockResolvedValue({ id: 'account-123', type: 'normal' }),
                },
            }));

            const result = await movementService.applyPendingMovement('test-movement-123');

            expect(consoleErrorSpy).toHaveBeenCalled();
            expect(updateSpy).toHaveBeenCalled();
            expect(result.isPending).toBe(false);
        });

        it('should fallback to Supabase when markAsPending fails', async () => {
            const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
            vi.spyOn(apiClient, 'post').mockRejectedValue(new Error('Backend unavailable'));
            vi.spyOn(SupabaseStorageService, 'getMovements').mockResolvedValue(mockMovements);
            const updateSpy = vi.spyOn(SupabaseStorageService, 'updateMovement').mockResolvedValue(undefined);
            
            // Mock dependencies
            vi.mock('./accountService', () => ({
                accountService: {
                    getAccount: vi.fn().mockResolvedValue({ id: 'account-123', type: 'normal' }),
                },
            }));

            const result = await movementService.markAsPending('test-movement-123');

            expect(consoleErrorSpy).toHaveBeenCalled();
            expect(updateSpy).toHaveBeenCalled();
            expect(result.isPending).toBe(true);
        });

        it('should fallback to Supabase when getMovementsByAccount fails', async () => {
            const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
            vi.spyOn(apiClient, 'get').mockRejectedValue(new Error('Backend unavailable'));
            const supabaseSpy = vi.spyOn(SupabaseStorageService, 'getMovements').mockResolvedValue(mockMovements);

            const result = await movementService.getMovementsByAccount('account-123');

            expect(consoleErrorSpy).toHaveBeenCalled();
            expect(supabaseSpy).toHaveBeenCalled();
            expect(result).toEqual(mockMovements);
        });

        it('should fallback to Supabase when getMovementsByPocket fails', async () => {
            const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
            vi.spyOn(apiClient, 'get').mockRejectedValue(new Error('Backend unavailable'));
            const supabaseSpy = vi.spyOn(SupabaseStorageService, 'getMovements').mockResolvedValue(mockMovements);

            const result = await movementService.getMovementsByPocket('pocket-123');

            expect(consoleErrorSpy).toHaveBeenCalled();
            expect(supabaseSpy).toHaveBeenCalled();
            expect(result).toEqual(mockMovements);
        });

        it('should fallback to Supabase when getMovementsByMonth fails', async () => {
            const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
            vi.spyOn(apiClient, 'get').mockRejectedValue(new Error('Backend unavailable'));
            const supabaseSpy = vi.spyOn(SupabaseStorageService, 'getMovements').mockResolvedValue(mockMovements);

            const result = await movementService.getMovementsByMonth(2024, 1);

            expect(consoleErrorSpy).toHaveBeenCalled();
            expect(supabaseSpy).toHaveBeenCalled();
            expect(result).toEqual(mockMovements);
        });

        it('should log error message with correct format when backend fails', async () => {
            const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
            const testError = new Error('Network timeout');
            vi.spyOn(apiClient, 'get').mockRejectedValue(testError);
            vi.spyOn(SupabaseStorageService, 'getMovements').mockResolvedValue(mockMovements);

            await movementService.getPendingMovements();

            expect(consoleErrorSpy).toHaveBeenCalledWith(
                'Backend API failed, falling back to Supabase:',
                testError
            );
        });

        it('should successfully complete operation after fallback', async () => {
            vi.spyOn(console, 'error').mockImplementation(() => {});
            vi.spyOn(apiClient, 'get').mockRejectedValue(new Error('Backend unavailable'));
            vi.spyOn(SupabaseStorageService, 'getMovements').mockResolvedValue(mockMovements);

            const result = await movementService.getPendingMovements();

            // Verify the operation completed successfully with fallback data
            expect(result).toEqual(mockMovements);
            expect(result).toHaveLength(1);
            expect(result[0].type).toBe('IngresoNormal');
        });
    });
});
