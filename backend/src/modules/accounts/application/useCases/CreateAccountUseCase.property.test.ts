/**
 * Property-Based Tests for CreateAccountUseCase
 * 
 * Feature: backend-migration, Property 6: Account uniqueness is enforced
 * Validates: Requirements 4.2
 * 
 * These tests verify that account uniqueness constraints are properly enforced
 * across a wide range of generated test cases.
 */

import 'reflect-metadata';
import fc from 'fast-check';
import { CreateAccountUseCase } from './CreateAccountUseCase';
import type { IAccountRepository } from '../../infrastructure/IAccountRepository';
import type { CreateAccountDTO } from '../dtos/AccountDTO';
import type { Currency } from '@shared-backend/types';
import { ConflictError } from '../../../../shared/errors/AppError';

describe('CreateAccountUseCase Property-Based Tests', () => {
  const validCurrencies: Currency[] = ['USD', 'MXN', 'COP', 'EUR', 'GBP'];

  // Helper to generate valid hex colors
  const validHexColor = () => 
    fc.tuple(
      fc.integer({ min: 0, max: 255 }),
      fc.integer({ min: 0, max: 255 }),
      fc.integer({ min: 0, max: 255 })
    ).map(([r, g, b]) => 
      `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
    );

  describe('Property 6: Account uniqueness is enforced', () => {
    it('should reject duplicate accounts with same name and currency', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          fc.constantFrom(...validCurrencies),
          validHexColor(),
          fc.string({ minLength: 1, maxLength: 20 }), // userId
          async (name: string, currency: Currency, color: string, userId: string) => {
            // Create mock repository that simulates an existing account
            const mockRepo: jest.Mocked<IAccountRepository> = {
              save: jest.fn().mockResolvedValue(undefined),
              findById: jest.fn().mockResolvedValue(null),
              findAllByUserId: jest.fn().mockResolvedValue([]),
              existsByNameAndCurrency: jest.fn().mockResolvedValue(true), // Account exists
              existsByNameAndCurrencyExcludingId: jest.fn().mockResolvedValue(false),
              update: jest.fn().mockResolvedValue(undefined),
              delete: jest.fn().mockResolvedValue(undefined),
              updateDisplayOrders: jest.fn().mockResolvedValue(undefined),
            };

            const useCase = new CreateAccountUseCase(mockRepo);

            const dto: CreateAccountDTO = {
              name: name.trim(),
              color,
              currency,
              type: 'normal',
            };

            // Attempting to create a duplicate account should throw ConflictError
            await expect(useCase.execute(dto, userId)).rejects.toThrow(ConflictError);
            
            // Verify that existsByNameAndCurrency was called with correct parameters
            expect(mockRepo.existsByNameAndCurrency).toHaveBeenCalledWith(
              name.trim(),
              currency,
              userId
            );
            
            // Verify that save was NOT called since uniqueness check failed
            expect(mockRepo.save).not.toHaveBeenCalled();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should allow accounts with same name but different currency', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          fc.constantFrom(...validCurrencies),
          fc.constantFrom(...validCurrencies),
          validHexColor(),
          fc.string({ minLength: 1, maxLength: 20 }), // userId
          async (name: string, currency1: Currency, currency2: Currency, color: string, userId: string) => {
            // Skip if currencies are the same (that would be a duplicate)
            if (currency1 === currency2) {
              return;
            }

            // Create mock repository that returns false for uniqueness check
            const mockRepo: jest.Mocked<IAccountRepository> = {
              save: jest.fn().mockResolvedValue(undefined),
              findById: jest.fn().mockResolvedValue(null),
              findAllByUserId: jest.fn().mockResolvedValue([]),
              existsByNameAndCurrency: jest.fn().mockResolvedValue(false), // No duplicate
              existsByNameAndCurrencyExcludingId: jest.fn().mockResolvedValue(false),
              update: jest.fn().mockResolvedValue(undefined),
              delete: jest.fn().mockResolvedValue(undefined),
              updateDisplayOrders: jest.fn().mockResolvedValue(undefined),
            };

            const useCase = new CreateAccountUseCase(mockRepo);

            const dto: CreateAccountDTO = {
              name: name.trim(),
              color,
              currency: currency2,
              type: 'normal',
            };

            // Should succeed since currency is different
            const result = await useCase.execute(dto, userId);

            expect(result.name).toBe(name.trim());
            expect(result.currency).toBe(currency2);
            expect(mockRepo.save).toHaveBeenCalled();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should allow accounts with different names but same currency', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          fc.constantFrom(...validCurrencies),
          validHexColor(),
          fc.string({ minLength: 1, maxLength: 20 }), // userId
          async (name1: string, name2: string, currency: Currency, color: string, userId: string) => {
            // Skip if names are the same (that would be a duplicate)
            if (name1.trim() === name2.trim()) {
              return;
            }

            // Create mock repository that returns false for uniqueness check
            const mockRepo: jest.Mocked<IAccountRepository> = {
              save: jest.fn().mockResolvedValue(undefined),
              findById: jest.fn().mockResolvedValue(null),
              findAllByUserId: jest.fn().mockResolvedValue([]),
              existsByNameAndCurrency: jest.fn().mockResolvedValue(false), // No duplicate
              existsByNameAndCurrencyExcludingId: jest.fn().mockResolvedValue(false),
              update: jest.fn().mockResolvedValue(undefined),
              delete: jest.fn().mockResolvedValue(undefined),
              updateDisplayOrders: jest.fn().mockResolvedValue(undefined),
            };

            const useCase = new CreateAccountUseCase(mockRepo);

            const dto: CreateAccountDTO = {
              name: name2.trim(),
              color,
              currency,
              type: 'normal',
            };

            // Should succeed since name is different
            const result = await useCase.execute(dto, userId);

            expect(result.name).toBe(name2.trim());
            expect(result.currency).toBe(currency);
            expect(mockRepo.save).toHaveBeenCalled();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should enforce uniqueness per user (different users can have same account)', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          fc.constantFrom(...validCurrencies),
          validHexColor(),
          fc.string({ minLength: 1, maxLength: 20 }), // userId1
          fc.string({ minLength: 1, maxLength: 20 }), // userId2
          async (name: string, currency: Currency, color: string, userId1: string, userId2: string) => {
            // Skip if users are the same
            if (userId1 === userId2) {
              return;
            }

            // Create mock repository that checks userId in uniqueness validation
            const mockRepo: jest.Mocked<IAccountRepository> = {
              save: jest.fn().mockResolvedValue(undefined),
              findById: jest.fn().mockResolvedValue(null),
              findAllByUserId: jest.fn().mockResolvedValue([]),
              // Return false for different user (no conflict)
              existsByNameAndCurrency: jest.fn().mockImplementation(
                async (n: string, c: Currency, u: string) => {
                  // Only return true if it's the first user (simulating existing account)
                  return u === userId1;
                }
              ),
              existsByNameAndCurrencyExcludingId: jest.fn().mockResolvedValue(false),
              update: jest.fn().mockResolvedValue(undefined),
              delete: jest.fn().mockResolvedValue(undefined),
              updateDisplayOrders: jest.fn().mockResolvedValue(undefined),
            };

            const useCase = new CreateAccountUseCase(mockRepo);

            const dto: CreateAccountDTO = {
              name: name.trim(),
              color,
              currency,
              type: 'normal',
            };

            // First user should fail (account exists)
            await expect(useCase.execute(dto, userId1)).rejects.toThrow(ConflictError);

            // Second user should succeed (different user)
            const result = await useCase.execute(dto, userId2);
            expect(result.name).toBe(name.trim());
            expect(result.currency).toBe(currency);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle name trimming in uniqueness check', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          fc.constantFrom(...validCurrencies),
          validHexColor(),
          fc.string({ minLength: 1, maxLength: 20 }), // userId
          fc.nat({ max: 5 }), // leading spaces
          fc.nat({ max: 5 }), // trailing spaces
          async (name: string, currency: Currency, color: string, userId: string, leadingSpaces: number, trailingSpaces: number) => {
            const trimmedName = name.trim();
            const paddedName = ' '.repeat(leadingSpaces) + trimmedName + ' '.repeat(trailingSpaces);

            // Create mock repository that simulates existing account with trimmed name
            const mockRepo: jest.Mocked<IAccountRepository> = {
              save: jest.fn().mockResolvedValue(undefined),
              findById: jest.fn().mockResolvedValue(null),
              findAllByUserId: jest.fn().mockResolvedValue([]),
              existsByNameAndCurrency: jest.fn().mockResolvedValue(true), // Account exists
              existsByNameAndCurrencyExcludingId: jest.fn().mockResolvedValue(false),
              update: jest.fn().mockResolvedValue(undefined),
              delete: jest.fn().mockResolvedValue(undefined),
              updateDisplayOrders: jest.fn().mockResolvedValue(undefined),
            };

            const useCase = new CreateAccountUseCase(mockRepo);

            const dto: CreateAccountDTO = {
              name: paddedName,
              color,
              currency,
              type: 'normal',
            };

            // Should fail because trimmed name matches existing account
            await expect(useCase.execute(dto, userId)).rejects.toThrow(ConflictError);

            // Verify that the name was trimmed before checking uniqueness
            expect(mockRepo.existsByNameAndCurrency).toHaveBeenCalledWith(
              trimmedName,
              currency,
              userId
            );
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
