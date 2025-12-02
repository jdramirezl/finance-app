import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { currencyService } from './currencyService';
import { apiClient } from './apiClient';
// import type { Currency } from '../types';

/**
 * Feature Flag Tests for Currency Service
 * 
 * These tests verify that the feature flag (VITE_USE_BACKEND_CURRENCY) correctly
 * controls routing between backend API and direct Supabase calls, and that
 * fallback to direct implementation works when backend fails.
 * 
 * Task: 42.3 Write tests for frontend services
 * - Test backend calls when flag enabled
 * - Test direct calls when flag disabled  
 * - Test fallback on backend error
 * 
 * Requirements: 3.1, 3.2, 3.3
 */

describe('currencyService - Feature Flag Integration', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.restoreAllMocks();
        // Clear the service's internal cache
        currencyService.clearCache();
    });

    afterEach(() => {
        vi.unstubAllEnvs();
    });

    describe('when backend flag is ENABLED', () => {
        beforeEach(() => {
            // Enable backend flag
            vi.stubEnv('VITE_USE_BACKEND_CURRENCY', 'true');
        });

        it('should call backend API for getExchangeRateAsync', async () => {
            const mockResponse = {
                from: 'USD',
                to: 'MXN',
                rate: 17.5,
                cachedAt: new Date().toISOString(),
            };
            const apiSpy = vi.spyOn(apiClient, 'get').mockResolvedValue(mockResponse);

            const result = await currencyService.getExchangeRateAsync('USD', 'MXN');

            expect(apiSpy).toHaveBeenCalledWith('/api/currency/rates?from=USD&to=MXN');
            expect(result).toBe(17.5);
        });

        it('should return 1 for same currency without calling API', async () => {
            const apiSpy = vi.spyOn(apiClient, 'get');

            const result = await currencyService.getExchangeRateAsync('USD', 'USD');

            expect(apiSpy).not.toHaveBeenCalled();
            expect(result).toBe(1);
        });

        it('should call backend API for convert', async () => {
            const mockResponse = {
                amount: 100,
                converted: 1750,
                rate: 17.5,
            };
            const apiSpy = vi.spyOn(apiClient, 'post').mockResolvedValue(mockResponse);

            const result = await currencyService.convert(100, 'USD', 'MXN');

            expect(apiSpy).toHaveBeenCalledWith('/api/currency/convert', {
                amount: 100,
                fromCurrency: 'USD',
                toCurrency: 'MXN',
            });
            expect(result).toBe(1750);
        });

        it('should handle multiple currency pairs', async () => {
            const mockResponse1 = {
                from: 'USD',
                to: 'EUR',
                rate: 0.92,
                cachedAt: new Date().toISOString(),
            };
            const mockResponse2 = {
                from: 'EUR',
                to: 'GBP',
                rate: 0.86,
                cachedAt: new Date().toISOString(),
            };
            const apiSpy = vi.spyOn(apiClient, 'get')
                .mockResolvedValueOnce(mockResponse1)
                .mockResolvedValueOnce(mockResponse2);

            const rate1 = await currencyService.getExchangeRateAsync('USD', 'EUR');
            const rate2 = await currencyService.getExchangeRateAsync('EUR', 'GBP');

            expect(apiSpy).toHaveBeenCalledTimes(2);
            expect(rate1).toBe(0.92);
            expect(rate2).toBe(0.86);
        });
    });

    describe('when backend flag is DISABLED', () => {
        beforeEach(() => {
            // Disable backend flag
            vi.stubEnv('VITE_USE_BACKEND_CURRENCY', 'false');
        });

        it('should use direct implementation for getExchangeRateAsync', async () => {
            const apiSpy = vi.spyOn(apiClient, 'get');

            const result = await currencyService.getExchangeRateAsync('USD', 'MXN');

            expect(apiSpy).not.toHaveBeenCalled();
            // Should return mock rate or cached rate
            expect(typeof result).toBe('number');
            expect(result).toBeGreaterThan(0);
        });

        it('should use direct implementation for convert', async () => {
            const apiSpy = vi.spyOn(apiClient, 'post');

            const result = await currencyService.convert(100, 'USD', 'MXN');

            expect(apiSpy).not.toHaveBeenCalled();
            // Should return converted amount
            expect(typeof result).toBe('number');
            expect(result).toBeGreaterThan(0);
        });

        it('should return 1 for same currency', async () => {
            const result = await currencyService.getExchangeRateAsync('USD', 'USD');
            expect(result).toBe(1);
        });

        it('should use sync method as fallback', () => {
            const result = currencyService.getExchangeRate('USD', 'MXN');
            expect(typeof result).toBe('number');
            expect(result).toBeGreaterThan(0);
        });
    });

    describe('fallback on backend error', () => {
        beforeEach(() => {
            // Enable backend flag
            vi.stubEnv('VITE_USE_BACKEND_CURRENCY', 'true');
        });

        it('should fallback to direct implementation when getExchangeRateAsync fails', async () => {
            const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
            vi.spyOn(apiClient, 'get').mockRejectedValue(new Error('Backend unavailable'));

            const result = await currencyService.getExchangeRateAsync('USD', 'MXN');

            expect(consoleErrorSpy).toHaveBeenCalledWith(
                '❌ Backend API failed, falling back to direct implementation:',
                expect.any(Error)
            );
            // Should still return a valid rate from fallback
            expect(typeof result).toBe('number');
            expect(result).toBeGreaterThan(0);
        });

        it('should fallback to direct implementation when convert fails', async () => {
            const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
            vi.spyOn(apiClient, 'post').mockRejectedValue(new Error('Backend unavailable'));

            const result = await currencyService.convert(100, 'USD', 'MXN');

            expect(consoleErrorSpy).toHaveBeenCalledWith(
                '❌ Backend API failed, falling back to direct implementation:',
                expect.any(Error)
            );
            // Should still return a valid converted amount from fallback
            expect(typeof result).toBe('number');
            expect(result).toBeGreaterThan(0);
        });

        it('should log error message with correct format when backend fails', async () => {
            const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
            const testError = new Error('Network timeout');
            vi.spyOn(apiClient, 'get').mockRejectedValue(testError);

            await currencyService.getExchangeRateAsync('USD', 'MXN');

            expect(consoleErrorSpy).toHaveBeenCalledWith(
                '❌ Backend API failed, falling back to direct implementation:',
                testError
            );
        });

        it('should successfully complete operation after fallback', async () => {
            vi.spyOn(console, 'error').mockImplementation(() => {});
            vi.spyOn(apiClient, 'get').mockRejectedValue(new Error('Backend unavailable'));

            const result = await currencyService.getExchangeRateAsync('USD', 'MXN');

            // Verify the operation completed successfully with fallback data
            expect(result).toBeGreaterThan(0);
            expect(typeof result).toBe('number');
        });

        it('should handle multiple failures gracefully', async () => {
            vi.spyOn(console, 'error').mockImplementation(() => {});
            vi.spyOn(apiClient, 'get').mockRejectedValue(new Error('Backend unavailable'));

            const result1 = await currencyService.getExchangeRateAsync('USD', 'MXN');
            const result2 = await currencyService.getExchangeRateAsync('USD', 'EUR');

            expect(result1).toBeGreaterThan(0);
            expect(result2).toBeGreaterThan(0);
        });
    });

    describe('currency conversion', () => {
        it('should convert amount correctly using backend', async () => {
            vi.stubEnv('VITE_USE_BACKEND_CURRENCY', 'true');
            const mockResponse = {
                amount: 100,
                converted: 1750,
                rate: 17.5,
            };
            vi.spyOn(apiClient, 'post').mockResolvedValue(mockResponse);

            const result = await currencyService.convert(100, 'USD', 'MXN');

            expect(result).toBe(1750);
        });

        it('should return same amount for same currency', async () => {
            const result = await currencyService.convert(100, 'USD', 'USD');
            expect(result).toBe(100);
        });

        it('should handle decimal amounts', async () => {
            vi.stubEnv('VITE_USE_BACKEND_CURRENCY', 'true');
            const mockResponse = {
                amount: 99.99,
                converted: 1749.825,
                rate: 17.5,
            };
            vi.spyOn(apiClient, 'post').mockResolvedValue(mockResponse);

            const result = await currencyService.convert(99.99, 'USD', 'MXN');

            expect(result).toBe(1749.825);
        });
    });

    describe('sync methods', () => {
        it('should use sync getExchangeRate for backward compatibility', () => {
            const result = currencyService.getExchangeRate('USD', 'MXN');
            expect(typeof result).toBe('number');
            expect(result).toBeGreaterThan(0);
        });

        it('should use sync convertAmount for backward compatibility', () => {
            const result = currencyService.convertAmount(100, 'USD', 'MXN');
            expect(typeof result).toBe('number');
            expect(result).toBeGreaterThan(0);
        });

        it('should format currency correctly', () => {
            const result = currencyService.formatCurrency(1234.56, 'USD');
            expect(result).toContain('1,234.56');
        });
    });
});
