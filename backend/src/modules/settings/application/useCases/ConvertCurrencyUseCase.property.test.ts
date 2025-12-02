/**
 * Property-Based Tests for ConvertCurrencyUseCase
 * 
 * Feature: backend-migration, Property 55, 56
 * Validates: Requirements 15.3, 15.4
 * 
 * These tests verify that currency conversion works correctly
 * across a wide range of generated test cases.
 */

import 'reflect-metadata';
import fc from 'fast-check';
import { ConvertCurrencyUseCase } from './ConvertCurrencyUseCase';
import { GetExchangeRateUseCase } from './GetExchangeRateUseCase';
import type { ConvertCurrencyDTO } from '../dtos/ExchangeRateDTO';
import type { Currency } from '@shared-backend/types';
import { ValidationError } from '../../../../shared/errors/AppError';

describe('ConvertCurrencyUseCase Property-Based Tests', () => {
  const validCurrencies: Currency[] = ['USD', 'MXN', 'COP', 'EUR', 'GBP'];
  const majorCurrencies: Currency[] = ['USD', 'EUR', 'GBP'];
  const nonMajorCurrencies: Currency[] = ['MXN', 'COP'];

  describe('Property 55: Non-major currency conversion uses USD intermediate', () => {
    it('should convert between non-major currencies via USD', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...nonMajorCurrencies),
          fc.constantFrom(...nonMajorCurrencies),
          fc.double({ min: 0.01, max: 10000, noNaN: true }), // amount
          fc.double({ min: 0.01, max: 100, noNaN: true }), // rate from source to USD
          fc.double({ min: 0.01, max: 100, noNaN: true }), // rate from USD to target
          async (
            fromCurrency: Currency,
            toCurrency: Currency,
            amount: number,
            toUSDRate: number,
            fromUSDRate: number
          ) => {
            // Skip if currencies are the same
            if (fromCurrency === toCurrency) {
              return;
            }

            // Create mock GetExchangeRateUseCase
            const mockGetExchangeRate = {
              execute: jest.fn().mockImplementation(async (from: Currency, to: Currency) => {
                if (from === fromCurrency && to === 'USD') {
                  return { fromCurrency: from, toCurrency: to, rate: toUSDRate, cachedAt: new Date() };
                }
                if (from === 'USD' && to === toCurrency) {
                  return { fromCurrency: from, toCurrency: to, rate: fromUSDRate, cachedAt: new Date() };
                }
                throw new Error('Unexpected currency pair');
              }),
            } as unknown as GetExchangeRateUseCase;

            const useCase = new ConvertCurrencyUseCase(mockGetExchangeRate);

            const dto: ConvertCurrencyDTO = {
              amount,
              fromCurrency,
              toCurrency,
            };

            // Execute use case
            const result = await useCase.execute(dto);

            // Verify that GetExchangeRateUseCase was called twice (via USD)
            expect(mockGetExchangeRate.execute).toHaveBeenCalledTimes(2);
            expect(mockGetExchangeRate.execute).toHaveBeenCalledWith(fromCurrency, 'USD');
            expect(mockGetExchangeRate.execute).toHaveBeenCalledWith('USD', toCurrency);

            // Verify the conversion calculation
            const expectedAmountInUSD = amount * toUSDRate;
            const expectedConvertedAmount = expectedAmountInUSD * fromUSDRate;
            const expectedEffectiveRate = toUSDRate * fromUSDRate;

            expect(result.amount).toBe(amount);
            expect(result.fromCurrency).toBe(fromCurrency);
            expect(result.toCurrency).toBe(toCurrency);
            expect(result.convertedAmount).toBeCloseTo(expectedConvertedAmount, 10);
            expect(result.rate).toBeCloseTo(expectedEffectiveRate, 10);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should use direct conversion when one currency is USD', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...nonMajorCurrencies),
          fc.double({ min: 0.01, max: 10000, noNaN: true }), // amount
          fc.double({ min: 0.01, max: 100, noNaN: true }), // rate
          fc.boolean(), // true = USD to non-major, false = non-major to USD
          async (currency: Currency, amount: number, rate: number, usdIsFrom: boolean) => {
            const fromCurrency = usdIsFrom ? 'USD' : currency;
            const toCurrency = usdIsFrom ? currency : 'USD';

            // Create mock GetExchangeRateUseCase
            const mockGetExchangeRate = {
              execute: jest.fn().mockResolvedValue({
                fromCurrency,
                toCurrency,
                rate,
                cachedAt: new Date(),
              }),
            } as unknown as GetExchangeRateUseCase;

            const useCase = new ConvertCurrencyUseCase(mockGetExchangeRate);

            const dto: ConvertCurrencyDTO = {
              amount,
              fromCurrency,
              toCurrency,
            };

            // Execute use case
            const result = await useCase.execute(dto);

            // Verify that GetExchangeRateUseCase was called only once (direct conversion)
            expect(mockGetExchangeRate.execute).toHaveBeenCalledTimes(1);
            expect(mockGetExchangeRate.execute).toHaveBeenCalledWith(fromCurrency, toCurrency);

            // Verify the conversion calculation
            const expectedConvertedAmount = amount * rate;

            expect(result.amount).toBe(amount);
            expect(result.fromCurrency).toBe(fromCurrency);
            expect(result.toCurrency).toBe(toCurrency);
            expect(result.convertedAmount).toBeCloseTo(expectedConvertedAmount, 10);
            expect(result.rate).toBe(rate);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should use direct conversion between major currencies', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...majorCurrencies),
          fc.constantFrom(...majorCurrencies),
          fc.double({ min: 0.01, max: 10000, noNaN: true }), // amount
          fc.double({ min: 0.01, max: 100, noNaN: true }), // rate
          async (fromCurrency: Currency, toCurrency: Currency, amount: number, rate: number) => {
            // Skip if currencies are the same
            if (fromCurrency === toCurrency) {
              return;
            }

            // Create mock GetExchangeRateUseCase
            const mockGetExchangeRate = {
              execute: jest.fn().mockResolvedValue({
                fromCurrency,
                toCurrency,
                rate,
                cachedAt: new Date(),
              }),
            } as unknown as GetExchangeRateUseCase;

            const useCase = new ConvertCurrencyUseCase(mockGetExchangeRate);

            const dto: ConvertCurrencyDTO = {
              amount,
              fromCurrency,
              toCurrency,
            };

            // Execute use case
            const result = await useCase.execute(dto);

            // Verify that GetExchangeRateUseCase was called only once (direct conversion)
            expect(mockGetExchangeRate.execute).toHaveBeenCalledTimes(1);
            expect(mockGetExchangeRate.execute).toHaveBeenCalledWith(fromCurrency, toCurrency);

            // Verify the conversion calculation
            const expectedConvertedAmount = amount * rate;

            expect(result.amount).toBe(amount);
            expect(result.fromCurrency).toBe(fromCurrency);
            expect(result.toCurrency).toBe(toCurrency);
            expect(result.convertedAmount).toBeCloseTo(expectedConvertedAmount, 10);
            expect(result.rate).toBe(rate);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 56: Currency conversion calculation', () => {
    it('should correctly multiply amount by exchange rate for direct conversions', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...majorCurrencies),
          fc.constantFrom(...majorCurrencies),
          fc.double({ min: 0.01, max: 10000, noNaN: true }), // amount
          fc.double({ min: 0.01, max: 100, noNaN: true }), // rate
          async (fromCurrency: Currency, toCurrency: Currency, amount: number, rate: number) => {
            // Skip if currencies are the same
            if (fromCurrency === toCurrency) {
              return;
            }

            // Create mock GetExchangeRateUseCase
            const mockGetExchangeRate = {
              execute: jest.fn().mockResolvedValue({
                fromCurrency,
                toCurrency,
                rate,
                cachedAt: new Date(),
              }),
            } as unknown as GetExchangeRateUseCase;

            const useCase = new ConvertCurrencyUseCase(mockGetExchangeRate);

            const dto: ConvertCurrencyDTO = {
              amount,
              fromCurrency,
              toCurrency,
            };

            // Execute use case
            const result = await useCase.execute(dto);

            // Verify the conversion calculation: convertedAmount = amount * rate
            const expectedConvertedAmount = amount * rate;

            expect(result.convertedAmount).toBeCloseTo(expectedConvertedAmount, 10);
            expect(result.amount).toBe(amount);
            expect(result.rate).toBeGreaterThan(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle same currency conversion with rate 1.0', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...validCurrencies),
          fc.double({ min: 0.01, max: 10000, noNaN: true }), // amount
          async (currency: Currency, amount: number) => {
            // Create mock GetExchangeRateUseCase (should not be called)
            const mockGetExchangeRate = {
              execute: jest.fn(),
            } as unknown as GetExchangeRateUseCase;

            const useCase = new ConvertCurrencyUseCase(mockGetExchangeRate);

            const dto: ConvertCurrencyDTO = {
              amount,
              fromCurrency: currency,
              toCurrency: currency,
            };

            // Execute use case
            const result = await useCase.execute(dto);

            // Should return same amount with rate 1.0
            expect(result.amount).toBe(amount);
            expect(result.convertedAmount).toBe(amount);
            expect(result.rate).toBe(1.0);
            expect(result.fromCurrency).toBe(currency);
            expect(result.toCurrency).toBe(currency);

            // Should not call GetExchangeRateUseCase
            expect(mockGetExchangeRate.execute).not.toHaveBeenCalled();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject negative amounts', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...validCurrencies),
          fc.constantFrom(...validCurrencies),
          fc.double({ min: -10000, max: -0.01, noNaN: true }), // negative amount
          async (fromCurrency: Currency, toCurrency: Currency, negativeAmount: number) => {
            // Create mock GetExchangeRateUseCase
            const mockGetExchangeRate = {
              execute: jest.fn(),
            } as unknown as GetExchangeRateUseCase;

            const useCase = new ConvertCurrencyUseCase(mockGetExchangeRate);

            const dto: ConvertCurrencyDTO = {
              amount: negativeAmount,
              fromCurrency,
              toCurrency,
            };

            // Should throw ValidationError
            await expect(useCase.execute(dto)).rejects.toThrow(ValidationError);
            await expect(useCase.execute(dto)).rejects.toThrow('Amount cannot be negative');

            // Should not call GetExchangeRateUseCase
            expect(mockGetExchangeRate.execute).not.toHaveBeenCalled();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject invalid amounts (NaN)', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...validCurrencies),
          fc.constantFrom(...validCurrencies),
          async (fromCurrency: Currency, toCurrency: Currency) => {
            // Create mock GetExchangeRateUseCase
            const mockGetExchangeRate = {
              execute: jest.fn(),
            } as unknown as GetExchangeRateUseCase;

            const useCase = new ConvertCurrencyUseCase(mockGetExchangeRate);

            const dto: ConvertCurrencyDTO = {
              amount: NaN,
              fromCurrency,
              toCurrency,
            };

            // Should throw ValidationError
            await expect(useCase.execute(dto)).rejects.toThrow(ValidationError);
            await expect(useCase.execute(dto)).rejects.toThrow('Amount must be a valid number');

            // Should not call GetExchangeRateUseCase
            expect(mockGetExchangeRate.execute).not.toHaveBeenCalled();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle zero amount correctly for direct conversions', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...majorCurrencies),
          fc.constantFrom(...majorCurrencies),
          fc.double({ min: 0.01, max: 100, noNaN: true }), // rate
          async (fromCurrency: Currency, toCurrency: Currency, rate: number) => {
            // Skip if currencies are the same
            if (fromCurrency === toCurrency) {
              return;
            }

            // Create mock GetExchangeRateUseCase
            const mockGetExchangeRate = {
              execute: jest.fn().mockResolvedValue({
                fromCurrency,
                toCurrency,
                rate,
                cachedAt: new Date(),
              }),
            } as unknown as GetExchangeRateUseCase;

            const useCase = new ConvertCurrencyUseCase(mockGetExchangeRate);

            const dto: ConvertCurrencyDTO = {
              amount: 0,
              fromCurrency,
              toCurrency,
            };

            // Execute use case
            const result = await useCase.execute(dto);

            // Should return zero converted amount
            expect(result.amount).toBe(0);
            expect(result.convertedAmount).toBe(0);
            expect(result.rate).toBe(rate);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve precision in conversion calculations', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...validCurrencies),
          fc.constantFrom(...validCurrencies),
          fc.double({ min: 0.01, max: 10000, noNaN: true }), // amount
          fc.double({ min: 0.01, max: 100, noNaN: true }), // rate
          async (fromCurrency: Currency, toCurrency: Currency, amount: number, rate: number) => {
            // Skip if currencies are the same
            if (fromCurrency === toCurrency) {
              return;
            }

            // Create mock GetExchangeRateUseCase
            const mockGetExchangeRate = {
              execute: jest.fn().mockResolvedValue({
                fromCurrency,
                toCurrency,
                rate,
                cachedAt: new Date(),
              }),
            } as unknown as GetExchangeRateUseCase;

            const useCase = new ConvertCurrencyUseCase(mockGetExchangeRate);

            const dto: ConvertCurrencyDTO = {
              amount,
              fromCurrency,
              toCurrency,
            };

            // Execute use case
            const result = await useCase.execute(dto);

            // Verify that the conversion is mathematically correct
            // convertedAmount / amount should equal rate (within floating point precision)
            const calculatedRate = result.convertedAmount / result.amount;
            expect(calculatedRate).toBeCloseTo(result.rate, 10);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
