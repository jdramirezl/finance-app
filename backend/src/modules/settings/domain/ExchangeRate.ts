/**
 * ExchangeRate Value Object
 * 
 * Represents an exchange rate between two currencies with caching metadata.
 * This is a value object - immutable and defined by its values.
 */

import type { Currency } from '@shared-backend/types';

export class ExchangeRate {
  constructor(
    public readonly fromCurrency: Currency,
    public readonly toCurrency: Currency,
    public readonly rate: number,
    public readonly cachedAt: Date,
    public readonly source?: 'cache' | 'db' | 'api'
  ) {
    this.validate();
  }

  /**
   * Domain invariants - business rules that must always be true
   */
  private validate(): void {
    // Validate currencies
    const validCurrencies: Currency[] = ['USD', 'MXN', 'COP', 'EUR', 'GBP'];

    if (!validCurrencies.includes(this.fromCurrency)) {
      throw new Error(`Invalid from currency - must be one of: ${validCurrencies.join(', ')}`);
    }

    if (!validCurrencies.includes(this.toCurrency)) {
      throw new Error(`Invalid to currency - must be one of: ${validCurrencies.join(', ')}`);
    }

    // Validate rate
    if (typeof this.rate !== 'number' || isNaN(this.rate)) {
      throw new Error('Exchange rate must be a valid number');
    }

    if (this.rate <= 0) {
      throw new Error('Exchange rate must be positive');
    }

    // Validate cachedAt
    if (!(this.cachedAt instanceof Date)) {
      throw new Error('Cached at must be a valid Date');
    }

    if (isNaN(this.cachedAt.getTime())) {
      throw new Error('Cached at must be a valid Date');
    }
  }

  /**
   * Check if the cached exchange rate has expired
   * Exchange rates are cached for 24 hours
   * 
   * @returns true if expired, false if still valid
   */
  isExpired(): boolean {
    const now = new Date();
    const expirationTime = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    const timeSinceCached = now.getTime() - this.cachedAt.getTime();

    return timeSinceCached >= expirationTime;
  }

  /**
   * Check if the cached exchange rate is still valid (not expired)
   * 
   * @returns true if valid, false if expired
   */
  isValid(): boolean {
    return !this.isExpired();
  }

  /**
   * Get the age of the cached rate in milliseconds
   * 
   * @returns Age in milliseconds
   */
  getAge(): number {
    const now = new Date();
    return now.getTime() - this.cachedAt.getTime();
  }

  /**
   * Get the age of the cached rate in hours
   * 
   * @returns Age in hours
   */
  getAgeInHours(): number {
    return this.getAge() / (60 * 60 * 1000);
  }

  /**
   * Convert an amount using this exchange rate
   * 
   * @param amount - Amount to convert
   * @returns Converted amount
   */
  convert(amount: number): number {
    if (typeof amount !== 'number' || isNaN(amount)) {
      throw new Error('Amount must be a valid number');
    }

    if (amount < 0) {
      throw new Error('Amount cannot be negative');
    }

    return amount * this.rate;
  }

  /**
   * Get the inverse exchange rate
   * For example, if this is USD->MXN at 20, inverse is MXN->USD at 0.05
   * 
   * @returns New ExchangeRate with inverted currencies and rate
   */
  inverse(): ExchangeRate {
    return new ExchangeRate(
      this.toCurrency,
      this.fromCurrency,
      1 / this.rate,
      this.cachedAt
    );
  }

  /**
   * Check if this exchange rate matches the given currency pair
   * 
   * @param from - From currency
   * @param to - To currency
   * @returns true if matches
   */
  matches(from: Currency, to: Currency): boolean {
    return this.fromCurrency === from && this.toCurrency === to;
  }

  /**
   * Convert to plain object (for serialization)
   */
  toJSON() {
    return {
      fromCurrency: this.fromCurrency,
      toCurrency: this.toCurrency,
      rate: this.rate,
      cachedAt: this.cachedAt.toISOString(),
    };
  }

  /**
   * Create from plain object (for deserialization)
   */
  static fromJSON(json: {
    fromCurrency: Currency;
    toCurrency: Currency;
    rate: number;
    cachedAt: string | Date;
  }): ExchangeRate {
    return new ExchangeRate(
      json.fromCurrency,
      json.toCurrency,
      json.rate,
      typeof json.cachedAt === 'string' ? new Date(json.cachedAt) : json.cachedAt
    );
  }
}
