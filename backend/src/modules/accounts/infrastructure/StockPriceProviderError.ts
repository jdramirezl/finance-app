/**
 * Typed failure from a stock price provider (Alpha Vantage today).
 *
 * The use case decides what to do with it (serve a stale cached price,
 * or surface PRICE_UNAVAILABLE / NOT_FOUND) instead of letting a generic
 * Error bubble up as an HTTP 500.
 */

export type StockPriceProviderFailure =
  /** Free-tier daily quota (25/day) or burst limit (1 req/s) hit. */
  | 'RATE_LIMITED'
  /** API key missing, invalid or revoked. */
  | 'AUTH'
  /** Provider has no quote for this symbol. */
  | 'SYMBOL_NOT_FOUND'
  /** Provider returned 5xx or a body we can't parse. */
  | 'UPSTREAM'
  /** Request never reached the provider (DNS, TLS, timeout). */
  | 'NETWORK';

const RETRYABLE: ReadonlySet<StockPriceProviderFailure> = new Set(['RATE_LIMITED', 'UPSTREAM', 'NETWORK']);

export class StockPriceProviderError extends Error {
  readonly retryable: boolean;

  constructor(
    public readonly symbol: string,
    public readonly reason: StockPriceProviderFailure,
    message: string
  ) {
    super(message);
    this.name = 'StockPriceProviderError';
    this.retryable = RETRYABLE.has(reason);
  }
}
