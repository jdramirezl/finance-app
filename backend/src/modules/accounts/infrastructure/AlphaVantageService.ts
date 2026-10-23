/**
 * Alpha Vantage Service Implementation
 *
 * Implements IAlphaVantageService for fetching stock prices from Alpha Vantage API.
 *
 * API Documentation: https://www.alphavantage.co/documentation/
 *
 * Free-tier limits: 25 requests/day and 1 request/second. Alpha Vantage
 * signals both with HTTP 200 and an "Information" (or older "Note") body,
 * so every failure is classified into a {@link StockPriceProviderError}
 * that callers can act on (serve a stale price, return 503, ...).
 *
 * Requirements: 13.4
 */

import { injectable } from 'tsyringe';
import type { IAlphaVantageService } from './IAlphaVantageService';
import { StockPriceProviderError, StockPriceProviderFailure } from './StockPriceProviderError';

interface AlphaVantageGlobalQuoteResponse {
  'Global Quote'?: {
    '01. symbol'?: string;
    '05. price'?: string;
  };
  'Error Message'?: string;
  'Note'?: string;
  'Information'?: string;
}

const RATE_LIMIT_PATTERN = /rate limit|requests per (day|second|minute)|call frequency|spreading out|premium/i;
const AUTH_PATTERN = /api ?key.*(invalid|missing)|invalid api ?key|claim your free api key/i;

/** Burst limit is 1 req/s; keep a small margin. */
const DEFAULT_MIN_INTERVAL_MS = 1100;
/** One retry after a rate-limit answer, which is usually the burst limit. */
const DEFAULT_RATE_LIMIT_RETRY_DELAY_MS = 1500;
const REQUEST_TIMEOUT_MS = 8000;

/**
 * Process-wide throttle. The service is registered as transient in DI, so
 * the schedule has to live at module level to space out calls made through
 * different instances (e.g. VOO and AMZN requested in parallel).
 */
let nextSlotAt = 0;

async function waitForSlot(minIntervalMs: number): Promise<void> {
  const now = Date.now();
  const slot = Math.max(now, nextSlotAt);
  nextSlotAt = slot + minIntervalMs;
  if (slot > now) {
    await new Promise((resolve) => setTimeout(resolve, slot - now));
  }
}

@injectable()
export class AlphaVantageService implements IAlphaVantageService {
  private readonly baseUrl = 'https://www.alphavantage.co/query';
  private readonly apiKey: string;

  /** Minimum spacing between provider calls (overridable in tests). */
  minIntervalMs = DEFAULT_MIN_INTERVAL_MS;
  /** Delay before the single retry after a rate-limit answer (overridable in tests). */
  rateLimitRetryDelayMs = DEFAULT_RATE_LIMIT_RETRY_DELAY_MS;

  constructor() {
    const apiKey = process.env.ALPHA_VANTAGE_API_KEY;

    if (!apiKey && process.env.NODE_ENV === 'production') {
      throw new Error('Alpha Vantage API key missing: ALPHA_VANTAGE_API_KEY required');
    }

    // Use 'demo' for testing/development if no key provided
    // Note: demo key has rate limits and may not work for all symbols
    this.apiKey = apiKey || 'demo';

    if (!apiKey) {
      console.warn('⚠️  Alpha Vantage API key not configured. Using demo key with limited functionality.');
    }
  }

  /** Reset the shared throttle between tests. */
  static resetThrottleForTests(): void {
    nextSlotAt = 0;
  }

  /**
   * Fetch current stock price from Alpha Vantage API (GLOBAL_QUOTE).
   *
   * @param symbol - Stock symbol (e.g., 'VOO', 'AAPL')
   * @returns Current stock price
   * @throws StockPriceProviderError, classified by reason
   */
  async fetchStockPrice(symbol: string): Promise<number> {
    const normalizedSymbol = symbol.toUpperCase();
    try {
      return await this.fetchOnce(normalizedSymbol);
    } catch (error) {
      if (error instanceof StockPriceProviderError && error.reason === 'RATE_LIMITED') {
        await new Promise((resolve) => setTimeout(resolve, this.rateLimitRetryDelayMs));
        return this.fetchOnce(normalizedSymbol);
      }
      throw error;
    }
  }

  private async fetchOnce(symbol: string): Promise<number> {
    await waitForSlot(this.minIntervalMs);

    const url = new URL(this.baseUrl);
    url.searchParams.append('function', 'GLOBAL_QUOTE');
    url.searchParams.append('symbol', symbol);
    url.searchParams.append('apikey', this.apiKey);

    let response: Response;
    try {
      response = await fetch(url.toString(), { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
    } catch (error) {
      const detail = error instanceof Error ? error.name : 'unknown';
      throw this.fail(symbol, 'NETWORK', `request failed (${detail})`);
    }

    if (response.status === 429) {
      throw this.fail(symbol, 'RATE_LIMITED', 'HTTP 429');
    }
    if (response.status === 401 || response.status === 403) {
      throw this.fail(symbol, 'AUTH', `HTTP ${response.status}`);
    }
    if (!response.ok) {
      throw this.fail(symbol, 'UPSTREAM', `HTTP ${response.status}`);
    }

    let data: AlphaVantageGlobalQuoteResponse;
    try {
      data = (await response.json()) as AlphaVantageGlobalQuoteResponse;
    } catch {
      throw this.fail(symbol, 'UPSTREAM', 'response was not JSON');
    }

    const notice = data['Information'] ?? data['Note'];
    if (notice) {
      if (AUTH_PATTERN.test(notice)) throw this.fail(symbol, 'AUTH', notice);
      if (RATE_LIMIT_PATTERN.test(notice)) throw this.fail(symbol, 'RATE_LIMITED', notice);
      throw this.fail(symbol, 'UPSTREAM', notice);
    }

    if (data['Error Message']) {
      throw this.fail(symbol, 'SYMBOL_NOT_FOUND', data['Error Message']);
    }

    const rawPrice = data['Global Quote']?.['05. price'];
    if (!rawPrice) {
      throw this.fail(symbol, 'SYMBOL_NOT_FOUND', 'no price data in response');
    }

    const price = parseFloat(rawPrice);
    if (isNaN(price) || price < 0) {
      throw this.fail(symbol, 'UPSTREAM', 'invalid price data');
    }

    return price;
  }

  private fail(symbol: string, reason: StockPriceProviderFailure, detail: string): StockPriceProviderError {
    const safeDetail = detail.split(this.apiKey).join('***').slice(0, 300);
    return new StockPriceProviderError(symbol, reason, `Alpha Vantage ${reason} for ${symbol}: ${safeDetail}`);
  }

  /**
   * Test API connectivity (useful for health checks)
   *
   * @returns true if API is accessible, false otherwise
   */
  async testConnection(): Promise<boolean> {
    try {
      // Use a well-known symbol for testing
      await this.fetchStockPrice('IBM');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get API key status (for debugging)
   *
   * @returns Object with API key status
   */
  getApiKeyStatus(): { configured: boolean; isDemo: boolean } {
    return {
      configured: !!this.apiKey,
      isDemo: this.apiKey === 'demo',
    };
  }
}
