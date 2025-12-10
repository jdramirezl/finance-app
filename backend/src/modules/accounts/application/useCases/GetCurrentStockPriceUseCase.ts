/**
 * GetCurrentStockPriceUseCase
 * 
 * Fetches current stock price with 3-tier caching:
 * 1. Local in-memory cache (24-hour expiration)
 * 2. Database cache (24-hour expiration)
 * 3. Alpha Vantage API (cache result in both locations)
 * 
 * Requirements: 13.1, 13.2, 13.3, 13.4
 */

import { injectable, inject } from 'tsyringe';
import { StockPrice } from '../../domain/StockPrice';
import type { IStockPriceRepository } from '../../infrastructure/IStockPriceRepository';
import type { IAlphaVantageService } from '../../infrastructure/IAlphaVantageService';

@injectable()
export class GetCurrentStockPriceUseCase {
  // Local in-memory cache
  private localCache: Map<string, StockPrice> = new Map();

  constructor(
    @inject('StockPriceRepository') private stockPriceRepo: IStockPriceRepository,
    @inject('AlphaVantageService') private alphaVantageService: IAlphaVantageService
  ) { }

  /**
   * Execute the use case
   * 
   * @param symbol - Stock symbol (e.g., 'VOO', 'AAPL')
   * @returns StockPrice with current price and cache metadata
   */
  async execute(symbol: string): Promise<StockPrice> {
    // Normalize symbol to uppercase
    const normalizedSymbol = symbol.toUpperCase();

    // 1. Check local cache first (Requirements 13.2)
    const localCached = this.localCache.get(normalizedSymbol);
    if (localCached && localCached.isFresh()) {
      return new StockPrice(localCached.symbol, localCached.price, localCached.cachedAt, 'cache');
    }

    // 2. Check database cache (Requirements 13.3)
    const dbCached = await this.stockPriceRepo.findBySymbol(normalizedSymbol);
    if (dbCached && dbCached.isFresh()) {
      const stockPriceDb = new StockPrice(dbCached.symbol, dbCached.price, dbCached.cachedAt, 'db');
      // Update local cache
      this.localCache.set(normalizedSymbol, stockPriceDb);
      return stockPriceDb;
    }

    // 3. Fetch from API (Requirements 13.4)
    const currentPrice = await this.alphaVantageService.fetchStockPrice(normalizedSymbol);
    const stockPrice = new StockPrice(normalizedSymbol, currentPrice, new Date(), 'api');

    // Cache in both locations
    await this.stockPriceRepo.save(stockPrice);
    this.localCache.set(normalizedSymbol, stockPrice);

    return stockPrice;
  }

  /**
   * Clear local cache (useful for testing)
   */
  clearLocalCache(): void {
    this.localCache.clear();
  }

  /**
   * Get cache statistics (useful for monitoring)
   */
  getCacheStats(): { localCacheSize: number } {
    return {
      localCacheSize: this.localCache.size,
    };
  }
}
