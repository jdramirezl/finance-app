/**
 * Exchange Rate DTOs
 * 
 * Data Transfer Objects for Exchange Rate API requests and responses.
 */

import type { Currency } from '@shared-backend/types';

/**
 * Response DTO for Exchange Rate
 */
export interface ExchangeRateResponseDTO {
  fromCurrency: Currency;
  toCurrency: Currency;
  rate: number;
  cachedAt: string; // ISO string
}

/**
 * Request DTO for Currency Conversion
 */
export interface ConvertCurrencyDTO {
  amount: number;
  fromCurrency: Currency;
  toCurrency: Currency;
}

/**
 * Response DTO for Currency Conversion
 */
export interface ConvertCurrencyResponseDTO {
  amount: number;
  fromCurrency: Currency;
  toCurrency: Currency;
  convertedAmount: number;
  rate: number;
}
