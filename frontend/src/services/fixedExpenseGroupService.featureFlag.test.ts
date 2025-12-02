import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { fixedExpenseGroupService } from './fixedExpenseGroupService';
import { apiClient } from './apiClient';
import { supabase } from '../lib/supabase';
import type { FixedExpenseGroup } from '../types';

/**
 * Feature Flag Tests for FixedExpenseGroup Service
 * 
 * These tests verify that the feature flag (VITE_USE_BACKEND_FIXED_EXPENSE_GROUPS) correctly
 * controls routing between backend API and direct Supabase calls, and that
 * fallback to Supabase works when backend fails.
 * 
 * Task: 21.3 Write tests for frontend services
 * - Test backend calls when flag enabled
 * - Test Supabase calls when flag disabled  
 * - Test fallback on backend error
 */

describe('fixedExpenseGroupService - Feature Flag Integration', () => {
    const mockGroup: FixedExpenseGroup = {
        id: 'test-group-123',
        name: 'Test Group',
        color: '#FF0000',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
    };

    const mockGroups: FixedExpenseGroup[] = [mockGroup];

    beforeEach(() => {
        vi.clearAllMocks();
        vi.restoreAllMocks();
    });

    afterEach(() => {
        vi.unstubAllEnvs();
    });

    describe('when backend flag is ENABLED', () => {
        beforeEach(() => {
            vi.stubEnv('VITE_USE_BACKEND_FIXED_EXPENSE_GROUPS', 'true');
        });

        it('should call backend API for getAll', async () => {
            const apiSpy = vi.spyOn(apiClient, 'get').mockResolvedValue(mockGroups);
            const supabaseSpy = vi.spyOn(supabase, 'from');

            const result = await fixedExpenseGroupService.getAll();

            expect(apiSpy).toHaveBeenCalledWith('/api/fixed-expense-groups');
            expect(supabaseSpy).not.toHaveBeenCalled();
            expect(result).toEqual(mockGroups);
        });

        it('should call backend API for getById', async () => {
            const apiSpy = vi.spyOn(apiClient, 'get').mockResolvedValue(mockGroup);
            const supabaseSpy = vi.spyOn(supabase, 'from');

            const result = await fixedExpenseGroupService.getById('test-group-123');

            expect(apiSpy).toHaveBeenCalledWith('/api/fixed-expense-groups/test-group-123');
            expect(supabaseSpy).not.toHaveBeenCalled();
            expect(result).toEqual(mockGroup);
        });

        it('should call backend API for create', async () => {
            const apiSpy = vi.spyOn(apiClient, 'post').mockResolvedValue(mockGroup);
            const supabaseSpy = vi.spyOn(supabase, 'from');

            const result = await fixedExpenseGroupService.create('Test Group', '#FF0000');

            expect(apiSpy).toHaveBeenCalledWith('/api/fixed-expense-groups', {
                name: 'Test Group',
                color: '#FF0000',
            });
            expect(supabaseSpy).not.toHaveBeenCalled();
            expect(result).toEqual(mockGroup);
        });

        it('should call backend API for update', async () => {
            const apiSpy = vi.spyOn(apiClient, 'put').mockResolvedValue(undefined);
            const supabaseSpy = vi.spyOn(supabase, 'from');

            await fixedExpenseGroupService.update('test-group-123', 'Updated Name', '#00FF00');

            expect(apiSpy).toHaveBeenCalledWith('/api/fixed-expense-groups/test-group-123', {
                name: 'Updated Name',
                color: '#00FF00',
            });
            expect(supabaseSpy).not.toHaveBeenCalled();
        });

        it('should call backend API for delete', async () => {
            const apiSpy = vi.spyOn(apiClient, 'delete').mockResolvedValue(undefined);
            const supabaseSpy = vi.spyOn(supabase, 'from');

            await fixedExpenseGroupService.delete('test-group-123');

            expect(apiSpy).toHaveBeenCalledWith('/api/fixed-expense-groups/test-group-123');
            expect(supabaseSpy).not.toHaveBeenCalled();
        });
    });

    describe('when backend flag is DISABLED', () => {
        beforeEach(() => {
            vi.stubEnv('VITE_USE_BACKEND_FIXED_EXPENSE_GROUPS', 'false');
        });

        it('should use direct Supabase calls for getAll', async () => {
            const apiSpy = vi.spyOn(apiClient, 'get');
            const mockSupabaseResponse = {
                data: [{
                    id: 'test-group-123',
                    name: 'Test Group',
                    color: '#FF0000',
                    created_at: '2024-01-01T00:00:00Z',
                    updated_at: '2024-01-01T00:00:00Z',
                }],
                error: null,
            };
            const supabaseSpy = vi.spyOn(supabase, 'from').mockReturnValue({
                select: vi.fn().mockReturnValue({
                    order: vi.fn().mockResolvedValue(mockSupabaseResponse),
                }),
            } as any);

            const result = await fixedExpenseGroupService.getAll();

            expect(apiSpy).not.toHaveBeenCalled();
            expect(supabaseSpy).toHaveBeenCalledWith('fixed_expense_groups');
            expect(result).toHaveLength(1);
            expect(result[0].name).toBe('Test Group');
        });

        it('should use direct Supabase calls for getById', async () => {
            const apiSpy = vi.spyOn(apiClient, 'get');
            const mockSupabaseResponse = {
                data: {
                    id: 'test-group-123',
                    name: 'Test Group',
                    color: '#FF0000',
                    created_at: '2024-01-01T00:00:00Z',
                    updated_at: '2024-01-01T00:00:00Z',
                },
                error: null,
            };
            const supabaseSpy = vi.spyOn(supabase, 'from').mockReturnValue({
                select: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                        single: vi.fn().mockResolvedValue(mockSupabaseResponse),
                    }),
                }),
            } as any);

            const result = await fixedExpenseGroupService.getById('test-group-123');

            expect(apiSpy).not.toHaveBeenCalled();
            expect(supabaseSpy).toHaveBeenCalledWith('fixed_expense_groups');
            expect(result?.name).toBe('Test Group');
        });

        it('should use direct Supabase calls for create', async () => {
            const apiSpy = vi.spyOn(apiClient, 'post');
            const mockSupabaseResponse = {
                data: {
                    id: 'test-group-123',
                    name: 'Test Group',
                    color: '#FF0000',
                    created_at: '2024-01-01T00:00:00Z',
                    updated_at: '2024-01-01T00:00:00Z',
                },
                error: null,
            };
            const supabaseSpy = vi.spyOn(supabase, 'from').mockReturnValue({
                insert: vi.fn().mockReturnValue({
                    select: vi.fn().mockReturnValue({
                        single: vi.fn().mockResolvedValue(mockSupabaseResponse),
                    }),
                }),
            } as any);

            const result = await fixedExpenseGroupService.create('Test Group', '#FF0000');

            expect(apiSpy).not.toHaveBeenCalled();
            expect(supabaseSpy).toHaveBeenCalledWith('fixed_expense_groups');
            expect(result.name).toBe('Test Group');
        });

        it('should use direct Supabase calls for update', async () => {
            const apiSpy = vi.spyOn(apiClient, 'put');
            const mockSupabaseResponse = { error: null };
            const supabaseSpy = vi.spyOn(supabase, 'from').mockReturnValue({
                update: vi.fn().mockReturnValue({
                    eq: vi.fn().mockResolvedValue(mockSupabaseResponse),
                }),
            } as any);

            await fixedExpenseGroupService.update('test-group-123', 'Updated Name', '#00FF00');

            expect(apiSpy).not.toHaveBeenCalled();
            expect(supabaseSpy).toHaveBeenCalledWith('fixed_expense_groups');
        });

        it('should use direct Supabase calls for delete', async () => {
            const apiSpy = vi.spyOn(apiClient, 'delete');
            const mockSupabaseResponse = { error: null };
            const supabaseSpy = vi.spyOn(supabase, 'from').mockReturnValue({
                update: vi.fn().mockReturnValue({
                    eq: vi.fn().mockResolvedValue(mockSupabaseResponse),
                }),
                delete: vi.fn().mockReturnValue({
                    eq: vi.fn().mockResolvedValue(mockSupabaseResponse),
                }),
            } as any);

            await fixedExpenseGroupService.delete('test-group-123');

            expect(apiSpy).not.toHaveBeenCalled();
            expect(supabaseSpy).toHaveBeenCalledWith('sub_pockets');
            expect(supabaseSpy).toHaveBeenCalledWith('fixed_expense_groups');
        });
    });

    describe('fallback on backend error', () => {
        beforeEach(() => {
            vi.stubEnv('VITE_USE_BACKEND_FIXED_EXPENSE_GROUPS', 'true');
        });

        it('should fallback to Supabase when getAll fails', async () => {
            const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
            vi.spyOn(apiClient, 'get').mockRejectedValue(new Error('Backend unavailable'));
            const mockSupabaseResponse = {
                data: [{
                    id: 'test-group-123',
                    name: 'Test Group',
                    color: '#FF0000',
                    created_at: '2024-01-01T00:00:00Z',
                    updated_at: '2024-01-01T00:00:00Z',
                }],
                error: null,
            };
            const supabaseSpy = vi.spyOn(supabase, 'from').mockReturnValue({
                select: vi.fn().mockReturnValue({
                    order: vi.fn().mockResolvedValue(mockSupabaseResponse),
                }),
            } as any);

            const result = await fixedExpenseGroupService.getAll();

            expect(consoleErrorSpy).toHaveBeenCalledWith(
                '❌ Backend API failed, falling back to Supabase:',
                expect.any(Error)
            );
            expect(supabaseSpy).toHaveBeenCalled();
            expect(result).toHaveLength(1);
            expect(result[0].name).toBe('Test Group');
        });

        it('should fallback to Supabase when getById fails', async () => {
            const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
            vi.spyOn(apiClient, 'get').mockRejectedValue(new Error('Backend unavailable'));
            const mockSupabaseResponse = {
                data: {
                    id: 'test-group-123',
                    name: 'Test Group',
                    color: '#FF0000',
                    created_at: '2024-01-01T00:00:00Z',
                    updated_at: '2024-01-01T00:00:00Z',
                },
                error: null,
            };
            const supabaseSpy = vi.spyOn(supabase, 'from').mockReturnValue({
                select: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                        single: vi.fn().mockResolvedValue(mockSupabaseResponse),
                    }),
                }),
            } as any);

            const result = await fixedExpenseGroupService.getById('test-group-123');

            expect(consoleErrorSpy).toHaveBeenCalled();
            expect(supabaseSpy).toHaveBeenCalled();
            expect(result?.name).toBe('Test Group');
        });

        it('should fallback to Supabase when create fails', async () => {
            const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
            vi.spyOn(apiClient, 'post').mockRejectedValue(new Error('Backend unavailable'));
            const mockSupabaseResponse = {
                data: {
                    id: 'test-group-123',
                    name: 'Test Group',
                    color: '#FF0000',
                    created_at: '2024-01-01T00:00:00Z',
                    updated_at: '2024-01-01T00:00:00Z',
                },
                error: null,
            };
            const supabaseSpy = vi.spyOn(supabase, 'from').mockReturnValue({
                insert: vi.fn().mockReturnValue({
                    select: vi.fn().mockReturnValue({
                        single: vi.fn().mockResolvedValue(mockSupabaseResponse),
                    }),
                }),
            } as any);

            const result = await fixedExpenseGroupService.create('Test Group', '#FF0000');

            expect(consoleErrorSpy).toHaveBeenCalled();
            expect(supabaseSpy).toHaveBeenCalled();
            expect(result.name).toBe('Test Group');
        });

        it('should fallback to Supabase when update fails', async () => {
            const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
            vi.spyOn(apiClient, 'put').mockRejectedValue(new Error('Backend unavailable'));
            const mockSupabaseResponse = { error: null };
            const supabaseSpy = vi.spyOn(supabase, 'from').mockReturnValue({
                update: vi.fn().mockReturnValue({
                    eq: vi.fn().mockResolvedValue(mockSupabaseResponse),
                }),
            } as any);

            await fixedExpenseGroupService.update('test-group-123', 'Updated Name', '#00FF00');

            expect(consoleErrorSpy).toHaveBeenCalled();
            expect(supabaseSpy).toHaveBeenCalled();
        });

        it('should fallback to Supabase when delete fails', async () => {
            const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
            vi.spyOn(apiClient, 'delete').mockRejectedValue(new Error('Backend unavailable'));
            const mockSupabaseResponse = { error: null };
            const supabaseSpy = vi.spyOn(supabase, 'from').mockReturnValue({
                update: vi.fn().mockReturnValue({
                    eq: vi.fn().mockResolvedValue(mockSupabaseResponse),
                }),
                delete: vi.fn().mockReturnValue({
                    eq: vi.fn().mockResolvedValue(mockSupabaseResponse),
                }),
            } as any);

            await fixedExpenseGroupService.delete('test-group-123');

            expect(consoleErrorSpy).toHaveBeenCalled();
            expect(supabaseSpy).toHaveBeenCalled();
        });

        it('should successfully complete operation after fallback', async () => {
            vi.spyOn(console, 'error').mockImplementation(() => {});
            vi.spyOn(apiClient, 'get').mockRejectedValue(new Error('Backend unavailable'));
            const mockSupabaseResponse = {
                data: [{
                    id: 'test-group-123',
                    name: 'Test Group',
                    color: '#FF0000',
                    created_at: '2024-01-01T00:00:00Z',
                    updated_at: '2024-01-01T00:00:00Z',
                }],
                error: null,
            };
            vi.spyOn(supabase, 'from').mockReturnValue({
                select: vi.fn().mockReturnValue({
                    order: vi.fn().mockResolvedValue(mockSupabaseResponse),
                }),
            } as any);

            const result = await fixedExpenseGroupService.getAll();

            expect(result).toHaveLength(1);
            expect(result[0].name).toBe('Test Group');
        });
    });
});
