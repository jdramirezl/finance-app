/**
 * Finnhub quote provider.
 *
 * Free tier: 60 calls/minute, US stocks and ETFs (VOO, AMZN, ...).
 * Docs: https://finnhub.io/docs/api/quote
 *
 * The API key is sent in the X-Finnhub-Token header so it never appears
 * in URLs or logs.
 */

import type { IStockPriceProvider } from './IStockPriceProvider';
import { StockPriceProviderError, StockPriceProviderFailure } from './StockPriceProviderError';

interface FinnhubQuote {
  /** current price */
  c?: number;
  /** quote timestamp (unix seconds); 0 when the symbol is unknown */
  t?: number;
}

const REQUEST_TIMEOUT_MS = 8000;

export class FinnhubService implements IStockPriceProvider {
  readonly name = 'finnhub';
  readonly dailyCallBudget = Infinity;
  private readonly baseUrl = 'https://finnhub.io/api/v1/quote';

  constructor(private readonly apiKey: string) {}

  async fetchStockPrice(symbol: string): Promise<number> {
    const normalized = symbol.toUpperCase();
    const url = `${this.baseUrl}?symbol=${encodeURIComponent(normalized)}`;

    let response: Response;
    try {
      response = await fetch(url, {
        headers: { 'X-Finnhub-Token': this.apiKey },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch (error) {
      const detail = error instanceof Error ? error.name : 'unknown';
      throw this.fail(normalized, 'NETWORK', `request failed (${detail})`);
    }

    if (response.status === 429) throw this.fail(normalized, 'RATE_LIMITED', 'HTTP 429');
    if (response.status === 401 || response.status === 403) {
      throw this.fail(normalized, 'AUTH', `HTTP ${response.status}`);
    }
    if (!response.ok) throw this.fail(normalized, 'UPSTREAM', `HTTP ${response.status}`);

    let data: FinnhubQuote;
    try {
      data = (await response.json()) as FinnhubQuote;
    } catch {
      throw this.fail(normalized, 'UPSTREAM', 'response was not JSON');
    }

    if (typeof data.c !== 'number' || typeof data.t !== 'number') {
      throw this.fail(normalized, 'UPSTREAM', 'unexpected response shape');
    }
    if (data.c <= 0 && data.t === 0) {
      throw this.fail(normalized, 'SYMBOL_NOT_FOUND', 'no quote for symbol');
    }
    if (!Number.isFinite(data.c) || data.c <= 0) {
      throw this.fail(normalized, 'UPSTREAM', 'invalid price data');
    }
    return data.c;
  }

  private fail(symbol: string, reason: StockPriceProviderFailure, detail: string): StockPriceProviderError {
    const safe = detail.split(this.apiKey).join('***').slice(0, 300);
    return new StockPriceProviderError(symbol, reason, `Finnhub ${reason} for ${symbol}: ${safe}`);
  }
}
