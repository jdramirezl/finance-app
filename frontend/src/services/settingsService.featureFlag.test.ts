import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { settingsService } from './settingsService';
import { apiClient } from './apiClient';
import { SupabaseStorageService } from './supabaseStorageService';
import { StorageService } from './storageService';
import type { Settings } from '../types';

/**
 * Feature Flag Tests for Settings Service
 * 
 * These tests verify that the feature flag (VITE_USE_BACKEND_SETTINGS) correctly
 * controls routing between backend API and direct Supabase calls, and that
 * fallback to Supabase works when backend fails.
 * 
 * Task: 42.3 Write tests for frontend services
 * - Test backend calls when flag enabled
 * - Test Supabase calls when flag disabled  
 * - Test fallback on backend error
 * 
 * Requirements: 3.1, 3.2, 3.3
 */

describe('settingsService - Feature Flag Integration', () => {
    const mockSettings: Settings = {
        primaryCurrency: 'USD',
        alphaVantageApiKey: 'test-api-key',
    };

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
            vi.stubEnv('VITE_USE_BACKEND_SETTINGS', 'true');
        });

        it('should call backend API for getSettings', async () => {
            const apiSpy = vi.spyOn(apiClient, 'get').mockResolvedValue(mockSettings);
            const supabaseSpy = vi.spyOn(SupabaseStorageService, 'getSettings');

            const result = await settingsService.getSettings();

            expect(apiSpy).toHaveBeenCalledWith('/api/settings');
            expect(supabaseSpy).not.toHaveBeenCalled();
            expect(result).toEqual(mockSettings);
        });

        it('should call backend API for updateSettings', async () => {
            const updates = { primaryCurrency: 'EUR' as const };
            const updatedSettings = { ...mockSettings, ...updates };
            const apiSpy = vi.spyOn(apiClient, 'put').mockResolvedValue(updatedSettings);
            const supabaseSpy = vi.spyOn(SupabaseStorageService, 'saveSettings');

            const result = await settingsService.updateSettings(updates);

            expect(apiSpy).toHaveBeenCalledWith('/api/settings', updates);
            expect(supabaseSpy).not.toHaveBeenCalled();
            expect(result).toEqual(updatedSettings);
        });

        it('should call backend API for getPrimaryCurrency', async () => {
            const apiSpy = vi.spyOn(apiClient, 'get').mockResolvedValue(mockSettings);

            const result = await settingsService.getPrimaryCurrency();

            expect(apiSpy).toHaveBeenCalledWith('/api/settings');
            expect(result).toBe('USD');
        });

        it('should call backend API for setPrimaryCurrency', async () => {
            const updatedSettings = { ...mockSettings, primaryCurrency: 'MXN' as const };
            const apiSpy = vi.spyOn(apiClient, 'put').mockResolvedValue(updatedSettings);

            const result = await settingsService.setPrimaryCurrency('MXN');

            expect(apiSpy).toHaveBeenCalledWith('/api/settings', { primaryCurrency: 'MXN' });
            expect(result.primaryCurrency).toBe('MXN');
        });

        it('should call backend API for getAlphaVantageApiKey', async () => {
            const apiSpy = vi.spyOn(apiClient, 'get').mockResolvedValue(mockSettings);

            const result = await settingsService.getAlphaVantageApiKey();

            expect(apiSpy).toHaveBeenCalledWith('/api/settings');
            expect(result).toBe('test-api-key');
        });

        it('should call backend API for setAlphaVantageApiKey', async () => {
            const updatedSettings = { ...mockSettings, alphaVantageApiKey: 'new-key' };
            const apiSpy = vi.spyOn(apiClient, 'put').mockResolvedValue(updatedSettings);

            const result = await settingsService.setAlphaVantageApiKey('new-key');

            expect(apiSpy).toHaveBeenCalledWith('/api/settings', { alphaVantageApiKey: 'new-key' });
            expect(result.alphaVantageApiKey).toBe('new-key');
        });
    });

    describe('when backend flag is DISABLED', () => {
        beforeEach(() => {
            // Disable backend flag
            vi.stubEnv('VITE_USE_BACKEND_SETTINGS', 'false');
        });

        it('should use direct Supabase calls for getSettings', async () => {
            const apiSpy = vi.spyOn(apiClient, 'get');
            const supabaseSpy = vi.spyOn(SupabaseStorageService, 'getSettings').mockResolvedValue(mockSettings);

            const result = await settingsService.getSettings();

            expect(apiSpy).not.toHaveBeenCalled();
            expect(supabaseSpy).toHaveBeenCalled();
            expect(result).toEqual(mockSettings);
        });

        it('should fallback to localStorage when Supabase returns null', async () => {
            const apiSpy = vi.spyOn(apiClient, 'get');
            vi.spyOn(SupabaseStorageService, 'getSettings').mockResolvedValue(null);
            const localStorageSpy = vi.spyOn(StorageService, 'getSettings').mockReturnValue(mockSettings);

            const result = await settingsService.getSettings();

            expect(apiSpy).not.toHaveBeenCalled();
            expect(localStorageSpy).toHaveBeenCalled();
            expect(result).toEqual(mockSettings);
        });

        it('should use direct Supabase calls for updateSettings', async () => {
            const updates = { primaryCurrency: 'EUR' as const };
            const apiSpy = vi.spyOn(apiClient, 'put');
            vi.spyOn(SupabaseStorageService, 'getSettings').mockResolvedValue(mockSettings);
            const supabaseSaveSpy = vi.spyOn(SupabaseStorageService, 'saveSettings').mockResolvedValue(undefined);
            const localStorageSaveSpy = vi.spyOn(StorageService, 'saveSettings').mockReturnValue(undefined);

            const result = await settingsService.updateSettings(updates);

            expect(apiSpy).not.toHaveBeenCalled();
            expect(supabaseSaveSpy).toHaveBeenCalled();
            expect(localStorageSaveSpy).toHaveBeenCalled();
            expect(result.primaryCurrency).toBe('EUR');
        });

        it('should validate currency when updating settings', async () => {
            const invalidUpdates = { primaryCurrency: 'INVALID' as any };
            vi.spyOn(SupabaseStorageService, 'getSettings').mockResolvedValue(mockSettings);

            await expect(settingsService.updateSettings(invalidUpdates)).rejects.toThrow(
                'Invalid currency: INVALID'
            );
        });
    });

    describe('fallback on backend error', () => {
        beforeEach(() => {
            // Enable backend flag
            vi.stubEnv('VITE_USE_BACKEND_SETTINGS', 'true');
        });

        it('should fallback to Supabase when getSettings fails', async () => {
            const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
            vi.spyOn(apiClient, 'get').mockRejectedValue(new Error('Backend unavailable'));
            const supabaseSpy = vi.spyOn(SupabaseStorageService, 'getSettings').mockResolvedValue(mockSettings);

            const result = await settingsService.getSettings();

            expect(consoleErrorSpy).toHaveBeenCalledWith(
                '❌ Backend API failed, falling back to Supabase:',
                expect.any(Error)
            );
            expect(supabaseSpy).toHaveBeenCalled();
            expect(result).toEqual(mockSettings);
        });

        it('should fallback to Supabase when updateSettings fails', async () => {
            const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
            const updates = { primaryCurrency: 'EUR' as const };
            vi.spyOn(apiClient, 'put').mockRejectedValue(new Error('Backend unavailable'));
            vi.spyOn(SupabaseStorageService, 'getSettings').mockResolvedValue(mockSettings);
            const supabaseSaveSpy = vi.spyOn(SupabaseStorageService, 'saveSettings').mockResolvedValue(undefined);
            vi.spyOn(StorageService, 'saveSettings').mockReturnValue(undefined);

            const result = await settingsService.updateSettings(updates);

            expect(consoleErrorSpy).toHaveBeenCalled();
            expect(supabaseSaveSpy).toHaveBeenCalled();
            expect(result.primaryCurrency).toBe('EUR');
        });

        it('should fallback to Supabase when getPrimaryCurrency fails', async () => {
            const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
            vi.spyOn(apiClient, 'get').mockRejectedValue(new Error('Backend unavailable'));
            vi.spyOn(SupabaseStorageService, 'getSettings').mockResolvedValue(mockSettings);

            const result = await settingsService.getPrimaryCurrency();

            expect(consoleErrorSpy).toHaveBeenCalled();
            expect(result).toBe('USD');
        });

        it('should fallback to Supabase when setPrimaryCurrency fails', async () => {
            const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
            vi.spyOn(apiClient, 'put').mockRejectedValue(new Error('Backend unavailable'));
            vi.spyOn(SupabaseStorageService, 'getSettings').mockResolvedValue(mockSettings);
            vi.spyOn(SupabaseStorageService, 'saveSettings').mockResolvedValue(undefined);
            vi.spyOn(StorageService, 'saveSettings').mockReturnValue(undefined);

            const result = await settingsService.setPrimaryCurrency('MXN');

            expect(consoleErrorSpy).toHaveBeenCalled();
            expect(result.primaryCurrency).toBe('MXN');
        });

        it('should log error message with correct format when backend fails', async () => {
            const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
            const testError = new Error('Network timeout');
            vi.spyOn(apiClient, 'get').mockRejectedValue(testError);
            vi.spyOn(SupabaseStorageService, 'getSettings').mockResolvedValue(mockSettings);

            await settingsService.getSettings();

            expect(consoleErrorSpy).toHaveBeenCalledWith(
                '❌ Backend API failed, falling back to Supabase:',
                testError
            );
        });

        it('should successfully complete operation after fallback', async () => {
            vi.spyOn(console, 'error').mockImplementation(() => {});
            vi.spyOn(apiClient, 'get').mockRejectedValue(new Error('Backend unavailable'));
            vi.spyOn(SupabaseStorageService, 'getSettings').mockResolvedValue(mockSettings);

            const result = await settingsService.getSettings();

            // Verify the operation completed successfully with fallback data
            expect(result).toEqual(mockSettings);
            expect(result.primaryCurrency).toBe('USD');
            expect(result.alphaVantageApiKey).toBe('test-api-key');
        });
    });
});
