/**
 * Property-Based Tests for UpdateAccountUseCase
 * 
 * Feature: backend-migration, Property 8: Account update validates uniqueness
 * Validates: Requirements 4.5
 * 
 * These tests verify that account update operations properly validate uniqueness
 * constraints when name or currency is changed.
 */

import 'reflect-metadata';
import fc from 'fast-check';
import { UpdateAccountUseCase } from './UpdateAccountUseCase';
import type { IAccountRepository } from '../../infrastructure/IAccountRepository';
import type { UpdateAccountDTO } from '../dtos/AccountDTO';
import type { Currency } from '@shared-backend/types';
import { Account } from '../../domain/Account';
import { ConflictError, NotFoundError } from '../../../../shared/errors/AppError';

describe('UpdateAccountUseCase Property-Based Tests', () => {
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

  describe('Property 8: Account update validates uniqueness', () => {
    it('should reject update when new name+currency combination already exists', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0), // original name
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0), // new name
          fc.constantFrom(...validCurrencies), // original currency
          fc.constantFrom(...validCurrencies), // new currency
          validHexColor(),
          fc.string({ minLength: 1, maxLength: 20 }), // userId
          fc.uuid(), // accountId
          async (originalName: string, newName: string, originalCurrency: Currency, newCurrency: Currency, color: string, userId: string, accountId: string) => {
            // Skip if nothing is changing (no uniqueness check needed)
            if (originalName.trim() === newName.trim() && originalCurrency === newCurrency) {
              return;
            }

            // Create existing account
            const existingAccount = new Account(
              accountId,
              originalName.trim(),
              color,
              originalCurrency,
              0,
              'normal'
            );

            // Create mock repository that simulates conflict
            const mockRepo: jest.Mocked<IAccountRepository> = {
              save: jest.fn().mockResolvedValue(undefined),
              findById: jest.fn().mockResolvedValue(existingAccount),
              findAllByUserId: jest.fn().mockResolvedValue([]),
              existsByNameAndCurrency: jest.fn().mockResolvedValue(false),
              existsByNameAndCurrencyExcludingId: jest.fn().mockResolvedValue(true), // Conflict exists
              update: jest.fn().mockResolvedValue(undefined),
              delete: jest.fn().mockResolvedValue(undefined),
              updateDisplayOrders: jest.fn().mockResolvedValue(undefined),
            };

            const useCase = new UpdateAccountUseCase(mockRepo);

            const dto: UpdateAccountDTO = {
              name: newName,
              currency: newCurrency,
            };

            // Should throw ConflictError due to existing account with same name+currency
            await expect(useCase.execute(accountId, dto, userId)).rejects.toThrow(ConflictError);

            // Verify uniqueness check was called with correct parameters
            expect(mockRepo.existsByNameAndCurrencyExcludingId).toHaveBeenCalledWith(
              newName.trim(),
              newCurrency,
              userId,
              accountId
            );

            // Verify update was NOT called
            expect(mockRepo.update).not.toHaveBeenCalled();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should allow update when name changes but new combination is unique', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0), // original name
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0), // new name
          fc.constantFrom(...validCurrencies),
          validHexColor(),
          fc.string({ minLength: 1, maxLength: 20 }), // userId
          fc.uuid(), // accountId
          async (originalName: string, newName: string, currency: Currency, color: string, userId: string, accountId: string) => {
            // Skip if name isn't actually changing
            if (originalName.trim() === newName.trim()) {
              return;
            }

            // Create existing account
            const existingAccount = new Account(
              accountId,
              originalName.trim(),
              color,
              currency,
              0,
              'normal'
            );

            // Create mock repository that allows the update (no conflict)
            const mockRepo: jest.Mocked<IAccountRepository> = {
              save: jest.fn().mockResolvedValue(undefined),
              findById: jest.fn().mockResolvedValue(existingAccount),
              findAllByUserId: jest.fn().mockResolvedValue([]),
              existsByNameAndCurrency: jest.fn().mockResolvedValue(false),
              existsByNameAndCurrencyExcludingId: jest.fn().mockResolvedValue(false), // No conflict
              update: jest.fn().mockResolvedValue(undefined),
              delete: jest.fn().mockResolvedValue(undefined),
              updateDisplayOrders: jest.fn().mockResolvedValue(undefined),
            };

            const useCase = new UpdateAccountUseCase(mockRepo);

            const dto: UpdateAccountDTO = {
              name: newName,
            };

            // Should succeed
            const result = await useCase.execute(accountId, dto, userId);

            expect(result.name).toBe(newName.trim());
            expect(result.currency).toBe(currency);

            // Verify uniqueness check was called
            expect(mockRepo.existsByNameAndCurrencyExcludingId).toHaveBeenCalledWith(
              newName.trim(),
              currency,
              userId,
              accountId
            );

            // Verify update was called
            expect(mockRepo.update).toHaveBeenCalled();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should allow update when currency changes but new combination is unique', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          fc.constantFrom(...validCurrencies), // original currency
          fc.constantFrom(...validCurrencies), // new currency
          validHexColor(),
          fc.string({ minLength: 1, maxLength: 20 }), // userId
          fc.uuid(), // accountId
          async (name: string, originalCurrency: Currency, newCurrency: Currency, color: string, userId: string, accountId: string) => {
            // Skip if currency isn't actually changing
            if (originalCurrency === newCurrency) {
              return;
            }

            // Create existing account
            const existingAccount = new Account(
              accountId,
              name.trim(),
              color,
              originalCurrency,
              0,
              'normal'
            );

            // Create mock repository that allows the update (no conflict)
            const mockRepo: jest.Mocked<IAccountRepository> = {
              save: jest.fn().mockResolvedValue(undefined),
              findById: jest.fn().mockResolvedValue(existingAccount),
              findAllByUserId: jest.fn().mockResolvedValue([]),
              existsByNameAndCurrency: jest.fn().mockResolvedValue(false),
              existsByNameAndCurrencyExcludingId: jest.fn().mockResolvedValue(false), // No conflict
              update: jest.fn().mockResolvedValue(undefined),
              delete: jest.fn().mockResolvedValue(undefined),
              updateDisplayOrders: jest.fn().mockResolvedValue(undefined),
            };

            const useCase = new UpdateAccountUseCase(mockRepo);

            const dto: UpdateAccountDTO = {
              currency: newCurrency,
            };

            // Should succeed
            const result = await useCase.execute(accountId, dto, userId);

            expect(result.name).toBe(name.trim());
            expect(result.currency).toBe(newCurrency);

            // Verify uniqueness check was called
            expect(mockRepo.existsByNameAndCurrencyExcludingId).toHaveBeenCalledWith(
              name.trim(),
              newCurrency,
              userId,
              accountId
            );

            // Verify update was called
            expect(mockRepo.update).toHaveBeenCalled();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should skip uniqueness check when neither name nor currency changes', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          fc.constantFrom(...validCurrencies),
          validHexColor(),
          validHexColor(), // new color
          fc.string({ minLength: 1, maxLength: 20 }), // userId
          fc.uuid(), // accountId
          async (name: string, currency: Currency, originalColor: string, newColor: string, userId: string, accountId: string) => {
            // Skip if color isn't changing
            if (originalColor === newColor) {
              return;
            }

            // Create existing account
            const existingAccount = new Account(
              accountId,
              name.trim(),
              originalColor,
              currency,
              0,
              'normal'
            );

            // Create mock repository
            const mockRepo: jest.Mocked<IAccountRepository> = {
              save: jest.fn().mockResolvedValue(undefined),
              findById: jest.fn().mockResolvedValue(existingAccount),
              findAllByUserId: jest.fn().mockResolvedValue([]),
              existsByNameAndCurrency: jest.fn().mockResolvedValue(false),
              existsByNameAndCurrencyExcludingId: jest.fn().mockResolvedValue(false),
              update: jest.fn().mockResolvedValue(undefined),
              delete: jest.fn().mockResolvedValue(undefined),
              updateDisplayOrders: jest.fn().mockResolvedValue(undefined),
            };

            const useCase = new UpdateAccountUseCase(mockRepo);

            const dto: UpdateAccountDTO = {
              color: newColor, // Only changing color, not name or currency
            };

            // Should succeed
            const result = await useCase.execute(accountId, dto, userId);

            expect(result.color).toBe(newColor);

            // Verify uniqueness check was NOT called (name and currency didn't change)
            expect(mockRepo.existsByNameAndCurrencyExcludingId).not.toHaveBeenCalled();

            // Verify update was called
            expect(mockRepo.update).toHaveBeenCalled();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle name trimming in uniqueness validation', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          fc.constantFrom(...validCurrencies),
          validHexColor(),
          fc.string({ minLength: 1, maxLength: 20 }), // userId
          fc.uuid(), // accountId
          fc.nat({ max: 5 }), // leading spaces
          fc.nat({ max: 5 }), // trailing spaces
          async (name: string, currency: Currency, color: string, userId: string, accountId: string, leadingSpaces: number, trailingSpaces: number) => {
            const trimmedName = name.trim();
            const paddedName = ' '.repeat(leadingSpaces) + trimmedName + ' '.repeat(trailingSpaces);

            // Skip if no padding (nothing to test)
            if (paddedName === trimmedName) {
              return;
            }

            // Create existing account with different name
            const existingAccount = new Account(
              accountId,
              'Different Name',
              color,
              currency,
              0,
              'normal'
            );

            // Create mock repository that simulates conflict with trimmed name
            const mockRepo: jest.Mocked<IAccountRepository> = {
              save: jest.fn().mockResolvedValue(undefined),
              findById: jest.fn().mockResolvedValue(existingAccount),
              findAllByUserId: jest.fn().mockResolvedValue([]),
              existsByNameAndCurrency: jest.fn().mockResolvedValue(false),
              existsByNameAndCurrencyExcludingId: jest.fn().mockResolvedValue(true), // Conflict with trimmed name
              update: jest.fn().mockResolvedValue(undefined),
              delete: jest.fn().mockResolvedValue(undefined),
              updateDisplayOrders: jest.fn().mockResolvedValue(undefined),
            };

            const useCase = new UpdateAccountUseCase(mockRepo);

            const dto: UpdateAccountDTO = {
              name: paddedName,
            };

            // Should throw ConflictError
            await expect(useCase.execute(accountId, dto, userId)).rejects.toThrow(ConflictError);

            // Verify that the name was trimmed before checking uniqueness
            expect(mockRepo.existsByNameAndCurrencyExcludingId).toHaveBeenCalledWith(
              trimmedName,
              currency,
              userId,
              accountId
            );
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
          fc.uuid(), // accountId
          async (name: string, currency: Currency, color: string, userId1: string, userId2: string, accountId: string) => {
            // Skip if users are the same
            if (userId1 === userId2) {
              return;
            }

            // Create existing account for user1
            const existingAccount = new Account(
              accountId,
              'Original Name',
              color,
              currency,
              0,
              'normal'
            );

            // Create mock repository that checks userId in uniqueness validation
            const mockRepo: jest.Mocked<IAccountRepository> = {
              save: jest.fn().mockResolvedValue(undefined),
              findById: jest.fn().mockImplementation(async (id: string, uid: string) => {
                // Return account only if userId matches
                return uid === userId1 ? existingAccount : null;
              }),
              findAllByUserId: jest.fn().mockResolvedValue([]),
              existsByNameAndCurrency: jest.fn().mockResolvedValue(false),
              existsByNameAndCurrencyExcludingId: jest.fn().mockImplementation(
                async (n: string, c: Currency, uid: string, excludeId: string) => {
                  // Return true only for userId1 (simulating conflict for that user)
                  return uid === userId1;
                }
              ),
              update: jest.fn().mockResolvedValue(undefined),
              delete: jest.fn().mockResolvedValue(undefined),
              updateDisplayOrders: jest.fn().mockResolvedValue(undefined),
            };

            const useCase = new UpdateAccountUseCase(mockRepo);

            const dto: UpdateAccountDTO = {
              name: name,
            };

            // User1 should fail (conflict exists for this user)
            await expect(useCase.execute(accountId, dto, userId1)).rejects.toThrow(ConflictError);

            // User2 should fail with NotFoundError (doesn't own the account)
            await expect(useCase.execute(accountId, dto, userId2)).rejects.toThrow(NotFoundError);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should allow update when both name and currency change to unique combination', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0), // original name
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0), // new name
          fc.constantFrom(...validCurrencies), // original currency
          fc.constantFrom(...validCurrencies), // new currency
          validHexColor(),
          fc.string({ minLength: 1, maxLength: 20 }), // userId
          fc.uuid(), // accountId
          async (originalName: string, newName: string, originalCurrency: Currency, newCurrency: Currency, color: string, userId: string, accountId: string) => {
            // Skip if nothing is changing
            if (originalName.trim() === newName.trim() && originalCurrency === newCurrency) {
              return;
            }

            // Create existing account
            const existingAccount = new Account(
              accountId,
              originalName.trim(),
              color,
              originalCurrency,
              0,
              'normal'
            );

            // Create mock repository that allows the update (no conflict)
            const mockRepo: jest.Mocked<IAccountRepository> = {
              save: jest.fn().mockResolvedValue(undefined),
              findById: jest.fn().mockResolvedValue(existingAccount),
              findAllByUserId: jest.fn().mockResolvedValue([]),
              existsByNameAndCurrency: jest.fn().mockResolvedValue(false),
              existsByNameAndCurrencyExcludingId: jest.fn().mockResolvedValue(false), // No conflict
              update: jest.fn().mockResolvedValue(undefined),
              delete: jest.fn().mockResolvedValue(undefined),
              updateDisplayOrders: jest.fn().mockResolvedValue(undefined),
            };

            const useCase = new UpdateAccountUseCase(mockRepo);

            const dto: UpdateAccountDTO = {
              name: newName,
              currency: newCurrency,
            };

            // Should succeed
            const result = await useCase.execute(accountId, dto, userId);

            expect(result.name).toBe(newName.trim());
            expect(result.currency).toBe(newCurrency);

            // Verify uniqueness check was called with new values
            expect(mockRepo.existsByNameAndCurrencyExcludingId).toHaveBeenCalledWith(
              newName.trim(),
              newCurrency,
              userId,
              accountId
            );

            // Verify update was called
            expect(mockRepo.update).toHaveBeenCalled();
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
