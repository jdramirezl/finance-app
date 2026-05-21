/**
 * Update Settings Use Case
 * 
 * Updates user settings with validation.
 * 
 * **Feature: backend-migration, Property 51, 52**
 * 
 * Requirements: 14.2, 14.3
 */

import { inject, injectable } from 'tsyringe';
import type { ISettingsRepository } from '../../infrastructure/ISettingsRepository';
import type { UpdateSettingsDTO, SettingsResponseDTO } from '../dtos/SettingsDTO';
import { SettingsMapper } from '../mappers/SettingsMapper';
import { NotFoundError, ValidationError } from '../../../../shared/errors/AppError';
import type { Currency } from '@shared-backend/types';

@injectable()
export class UpdateSettingsUseCase {
  constructor(
    @inject('SettingsRepository') private settingsRepository: ISettingsRepository
  ) {}

  /**
   * Execute the use case
   * 
   * @param userId - User ID
   * @param dto - Update settings DTO
   * @returns Updated settings response DTO
   * @throws NotFoundError if settings not found
   * @throws ValidationError if currency is invalid
   */
  async execute(userId: string, dto: UpdateSettingsDTO): Promise<SettingsResponseDTO> {
    // Fetch existing settings
    const settings = await this.settingsRepository.findByUserId(userId);

    if (!settings) {
      throw new NotFoundError('Settings not found for user');
    }

    // Validate and update primary currency if provided
    if (dto.primaryCurrency !== undefined) {
      const validCurrencies: Currency[] = ['USD', 'MXN', 'COP', 'EUR', 'GBP'];
      if (!validCurrencies.includes(dto.primaryCurrency)) {
        throw new ValidationError(
          `Invalid primary currency - must be one of: ${validCurrencies.join(', ')}`
        );
      }
      settings.updatePrimaryCurrency(dto.primaryCurrency);
    }

    // Update Alpha Vantage API key if provided (including explicit undefined to clear)
    if ('alphaVantageApiKey' in dto) {
      settings.updateAlphaVantageApiKey(dto.alphaVantageApiKey);
    }

    // Save core settings via domain entity
    await this.settingsRepository.update(settings);

    // Save additional fields directly (accountCardDisplay, snapshotFrequency, etc.)
    // These bypass the domain entity since they're simple preferences without business rules
    const extraFields: Record<string, unknown> = {};
    if ('accountCardDisplay' in dto) extraFields.account_card_display = dto.accountCardDisplay;
    if ('snapshotFrequency' in dto) extraFields.snapshot_frequency = dto.snapshotFrequency;
    if (Object.keys(extraFields).length > 0) {
      await this.settingsRepository.updateFields(userId, extraFields);
    }

    // Re-fetch to return the full updated state
    const updated = await this.settingsRepository.findByUserId(userId);
    return SettingsMapper.toDTO(updated!);
  }
}
