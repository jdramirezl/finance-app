/**
 * Get Settings Use Case
 * 
 * Fetches user settings from the repository.
 * 
 * **Feature: backend-migration, Property N/A**
 * 
 * Requirements: 14.1
 */

import { inject, injectable } from 'tsyringe';
import type { ISettingsRepository } from '../../infrastructure/ISettingsRepository';
import type { SettingsResponseDTO } from '../dtos/SettingsDTO';
import { SettingsMapper } from '../mappers/SettingsMapper';
import { NotFoundError } from '../../../../shared/errors/AppError';

@injectable()
export class GetSettingsUseCase {
  constructor(
    @inject('SettingsRepository') private settingsRepository: ISettingsRepository
  ) {}

  /**
   * Execute the use case
   * 
   * @param userId - User ID
   * @returns Settings response DTO
   * @throws NotFoundError if settings not found
   */
  async execute(userId: string): Promise<SettingsResponseDTO> {
    // Fetch settings from repository
    const settings = await this.settingsRepository.findByUserId(userId);

    // Check if settings exist
    if (!settings) {
      throw new NotFoundError('Settings not found for user');
    }

    // Convert to DTO and return
    return SettingsMapper.toDTO(settings);
  }
}
