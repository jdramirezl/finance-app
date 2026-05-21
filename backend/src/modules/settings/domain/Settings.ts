/**
 * Settings Domain Entity
 * 
 * Represents user application settings with business rules and invariants.
 * This is the core domain model - no dependencies on infrastructure.
 */

import type { Currency } from '@shared-backend/types';

export type AccountCardDisplayMode = 'compact' | 'detailed';

export interface AccountCardDisplaySettings {
  regular: AccountCardDisplayMode;
  investment: AccountCardDisplayMode;
  cd: AccountCardDisplayMode;
}

export type SnapshotFrequency = 'daily' | 'weekly' | 'monthly' | 'manual';

export class Settings {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    public primaryCurrency: Currency,
    public alphaVantageApiKey?: string,
    public accountCardDisplay?: AccountCardDisplaySettings,
    public snapshotFrequency?: SnapshotFrequency
  ) {
    this.validate();
  }

  /**
   * Domain invariants - business rules that must always be true
   */
  private validate(): void {
    if (!this.userId?.trim()) {
      throw new Error('User ID cannot be empty');
    }

    const validCurrencies: Currency[] = ['USD', 'MXN', 'COP', 'EUR', 'GBP'];
    if (!validCurrencies.includes(this.primaryCurrency)) {
      throw new Error(`Invalid primary currency - must be one of: ${validCurrencies.join(', ')}`);
    }

    if (this.alphaVantageApiKey !== undefined && this.alphaVantageApiKey !== null) {
      if (typeof this.alphaVantageApiKey === 'string' && this.alphaVantageApiKey.trim() === '') {
        throw new Error('Alpha Vantage API key cannot be empty string');
      }
    }

    if (this.snapshotFrequency !== undefined) {
      const validFrequencies: SnapshotFrequency[] = ['daily', 'weekly', 'monthly', 'manual'];
      if (!validFrequencies.includes(this.snapshotFrequency)) {
        throw new Error(`Invalid snapshot frequency - must be one of: ${validFrequencies.join(', ')}`);
      }
    }
  }

  updatePrimaryCurrency(currency: Currency): void {
    this.primaryCurrency = currency;
    this.validate();
  }

  updateAlphaVantageApiKey(apiKey?: string): void {
    this.alphaVantageApiKey = apiKey;
    this.validate();
  }

  updateAccountCardDisplay(display: AccountCardDisplaySettings): void {
    this.accountCardDisplay = display;
  }

  updateSnapshotFrequency(frequency: SnapshotFrequency): void {
    this.snapshotFrequency = frequency;
    this.validate();
  }

  hasAlphaVantageApiKey(): boolean {
    return !!this.alphaVantageApiKey && this.alphaVantageApiKey.trim().length > 0;
  }

  toJSON() {
    return {
      id: this.id,
      userId: this.userId,
      primaryCurrency: this.primaryCurrency,
      alphaVantageApiKey: this.alphaVantageApiKey,
      accountCardDisplay: this.accountCardDisplay,
      snapshotFrequency: this.snapshotFrequency,
    };
  }
}
