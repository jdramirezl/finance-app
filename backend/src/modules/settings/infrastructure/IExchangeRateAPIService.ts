/**
 * Exchange Rate API Service Interface
 * 
 * Defines the contract for fetching exchange rates from external APIs.
 * Infrastructure layer implements this interface.
 */

import type { Currency } from '@shared-backend/types';

export interface IExchangeRateAPIService {
  /**
   * Fetch exchange rate from external API
   * 
   * @param fromCurrency - From currency
   * @param toCurrency - To currency
   * @returns Exchange rate
   */
  fetchRate(fromCurrency: Currency, toCurrency: Currency): Promise<number>;
}
