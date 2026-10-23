/**
 * Contract for a stock price source (Finnhub, Alpha Vantage, or a fallback chain).
 */

export interface StockQuote {
  price: number;
  /** Which upstream answered, e.g. "finnhub". */
  provider: string;
}

export interface IStockPriceProvider {
  /** Short provider id used in logs and API responses. */
  readonly name?: string;
  /**
   * Upstream calls allowed per day. Drives the automatic cache window.
   * `Infinity` = effectively unlimited for our volume; undefined = assume
   * the Alpha Vantage free tier (25/day).
   */
  readonly dailyCallBudget?: number;
  /** Current price, or a StockPriceProviderError. */
  fetchStockPrice(symbol: string): Promise<number>;
  /** Same as fetchStockPrice, plus which provider answered. */
  fetchQuote?(symbol: string): Promise<StockQuote>;
}
