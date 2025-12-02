/**
 * Exchange Rate API Service Implementation
 * 
 * Fetches exchange rates from external API (fawazahmed0/currency-api).
 * This is a free, open-source exchange rate API.
 */

import { injectable } from 'tsyringe';
import type { IExchangeRateAPIService } from './IExchangeRateAPIService';
import type { Currency } from '@shared-backend/types';

// Exchange API configuration (https://github.com/fawazahmed0/exchange-api)
const API_BASE_URL = 'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1';

interface ExchangeRatesResponse {
  date: string;
  [key: string]: string | number | { [key: string]: number };
}

@injectable()
export class ExchangeRateAPIService implements IExchangeRateAPIService {
  /**
   * Fetch exchange rate from external API
   * 
   * @param fromCurrency - From currency
   * @param toCurrency - To currency
   * @returns Exchange rate
   */
  async fetchRate(fromCurrency: Currency, toCurrency: Currency): Promise<number> {
    try {
      // Convert to lowercase for API
      const fromCode = fromCurrency.toLowerCase();
      const toCode = toCurrency.toLowerCase();

      // Build API URL - format: /currencies/{base_currency}.json
      const url = `${API_BASE_URL}/currencies/${fromCode}.json`;

      console.log(`[ExchangeRateAPI] Fetching rate: ${fromCurrency} -> ${toCurrency}`);

      // Fetch from Exchange API
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Exchange API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json() as ExchangeRatesResponse;

      // Extract rate for target currency
      const ratesData = data[fromCode] as { [key: string]: number };
      
      if (!ratesData || ratesData[toCode] === undefined) {
        throw new Error(`Exchange rate not found for ${fromCurrency} -> ${toCurrency}`);
      }

      const rate = ratesData[toCode];

      console.log(`[ExchangeRateAPI] Success: ${fromCurrency} -> ${toCurrency} = ${rate}`);

      return rate;

    } catch (error) {
      console.error('[ExchangeRateAPI] Error:', error);
      
      throw new Error(
        `Failed to fetch exchange rate: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}
