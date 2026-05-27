/**
 * GetCurrentStockPriceUseCase
 *
 * Fetches current stock price with 3-tier caching:
 * 1. Local in-memory cache
 * 2. Database cache
 * 3. Alpha Vantage API (cache result in both locations)
 *
 * The cache TTL is now dynamic and sized to the number of distinct active
 * investment symbols system-wide, so we max out the free Alpha Vantage
 * quota (25 calls/day) regardless of how many symbols the user holds:
 *
 *   cacheHours = max(1, ceil(symbolCount * 24 / 25))
 *
 * - 1 symbol  → 1h refresh (24 calls/day)
 * - 5 symbols → 5h refresh (24 calls/day total across the 5 symbols)
 * - 25 symbols → 24h (back to original behavior)
 *
 * The symbol count itself is queried lazily and memoized for 10 minutes so
 * we don't hit the database on every single price check.
 *
 * Requirements: 13.1, 13.2, 13.3, 13.4
 */

import { injectable, inject } from 'tsyringe';
import { StockPrice } from '../../domain/StockPrice';
import type { IStockPriceRepository } from '../../infrastructure/IStockPriceRepository';
import type { IAlphaVantageService } from '../../infrastructure/IAlphaVantageService';
import type { IAccountRepository } from '../../infrastructure/IAccountRepository';

/**
 * Free-tier Alpha Vantage daily call budget. Used to spread refreshes
 * evenly across active symbols. Bump this in lock-step with any quota
 * upgrade — the calculation degrades to "24h cache" once the symbol
 * count reaches this value, which is the desired conservative floor.
 */
const DAILY_API_CALL_BUDGET = 25;

/**
 * How long to trust the cached symbol count before re-querying. Short
 * enough that adding a new investment account starts tightening the
 * refresh interval within minutes; long enough to keep the database hit
 * out of the hot path of every price lookup.
 */
const SYMBOL_COUNT_MEMO_TTL_MS = 10 * 60 * 1000; // 10 minutes

@injectable()
export class GetCurrentStockPriceUseCase {
  // Local in-memory cache, keyed by uppercase symbol.
  private localCache: Map<string, StockPrice> = new Map();

  // Memoized symbol-count lookup. We don't store the raw symbol list
  // because callers only need the count — keeping just a number avoids
  // any chance of stale-symbol bugs leaking into other code paths.
  private memoizedSymbolCount: number | null = null;
  private memoizedSymbolCountAt = 0;

  constructor(
    @inject('StockPriceRepository') private stockPriceRepo: IStockPriceRepository,
    @inject('AlphaVantageService') private alphaVantageService: IAlphaVantageService,
    @inject('AccountRepository') private accountRepo: IAccountRepository
  ) { }

  /**
   * Execute the use case
   *
   * @param symbol - Stock symbol (e.g., 'VOO', 'AAPL')
   * @returns StockPrice with current price and cache metadata
   */
  async execute(symbol: string, force = false): Promise<StockPrice> {
    // Normalize symbol to uppercase
    const normalizedSymbol = symbol.toUpperCase();

    // Resolve the cache window first so every freshness check below
    // uses the same TTL for this request.
    const cacheHours = await this.getCacheHours();

    if (!force) {
      // 1. Check local cache first (Requirements 13.2)
      const localCached = this.localCache.get(normalizedSymbol);
      if (localCached && localCached.isFresh(cacheHours)) {
        return new StockPrice(localCached.symbol, localCached.price, localCached.cachedAt, 'cache');
      }

      // 2. Check database cache (Requirements 13.3)
      const dbCached = await this.stockPriceRepo.findBySymbol(normalizedSymbol);
      if (dbCached && dbCached.isFresh(cacheHours)) {
        const stockPriceDb = new StockPrice(dbCached.symbol, dbCached.price, dbCached.cachedAt, 'db');
        // Update local cache
        this.localCache.set(normalizedSymbol, stockPriceDb);
        return stockPriceDb;
      }
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
   * Compute the current cache window in hours, derived from the system-
   * wide active-symbol count. The symbol count is memoized for
   * {@link SYMBOL_COUNT_MEMO_TTL_MS}; a repository failure during the
   * refresh falls back to the conservative 24-hour window so a transient
   * DB blip can never escalate API usage past the free-tier budget.
   */
  private async getCacheHours(): Promise<number> {
    const symbolCount = await this.getSymbolCount();
    return Math.max(1, Math.ceil((symbolCount * 24) / DAILY_API_CALL_BUDGET));
  }

  /**
   * Fetch the active-symbol count, memoized for {@link SYMBOL_COUNT_MEMO_TTL_MS}.
   *
   * On error we don't blow up the price call (which would cascade into a
   * broken summary page) — instead we return DAILY_API_CALL_BUDGET so the
   * derived cacheHours collapses to 24h, the safest possible value.
   */
  private async getSymbolCount(): Promise<number> {
    const now = Date.now();
    if (
      this.memoizedSymbolCount !== null &&
      now - this.memoizedSymbolCountAt < SYMBOL_COUNT_MEMO_TTL_MS
    ) {
      return this.memoizedSymbolCount;
    }

    try {
      const symbols = await this.accountRepo.getDistinctActiveSymbols();
      this.memoizedSymbolCount = symbols.length;
      this.memoizedSymbolCountAt = now;
      return this.memoizedSymbolCount;
    } catch {
      // Fall back to the conservative budget so cacheHours = 24 — better
      // to over-cache for a few minutes than over-spend the API budget.
      // We deliberately don't memoize this fallback so the next call
      // retries the lookup.
      return DAILY_API_CALL_BUDGET;
    }
  }

  /**
   * Clear local cache (useful for testing)
   */
  clearLocalCache(): void {
    this.localCache.clear();
    this.memoizedSymbolCount = null;
    this.memoizedSymbolCountAt = 0;
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
