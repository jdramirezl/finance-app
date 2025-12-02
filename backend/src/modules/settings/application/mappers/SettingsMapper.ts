/**
 * Settings Mapper
 * 
 * Maps between Settings domain entity, persistence layer, and DTOs.
 */

import { Settings } from '../../domain/Settings';
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
  }): Settings {
    return new Settings(
      data.id,
      data.user_id,
      data.primary_currency as Currency,
      data.alpha_vantage_api_key ?? undefined
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
      updated_at: new Date().toISOString(),
    };
  }
}
