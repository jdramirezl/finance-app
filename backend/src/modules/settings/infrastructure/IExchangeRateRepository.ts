/**
 * Exchange Rate Repository Interface
 * 
 * Defines the contract for ExchangeRate caching operations.
 * Infrastructure layer implements this interface.
 */

import type { ExchangeRate } from '../domain/ExchangeRate';
import type { Currency } from '@shared-backend/types';

export interface IExchangeRateRepository {
  /**
   * Find cached exchange rate by currency pair
   * 
   * @param fromCurrency - Source currency
   * @param toCurrency - Target currency
   * @returns ExchangeRate or null if not found or expired
   */
  findRate(
    fromCurrency: Currency,
    toCurrency: Currency
  ): Promise<ExchangeRate | null>;

  /**
   * Save exchange rate to cache
   * 
   * @param exchangeRate - ExchangeRate value object
   */
  saveRate(exchangeRate: ExchangeRate): Promise<void>;

  /**
   * Delete expired exchange rates from cache
   * 
   * @returns Number of deleted records
   */
  deleteExpired(): Promise<number>;
}
