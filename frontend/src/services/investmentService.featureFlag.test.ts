import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { apiClient } from './apiClient';
import { supabase } from '../lib/supabase';

/**
 * Feature Flag Tests for Investment Service
 * 
 * These tests verify that the feature flag (VITE_USE_BACKEND_INVESTMENTS) correctly
 * controls routing between backend API and direct Supabase calls, and that
 * fallback to direct implementation works when backend fails.
 * 
 * Task: 35.2 Write tests for frontend service
 * - Test backend calls when flag enabled
 * - Test direct calls when flag disabled  
 * - Test fallback on backend error
 */

// Mock supabase to avoid real database calls
vi.mock('../lib/supabase', () => ({
    supabase: {
        from: vi.fn(() => ({
            select: vi.fn(() => ({
                eq: vi.fn(() => ({
                    single: vi.fn(() => Promise.resolve({ data: null, error: null })),
                    order: vi.fn(() => ({
                        limit: vi.fn(() => Promise.resolve({ data: [], error: null })),
                    })),
                })),
                gte: vi.fn(() => ({
                    order: vi.fn(() => ({
                        limit: vi.fn(() => Promise.resolve({ data: [], error: null })),
                    })),
                })),
            })),
            insert: vi.fn(() => Promise.resolve({ error: null })),
            upsert: vi.fn(() => Promise.resolve({ error: null })),
        })),
    },
}));

describe('investmentService - Feature Flag Integration', () => {
    const mockSymbol = 'VOO';
    const mockPrice = 450.25;
    const mockCachedAt = new Date('2024-01-15T10:00:00Z');

    const mockBackendResponse = {
        symbol: mockSymbol,
        price: mockPrice,
        cachedAt: mockCachedAt.toISOString(),
    };

    beforeEach(() => {
        vi.clearAllMocks();
        // Clear localStorage cache
        localStorage.clear();
        // Mock global fetch for Vercel API
        global.fetch = vi.fn();
        // Clear module cache to allow re-importing with new env vars
        vi.resetModules();
    });

    afterEach(() => {
        vi.unstubAllEnvs();
        vi.restoreAllMocks();
    });

    describe('when backend flag is ENABLED', () => {
        it('should call backend API for getCurrentPrice', async () => {
            // Enable backend flag before importing
            vi.stubEnv('VITE_USE_BACKEND_INVESTMENTS', 'true');
            const { investmentService } = await import('./investmentService');
            
            const apiSpy = vi.spyOn(apiClient, 'get').mockResolvedValue(mockBackendResponse);

            const result = await investmentService.getCurrentPrice(mockSymbol);

            expect(apiSpy).toHaveBeenCalledWith(`/api/investments/prices/${mockSymbol}`);
            expect(result).toBe(mockPrice);
        });

        it('should cache the price locally after backend call', async () => {
            vi.stubEnv('VITE_USE_BACKEND_INVESTMENTS', 'true');
            const { investmentService } = await import('./investmentService');
            
            vi.spyOn(apiClient, 'get').mockResolvedValue(mockBackendResponse);

            await investmentService.getCurrentPrice(mockSymbol);

            // Check that price was cached
            const timestamp = investmentService.getPriceTimestamp(mockSymbol);
            expect(timestamp).toBe(mockCachedAt.getTime());
        });

        it('should log backend API usage', async () => {
            vi.stubEnv('VITE_USE_BACKEND_INVESTMENTS', 'true');
            const { investmentService } = await import('./investmentService');
            
            const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
            vi.spyOn(apiClient, 'get').mockResolvedValue(mockBackendResponse);

            await investmentService.getCurrentPrice(mockSymbol);

            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining('Backend API: GET /api/investments/prices/')
            );
        });
    });

    describe('when backend flag is DISABLED', () => {
        it('should use direct implementation for getCurrentPrice', async () => {
            vi.stubEnv('VITE_USE_BACKEND_INVESTMENTS', 'false');
            const { investmentService } = await import('./investmentService');
            
            const apiSpy = vi.spyOn(apiClient, 'get');
            
            // Mock the Vercel API endpoint that the direct implementation uses
            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                json: async () => ({
                    symbol: mockSymbol,
                    price: mockPrice,
                    currency: 'USD',
                    marketState: 'REGULAR',
                    lastUpdated: mockCachedAt.toISOString(),
                }),
            });

            const result = await investmentService.getCurrentPrice(mockSymbol);

            expect(apiSpy).not.toHaveBeenCalled();
            expect(result).toBe(mockPrice);
        });

        it('should not call backend API when flag is disabled', async () => {
            vi.stubEnv('VITE_USE_BACKEND_INVESTMENTS', 'false');
            const { investmentService } = await import('./investmentService');
            
            const apiSpy = vi.spyOn(apiClient, 'get');
            
            // Mock the Vercel API
            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                json: async () => ({
                    symbol: mockSymbol,
                    price: mockPrice,
                    currency: 'USD',
                    marketState: 'REGULAR',
                    lastUpdated: mockCachedAt.toISOString(),
                }),
            });

            await investmentService.getCurrentPrice(mockSymbol);

            expect(apiSpy).not.toHaveBeenCalled();
        });
    });

    describe('fallback on backend error', () => {
        it('should fallback to direct implementation when backend fails', async () => {
            vi.stubEnv('VITE_USE_BACKEND_INVESTMENTS', 'true');
            const { investmentService } = await import('./investmentService');
            
            const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
            vi.spyOn(apiClient, 'get').mockRejectedValue(new Error('Backend unavailable'));
            
            // Mock the Vercel API for fallback
            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                json: async () => ({
                    symbol: mockSymbol,
                    price: mockPrice,
                    currency: 'USD',
                    marketState: 'REGULAR',
                    lastUpdated: mockCachedAt.toISOString(),
                }),
            });

            const result = await investmentService.getCurrentPrice(mockSymbol);

            expect(consoleErrorSpy).toHaveBeenCalledWith(
                expect.stringContaining('Backend API failed'),
                expect.any(Error)
            );
            expect(result).toBe(mockPrice);
        });

        it('should log error message with correct format when backend fails', async () => {
            vi.stubEnv('VITE_USE_BACKEND_INVESTMENTS', 'true');
            const { investmentService } = await import('./investmentService');
            
            const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
            const testError = new Error('Network timeout');
            vi.spyOn(apiClient, 'get').mockRejectedValue(testError);
            
            // Mock the Vercel API for fallback
            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                json: async () => ({
                    symbol: mockSymbol,
                    price: mockPrice,
                    currency: 'USD',
                    marketState: 'REGULAR',
                    lastUpdated: mockCachedAt.toISOString(),
                }),
            });

            await investmentService.getCurrentPrice(mockSymbol);

            expect(consoleErrorSpy).toHaveBeenCalledWith(
                expect.stringContaining('Backend API failed, falling back to direct implementation:'),
                testError
            );
        });

        it('should successfully complete operation after fallback', async () => {
            vi.stubEnv('VITE_USE_BACKEND_INVESTMENTS', 'true');
            const { investmentService } = await import('./investmentService');
            
            vi.spyOn(console, 'error').mockImplementation(() => {});
            vi.spyOn(apiClient, 'get').mockRejectedValue(new Error('Backend unavailable'));
            
            // Mock the Vercel API for fallback
            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                json: async () => ({
                    symbol: mockSymbol,
                    price: mockPrice,
                    currency: 'USD',
                    marketState: 'REGULAR',
                    lastUpdated: mockCachedAt.toISOString(),
                }),
            });

            const result = await investmentService.getCurrentPrice(mockSymbol);

            // Verify the operation completed successfully with fallback data
            expect(result).toBe(mockPrice);
            expect(typeof result).toBe('number');
            expect(result).toBeGreaterThan(0);
        });

        it('should cache price after successful fallback', async () => {
            vi.stubEnv('VITE_USE_BACKEND_INVESTMENTS', 'true');
            const { investmentService } = await import('./investmentService');
            
            vi.spyOn(console, 'error').mockImplementation(() => {});
            vi.spyOn(apiClient, 'get').mockRejectedValue(new Error('Backend unavailable'));
            
            // Mock the Vercel API for fallback
            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                json: async () => ({
                    symbol: mockSymbol,
                    price: mockPrice,
                    currency: 'USD',
                    marketState: 'REGULAR',
                    lastUpdated: mockCachedAt.toISOString(),
                }),
            });

            await investmentService.getCurrentPrice(mockSymbol);

            // Check that price was cached even after fallback
            const timestamp = investmentService.getPriceTimestamp(mockSymbol);
            expect(timestamp).toBeTruthy();
            expect(typeof timestamp).toBe('number');
        });
    });

    describe('forceRefreshPrice', () => {
        it('should clear cache before fetching', async () => {
            vi.stubEnv('VITE_USE_BACKEND_INVESTMENTS', 'true');
            const { investmentService } = await import('./investmentService');
            
            // First, cache a price
            vi.spyOn(apiClient, 'get').mockResolvedValue(mockBackendResponse);
            await investmentService.getCurrentPrice(mockSymbol);
            
            // Verify it's cached
            let timestamp = investmentService.getPriceTimestamp(mockSymbol);
            expect(timestamp).toBeTruthy();

            // Force refresh
            await investmentService.forceRefreshPrice(mockSymbol);

            // The cache should have been cleared and then repopulated
            timestamp = investmentService.getPriceTimestamp(mockSymbol);
            expect(timestamp).toBeTruthy();
        });

        it('should call getCurrentPrice after clearing cache', async () => {
            vi.stubEnv('VITE_USE_BACKEND_INVESTMENTS', 'true');
            const { investmentService } = await import('./investmentService');
            
            const apiSpy = vi.spyOn(apiClient, 'get').mockResolvedValue(mockBackendResponse);

            await investmentService.forceRefreshPrice(mockSymbol);

            expect(apiSpy).toHaveBeenCalledWith(`/api/investments/prices/${mockSymbol}`);
        });
    });

    describe('updateInvestmentAccount', () => {
        const mockAccount = {
            id: 'test-account',
            name: 'Investment Account',
            color: '#00FF00',
            currency: 'USD' as const,
            balance: 0,
            type: 'investment' as const,
            stockSymbol: mockSymbol,
            montoInvertido: 10000,
            shares: 25,
        };

        it('should fetch current price and calculate values', async () => {
            vi.stubEnv('VITE_USE_BACKEND_INVESTMENTS', 'true');
            const { investmentService } = await import('./investmentService');
            
            vi.spyOn(apiClient, 'get').mockResolvedValue(mockBackendResponse);

            const result = await investmentService.updateInvestmentAccount(mockAccount);

            expect(result.precioActual).toBe(mockPrice);
            expect(result.totalValue).toBe(mockPrice * mockAccount.shares);
            expect(result.gainsUSD).toBe(mockPrice * mockAccount.shares - mockAccount.montoInvertido);
        });

        it('should throw error if account has no stock symbol', async () => {
            vi.stubEnv('VITE_USE_BACKEND_INVESTMENTS', 'true');
            const { investmentService } = await import('./investmentService');
            
            const accountWithoutSymbol = { ...mockAccount, stockSymbol: undefined };

            await expect(investmentService.updateInvestmentAccount(accountWithoutSymbol))
                .rejects.toThrow('Investment account must have a stock symbol');
        });
    });

    describe('calculateInvestmentValues', () => {
        const mockAccount = {
            id: 'test-account',
            name: 'Investment Account',
            color: '#00FF00',
            currency: 'USD' as const,
            balance: 0,
            type: 'investment' as const,
            stockSymbol: mockSymbol,
            montoInvertido: 10000,
            shares: 25,
        };

        it('should calculate total value correctly', async () => {
            vi.stubEnv('VITE_USE_BACKEND_INVESTMENTS', 'true');
            const { investmentService } = await import('./investmentService');
            
            const result = investmentService.calculateInvestmentValues(mockAccount, mockPrice);

            expect(result.totalValue).toBe(mockPrice * mockAccount.shares);
        });

        it('should calculate gains in USD correctly', async () => {
            vi.stubEnv('VITE_USE_BACKEND_INVESTMENTS', 'true');
            const { investmentService } = await import('./investmentService');
            
            const result = investmentService.calculateInvestmentValues(mockAccount, mockPrice);

            expect(result.gainsUSD).toBe(mockPrice * mockAccount.shares - mockAccount.montoInvertido);
        });

        it('should calculate gains percentage correctly', async () => {
            vi.stubEnv('VITE_USE_BACKEND_INVESTMENTS', 'true');
            const { investmentService } = await import('./investmentService');
            
            const result = investmentService.calculateInvestmentValues(mockAccount, mockPrice);

            const expectedGainsPct = ((mockPrice * mockAccount.shares - mockAccount.montoInvertido) / mockAccount.montoInvertido) * 100;
            expect(result.gainsPct).toBeCloseTo(expectedGainsPct, 2);
        });

        it('should handle zero montoInvertido', async () => {
            vi.stubEnv('VITE_USE_BACKEND_INVESTMENTS', 'true');
            const { investmentService } = await import('./investmentService');
            
            const accountWithZeroInvestment = { ...mockAccount, montoInvertido: 0 };
            const result = investmentService.calculateInvestmentValues(accountWithZeroInvestment, mockPrice);

            expect(result.gainsPct).toBe(0);
        });
    });
});
