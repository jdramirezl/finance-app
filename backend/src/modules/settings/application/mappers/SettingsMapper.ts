/**
 * Settings Mapper
 * 
 * Maps between Settings domain entity, persistence layer, and DTOs.
 */

import { Settings } from '../../domain/Settings';
import type { AccountCardDisplaySettings, SnapshotFrequency } from '../../domain/Settings';
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
  }): Settings {
    return new Settings(
      data.id,
      data.user_id,
      data.primary_currency as Currency,
      data.alpha_vantage_api_key ?? undefined,
      data.account_card_display ?? undefined,
      (data.snapshot_frequency as SnapshotFrequency) ?? undefined
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
      updated_at: new Date().toISOString(),
    };
  }
}
