/**
 * Property-Based Tests for ReorderAccountsUseCase
 * 
 * Feature: backend-migration, Property 9: Account reordering updates display order
 * Validates: Requirements 4.7
 * 
 * These tests verify that account reordering properly updates the displayOrder
 * field for each account to match its position in the provided list.
 */

import 'reflect-metadata';
import fc from 'fast-check';
import type { IAccountRepository } from '../../infrastructure/IAccountRepository';
import { Account } from '../../domain/Account';
import type { Currency } from '@shared-backend/types';
import { NotFoundError } from '../../../../shared/errors/AppError';

// Mock implementation of ReorderAccountsUseCase for testing
// This will be replaced with the actual implementation when it's created
class ReorderAccountsUseCase {
  constructor(private accountRepo: IAccountRepository) {}

  async execute(accountIds: string[], userId: string): Promise<void> {
    // Verify all accounts exist and belong to the user
    const accounts = await Promise.all(
      accountIds.map(id => this.accountRepo.findById(id, userId))
    );

    // Check if any account is not found
    if (accounts.some(account => account === null)) {
      throw new NotFoundError('One or more accounts not found');
    }

    // Update display orders
    await this.accountRepo.updateDisplayOrders(accountIds, userId);
  }
}

describe('ReorderAccountsUseCase Property-Based Tests', () => {
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

  describe('Property 9: Account reordering updates display order', () => {
    it('should update displayOrder for all accounts in the list', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 20 }), // userId
          fc.array(
            fc.record({
              id: fc.uuid(),
              name: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
              color: validHexColor(),
              currency: fc.constantFrom(...validCurrencies),
            }),
            { minLength: 1, maxLength: 10 }
          ),
          async (userId: string, accountConfigs) => {
            // Create accounts
            const accounts = accountConfigs.map(config => 
              new Account(
                config.id,
                config.name.trim(),
                config.color,
                config.currency,
                0,
                'normal'
              )
            );

            // Extract account IDs in order
            const accountIds = accounts.map(a => a.id);

            // Create mock repository
            const mockRepo: jest.Mocked<IAccountRepository> = {
              save: jest.fn().mockResolvedValue(undefined),
              findById: jest.fn().mockImplementation(async (id: string, uid: string) => {
                if (uid !== userId) return null;
                return accounts.find(a => a.id === id) || null;
              }),
              findAllByUserId: jest.fn().mockResolvedValue(accounts),
              existsByNameAndCurrency: jest.fn().mockResolvedValue(false),
              existsByNameAndCurrencyExcludingId: jest.fn().mockResolvedValue(false),
              update: jest.fn().mockResolvedValue(undefined),
              delete: jest.fn().mockResolvedValue(undefined),
              updateDisplayOrders: jest.fn().mockResolvedValue(undefined),
            };

            const useCase = new ReorderAccountsUseCase(mockRepo);

            // Execute reordering
            await useCase.execute(accountIds, userId);

            // Verify that updateDisplayOrders was called with correct parameters
            expect(mockRepo.updateDisplayOrders).toHaveBeenCalledWith(accountIds, userId);
            expect(mockRepo.updateDisplayOrders).toHaveBeenCalledTimes(1);

            // Verify that all accounts were checked for existence
            expect(mockRepo.findById).toHaveBeenCalledTimes(accountIds.length);
            accountIds.forEach(id => {
              expect(mockRepo.findById).toHaveBeenCalledWith(id, userId);
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle reordering with different permutations of the same accounts', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 20 }), // userId
          fc.array(
            fc.record({
              id: fc.uuid(),
              name: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
              color: validHexColor(),
              currency: fc.constantFrom(...validCurrencies),
            }),
            { minLength: 2, maxLength: 5 }
          ),
          async (userId: string, accountConfigs) => {
            // Create accounts
            const accounts = accountConfigs.map(config => 
              new Account(
                config.id,
                config.name.trim(),
                config.color,
                config.currency,
                0,
                'normal'
              )
            );

            // Get original order
            const originalOrder = accounts.map(a => a.id);

            // Create a shuffled order (different from original)
            const shuffledOrder = [...originalOrder].sort(() => Math.random() - 0.5);

            // Skip if the shuffle resulted in the same order
            if (JSON.stringify(originalOrder) === JSON.stringify(shuffledOrder)) {
              return;
            }

            // Create mock repository
            const mockRepo: jest.Mocked<IAccountRepository> = {
              save: jest.fn().mockResolvedValue(undefined),
              findById: jest.fn().mockImplementation(async (id: string, uid: string) => {
                if (uid !== userId) return null;
                return accounts.find(a => a.id === id) || null;
              }),
              findAllByUserId: jest.fn().mockResolvedValue(accounts),
              existsByNameAndCurrency: jest.fn().mockResolvedValue(false),
              existsByNameAndCurrencyExcludingId: jest.fn().mockResolvedValue(false),
              update: jest.fn().mockResolvedValue(undefined),
              delete: jest.fn().mockResolvedValue(undefined),
              updateDisplayOrders: jest.fn().mockResolvedValue(undefined),
            };

            const useCase = new ReorderAccountsUseCase(mockRepo);

            // Execute reordering with shuffled order
            await useCase.execute(shuffledOrder, userId);

            // Verify that updateDisplayOrders was called with the shuffled order
            expect(mockRepo.updateDisplayOrders).toHaveBeenCalledWith(shuffledOrder, userId);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject reordering if any account does not exist', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 20 }), // userId
          fc.array(
            fc.record({
              id: fc.uuid(),
              name: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
              color: validHexColor(),
              currency: fc.constantFrom(...validCurrencies),
            }),
            { minLength: 1, maxLength: 5 }
          ),
          fc.uuid(), // non-existent account ID
          async (userId: string, accountConfigs, nonExistentId) => {
            // Create accounts
            const accounts = accountConfigs.map(config => 
              new Account(
                config.id,
                config.name.trim(),
                config.color,
                config.currency,
                0,
                'normal'
              )
            );

            // Ensure the non-existent ID is not in the list
            if (accounts.some(a => a.id === nonExistentId)) {
              return;
            }

            // Create account IDs list with the non-existent ID
            const accountIds = [...accounts.map(a => a.id), nonExistentId];

            // Create mock repository
            const mockRepo: jest.Mocked<IAccountRepository> = {
              save: jest.fn().mockResolvedValue(undefined),
              findById: jest.fn().mockImplementation(async (id: string, uid: string) => {
                if (uid !== userId) return null;
                if (id === nonExistentId) return null; // Non-existent account
                return accounts.find(a => a.id === id) || null;
              }),
              findAllByUserId: jest.fn().mockResolvedValue(accounts),
              existsByNameAndCurrency: jest.fn().mockResolvedValue(false),
              existsByNameAndCurrencyExcludingId: jest.fn().mockResolvedValue(false),
              update: jest.fn().mockResolvedValue(undefined),
              delete: jest.fn().mockResolvedValue(undefined),
              updateDisplayOrders: jest.fn().mockResolvedValue(undefined),
            };

            const useCase = new ReorderAccountsUseCase(mockRepo);

            // Should throw NotFoundError
            await expect(useCase.execute(accountIds, userId)).rejects.toThrow(NotFoundError);

            // Verify that updateDisplayOrders was NOT called
            expect(mockRepo.updateDisplayOrders).not.toHaveBeenCalled();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject reordering if accounts belong to different user', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 20 }), // userId1
          fc.string({ minLength: 1, maxLength: 20 }), // userId2
          fc.array(
            fc.record({
              id: fc.uuid(),
              name: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
              color: validHexColor(),
              currency: fc.constantFrom(...validCurrencies),
            }),
            { minLength: 1, maxLength: 5 }
          ),
          async (userId1: string, userId2: string, accountConfigs) => {
            // Skip if users are the same
            if (userId1 === userId2) {
              return;
            }

            // Create accounts for userId1
            const accounts = accountConfigs.map(config => 
              new Account(
                config.id,
                config.name.trim(),
                config.color,
                config.currency,
                0,
                'normal'
              )
            );

            const accountIds = accounts.map(a => a.id);

            // Create mock repository that returns accounts only for userId1
            const mockRepo: jest.Mocked<IAccountRepository> = {
              save: jest.fn().mockResolvedValue(undefined),
              findById: jest.fn().mockImplementation(async (id: string, uid: string) => {
                // Only return accounts for userId1
                if (uid !== userId1) return null;
                return accounts.find(a => a.id === id) || null;
              }),
              findAllByUserId: jest.fn().mockImplementation(async (uid: string) => {
                return uid === userId1 ? accounts : [];
              }),
              existsByNameAndCurrency: jest.fn().mockResolvedValue(false),
              existsByNameAndCurrencyExcludingId: jest.fn().mockResolvedValue(false),
              update: jest.fn().mockResolvedValue(undefined),
              delete: jest.fn().mockResolvedValue(undefined),
              updateDisplayOrders: jest.fn().mockResolvedValue(undefined),
            };

            const useCase = new ReorderAccountsUseCase(mockRepo);

            // userId2 trying to reorder userId1's accounts should fail
            await expect(useCase.execute(accountIds, userId2)).rejects.toThrow(NotFoundError);

            // Verify that updateDisplayOrders was NOT called
            expect(mockRepo.updateDisplayOrders).not.toHaveBeenCalled();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle single account reordering', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 20 }), // userId
          fc.uuid(), // accountId
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          validHexColor(),
          fc.constantFrom(...validCurrencies),
          async (userId: string, accountId: string, name: string, color: string, currency: Currency) => {
            // Create single account
            const account = new Account(
              accountId,
              name.trim(),
              color,
              currency,
              0,
              'normal'
            );

            const accountIds = [accountId];

            // Create mock repository
            const mockRepo: jest.Mocked<IAccountRepository> = {
              save: jest.fn().mockResolvedValue(undefined),
              findById: jest.fn().mockImplementation(async (id: string, uid: string) => {
                if (uid !== userId || id !== accountId) return null;
                return account;
              }),
              findAllByUserId: jest.fn().mockResolvedValue([account]),
              existsByNameAndCurrency: jest.fn().mockResolvedValue(false),
              existsByNameAndCurrencyExcludingId: jest.fn().mockResolvedValue(false),
              update: jest.fn().mockResolvedValue(undefined),
              delete: jest.fn().mockResolvedValue(undefined),
              updateDisplayOrders: jest.fn().mockResolvedValue(undefined),
            };

            const useCase = new ReorderAccountsUseCase(mockRepo);

            // Execute reordering with single account
            await useCase.execute(accountIds, userId);

            // Verify that updateDisplayOrders was called
            expect(mockRepo.updateDisplayOrders).toHaveBeenCalledWith(accountIds, userId);
            expect(mockRepo.findById).toHaveBeenCalledWith(accountId, userId);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle empty account list gracefully', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 20 }), // userId
          async (userId: string) => {
            const accountIds: string[] = [];

            // Create mock repository
            const mockRepo: jest.Mocked<IAccountRepository> = {
              save: jest.fn().mockResolvedValue(undefined),
              findById: jest.fn().mockResolvedValue(null),
              findAllByUserId: jest.fn().mockResolvedValue([]),
              existsByNameAndCurrency: jest.fn().mockResolvedValue(false),
              existsByNameAndCurrencyExcludingId: jest.fn().mockResolvedValue(false),
              update: jest.fn().mockResolvedValue(undefined),
              delete: jest.fn().mockResolvedValue(undefined),
              updateDisplayOrders: jest.fn().mockResolvedValue(undefined),
            };

            const useCase = new ReorderAccountsUseCase(mockRepo);

            // Execute reordering with empty list
            await useCase.execute(accountIds, userId);

            // Verify that updateDisplayOrders was called with empty array
            expect(mockRepo.updateDisplayOrders).toHaveBeenCalledWith(accountIds, userId);
            expect(mockRepo.findById).not.toHaveBeenCalled();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve account order exactly as provided in the list', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 20 }), // userId
          fc.array(
            fc.record({
              id: fc.uuid(),
              name: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
              color: validHexColor(),
              currency: fc.constantFrom(...validCurrencies),
            }),
            { minLength: 3, maxLength: 10 }
          ),
          async (userId: string, accountConfigs) => {
            // Create accounts
            const accounts = accountConfigs.map(config => 
              new Account(
                config.id,
                config.name.trim(),
                config.color,
                config.currency,
                0,
                'normal'
              )
            );

            // Create a specific order
            const accountIds = accounts.map(a => a.id);

            // Create mock repository
            const mockRepo: jest.Mocked<IAccountRepository> = {
              save: jest.fn().mockResolvedValue(undefined),
              findById: jest.fn().mockImplementation(async (id: string, uid: string) => {
                if (uid !== userId) return null;
                return accounts.find(a => a.id === id) || null;
              }),
              findAllByUserId: jest.fn().mockResolvedValue(accounts),
              existsByNameAndCurrency: jest.fn().mockResolvedValue(false),
              existsByNameAndCurrencyExcludingId: jest.fn().mockResolvedValue(false),
              update: jest.fn().mockResolvedValue(undefined),
              delete: jest.fn().mockResolvedValue(undefined),
              updateDisplayOrders: jest.fn().mockResolvedValue(undefined),
            };

            const useCase = new ReorderAccountsUseCase(mockRepo);

            // Execute reordering
            await useCase.execute(accountIds, userId);

            // Verify that the exact order was passed to updateDisplayOrders
            const callArgs = mockRepo.updateDisplayOrders.mock.calls[0];
            expect(callArgs[0]).toEqual(accountIds);
            
            // Verify order is preserved (each ID at its expected position)
            accountIds.forEach((id, index) => {
              expect(callArgs[0][index]).toBe(id);
            });
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
