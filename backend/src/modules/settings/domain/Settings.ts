/**
 * Settings Domain Entity
 * 
 * Represents user application settings with business rules and invariants.
 * This is the core domain model - no dependencies on infrastructure.
 */

import type { Currency } from '@shared-backend/types';

export class Settings {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    public primaryCurrency: Currency,
    public alphaVantageApiKey?: string
  ) {
    this.validate();
  }

  /**
   * Domain invariants - business rules that must always be true
   */
  private validate(): void {
    // Validate userId
    if (!this.userId?.trim()) {
      throw new Error('User ID cannot be empty');
    }

    // Validate primary currency
    const validCurrencies: Currency[] = ['USD', 'MXN', 'COP', 'EUR', 'GBP'];
    if (!validCurrencies.includes(this.primaryCurrency)) {
      throw new Error(`Invalid primary currency - must be one of: ${validCurrencies.join(', ')}`);
    }

    // Validate API key if provided (basic validation - not empty string)
    if (this.alphaVantageApiKey !== undefined && this.alphaVantageApiKey !== null) {
      if (typeof this.alphaVantageApiKey === 'string' && this.alphaVantageApiKey.trim() === '') {
        throw new Error('Alpha Vantage API key cannot be empty string');
      }
    }
  }

  /**
   * Update primary currency
   * 
   * @param currency - New primary currency
   */
  updatePrimaryCurrency(currency: Currency): void {
    this.primaryCurrency = currency;
    this.validate();
  }

  /**
   * Update Alpha Vantage API key
   * 
   * @param apiKey - New API key (or undefined to clear)
   */
  updateAlphaVantageApiKey(apiKey?: string): void {
    this.alphaVantageApiKey = apiKey;
    this.validate();
  }

  /**
   * Check if Alpha Vantage API key is configured
   */
  hasAlphaVantageApiKey(): boolean {
    return !!this.alphaVantageApiKey && this.alphaVantageApiKey.trim().length > 0;
  }

  /**
   * Convert to plain object (for serialization)
   */
  toJSON() {
    return {
      id: this.id,
      userId: this.userId,
      primaryCurrency: this.primaryCurrency,
      alphaVantageApiKey: this.alphaVantageApiKey,
    };
  }
}
