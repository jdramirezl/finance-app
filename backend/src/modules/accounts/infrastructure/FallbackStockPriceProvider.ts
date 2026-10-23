/**
 * Tries stock price providers in order and returns the first success.
 *
 * Production order: Finnhub (60/min) → Alpha Vantage (25/day). The chain's
 * daily budget and the automatic cache window follow the primary provider.
 */

import type { IStockPriceProvider, StockQuote } from './IStockPriceProvider';
import { StockPriceProviderError } from './StockPriceProviderError';

export class FallbackStockPriceProvider implements IStockPriceProvider {
  readonly name: string;
  readonly dailyCallBudget?: number;

  constructor(private readonly providers: IStockPriceProvider[]) {
    if (providers.length === 0) throw new Error('FallbackStockPriceProvider needs at least one provider');
    this.name = providers.map((p) => p.name ?? 'unknown').join('+');
    this.dailyCallBudget = providers[0].dailyCallBudget;
  }

  async fetchStockPrice(symbol: string): Promise<number> {
    return (await this.fetchQuote(symbol)).price;
  }

  async fetchQuote(symbol: string): Promise<StockQuote> {
    const normalized = symbol.toUpperCase();
    const errors: Array<{ provider: string; error: StockPriceProviderError }> = [];

    for (const provider of this.providers) {
      const name = provider.name ?? 'unknown';
      try {
        const price = await provider.fetchStockPrice(normalized);
        if (errors.length > 0) {
          console.warn(
            `[stock-price] ${normalized} served by ${name} after: ${errors.map((e) => `${e.provider} ${e.error.reason}`).join(', ')}`
          );
        }
        return { price, provider: name };
      } catch (err) {
        const error = err instanceof StockPriceProviderError
          ? err
          : new StockPriceProviderError(normalized, 'UPSTREAM', err instanceof Error ? err.message : String(err));
        errors.push({ provider: name, error });
      }
    }

    // Unknown symbol only if every provider agrees; otherwise report the
    // most actionable failure (a retryable one first).
    const notFound = errors.every((e) => e.error.reason === 'SYMBOL_NOT_FOUND');
    const chosen = notFound
      ? errors[0].error
      : (errors.find((e) => e.error.retryable) ?? errors.find((e) => e.error.reason !== 'SYMBOL_NOT_FOUND')!).error;
    const summary = errors.map((e) => `${e.provider}: ${e.error.reason}`).join('; ');
    throw new StockPriceProviderError(normalized, chosen.reason, `All price providers failed for ${normalized} (${summary})`);
  }
}
