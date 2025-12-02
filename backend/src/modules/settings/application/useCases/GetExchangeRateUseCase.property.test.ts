/**
 * Property-Based Tests for GetExchangeRateUseCase
 * 
 * Feature: backend-migration, Property 53, 54
 * Validates: Requirements 15.1, 15.2
 * These tests verify that exchange rate caching works correctly
 * across a wide range of generated test cases.
 */

import 'reflect-metadata';
import fc from 'fast-check';
import { GetExchangeRateUseCase } from './GetExchangeRateUseCase';
import type { IExchangeRateRepository } from '../../infrastructure/IExchangeRateRepository';
import type { IExchangeRateAPIService } from '../../infrastructure/IExchangeRateAPIService';
import type { Currency } from '@shared-backend/types';
import { ExchangeRate } from '../../domain/ExchangeRate';
describe('GetExchangeRateUseCase Property-Based Tests', () => {
  const validCurrencies: Currency[] = ['USD', 'MXN', 'COP', 'EUR', 'GBP'];
  describe('Property 53: Exchange rate caching checks cache first', () => {
    it('should return cached rate when cache is valid', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...validCurrencies),
          fc.constantFrom(...validCurrencies),
          fc.double({ min: 0.01, max: 1000, noNaN: true }), // cached rate
          fc.double({ min: 0.01, max: 1000, noNaN: true }), // API rate (different)
          async (fromCurrency: Currency, toCurrency: Currency, cachedRateValue: number, apiRateValue: number) => {
            // Skip if currencies are the same (special case)
            if (fromCurrency === toCurrency) {
              return;
            }
            // Create a valid cached rate (not expired)
            const cachedRate = new ExchangeRate(
              fromCurrency,
              toCurrency,
              cachedRateValue,
              new Date() // Current time - not expired
            );
            // Create mock repository that returns cached rate
            const mockRepo: jest.Mocked<IExchangeRateRepository> = {
              findRate: jest.fn().mockResolvedValue(cachedRate),
              saveRate: jest.fn().mockResolvedValue(undefined),
              deleteExpired: jest.fn().mockResolvedValue(0),
            };
            // Create mock API service
            const mockAPIService: jest.Mocked<IExchangeRateAPIService> = {
              fetchRate: jest.fn().mockResolvedValue(apiRateValue),
            };
            const useCase = new GetExchangeRateUseCase(mockRepo, mockAPIService);
            // Execute use case
            const result = await useCase.execute(fromCurrency, toCurrency);
            // Should return cached rate
            expect(result.rate).toBe(cachedRateValue);
            expect(result.fromCurrency).toBe(fromCurrency);
            expect(result.toCurrency).toBe(toCurrency);
            // Should check cache
            expect(mockRepo.findRate).toHaveBeenCalledWith(fromCurrency, toCurrency);
            // Should NOT call API (cache hit)
            expect(mockAPIService.fetchRate).not.toHaveBeenCalled();
            // Should NOT save to cache (already cached)
            expect(mockRepo.saveRate).not.toHaveBeenCalled();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should not use expired cached rate', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...validCurrencies),
          fc.constantFrom(...validCurrencies),
          fc.double({ min: 0.01, max: 1000, noNaN: true }), // API rate
          async (fromCurrency: Currency, toCurrency: Currency, apiRateValue: number) => {
            // Skip if currencies are the same
            if (fromCurrency === toCurrency) {
              return;
            }
            // Create an expired cached rate (25 hours ago)
            const expiredDate = new Date();
            expiredDate.setHours(expiredDate.getHours() - 25);
            
            const expiredRate = new ExchangeRate(
              fromCurrency,
              toCurrency,
              1.5,
              expiredDate
            );
            // Create mock repository that returns expired rate
            const mockRepo: jest.Mocked<IExchangeRateRepository> = {
              findRate: jest.fn().mockResolvedValue(expiredRate),
              saveRate: jest.fn().mockResolvedValue(undefined),
              deleteExpired: jest.fn().mockResolvedValue(0),
            };
            const mockAPIService: jest.Mocked<IExchangeRateAPIService> = {
              fetchRate: jest.fn().mockResolvedValue(apiRateValue),
            };
            const useCase = new GetExchangeRateUseCase(mockRepo, mockAPIService);
            const result = await useCase.execute(fromCurrency, toCurrency);
            // Should return API rate (not expired cached rate)
            expect(result.rate).toBe(apiRateValue);
            // Should call API (cache expired)
            expect(mockAPIService.fetchRate).toHaveBeenCalledWith(fromCurrency, toCurrency);
            // Should save new rate to cache
            expect(mockRepo.saveRate).toHaveBeenCalled();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle same currency conversion without cache or API', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...validCurrencies),
          async (currency: Currency) => {
            // Create mock repository
            const mockRepo: jest.Mocked<IExchangeRateRepository> = {
              findRate: jest.fn().mockResolvedValue(null),
              saveRate: jest.fn().mockResolvedValue(undefined),
              deleteExpired: jest.fn().mockResolvedValue(0),
            };
            const mockAPIService: jest.Mocked<IExchangeRateAPIService> = {
              fetchRate: jest.fn().mockResolvedValue(1.0),
            };
            const useCase = new GetExchangeRateUseCase(mockRepo, mockAPIService);
            // Execute use case with same currency
            const result = await useCase.execute(currency, currency);
            // Should return rate of 1.0
            expect(result.rate).toBe(1.0);
            expect(result.fromCurrency).toBe(currency);
            expect(result.toCurrency).toBe(currency);
            // Should NOT check cache
            expect(mockRepo.findRate).not.toHaveBeenCalled();
            // Should NOT call API
            expect(mockAPIService.fetchRate).not.toHaveBeenCalled();
            // Should NOT save to cache
            expect(mockRepo.saveRate).not.toHaveBeenCalled();
          }
        ),
        { numRuns: 100 }
      );
    });
  });
  describe('Property 54: Exchange rate caching falls back to API', () => {
    it('should call API when cache is empty', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...validCurrencies),
          fc.constantFrom(...validCurrencies),
          fc.double({ min: 0.01, max: 1000, noNaN: true }),
          async (fromCurrency: Currency, toCurrency: Currency, apiRateValue: number) => {
            if (fromCurrency === toCurrency) {
              return;
            }
            // Create mock repository that returns null (cache miss)
            const mockRepo: jest.Mocked<IExchangeRateRepository> = {
              findRate: jest.fn().mockResolvedValue(null),
              saveRate: jest.fn().mockResolvedValue(undefined),
              deleteExpired: jest.fn().mockResolvedValue(0),
            };
            const mockAPIService: jest.Mocked<IExchangeRateAPIService> = {
              fetchRate: jest.fn().mockResolvedValue(apiRateValue),
            };
            const useCase = new GetExchangeRateUseCase(mockRepo, mockAPIService);
            const result = await useCase.execute(fromCurrency, toCurrency);
            // Should return API rate
            expect(result.rate).toBe(apiRateValue);
            // Should call API (cache miss)
            expect(mockAPIService.fetchRate).toHaveBeenCalledWith(fromCurrency, toCurrency);
            // Should save to cache
            expect(mockRepo.saveRate).toHaveBeenCalled();
            // Verify the saved rate has correct values
            const savedRate = mockRepo.saveRate.mock.calls[0][0];
            expect(savedRate.fromCurrency).toBe(fromCurrency);
            expect(savedRate.toCurrency).toBe(toCurrency);
            expect(savedRate.rate).toBe(apiRateValue);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should cache API result for future requests', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...validCurrencies),
          fc.constantFrom(...validCurrencies),
          fc.double({ min: 0.01, max: 1000, noNaN: true }),
          async (fromCurrency: Currency, toCurrency: Currency, apiRateValue: number) => {
            if (fromCurrency === toCurrency) {
              return;
            }
            const mockRepo: jest.Mocked<IExchangeRateRepository> = {
              findRate: jest.fn().mockResolvedValue(null),
              saveRate: jest.fn().mockResolvedValue(undefined),
              deleteExpired: jest.fn().mockResolvedValue(0),
            };
            const mockAPIService: jest.Mocked<IExchangeRateAPIService> = {
              fetchRate: jest.fn().mockResolvedValue(apiRateValue),
            };
            const useCase = new GetExchangeRateUseCase(mockRepo, mockAPIService);
            await useCase.execute(fromCurrency, toCurrency);
            // Verify that saveRate was called with correct exchange rate
            expect(mockRepo.saveRate).toHaveBeenCalledTimes(1);
            const savedRate = mockRepo.saveRate.mock.calls[0][0];
            expect(savedRate).toBeInstanceOf(ExchangeRate);
            // Verify the cached date is recent (within last second)
            const now = new Date();
            const timeDiff = now.getTime() - savedRate.cachedAt.getTime();
            expect(timeDiff).toBeLessThan(1000); // Less than 1 second
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle API errors gracefully', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...validCurrencies),
          fc.constantFrom(...validCurrencies),
          fc.string({ minLength: 5, maxLength: 50 }), // error message
          async (fromCurrency: Currency, toCurrency: Currency, errorMessage: string) => {
            if (fromCurrency === toCurrency) {
              return;
            }
            const mockRepo: jest.Mocked<IExchangeRateRepository> = {
              findRate: jest.fn().mockResolvedValue(null),
              saveRate: jest.fn().mockResolvedValue(undefined),
              deleteExpired: jest.fn().mockResolvedValue(0),
            };
            // Create mock API service that throws error
            const mockAPIService: jest.Mocked<IExchangeRateAPIService> = {
              fetchRate: jest.fn().mockRejectedValue(new Error(errorMessage)),
            };
            const useCase = new GetExchangeRateUseCase(mockRepo, mockAPIService);
            // Execute use case - should propagate error
            await expect(useCase.execute(fromCurrency, toCurrency)).rejects.toThrow(errorMessage);
            // Should call API
            expect(mockAPIService.fetchRate).toHaveBeenCalledWith(fromCurrency, toCurrency);
            // Should NOT save to cache (API failed)
            expect(mockRepo.saveRate).not.toHaveBeenCalled();
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
