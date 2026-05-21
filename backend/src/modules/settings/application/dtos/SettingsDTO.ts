/**
 * Settings DTOs
 * 
 * Data Transfer Objects for Settings API requests and responses.
 */

import type { Currency } from '@shared-backend/types';
import type { AccountCardDisplaySettings, SnapshotFrequency } from '../../domain/Settings';

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
}

/**
 * Request DTO for updating Settings
 */
export interface UpdateSettingsDTO {
  primaryCurrency?: Currency;
  alphaVantageApiKey?: string;
  accountCardDisplay?: AccountCardDisplaySettings;
  snapshotFrequency?: SnapshotFrequency;
}
