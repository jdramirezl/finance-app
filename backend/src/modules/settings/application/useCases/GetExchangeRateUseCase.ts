/**
 * Get Exchange Rate Use Case
 * 
 * Fetches exchange rate with 3-tier caching:
 * 1. Check database cache (24-hour expiration)
 * 2. Call external API if cache miss
 * 3. Cache result in database
 * 
 * **Feature: backend-migration, Property 53, 54**
 * 
 * Requirements: 15.1, 15.2
 */

import { inject, injectable } from 'tsyringe';
import type { IExchangeRateRepository } from '../../infrastructure/IExchangeRateRepository';
import type { IExchangeRateAPIService } from '../../infrastructure/IExchangeRateAPIService';
import type { ExchangeRateResponseDTO } from '../dtos/ExchangeRateDTO';
import { ExchangeRateMapper } from '../mappers/ExchangeRateMapper';
import { ExchangeRate } from '../../domain/ExchangeRate';
import type { Currency } from '@shared-backend/types';

@injectable()
export class GetExchangeRateUseCase {
  constructor(
    @inject('ExchangeRateRepository') private exchangeRateRepository: IExchangeRateRepository,
    @inject('ExchangeRateAPIService') private exchangeRateAPIService: IExchangeRateAPIService
  ) {}

  /**
   * Execute the use case
   * 
   * @param fromCurrency - From currency
   * @param toCurrency - To currency
   * @returns Exchange rate response DTO
   */
  async execute(fromCurrency: Currency, toCurrency: Currency): Promise<ExchangeRateResponseDTO> {
    // Special case: same currency
    if (fromCurrency === toCurrency) {
      const rate = new ExchangeRate(fromCurrency, toCurrency, 1.0, new Date());
      return ExchangeRateMapper.toDTO(rate);
    }

    // Step 1: Check database cache with 24-hour expiration
    const cachedRate = await this.exchangeRateRepository.findRate(fromCurrency, toCurrency);
    
    if (cachedRate && cachedRate.isValid()) {
      // Cache hit - return cached rate
      return ExchangeRateMapper.toDTO(cachedRate);
    }

    // Step 2: Cache miss - call external API
    const rateValue = await this.exchangeRateAPIService.fetchRate(fromCurrency, toCurrency);

    // Step 3: Create exchange rate value object and cache it
    const exchangeRate = new ExchangeRate(fromCurrency, toCurrency, rateValue, new Date());
    await this.exchangeRateRepository.saveRate(exchangeRate);

    // Return DTO
    return ExchangeRateMapper.toDTO(exchangeRate);
  }
}
