/**
 * Settings Mapper
 * 
 * Maps between Settings domain entity, persistence layer, and DTOs.
 */

import { Settings } from '../../domain/Settings';
import type { AccountCardDisplaySettings, DateFormatPreference, SnapshotFrequency } from '../../domain/Settings';
import type { SettingsResponseDTO } from '../dtos/SettingsDTO';
import type { Currency } from '@shared-backend/types';

export class SettingsMapper {
  /**
   * Convert domain entity to response DTO
   */
  static toDTO(settings: Settings): SettingsResponseDTO {
    return {
      id: settings.id,
      userId: settings.userId,
      primaryCurrency: settings.primaryCurrency,
      alphaVantageApiKey: settings.alphaVantageApiKey,
      accountCardDisplay: settings.accountCardDisplay,
      snapshotFrequency: settings.snapshotFrequency,
      defaultExpenseAccountId: settings.defaultExpenseAccountId,
      defaultExpensePocketId: settings.defaultExpensePocketId,
      defaultIncomeAccountId: settings.defaultIncomeAccountId,
      defaultIncomePocketId: settings.defaultIncomePocketId,
      dateFormat: settings.dateFormat,
      movementsPerPage: settings.movementsPerPage,
      reminderAdvanceDays: settings.reminderAdvanceDays,
      defaultCurrencyForNewAccounts: settings.defaultCurrencyForNewAccounts,
    };
  }

  /**
   * Convert database row to domain entity
   */
  static toDomain(data: {
    id: string;
    user_id: string;
    primary_currency: string;
    alpha_vantage_api_key?: string | null;
    account_card_display?: AccountCardDisplaySettings | null;
    snapshot_frequency?: string | null;
    default_expense_account_id?: string | null;
    default_expense_pocket_id?: string | null;
    default_income_account_id?: string | null;
    default_income_pocket_id?: string | null;
    date_format?: string | null;
    movements_per_page?: number | null;
    reminder_advance_days?: number | null;
    default_currency_for_new_accounts?: string | null;
  }): Settings {
    return new Settings(
      data.id,
      data.user_id,
      data.primary_currency as Currency,
      data.alpha_vantage_api_key ?? undefined,
      data.account_card_display ?? undefined,
      (data.snapshot_frequency as SnapshotFrequency) ?? undefined,
      data.default_expense_account_id ?? undefined,
      data.default_expense_pocket_id ?? undefined,
      data.default_income_account_id ?? undefined,
      data.default_income_pocket_id ?? undefined,
      (data.date_format as DateFormatPreference) ?? 'MMM d, yyyy',
      data.movements_per_page ?? 50,
      data.reminder_advance_days ?? 7,
      (data.default_currency_for_new_accounts as Currency) ?? 'USD'
    );
  }

  /**
   * Convert domain entity to database row
   */
  static toPersistence(settings: Settings) {
    return {
      id: settings.id,
      user_id: settings.userId,
      primary_currency: settings.primaryCurrency,
      alpha_vantage_api_key: settings.alphaVantageApiKey ?? null,
      account_card_display: settings.accountCardDisplay ?? null,
      snapshot_frequency: settings.snapshotFrequency ?? null,
      default_expense_account_id: settings.defaultExpenseAccountId ?? null,
      default_expense_pocket_id: settings.defaultExpensePocketId ?? null,
      default_income_account_id: settings.defaultIncomeAccountId ?? null,
      default_income_pocket_id: settings.defaultIncomePocketId ?? null,
      date_format: settings.dateFormat,
      movements_per_page: settings.movementsPerPage,
      reminder_advance_days: settings.reminderAdvanceDays,
      default_currency_for_new_accounts: settings.defaultCurrencyForNewAccounts,
      updated_at: new Date().toISOString(),
    };
  }
}
