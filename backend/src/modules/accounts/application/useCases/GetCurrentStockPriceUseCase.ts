/**
 * GetCurrentStockPriceUseCase
 *
 * Fetches current stock price with 3-tier caching:
 * 1. Local in-memory cache
 * 2. Database cache
 * 3. Price provider chain (Finnhub → Alpha Vantage), cached in both places
 *
 * Cache window ("freshUntil"):
 * - Primary provider without a daily limit (Finnhub, 60/min): 15 minutes.
 * - Alpha Vantage only (25/day): sized to the active-symbol count,
 *   cacheHours = max(1, ceil(symbolCount * 24 / 25)).
 *
 * `force` skips both caches. If the provider fails, the last known price is
 * returned with source 'stale' and a staleReason; with nothing cached the
 * caller gets PRICE_UNAVAILABLE (503) or NotFound (unknown symbol).
 *
 * Requirements: 13.1, 13.2, 13.3, 13.4
 */

import { injectable, inject } from 'tsyringe';
import { StockPrice } from '../../domain/StockPrice';
import type { IStockPriceRepository } from '../../infrastructure/IStockPriceRepository';
import type { IStockPriceProvider, StockQuote } from '../../infrastructure/IStockPriceProvider';
import type { IAccountRepository } from '../../infrastructure/IAccountRepository';
import { StockPriceProviderError, StockPriceProviderFailure } from '../../infrastructure/StockPriceProviderError';
import { NotFoundError, PriceUnavailableError } from '../../../../shared/errors/AppError';

const REASON_TEXT: Record<StockPriceProviderFailure, string> = {
  RATE_LIMITED: 'price provider rate limit reached',
  AUTH: 'price provider rejected the API key',
  SYMBOL_NOT_FOUND: 'symbol not found',
  UPSTREAM: 'price provider error',
  NETWORK: 'price provider unreachable',
};

/** Retry hints. Rate limits are usually the 1 req/s burst limit or the daily quota. */
const RETRY_AFTER_SECONDS: Record<StockPriceProviderFailure, number> = {
  RATE_LIMITED: 60,
  AUTH: 0,
  SYMBOL_NOT_FOUND: 0,
  UPSTREAM: 30,
  NETWORK: 30,
};

/**
 * Free-tier Alpha Vantage daily call budget. Used to spread refreshes
 * evenly across active symbols. Bump this in lock-step with any quota
 * upgrade — the calculation degrades to "24h cache" once the symbol
 * count reaches this value, which is the desired conservative floor.
 */
const DAILY_API_CALL_BUDGET = 25;

/**
 * Automatic refresh window when the primary provider has no meaningful
 * daily limit (Finnhub: 60 calls/minute).
 */
const UNLIMITED_PROVIDER_CACHE_HOURS = 0.25; // 15 minutes

/**
 * How long to trust the cached symbol count before re-querying. Short
 * enough that adding a new investment account starts tightening the
 * refresh interval within minutes; long enough to keep the database hit
 * out of the hot path of every price lookup.
 */
const SYMBOL_COUNT_MEMO_TTL_MS = 10 * 60 * 1000; // 10 minutes

const freshUntil = (cachedAt: Date, cacheHours: number) =>
  new Date(cachedAt.getTime() + cacheHours * 3_600_000);

@injectable()
export class GetCurrentStockPriceUseCase {
  // Local in-memory cache, keyed by uppercase symbol.
  private localCache: Map<string, StockPrice> = new Map();

  // In-flight provider calls, keyed by uppercase symbol.
  private inFlight: Map<string, Promise<StockQuote>> = new Map();

  // Memoized symbol-count lookup. We don't store the raw symbol list
  // because callers only need the count — keeping just a number avoids
  // any chance of stale-symbol bugs leaking into other code paths.
  private memoizedSymbolCount: number | null = null;
  private memoizedSymbolCountAt = 0;

  constructor(
    @inject('StockPriceRepository') private stockPriceRepo: IStockPriceRepository,
    @inject('StockPriceProvider') private priceProvider: IStockPriceProvider,
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

    // Last known price, kept as a fallback if the provider fails.
    let lastKnown: StockPrice | null = this.localCache.get(normalizedSymbol) ?? null;

    if (!force && lastKnown && lastKnown.isFresh(cacheHours)) {
      // 1. Local cache hit (Requirements 13.2)
      return new StockPrice(lastKnown.symbol, lastKnown.price, lastKnown.cachedAt, 'cache', {
        provider: lastKnown.provider,
        freshUntil: freshUntil(lastKnown.cachedAt, cacheHours),
      });
    }

    // 2. Database cache (Requirements 13.3). A DB failure must not block
    //    the provider call, so it only loses us the fallback.
    try {
      const dbCached = await this.stockPriceRepo.findBySymbol(normalizedSymbol);
      if (dbCached) {
        if (!lastKnown || dbCached.cachedAt > lastKnown.cachedAt) lastKnown = dbCached;
        if (!force && dbCached.isFresh(cacheHours)) {
          const stockPriceDb = new StockPrice(dbCached.symbol, dbCached.price, dbCached.cachedAt, 'db', {
            freshUntil: freshUntil(dbCached.cachedAt, cacheHours),
          });
          this.localCache.set(normalizedSymbol, stockPriceDb);
          return stockPriceDb;
        }
      }
    } catch (error) {
      console.error(`[stock-price] DB cache read failed for ${normalizedSymbol}:`, (error as Error).message);
    }

    // 3. Fetch from API (Requirements 13.4)
    let quote: StockQuote;
    try {
      quote = await this.fetchDeduped(normalizedSymbol);
    } catch (error) {
      return this.handleProviderFailure(normalizedSymbol, error, lastKnown);
    }

    const now = new Date();
    const stockPrice = new StockPrice(normalizedSymbol, quote.price, now, 'api', {
      provider: quote.provider,
      freshUntil: freshUntil(now, cacheHours),
    });
    this.localCache.set(normalizedSymbol, stockPrice);
    try {
      await this.stockPriceRepo.save(stockPrice);
    } catch (error) {
      console.error(`[stock-price] DB cache write failed for ${normalizedSymbol}:`, (error as Error).message);
    }

    return stockPrice;
  }

  /** One provider call per symbol at a time; concurrent callers share it. */
  private fetchDeduped(symbol: string): Promise<StockQuote> {
    const pending = this.inFlight.get(symbol);
    if (pending) return pending;
    const provider = this.priceProvider;
    const call: Promise<StockQuote> = provider.fetchQuote
      ? provider.fetchQuote(symbol)
      : provider.fetchStockPrice(symbol).then((price) => ({ price, provider: provider.name ?? 'unknown' }));
    const request = call.finally(() => this.inFlight.delete(symbol));
    this.inFlight.set(symbol, request);
    return request;
  }

  /**
   * Provider failed: serve the last known price marked 'stale' if we have
   * one; otherwise raise a typed error (never a generic 500).
   */
  private handleProviderFailure(symbol: string, error: unknown, lastKnown: StockPrice | null): StockPrice {
    const providerError = error instanceof StockPriceProviderError ? error : null;
    const reason = providerError?.reason ?? 'UPSTREAM';
    const detail = providerError?.message ?? (error instanceof Error ? error.message : String(error));

    if (reason === 'SYMBOL_NOT_FOUND') {
      throw new NotFoundError(`No price found for symbol ${symbol}`);
    }

    if (lastKnown) {
      console.warn(
        `[stock-price] ${reason} for ${symbol}; serving stale price from ${lastKnown.cachedAt.toISOString()}: ${detail}`
      );
      return new StockPrice(symbol, lastKnown.price, lastKnown.cachedAt, 'stale', {
        provider: lastKnown.provider,
        staleReason: reason,
      });
    }

    console.error(`[stock-price] ${reason} for ${symbol} and no cached price: ${detail}`);
    const retryable = providerError ? providerError.retryable : true;
    throw new PriceUnavailableError(
      symbol,
      REASON_TEXT[reason],
      retryable,
      retryable ? RETRY_AFTER_SECONDS[reason] : undefined
    );
  }

  /**
   * Compute the current cache window in hours, derived from the system-
   * wide active-symbol count. The symbol count is memoized for
   * {@link SYMBOL_COUNT_MEMO_TTL_MS}; a repository failure during the
   * refresh falls back to the conservative 24-hour window so a transient
   * DB blip can never escalate API usage past the free-tier budget.
   */
  private async getCacheHours(): Promise<number> {
    const budget = this.priceProvider.dailyCallBudget ?? DAILY_API_CALL_BUDGET;
    if (!Number.isFinite(budget)) return UNLIMITED_PROVIDER_CACHE_HOURS;
    const symbolCount = await this.getSymbolCount();
    return Math.max(1, Math.ceil((symbolCount * 24) / budget));
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
