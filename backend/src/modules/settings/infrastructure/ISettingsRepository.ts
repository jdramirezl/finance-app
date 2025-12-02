/**
 * Settings Repository Interface
 * 
 * Defines the contract for Settings persistence operations.
 * Infrastructure layer implements this interface.
 */

import type { Settings } from '../domain/Settings';

export interface ISettingsRepository {
  /**
   * Find settings by user ID
   * 
   * @param userId - User ID
   * @returns Settings or null if not found
   */
  findByUserId(userId: string): Promise<Settings | null>;

  /**
   * Save or update settings for a user
   * 
   * @param settings - Settings entity
   */
  save(settings: Settings): Promise<void>;

  /**
   * Update existing settings
   * 
   * @param settings - Settings entity
   */
  update(settings: Settings): Promise<void>;

  /**
   * Create default settings for a new user
   * 
   * @param userId - User ID
   * @returns Created settings
   */
  createDefault(userId: string): Promise<Settings>;
}
