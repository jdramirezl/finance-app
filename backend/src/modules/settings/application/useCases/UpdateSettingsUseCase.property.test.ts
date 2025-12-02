/**
 * Property-Based Tests for UpdateSettingsUseCase
 * 
 * Feature: backend-migration, Property 51, 52
 * Validates: Requirements 14.2, 14.3
 * 
 * These tests verify that settings validation and updates work correctly
 * across a wide range of generated test cases.
 */

import 'reflect-metadata';
import fc from 'fast-check';
import { UpdateSettingsUseCase } from './UpdateSettingsUseCase';
import type { ISettingsRepository } from '../../infrastructure/ISettingsRepository';
import type { UpdateSettingsDTO } from '../dtos/SettingsDTO';
import type { Currency } from '@shared-backend/types';
import { Settings } from '../../domain/Settings';
import { ValidationError, NotFoundError } from '../../../../shared/errors/AppError';

describe('UpdateSettingsUseCase Property-Based Tests', () => {
  const validCurrencies: Currency[] = ['USD', 'MXN', 'COP', 'EUR', 'GBP'];

  describe('Property 51: Settings update validates currency', () => {
    it('should reject invalid currencies', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0), // userId
          fc.string({ minLength: 1, maxLength: 10 }).filter(s => 
            !validCurrencies.includes(s as Currency)
          ), // invalid currency
          async (userId: string, invalidCurrency: string) => {
            // Create existing settings
            const existingSettings = new Settings(
              'settings-id',
              userId,
              'USD'
            );

            // Create mock repository
            const mockRepo: jest.Mocked<ISettingsRepository> = {
              findByUserId: jest.fn().mockResolvedValue(existingSettings),
              save: jest.fn().mockResolvedValue(undefined),
              update: jest.fn().mockResolvedValue(undefined),
              createDefault: jest.fn().mockResolvedValue(undefined),
            };

            const useCase = new UpdateSettingsUseCase(mockRepo);

            const dto: UpdateSettingsDTO = {
              primaryCurrency: invalidCurrency as Currency,
            };

            // Should throw ValidationError for invalid currency
            await expect(useCase.execute(userId, dto)).rejects.toThrow(ValidationError);
            
            // Verify that update was NOT called
            expect(mockRepo.update).not.toHaveBeenCalled();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should accept all valid currencies', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0), // userId
          fc.constantFrom(...validCurrencies),
          async (userId: string, validCurrency: Currency) => {
            // Create existing settings with different currency
            const existingSettings = new Settings(
              'settings-id',
              userId,
              'USD'
            );

            // Create mock repository
            const mockRepo: jest.Mocked<ISettingsRepository> = {
              findByUserId: jest.fn().mockResolvedValue(existingSettings),
              save: jest.fn().mockResolvedValue(undefined),
              update: jest.fn().mockResolvedValue(undefined),
              createDefault: jest.fn().mockResolvedValue(undefined),
            };

            const useCase = new UpdateSettingsUseCase(mockRepo);

            const dto: UpdateSettingsDTO = {
              primaryCurrency: validCurrency,
            };

            // Should succeed with valid currency
            const result = await useCase.execute(userId, dto);

            expect(result.primaryCurrency).toBe(validCurrency);
            expect(mockRepo.update).toHaveBeenCalled();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should throw NotFoundError when settings do not exist', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 20 }), // userId
          fc.constantFrom(...validCurrencies),
          async (userId: string, currency: Currency) => {
            // Create mock repository that returns null (no settings)
            const mockRepo: jest.Mocked<ISettingsRepository> = {
              findByUserId: jest.fn().mockResolvedValue(null),
              save: jest.fn().mockResolvedValue(undefined),
              update: jest.fn().mockResolvedValue(undefined),
              createDefault: jest.fn().mockResolvedValue(undefined),
            };

            const useCase = new UpdateSettingsUseCase(mockRepo);

            const dto: UpdateSettingsDTO = {
              primaryCurrency: currency,
            };

            // Should throw NotFoundError
            await expect(useCase.execute(userId, dto)).rejects.toThrow(NotFoundError);
            
            // Verify that update was NOT called
            expect(mockRepo.update).not.toHaveBeenCalled();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 52: Settings update allows API key changes', () => {
    it('should allow setting API key to any non-empty string', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 20 }), // userId
          fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0), // API key
          async (userId: string, apiKey: string) => {
            // Create existing settings without API key
            const existingSettings = new Settings(
              'settings-id',
              userId,
              'USD'
            );

            // Create mock repository
            const mockRepo: jest.Mocked<ISettingsRepository> = {
              findByUserId: jest.fn().mockResolvedValue(existingSettings),
              save: jest.fn().mockResolvedValue(undefined),
              update: jest.fn().mockResolvedValue(undefined),
              createDefault: jest.fn().mockResolvedValue(undefined),
            };

            const useCase = new UpdateSettingsUseCase(mockRepo);

            const dto: UpdateSettingsDTO = {
              alphaVantageApiKey: apiKey,
            };

            // Should succeed
            const result = await useCase.execute(userId, dto);

            expect(result.alphaVantageApiKey).toBe(apiKey);
            expect(mockRepo.update).toHaveBeenCalled();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should allow clearing API key by setting to undefined', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0), // userId
          fc.string({ minLength: 5, maxLength: 100 }).filter(s => s.trim().length > 0), // existing API key
          async (userId: string, existingApiKey: string) => {
            // Create existing settings with API key
            const existingSettings = new Settings(
              'settings-id',
              userId,
              'USD',
              existingApiKey
            );

            // Create mock repository
            const mockRepo: jest.Mocked<ISettingsRepository> = {
              findByUserId: jest.fn().mockResolvedValue(existingSettings),
              save: jest.fn().mockResolvedValue(undefined),
              update: jest.fn().mockResolvedValue(undefined),
              createDefault: jest.fn().mockResolvedValue(undefined),
            };

            const useCase = new UpdateSettingsUseCase(mockRepo);

            const dto: UpdateSettingsDTO = {
              alphaVantageApiKey: undefined,
            };

            // Should succeed and clear the API key
            const result = await useCase.execute(userId, dto);

            expect(result.alphaVantageApiKey).toBeUndefined();
            expect(mockRepo.update).toHaveBeenCalled();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should allow updating both currency and API key simultaneously', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0), // userId
          fc.constantFrom(...validCurrencies),
          fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0), // API key
          async (userId: string, newCurrency: Currency, newApiKey: string) => {
            // Create existing settings
            const existingSettings = new Settings(
              'settings-id',
              userId,
              'USD',
              'old-api-key'
            );

            // Create mock repository
            const mockRepo: jest.Mocked<ISettingsRepository> = {
              findByUserId: jest.fn().mockResolvedValue(existingSettings),
              save: jest.fn().mockResolvedValue(undefined),
              update: jest.fn().mockResolvedValue(undefined),
              createDefault: jest.fn().mockResolvedValue(undefined),
            };

            const useCase = new UpdateSettingsUseCase(mockRepo);

            const dto: UpdateSettingsDTO = {
              primaryCurrency: newCurrency,
              alphaVantageApiKey: newApiKey,
            };

            // Should succeed and update both fields
            const result = await useCase.execute(userId, dto);

            expect(result.primaryCurrency).toBe(newCurrency);
            expect(result.alphaVantageApiKey).toBe(newApiKey);
            expect(mockRepo.update).toHaveBeenCalled();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve existing values when not updating them', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0), // userId
          fc.constantFrom(...validCurrencies), // existing currency
          fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0), // existing API key
          fc.constantFrom(...validCurrencies), // new currency
          async (userId: string, existingCurrency: Currency, existingApiKey: string, newCurrency: Currency) => {
            // Create existing settings
            const existingSettings = new Settings(
              'settings-id',
              userId,
              existingCurrency,
              existingApiKey
            );

            // Create mock repository
            const mockRepo: jest.Mocked<ISettingsRepository> = {
              findByUserId: jest.fn().mockResolvedValue(existingSettings),
              save: jest.fn().mockResolvedValue(undefined),
              update: jest.fn().mockResolvedValue(undefined),
              createDefault: jest.fn().mockResolvedValue(undefined),
            };

            const useCase = new UpdateSettingsUseCase(mockRepo);

            // Only update currency, not API key
            const dto: UpdateSettingsDTO = {
              primaryCurrency: newCurrency,
            };

            // Should succeed and preserve API key
            const result = await useCase.execute(userId, dto);

            expect(result.primaryCurrency).toBe(newCurrency);
            expect(result.alphaVantageApiKey).toBe(existingApiKey); // Preserved
            expect(mockRepo.update).toHaveBeenCalled();
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
