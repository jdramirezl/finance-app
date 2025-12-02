/**
 * Exchange Rate Mapper
 * 
 * Maps between ExchangeRate value object, persistence layer, and DTOs.
 */

import { ExchangeRate } from '../../domain/ExchangeRate';
import type { ExchangeRateResponseDTO } from '../dtos/ExchangeRateDTO';
import type { Currency } from '@shared-backend/types';

export class ExchangeRateMapper {
  /**
   * Convert value object to response DTO
   */
  static toDTO(exchangeRate: ExchangeRate): ExchangeRateResponseDTO {
    return {
      fromCurrency: exchangeRate.fromCurrency,
      toCurrency: exchangeRate.toCurrency,
      rate: exchangeRate.rate,
      cachedAt: exchangeRate.cachedAt.toISOString(),
    };
  }

  /**
   * Convert database row to value object
   */
  static toDomain(data: {
    base_currency: string;
    target_currency: string;
    rate: number;
    last_updated: string | Date;
  }): ExchangeRate {
    return new ExchangeRate(
      data.base_currency as Currency,
      data.target_currency as Currency,
      data.rate,
      typeof data.last_updated === 'string' ? new Date(data.last_updated) : data.last_updated
    );
  }

  /**
   * Convert value object to database row
   */
  static toPersistence(exchangeRate: ExchangeRate) {
    return {
      base_currency: exchangeRate.fromCurrency,
      target_currency: exchangeRate.toCurrency,
      rate: exchangeRate.rate,
      last_updated: exchangeRate.cachedAt.toISOString(),
    };
  }
}
