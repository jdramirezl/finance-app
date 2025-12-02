/**
 * Property-Based Tests for GetCurrentStockPriceUseCase
 * 
 * Feature: backend-migration
 * Property 45: Investment account fetches price from cache or API
 * Property 46: Stock price caching checks local cache first
 * Property 47: Stock price caching falls back to database
 * Property 48: Stock price caching falls back to API
 * Validates: Requirements 13.1, 13.2, 13.3, 13.4
 * 
 * These tests verify the 3-tier caching strategy for stock prices.
 */

import 'reflect-metadata';
import fc from 'fast-check';
import { GetCurrentStockPriceUseCase } from './GetCurrentStockPriceUseCase';
import { StockPrice } from '../../domain/StockPrice';
import type { IStockPriceRepository } from '../../infrastructure/IStockPriceRepository';
import type { IAlphaVantageService } from '../../infrastructure/IAlphaVantageService';

describe('GetCurrentStockPriceUseCase Property-Based Tests', () => {
  // Helper to generate valid stock symbols (1-5 uppercase letters)
  const validStockSymbol = () =>
    fc.array(fc.constantFrom('A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'), {
      minLength: 1,
      maxLength: 5,
    }).map(arr => arr.join(''));

  // Helper to generate valid stock prices
  const validStockPrice = () => fc.double({ min: 0.01, max: 10000, noNaN: true });

  describe('Property 46: Stock price caching checks local cache first', () => {
    it('should return from local cache when available and fresh', async () => {
      await fc.assert(
        fc.asyncProperty(
          validStockSymbol(),
          validStockPrice(),
          async (symbol: string, price: number) => {
            // Create mock repository and service
            const mockRepo: jest.Mocked<IStockPriceRepository> = {
              findBySymbol: jest.fn(),
              save: jest.fn(),
              deleteExpired: jest.fn(),
            };

            const mockService: jest.Mocked<IAlphaVantageService> = {
              fetchStockPrice: jest.fn(),
            };

            const useCase = new GetCurrentStockPriceUseCase(mockRepo, mockService);

            // Pre-populate local cache with fresh price
            const cachedPrice = new StockPrice(symbol, price, new Date());
            useCase['localCache'].set(symbol, cachedPrice);

            // Execute use case
            const result = await useCase.execute(symbol);

            // Should return cached price
            expect(result.symbol).toBe(symbol);
            expect(result.price).toBe(price);
            expect(result.isFresh()).toBe(true);

            // Should NOT call database or API
            expect(mockRepo.findBySymbol).not.toHaveBeenCalled();
            expect(mockService.fetchStockPrice).not.toHaveBeenCalled();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should skip expired local cache and check database', async () => {
      await fc.assert(
        fc.asyncProperty(
          validStockSymbol(),
          validStockPrice(),
          validStockPrice(),
          async (symbol: string, oldPrice: number, newPrice: number) => {
            // Create mock repository and service
            const mockRepo: jest.Mocked<IStockPriceRepository> = {
              findBySymbol: jest.fn().mockResolvedValue(
                new StockPrice(symbol, newPrice, new Date())
              ),
              save: jest.fn(),
              deleteExpired: jest.fn(),
            };

            const mockService: jest.Mocked<IAlphaVantageService> = {
              fetchStockPrice: jest.fn(),
            };

            const useCase = new GetCurrentStockPriceUseCase(mockRepo, mockService);

            // Pre-populate local cache with EXPIRED price (25 hours ago)
            const expiredDate = new Date();
            expiredDate.setHours(expiredDate.getHours() - 25);
            const expiredPrice = new StockPrice(symbol, oldPrice, expiredDate);
            useCase['localCache'].set(symbol, expiredPrice);

            // Execute use case
            const result = await useCase.execute(symbol);

            // Should return fresh price from database
            expect(result.symbol).toBe(symbol);
            expect(result.price).toBe(newPrice);
            expect(result.isFresh()).toBe(true);

            // Should call database but NOT API
            expect(mockRepo.findBySymbol).toHaveBeenCalledWith(symbol);
            expect(mockService.fetchStockPrice).not.toHaveBeenCalled();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 47: Stock price caching falls back to database', () => {
    it('should fetch from database when local cache misses', async () => {
      await fc.assert(
        fc.asyncProperty(
          validStockSymbol(),
          validStockPrice(),
          async (symbol: string, price: number) => {
            // Create mock repository with fresh cached price
            const dbCachedPrice = new StockPrice(symbol, price, new Date());
            const mockRepo: jest.Mocked<IStockPriceRepository> = {
              findBySymbol: jest.fn().mockResolvedValue(dbCachedPrice),
              save: jest.fn(),
              deleteExpired: jest.fn(),
            };

            const mockService: jest.Mocked<IAlphaVantageService> = {
              fetchStockPrice: jest.fn(),
            };

            const useCase = new GetCurrentStockPriceUseCase(mockRepo, mockService);

            // Ensure local cache is empty
            useCase.clearLocalCache();

            // Execute use case
            const result = await useCase.execute(symbol);

            // Should return price from database
            expect(result.symbol).toBe(symbol);
            expect(result.price).toBe(price);
            expect(result.isFresh()).toBe(true);

            // Should call database but NOT API
            expect(mockRepo.findBySymbol).toHaveBeenCalledWith(symbol);
            expect(mockService.fetchStockPrice).not.toHaveBeenCalled();

            // Should update local cache
            const localCached = useCase['localCache'].get(symbol);
            expect(localCached).toBeDefined();
            expect(localCached?.price).toBe(price);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should skip expired database cache and call API', async () => {
      await fc.assert(
        fc.asyncProperty(
          validStockSymbol(),
          validStockPrice(),
          validStockPrice(),
          async (symbol: string, oldPrice: number, newPrice: number) => {
            // Create mock repository with EXPIRED cached price
            const expiredDate = new Date();
            expiredDate.setHours(expiredDate.getHours() - 25);
            const expiredPrice = new StockPrice(symbol, oldPrice, expiredDate);

            const mockRepo: jest.Mocked<IStockPriceRepository> = {
              findBySymbol: jest.fn().mockResolvedValue(expiredPrice),
              save: jest.fn(),
              deleteExpired: jest.fn(),
            };

            const mockService: jest.Mocked<IAlphaVantageService> = {
              fetchStockPrice: jest.fn().mockResolvedValue(newPrice),
            };

            const useCase = new GetCurrentStockPriceUseCase(mockRepo, mockService);

            // Ensure local cache is empty
            useCase.clearLocalCache();

            // Execute use case
            const result = await useCase.execute(symbol);

            // Should return fresh price from API
            expect(result.symbol).toBe(symbol);
            expect(result.price).toBe(newPrice);
            expect(result.isFresh()).toBe(true);

            // Should call both database and API
            expect(mockRepo.findBySymbol).toHaveBeenCalledWith(symbol);
            expect(mockService.fetchStockPrice).toHaveBeenCalledWith(symbol);

            // Should save to database
            expect(mockRepo.save).toHaveBeenCalled();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 48: Stock price caching falls back to API', () => {
    it('should fetch from API when both caches miss', async () => {
      await fc.assert(
        fc.asyncProperty(
          validStockSymbol(),
          validStockPrice(),
          async (symbol: string, price: number) => {
            // Create mock repository with no cached price
            const mockRepo: jest.Mocked<IStockPriceRepository> = {
              findBySymbol: jest.fn().mockResolvedValue(null),
              save: jest.fn(),
              deleteExpired: jest.fn(),
            };

            const mockService: jest.Mocked<IAlphaVantageService> = {
              fetchStockPrice: jest.fn().mockResolvedValue(price),
            };

            const useCase = new GetCurrentStockPriceUseCase(mockRepo, mockService);

            // Ensure local cache is empty
            useCase.clearLocalCache();

            // Execute use case
            const result = await useCase.execute(symbol);

            // Should return price from API
            expect(result.symbol).toBe(symbol);
            expect(result.price).toBe(price);
            expect(result.isFresh()).toBe(true);

            // Should call database and API
            expect(mockRepo.findBySymbol).toHaveBeenCalledWith(symbol);
            expect(mockService.fetchStockPrice).toHaveBeenCalledWith(symbol);

            // Should save to both caches
            expect(mockRepo.save).toHaveBeenCalled();
            const localCached = useCase['localCache'].get(symbol);
            expect(localCached).toBeDefined();
            expect(localCached?.price).toBe(price);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should cache API result in both local and database', async () => {
      await fc.assert(
        fc.asyncProperty(
          validStockSymbol(),
          validStockPrice(),
          async (symbol: string, price: number) => {
            let savedPrice: StockPrice | undefined = undefined;

            const mockRepo: jest.Mocked<IStockPriceRepository> = {
              findBySymbol: jest.fn().mockResolvedValue(null),
              save: jest.fn().mockImplementation(async (sp: StockPrice) => {
                savedPrice = sp;
              }),
              deleteExpired: jest.fn(),
            };

            const mockService: jest.Mocked<IAlphaVantageService> = {
              fetchStockPrice: jest.fn().mockResolvedValue(price),
            };

            const useCase = new GetCurrentStockPriceUseCase(mockRepo, mockService);
            useCase.clearLocalCache();

            // Execute use case
            await useCase.execute(symbol);

            // Verify database save was called with correct data
            expect(mockRepo.save).toHaveBeenCalled();
            expect(savedPrice).toBeDefined();
            expect(savedPrice!.symbol).toBe(symbol);
            expect(savedPrice!.price).toBe(price);
            expect(savedPrice!.isFresh()).toBe(true);

            // Verify local cache was updated
            const localCached = useCase['localCache'].get(symbol);
            expect(localCached).toBeDefined();
            expect(localCached?.symbol).toBe(symbol);
            expect(localCached?.price).toBe(price);
            expect(localCached?.isFresh()).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 45: Investment account fetches price from cache or API', () => {
    it('should normalize symbol to uppercase', async () => {
      await fc.assert(
        fc.asyncProperty(
          validStockSymbol(),
          validStockPrice(),
          async (symbol: string, price: number) => {
            const mockRepo: jest.Mocked<IStockPriceRepository> = {
              findBySymbol: jest.fn().mockResolvedValue(null),
              save: jest.fn(),
              deleteExpired: jest.fn(),
            };

            const mockService: jest.Mocked<IAlphaVantageService> = {
              fetchStockPrice: jest.fn().mockResolvedValue(price),
            };

            const useCase = new GetCurrentStockPriceUseCase(mockRepo, mockService);
            useCase.clearLocalCache();

            // Execute with lowercase symbol
            const lowercaseSymbol = symbol.toLowerCase();
            await useCase.execute(lowercaseSymbol);

            // Should call API with uppercase symbol
            expect(mockService.fetchStockPrice).toHaveBeenCalledWith(symbol.toUpperCase());
            expect(mockRepo.findBySymbol).toHaveBeenCalledWith(symbol.toUpperCase());
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle mixed case symbols consistently', async () => {
      await fc.assert(
        fc.asyncProperty(
          validStockSymbol(),
          validStockPrice(),
          async (symbol: string, price: number) => {
            const mockRepo: jest.Mocked<IStockPriceRepository> = {
              findBySymbol: jest.fn().mockResolvedValue(null),
              save: jest.fn(),
              deleteExpired: jest.fn(),
            };

            const mockService: jest.Mocked<IAlphaVantageService> = {
              fetchStockPrice: jest.fn().mockResolvedValue(price),
            };

            const useCase = new GetCurrentStockPriceUseCase(mockRepo, mockService);
            useCase.clearLocalCache();

            // Create mixed case version
            const mixedCase = symbol
              .split('')
              .map((char, i) => (i % 2 === 0 ? char.toLowerCase() : char.toUpperCase()))
              .join('');

            // Execute with mixed case
            const result = await useCase.execute(mixedCase);

            // Should return normalized uppercase symbol
            expect(result.symbol).toBe(symbol.toUpperCase());
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
