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

export type DateFormatPreference = 'MMM d, yyyy' | 'dd/MM/yyyy' | 'MM/dd/yyyy' | 'yyyy-MM-dd';

export const VALID_DATE_FORMATS: DateFormatPreference[] = ['MMM d, yyyy', 'dd/MM/yyyy', 'MM/dd/yyyy', 'yyyy-MM-dd'];

export class Settings {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    public primaryCurrency: Currency,
    public alphaVantageApiKey?: string,
    public accountCardDisplay?: AccountCardDisplaySettings,
    public snapshotFrequency?: SnapshotFrequency,
    public defaultExpenseAccountId?: string,
    public defaultExpensePocketId?: string,
    public defaultIncomeAccountId?: string,
    public defaultIncomePocketId?: string,
    public dateFormat: DateFormatPreference = 'MMM d, yyyy',
    public movementsPerPage: number = 50,
    public reminderAdvanceDays: number = 7,
    public defaultCurrencyForNewAccounts: Currency = 'USD'
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

    if (!VALID_DATE_FORMATS.includes(this.dateFormat)) {
      throw new Error(`Invalid date format - must be one of: ${VALID_DATE_FORMATS.join(', ')}`);
    }

    if (this.movementsPerPage < 10 || this.movementsPerPage > 200) {
      throw new Error('Movements per page must be between 10 and 200');
    }

    if (this.reminderAdvanceDays < 1 || this.reminderAdvanceDays > 30) {
      throw new Error('Reminder advance days must be between 1 and 30');
    }

    const validCurrenciesForDefault: Currency[] = ['USD', 'MXN', 'COP', 'EUR', 'GBP'];
    if (!validCurrenciesForDefault.includes(this.defaultCurrencyForNewAccounts)) {
      throw new Error(`Invalid default currency for new accounts - must be one of: ${validCurrenciesForDefault.join(', ')}`);
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

  updateDefaultExpenseAccount(accountId?: string, pocketId?: string): void {
    this.defaultExpenseAccountId = accountId;
    this.defaultExpensePocketId = pocketId;
  }

  updateDefaultIncomeAccount(accountId?: string, pocketId?: string): void {
    this.defaultIncomeAccountId = accountId;
    this.defaultIncomePocketId = pocketId;
  }

  updateDateFormat(dateFormat: DateFormatPreference): void {
    this.dateFormat = dateFormat;
    this.validate();
  }

  updateMovementsPerPage(count: number): void {
    this.movementsPerPage = count;
    this.validate();
  }

  updateReminderAdvanceDays(days: number): void {
    this.reminderAdvanceDays = days;
    this.validate();
  }

  updateDefaultCurrencyForNewAccounts(currency: Currency): void {
    this.defaultCurrencyForNewAccounts = currency;
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
      defaultExpenseAccountId: this.defaultExpenseAccountId,
      defaultExpensePocketId: this.defaultExpensePocketId,
      defaultIncomeAccountId: this.defaultIncomeAccountId,
      defaultIncomePocketId: this.defaultIncomePocketId,
      dateFormat: this.dateFormat,
      movementsPerPage: this.movementsPerPage,
      reminderAdvanceDays: this.reminderAdvanceDays,
      defaultCurrencyForNewAccounts: this.defaultCurrencyForNewAccounts,
    };
  }
}
