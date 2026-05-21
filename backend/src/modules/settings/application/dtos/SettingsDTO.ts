/**
 * Settings DTOs
 * 
 * Data Transfer Objects for Settings API requests and responses.
 */

import type { Currency } from '@shared-backend/types';
import type { AccountCardDisplaySettings, DateFormatPreference, SnapshotFrequency } from '../../domain/Settings';

/**
 * Response DTO for Settings
 */
export interface SettingsResponseDTO {
  id: string;
  userId: string;
  primaryCurrency: Currency;
  alphaVantageApiKey?: string;
  accountCardDisplay?: AccountCardDisplaySettings;
  snapshotFrequency?: SnapshotFrequency;
  defaultExpenseAccountId?: string;
  defaultExpensePocketId?: string;
  defaultIncomeAccountId?: string;
  defaultIncomePocketId?: string;
  dateFormat: string;
  movementsPerPage: number;
  reminderAdvanceDays: number;
  defaultCurrencyForNewAccounts: Currency;
}

/**
 * Request DTO for updating Settings
 */
export interface UpdateSettingsDTO {
  primaryCurrency?: Currency;
  alphaVantageApiKey?: string;
  accountCardDisplay?: AccountCardDisplaySettings;
  snapshotFrequency?: SnapshotFrequency;
  defaultExpenseAccountId?: string;
  defaultExpensePocketId?: string;
  defaultIncomeAccountId?: string;
  defaultIncomePocketId?: string;
  dateFormat?: DateFormatPreference;
  movementsPerPage?: number;
  reminderAdvanceDays?: number;
  defaultCurrencyForNewAccounts?: Currency;
}
