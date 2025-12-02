/**
 * Convert Currency Use Case
 * 
 * Converts an amount from one currency to another using exchange rates.
 * Handles non-major currencies by converting via USD as intermediate.
 * 
 * **Feature: backend-migration, Property 55, 56**
 * 
 * Requirements: 15.3, 15.4
 */

import { inject, injectable } from 'tsyringe';
import type { ConvertCurrencyDTO, ConvertCurrencyResponseDTO } from '../dtos/ExchangeRateDTO';
import { GetExchangeRateUseCase } from './GetExchangeRateUseCase';
import { ValidationError } from '../../../../shared/errors/AppError';
import type { Currency } from '@shared-backend/types';

@injectable()
export class ConvertCurrencyUseCase {
  // Major currencies that have direct exchange rates
  private readonly majorCurrencies: Currency[] = ['USD', 'EUR', 'GBP'];

  constructor(
    @inject(GetExchangeRateUseCase) private getExchangeRateUseCase: GetExchangeRateUseCase
  ) {}

  /**
   * Execute the use case
   * 
   * @param dto - Convert currency DTO
   * @returns Conversion result DTO
   */
  async execute(dto: ConvertCurrencyDTO): Promise<ConvertCurrencyResponseDTO> {
    // Validate amount
    if (typeof dto.amount !== 'number' || isNaN(dto.amount)) {
      throw new ValidationError('Amount must be a valid number');
    }

    if (dto.amount < 0) {
      throw new ValidationError('Amount cannot be negative');
    }

    // Special case: same currency
    if (dto.fromCurrency === dto.toCurrency) {
      return {
        amount: dto.amount,
        fromCurrency: dto.fromCurrency,
        toCurrency: dto.toCurrency,
        convertedAmount: dto.amount,
        rate: 1.0,
      };
    }

    // Check if both currencies are major or if one is USD
    const fromIsMajor = this.majorCurrencies.includes(dto.fromCurrency);
    const toIsMajor = this.majorCurrencies.includes(dto.toCurrency);
    const hasUSD = dto.fromCurrency === 'USD' || dto.toCurrency === 'USD';

    // If both are major or one is USD, use direct conversion
    if ((fromIsMajor && toIsMajor) || hasUSD) {
      return await this.directConversion(dto);
    }

    // Otherwise, convert via USD as intermediate
    return await this.convertViaUSD(dto);
  }

  /**
   * Direct conversion between two currencies
   */
  private async directConversion(dto: ConvertCurrencyDTO): Promise<ConvertCurrencyResponseDTO> {
    // Get exchange rate
    const exchangeRateDTO = await this.getExchangeRateUseCase.execute(
      dto.fromCurrency,
      dto.toCurrency
    );

    // Calculate converted amount
    const convertedAmount = dto.amount * exchangeRateDTO.rate;

    return {
      amount: dto.amount,
      fromCurrency: dto.fromCurrency,
      toCurrency: dto.toCurrency,
      convertedAmount,
      rate: exchangeRateDTO.rate,
    };
  }

  /**
   * Convert via USD as intermediate currency
   * For example: MXN -> USD -> COP
   */
  private async convertViaUSD(dto: ConvertCurrencyDTO): Promise<ConvertCurrencyResponseDTO> {
    // Step 1: Convert from source currency to USD
    const toUSDRate = await this.getExchangeRateUseCase.execute(dto.fromCurrency, 'USD');
    const amountInUSD = dto.amount * toUSDRate.rate;

    // Step 2: Convert from USD to target currency
    const fromUSDRate = await this.getExchangeRateUseCase.execute('USD', dto.toCurrency);
    const convertedAmount = amountInUSD * fromUSDRate.rate;

    // Calculate effective rate (from source to target)
    const effectiveRate = toUSDRate.rate * fromUSDRate.rate;

    return {
      amount: dto.amount,
      fromCurrency: dto.fromCurrency,
      toCurrency: dto.toCurrency,
      convertedAmount,
      rate: effectiveRate,
    };
  }
}
