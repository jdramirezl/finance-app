/**
 * Property-Based Tests for DeleteAccountCascadeUseCase
 * 
 * Feature: backend-migration, Property 10: Cascade delete with orphan flag
 * Validates: Requirements 5.1
 * 
 * These tests verify that cascade delete with orphan flag properly marks
 * movements as orphaned while preserving the movement data across a wide
 * range of generated test cases.
 */

import 'reflect-metadata';
import fc from 'fast-check';
import { DeleteAccountCascadeUseCase } from './DeleteAccountCascadeUseCase';
import type { IAccountRepository } from '../../infrastructure/IAccountRepository';
import { Account } from '../../domain/Account';
import type { Currency } from '@shared-backend/types';

// Mock interfaces for dependencies
interface IPocketRepository {
  findByAccountId(accountId: string, userId: string): Promise<Array<{ id: string; accountId: string; type: string }>>;
  delete(pocketId: string, userId: string): Promise<void>;
}

interface ISubPocketRepository {
  findByPocketId(pocketId: string, userId: string): Promise<Array<{ id: string; pocketId: string }>>;
  delete(subPocketId: string, userId: string): Promise<void>;
}

interface IMovementRepository {
  findByAccountId(accountId: string, userId: string): Promise<Array<{ id: string; accountId: string }>>;
  markAsOrphaned(movementId: string, accountName: string, accountCurrency: string, pocketName: string, userId: string): Promise<void>;
  delete(movementId: string, userId: string): Promise<void>;
}

describe('DeleteAccountCascadeUseCase Property-Based Tests', () => {
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

  // Helper to generate account data
  const accountArbitrary = () =>
    fc.record({
      id: fc.uuid(),
      name: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
      color: validHexColor(),
      currency: fc.constantFrom(...validCurrencies),
      balance: fc.integer({ min: 0, max: 1000000 }),
    });

  // Helper to generate pocket data
  const pocketArbitrary = (accountId: string) =>
    fc.record({
      id: fc.uuid(),
      accountId: fc.constant(accountId),
      type: fc.constantFrom('normal', 'fixed'),
    });

  // Helper to generate movement data
  const movementArbitrary = (accountId: string) =>
    fc.record({
      id: fc.uuid(),
      accountId: fc.constant(accountId),
    });

  describe('Property 10: Cascade delete with orphan flag', () => {
    it('should mark all movements as orphaned when deleteMovements is false', async () => {
      await fc.assert(
        fc.asyncProperty(
          accountArbitrary(),
          fc.string({ minLength: 1, maxLength: 20 }), // userId
          fc.array(fc.uuid(), { minLength: 0, maxLength: 10 }), // pocket IDs
          fc.integer({ min: 1, max: 20 }), // number of movements
          async (accountData, userId, pocketIds, movementCount) => {
            // Create account entity
            const account = new Account(
              accountData.id,
              accountData.name.trim(),
              accountData.color,
              accountData.currency,
              accountData.balance
            );

            // Generate pockets
            const pockets = pocketIds.map(id => ({
              id,
              accountId: accountData.id,
              type: 'normal' as const,
            }));

            // Generate movements
            const movements = Array.from({ length: movementCount }, (_, i) => ({
              id: `movement-${i}`,
              accountId: accountData.id,
            }));

            // Track calls to markAsOrphaned
            const orphanedCalls: Array<{
              movementId: string;
              accountName: string;
              accountCurrency: string;
              pocketName: string;
              userId: string;
            }> = [];

            // Create mock repositories
            const mockAccountRepo: jest.Mocked<IAccountRepository> = {
              save: jest.fn(),
              findById: jest.fn().mockResolvedValue(account),
              findAllByUserId: jest.fn(),
              existsByNameAndCurrency: jest.fn(),
              existsByNameAndCurrencyExcludingId: jest.fn(),
              update: jest.fn(),
              delete: jest.fn().mockResolvedValue(undefined),
              updateDisplayOrders: jest.fn(),
            };

            const mockPocketRepo: jest.Mocked<IPocketRepository> = {
              findByAccountId: jest.fn().mockResolvedValue(pockets),
              delete: jest.fn().mockResolvedValue(undefined),
            };

            const mockSubPocketRepo: jest.Mocked<ISubPocketRepository> = {
              findByPocketId: jest.fn().mockResolvedValue([]),
              delete: jest.fn(),
            };

            const mockMovementRepo: jest.Mocked<IMovementRepository> = {
              findByAccountId: jest.fn().mockResolvedValue(movements),
              markAsOrphaned: jest.fn().mockImplementation(async (movementId, accountName, accountCurrency, pocketName, uid) => {
                orphanedCalls.push({ movementId, accountName, accountCurrency, pocketName, userId: uid });
              }),
              delete: jest.fn(),
            };

            // Create use case
            const useCase = new DeleteAccountCascadeUseCase(
              mockAccountRepo,
              mockPocketRepo,
              mockSubPocketRepo,
              mockMovementRepo
            );

            // Execute cascade delete with orphan flag
            const result = await useCase.execute(
              accountData.id,
              { deleteMovements: false },
              userId
            );

            // PROPERTY: All movements should be marked as orphaned
            expect(mockMovementRepo.markAsOrphaned).toHaveBeenCalledTimes(movementCount);
            expect(orphanedCalls).toHaveLength(movementCount);

            // PROPERTY: No movements should be hard deleted
            expect(mockMovementRepo.delete).not.toHaveBeenCalled();

            // PROPERTY: Each movement should be marked with correct account info
            orphanedCalls.forEach(call => {
              expect(call.accountName).toBe(account.name);
              expect(call.accountCurrency).toBe(account.currency);
              expect(call.userId).toBe(userId);
            });

            // PROPERTY: All movement IDs should be marked as orphaned
            const orphanedMovementIds = orphanedCalls.map(c => c.movementId);
            const expectedMovementIds = movements.map(m => m.id);
            expect(orphanedMovementIds.sort()).toEqual(expectedMovementIds.sort());

            // PROPERTY: Result should report correct movement count
            expect(result.movements).toBe(movementCount);

            // PROPERTY: Account should still be deleted
            expect(mockAccountRepo.delete).toHaveBeenCalledWith(accountData.id, userId);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve movement data when marking as orphaned (no hard delete)', async () => {
      await fc.assert(
        fc.asyncProperty(
          accountArbitrary(),
          fc.string({ minLength: 1, maxLength: 20 }), // userId
          fc.integer({ min: 1, max: 15 }), // number of movements
          async (accountData, userId, movementCount) => {
            const account = new Account(
              accountData.id,
              accountData.name.trim(),
              accountData.color,
              accountData.currency,
              accountData.balance
            );

            const movements = Array.from({ length: movementCount }, (_, i) => ({
              id: `movement-${i}`,
              accountId: accountData.id,
            }));

            const mockAccountRepo: jest.Mocked<IAccountRepository> = {
              save: jest.fn(),
              findById: jest.fn().mockResolvedValue(account),
              findAllByUserId: jest.fn(),
              existsByNameAndCurrency: jest.fn(),
              existsByNameAndCurrencyExcludingId: jest.fn(),
              update: jest.fn(),
              delete: jest.fn().mockResolvedValue(undefined),
              updateDisplayOrders: jest.fn(),
            };

            const mockPocketRepo: jest.Mocked<IPocketRepository> = {
              findByAccountId: jest.fn().mockResolvedValue([]),
              delete: jest.fn(),
            };

            const mockSubPocketRepo: jest.Mocked<ISubPocketRepository> = {
              findByPocketId: jest.fn().mockResolvedValue([]),
              delete: jest.fn(),
            };

            const mockMovementRepo: jest.Mocked<IMovementRepository> = {
              findByAccountId: jest.fn().mockResolvedValue(movements),
              markAsOrphaned: jest.fn().mockResolvedValue(undefined),
              delete: jest.fn(),
            };

            const useCase = new DeleteAccountCascadeUseCase(
              mockAccountRepo,
              mockPocketRepo,
              mockSubPocketRepo,
              mockMovementRepo
            );

            await useCase.execute(
              accountData.id,
              { deleteMovements: false },
              userId
            );

            // PROPERTY: markAsOrphaned should be called (preserves data)
            expect(mockMovementRepo.markAsOrphaned).toHaveBeenCalled();

            // PROPERTY: delete should NEVER be called (data preservation)
            expect(mockMovementRepo.delete).not.toHaveBeenCalled();

            // PROPERTY: The number of orphan calls equals the number of movements
            expect(mockMovementRepo.markAsOrphaned).toHaveBeenCalledTimes(movementCount);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle accounts with varying numbers of pockets and movements', async () => {
      await fc.assert(
        fc.asyncProperty(
          accountArbitrary(),
          fc.string({ minLength: 1, maxLength: 20 }), // userId
          fc.integer({ min: 0, max: 10 }), // number of pockets
          fc.integer({ min: 0, max: 20 }), // number of movements
          async (accountData, userId, pocketCount, movementCount) => {
            const account = new Account(
              accountData.id,
              accountData.name.trim(),
              accountData.color,
              accountData.currency,
              accountData.balance
            );

            const pockets = Array.from({ length: pocketCount }, (_, i) => ({
              id: `pocket-${i}`,
              accountId: accountData.id,
              type: 'normal' as const,
            }));

            const movements = Array.from({ length: movementCount }, (_, i) => ({
              id: `movement-${i}`,
              accountId: accountData.id,
            }));

            const mockAccountRepo: jest.Mocked<IAccountRepository> = {
              save: jest.fn(),
              findById: jest.fn().mockResolvedValue(account),
              findAllByUserId: jest.fn(),
              existsByNameAndCurrency: jest.fn(),
              existsByNameAndCurrencyExcludingId: jest.fn(),
              update: jest.fn(),
              delete: jest.fn().mockResolvedValue(undefined),
              updateDisplayOrders: jest.fn(),
            };

            const mockPocketRepo: jest.Mocked<IPocketRepository> = {
              findByAccountId: jest.fn().mockResolvedValue(pockets),
              delete: jest.fn().mockResolvedValue(undefined),
            };

            const mockSubPocketRepo: jest.Mocked<ISubPocketRepository> = {
              findByPocketId: jest.fn().mockResolvedValue([]),
              delete: jest.fn(),
            };

            const mockMovementRepo: jest.Mocked<IMovementRepository> = {
              findByAccountId: jest.fn().mockResolvedValue(movements),
              markAsOrphaned: jest.fn().mockResolvedValue(undefined),
              delete: jest.fn(),
            };

            const useCase = new DeleteAccountCascadeUseCase(
              mockAccountRepo,
              mockPocketRepo,
              mockSubPocketRepo,
              mockMovementRepo
            );

            const result = await useCase.execute(
              accountData.id,
              { deleteMovements: false },
              userId
            );

            // PROPERTY: Movements marked as orphaned equals movement count
            expect(mockMovementRepo.markAsOrphaned).toHaveBeenCalledTimes(movementCount);

            // PROPERTY: No movements hard deleted
            expect(mockMovementRepo.delete).not.toHaveBeenCalled();

            // PROPERTY: Result counts are accurate
            expect(result.pockets).toBe(pocketCount);
            expect(result.movements).toBe(movementCount);
            expect(result.account).toBe(account.name);

            // PROPERTY: Pockets are deleted
            expect(mockPocketRepo.delete).toHaveBeenCalledTimes(pocketCount);

            // PROPERTY: Account is deleted
            expect(mockAccountRepo.delete).toHaveBeenCalledWith(accountData.id, userId);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should work correctly even with zero movements', async () => {
      await fc.assert(
        fc.asyncProperty(
          accountArbitrary(),
          fc.string({ minLength: 1, maxLength: 20 }), // userId
          fc.integer({ min: 0, max: 5 }), // number of pockets
          async (accountData, userId, pocketCount) => {
            const account = new Account(
              accountData.id,
              accountData.name.trim(),
              accountData.color,
              accountData.currency,
              accountData.balance
            );

            const pockets = Array.from({ length: pocketCount }, (_, i) => ({
              id: `pocket-${i}`,
              accountId: accountData.id,
              type: 'normal' as const,
            }));

            const mockAccountRepo: jest.Mocked<IAccountRepository> = {
              save: jest.fn(),
              findById: jest.fn().mockResolvedValue(account),
              findAllByUserId: jest.fn(),
              existsByNameAndCurrency: jest.fn(),
              existsByNameAndCurrencyExcludingId: jest.fn(),
              update: jest.fn(),
              delete: jest.fn().mockResolvedValue(undefined),
              updateDisplayOrders: jest.fn(),
            };

            const mockPocketRepo: jest.Mocked<IPocketRepository> = {
              findByAccountId: jest.fn().mockResolvedValue(pockets),
              delete: jest.fn().mockResolvedValue(undefined),
            };

            const mockSubPocketRepo: jest.Mocked<ISubPocketRepository> = {
              findByPocketId: jest.fn().mockResolvedValue([]),
              delete: jest.fn(),
            };

            const mockMovementRepo: jest.Mocked<IMovementRepository> = {
              findByAccountId: jest.fn().mockResolvedValue([]), // No movements
              markAsOrphaned: jest.fn(),
              delete: jest.fn(),
            };

            const useCase = new DeleteAccountCascadeUseCase(
              mockAccountRepo,
              mockPocketRepo,
              mockSubPocketRepo,
              mockMovementRepo
            );

            const result = await useCase.execute(
              accountData.id,
              { deleteMovements: false },
              userId
            );

            // PROPERTY: With zero movements, markAsOrphaned should not be called
            expect(mockMovementRepo.markAsOrphaned).not.toHaveBeenCalled();

            // PROPERTY: With zero movements, delete should not be called
            expect(mockMovementRepo.delete).not.toHaveBeenCalled();

            // PROPERTY: Result should show zero movements
            expect(result.movements).toBe(0);

            // PROPERTY: Account should still be deleted
            expect(mockAccountRepo.delete).toHaveBeenCalledWith(accountData.id, userId);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should pass correct account metadata to markAsOrphaned for all movements', async () => {
      await fc.assert(
        fc.asyncProperty(
          accountArbitrary(),
          fc.string({ minLength: 1, maxLength: 20 }), // userId
          fc.integer({ min: 1, max: 10 }), // number of movements
          async (accountData, userId, movementCount) => {
            const account = new Account(
              accountData.id,
              accountData.name.trim(),
              accountData.color,
              accountData.currency,
              accountData.balance
            );

            const movements = Array.from({ length: movementCount }, (_, i) => ({
              id: `movement-${i}`,
              accountId: accountData.id,
            }));

            const orphanedCalls: Array<{
              movementId: string;
              accountName: string;
              accountCurrency: string;
            }> = [];

            const mockAccountRepo: jest.Mocked<IAccountRepository> = {
              save: jest.fn(),
              findById: jest.fn().mockResolvedValue(account),
              findAllByUserId: jest.fn(),
              existsByNameAndCurrency: jest.fn(),
              existsByNameAndCurrencyExcludingId: jest.fn(),
              update: jest.fn(),
              delete: jest.fn().mockResolvedValue(undefined),
              updateDisplayOrders: jest.fn(),
            };

            const mockPocketRepo: jest.Mocked<IPocketRepository> = {
              findByAccountId: jest.fn().mockResolvedValue([]),
              delete: jest.fn(),
            };

            const mockSubPocketRepo: jest.Mocked<ISubPocketRepository> = {
              findByPocketId: jest.fn().mockResolvedValue([]),
              delete: jest.fn(),
            };

            const mockMovementRepo: jest.Mocked<IMovementRepository> = {
              findByAccountId: jest.fn().mockResolvedValue(movements),
              markAsOrphaned: jest.fn().mockImplementation(async (movementId, accountName, accountCurrency) => {
                orphanedCalls.push({ movementId, accountName, accountCurrency });
              }),
              delete: jest.fn(),
            };

            const useCase = new DeleteAccountCascadeUseCase(
              mockAccountRepo,
              mockPocketRepo,
              mockSubPocketRepo,
              mockMovementRepo
            );

            await useCase.execute(
              accountData.id,
              { deleteMovements: false },
              userId
            );

            // PROPERTY: Every orphaned call should have the correct account name
            orphanedCalls.forEach(call => {
              expect(call.accountName).toBe(account.name);
            });

            // PROPERTY: Every orphaned call should have the correct account currency
            orphanedCalls.forEach(call => {
              expect(call.accountCurrency).toBe(account.currency);
            });

            // PROPERTY: All movements should be accounted for
            expect(orphanedCalls).toHaveLength(movementCount);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 11: Cascade delete with hard delete flag', () => {
    it('should permanently delete all movements when deleteMovements is true', async () => {
      await fc.assert(
        fc.asyncProperty(
          accountArbitrary(),
          fc.string({ minLength: 1, maxLength: 20 }), // userId
          fc.integer({ min: 1, max: 20 }), // number of movements
          async (accountData, userId, movementCount) => {
            // Create account entity
            const account = new Account(
              accountData.id,
              accountData.name.trim(),
              accountData.color,
              accountData.currency,
              accountData.balance
            );

            // Generate movements
            const movements = Array.from({ length: movementCount }, (_, i) => ({
              id: `movement-${i}`,
              accountId: accountData.id,
            }));

            // Track calls to delete
            const deletedMovementIds: string[] = [];

            // Create mock repositories
            const mockAccountRepo: jest.Mocked<IAccountRepository> = {
              save: jest.fn(),
              findById: jest.fn().mockResolvedValue(account),
              findAllByUserId: jest.fn(),
              existsByNameAndCurrency: jest.fn(),
              existsByNameAndCurrencyExcludingId: jest.fn(),
              update: jest.fn(),
              delete: jest.fn().mockResolvedValue(undefined),
              updateDisplayOrders: jest.fn(),
            };

            const mockPocketRepo: jest.Mocked<IPocketRepository> = {
              findByAccountId: jest.fn().mockResolvedValue([]),
              delete: jest.fn(),
            };

            const mockSubPocketRepo: jest.Mocked<ISubPocketRepository> = {
              findByPocketId: jest.fn().mockResolvedValue([]),
              delete: jest.fn(),
            };

            const mockMovementRepo: jest.Mocked<IMovementRepository> = {
              findByAccountId: jest.fn().mockResolvedValue(movements),
              markAsOrphaned: jest.fn(),
              delete: jest.fn().mockImplementation(async (movementId) => {
                deletedMovementIds.push(movementId);
              }),
            };

            // Create use case
            const useCase = new DeleteAccountCascadeUseCase(
              mockAccountRepo,
              mockPocketRepo,
              mockSubPocketRepo,
              mockMovementRepo
            );

            // Execute cascade delete with hard delete flag
            const result = await useCase.execute(
              accountData.id,
              { deleteMovements: true },
              userId
            );

            // PROPERTY: All movements should be hard deleted
            expect(mockMovementRepo.delete).toHaveBeenCalledTimes(movementCount);
            expect(deletedMovementIds).toHaveLength(movementCount);

            // PROPERTY: No movements should be marked as orphaned
            expect(mockMovementRepo.markAsOrphaned).not.toHaveBeenCalled();

            // PROPERTY: All movement IDs should be deleted
            const expectedMovementIds = movements.map(m => m.id);
            expect(deletedMovementIds.sort()).toEqual(expectedMovementIds.sort());

            // PROPERTY: Each delete call should have correct userId
            for (let i = 0; i < movementCount; i++) {
              expect(mockMovementRepo.delete).toHaveBeenNthCalledWith(
                i + 1,
                expect.any(String),
                userId
              );
            }

            // PROPERTY: Result should report correct movement count
            expect(result.movements).toBe(movementCount);

            // PROPERTY: Account should still be deleted
            expect(mockAccountRepo.delete).toHaveBeenCalledWith(accountData.id, userId);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should hard delete movements without preserving any data', async () => {
      await fc.assert(
        fc.asyncProperty(
          accountArbitrary(),
          fc.string({ minLength: 1, maxLength: 20 }), // userId
          fc.integer({ min: 1, max: 15 }), // number of movements
          async (accountData, userId, movementCount) => {
            const account = new Account(
              accountData.id,
              accountData.name.trim(),
              accountData.color,
              accountData.currency,
              accountData.balance
            );

            const movements = Array.from({ length: movementCount }, (_, i) => ({
              id: `movement-${i}`,
              accountId: accountData.id,
            }));

            const mockAccountRepo: jest.Mocked<IAccountRepository> = {
              save: jest.fn(),
              findById: jest.fn().mockResolvedValue(account),
              findAllByUserId: jest.fn(),
              existsByNameAndCurrency: jest.fn(),
              existsByNameAndCurrencyExcludingId: jest.fn(),
              update: jest.fn(),
              delete: jest.fn().mockResolvedValue(undefined),
              updateDisplayOrders: jest.fn(),
            };

            const mockPocketRepo: jest.Mocked<IPocketRepository> = {
              findByAccountId: jest.fn().mockResolvedValue([]),
              delete: jest.fn(),
            };

            const mockSubPocketRepo: jest.Mocked<ISubPocketRepository> = {
              findByPocketId: jest.fn().mockResolvedValue([]),
              delete: jest.fn(),
            };

            const mockMovementRepo: jest.Mocked<IMovementRepository> = {
              findByAccountId: jest.fn().mockResolvedValue(movements),
              markAsOrphaned: jest.fn(),
              delete: jest.fn().mockResolvedValue(undefined),
            };

            const useCase = new DeleteAccountCascadeUseCase(
              mockAccountRepo,
              mockPocketRepo,
              mockSubPocketRepo,
              mockMovementRepo
            );

            await useCase.execute(
              accountData.id,
              { deleteMovements: true },
              userId
            );

            // PROPERTY: delete should be called (hard delete)
            expect(mockMovementRepo.delete).toHaveBeenCalled();

            // PROPERTY: markAsOrphaned should NEVER be called (no data preservation)
            expect(mockMovementRepo.markAsOrphaned).not.toHaveBeenCalled();

            // PROPERTY: The number of delete calls equals the number of movements
            expect(mockMovementRepo.delete).toHaveBeenCalledTimes(movementCount);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle accounts with varying numbers of pockets and movements (hard delete)', async () => {
      await fc.assert(
        fc.asyncProperty(
          accountArbitrary(),
          fc.string({ minLength: 1, maxLength: 20 }), // userId
          fc.integer({ min: 0, max: 10 }), // number of pockets
          fc.integer({ min: 0, max: 20 }), // number of movements
          async (accountData, userId, pocketCount, movementCount) => {
            const account = new Account(
              accountData.id,
              accountData.name.trim(),
              accountData.color,
              accountData.currency,
              accountData.balance
            );

            const pockets = Array.from({ length: pocketCount }, (_, i) => ({
              id: `pocket-${i}`,
              accountId: accountData.id,
              type: 'normal' as const,
            }));

            const movements = Array.from({ length: movementCount }, (_, i) => ({
              id: `movement-${i}`,
              accountId: accountData.id,
            }));

            const mockAccountRepo: jest.Mocked<IAccountRepository> = {
              save: jest.fn(),
              findById: jest.fn().mockResolvedValue(account),
              findAllByUserId: jest.fn(),
              existsByNameAndCurrency: jest.fn(),
              existsByNameAndCurrencyExcludingId: jest.fn(),
              update: jest.fn(),
              delete: jest.fn().mockResolvedValue(undefined),
              updateDisplayOrders: jest.fn(),
            };

            const mockPocketRepo: jest.Mocked<IPocketRepository> = {
              findByAccountId: jest.fn().mockResolvedValue(pockets),
              delete: jest.fn().mockResolvedValue(undefined),
            };

            const mockSubPocketRepo: jest.Mocked<ISubPocketRepository> = {
              findByPocketId: jest.fn().mockResolvedValue([]),
              delete: jest.fn(),
            };

            const mockMovementRepo: jest.Mocked<IMovementRepository> = {
              findByAccountId: jest.fn().mockResolvedValue(movements),
              markAsOrphaned: jest.fn(),
              delete: jest.fn().mockResolvedValue(undefined),
            };

            const useCase = new DeleteAccountCascadeUseCase(
              mockAccountRepo,
              mockPocketRepo,
              mockSubPocketRepo,
              mockMovementRepo
            );

            const result = await useCase.execute(
              accountData.id,
              { deleteMovements: true },
              userId
            );

            // PROPERTY: Movements hard deleted equals movement count
            expect(mockMovementRepo.delete).toHaveBeenCalledTimes(movementCount);

            // PROPERTY: No movements marked as orphaned
            expect(mockMovementRepo.markAsOrphaned).not.toHaveBeenCalled();

            // PROPERTY: Result counts are accurate
            expect(result.pockets).toBe(pocketCount);
            expect(result.movements).toBe(movementCount);
            expect(result.account).toBe(account.name);

            // PROPERTY: Pockets are deleted
            expect(mockPocketRepo.delete).toHaveBeenCalledTimes(pocketCount);

            // PROPERTY: Account is deleted
            expect(mockAccountRepo.delete).toHaveBeenCalledWith(accountData.id, userId);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should work correctly even with zero movements (hard delete mode)', async () => {
      await fc.assert(
        fc.asyncProperty(
          accountArbitrary(),
          fc.string({ minLength: 1, maxLength: 20 }), // userId
          fc.integer({ min: 0, max: 5 }), // number of pockets
          async (accountData, userId, pocketCount) => {
            const account = new Account(
              accountData.id,
              accountData.name.trim(),
              accountData.color,
              accountData.currency,
              accountData.balance
            );

            const pockets = Array.from({ length: pocketCount }, (_, i) => ({
              id: `pocket-${i}`,
              accountId: accountData.id,
              type: 'normal' as const,
            }));

            const mockAccountRepo: jest.Mocked<IAccountRepository> = {
              save: jest.fn(),
              findById: jest.fn().mockResolvedValue(account),
              findAllByUserId: jest.fn(),
              existsByNameAndCurrency: jest.fn(),
              existsByNameAndCurrencyExcludingId: jest.fn(),
              update: jest.fn(),
              delete: jest.fn().mockResolvedValue(undefined),
              updateDisplayOrders: jest.fn(),
            };

            const mockPocketRepo: jest.Mocked<IPocketRepository> = {
              findByAccountId: jest.fn().mockResolvedValue(pockets),
              delete: jest.fn().mockResolvedValue(undefined),
            };

            const mockSubPocketRepo: jest.Mocked<ISubPocketRepository> = {
              findByPocketId: jest.fn().mockResolvedValue([]),
              delete: jest.fn(),
            };

            const mockMovementRepo: jest.Mocked<IMovementRepository> = {
              findByAccountId: jest.fn().mockResolvedValue([]), // No movements
              markAsOrphaned: jest.fn(),
              delete: jest.fn(),
            };

            const useCase = new DeleteAccountCascadeUseCase(
              mockAccountRepo,
              mockPocketRepo,
              mockSubPocketRepo,
              mockMovementRepo
            );

            const result = await useCase.execute(
              accountData.id,
              { deleteMovements: true },
              userId
            );

            // PROPERTY: With zero movements, delete should not be called
            expect(mockMovementRepo.delete).not.toHaveBeenCalled();

            // PROPERTY: With zero movements, markAsOrphaned should not be called
            expect(mockMovementRepo.markAsOrphaned).not.toHaveBeenCalled();

            // PROPERTY: Result should show zero movements
            expect(result.movements).toBe(0);

            // PROPERTY: Account should still be deleted
            expect(mockAccountRepo.delete).toHaveBeenCalledWith(accountData.id, userId);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should delete all movements regardless of account complexity', async () => {
      await fc.assert(
        fc.asyncProperty(
          accountArbitrary(),
          fc.string({ minLength: 1, maxLength: 20 }), // userId
          fc.integer({ min: 1, max: 10 }), // number of movements
          async (accountData, userId, movementCount) => {
            const account = new Account(
              accountData.id,
              accountData.name.trim(),
              accountData.color,
              accountData.currency,
              accountData.balance
            );

            const movements = Array.from({ length: movementCount }, (_, i) => ({
              id: `movement-${i}`,
              accountId: accountData.id,
            }));

            const deletedMovementIds: string[] = [];

            const mockAccountRepo: jest.Mocked<IAccountRepository> = {
              save: jest.fn(),
              findById: jest.fn().mockResolvedValue(account),
              findAllByUserId: jest.fn(),
              existsByNameAndCurrency: jest.fn(),
              existsByNameAndCurrencyExcludingId: jest.fn(),
              update: jest.fn(),
              delete: jest.fn().mockResolvedValue(undefined),
              updateDisplayOrders: jest.fn(),
            };

            const mockPocketRepo: jest.Mocked<IPocketRepository> = {
              findByAccountId: jest.fn().mockResolvedValue([]),
              delete: jest.fn(),
            };

            const mockSubPocketRepo: jest.Mocked<ISubPocketRepository> = {
              findByPocketId: jest.fn().mockResolvedValue([]),
              delete: jest.fn(),
            };

            const mockMovementRepo: jest.Mocked<IMovementRepository> = {
              findByAccountId: jest.fn().mockResolvedValue(movements),
              markAsOrphaned: jest.fn(),
              delete: jest.fn().mockImplementation(async (movementId) => {
                deletedMovementIds.push(movementId);
              }),
            };

            const useCase = new DeleteAccountCascadeUseCase(
              mockAccountRepo,
              mockPocketRepo,
              mockSubPocketRepo,
              mockMovementRepo
            );

            await useCase.execute(
              accountData.id,
              { deleteMovements: true },
              userId
            );

            // PROPERTY: Every movement should be deleted
            expect(deletedMovementIds).toHaveLength(movementCount);

            // PROPERTY: All movement IDs should match
            const expectedMovementIds = movements.map(m => m.id);
            expect(deletedMovementIds.sort()).toEqual(expectedMovementIds.sort());

            // PROPERTY: No orphaning should occur
            expect(mockMovementRepo.markAsOrphaned).not.toHaveBeenCalled();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 14: Cascade delete returns accurate counts', () => {
    it('should return accurate counts for all deleted entities', async () => {
      await fc.assert(
        fc.asyncProperty(
          accountArbitrary(),
          fc.string({ minLength: 1, maxLength: 20 }), // userId
          fc.integer({ min: 0, max: 10 }), // number of normal pockets
          fc.integer({ min: 0, max: 1 }), // number of fixed pockets (0 or 1)
          fc.integer({ min: 0, max: 15 }), // number of sub-pockets per fixed pocket
          fc.integer({ min: 0, max: 20 }), // number of movements
          fc.boolean(), // deleteMovements flag
          async (accountData, userId, normalPocketCount, fixedPocketCount, subPocketCount, movementCount, deleteMovements) => {
            const account = new Account(
              accountData.id,
              accountData.name.trim(),
              accountData.color,
              accountData.currency,
              accountData.balance
            );

            // Generate normal pockets
            const normalPockets = Array.from({ length: normalPocketCount }, (_, i) => ({
              id: `normal-pocket-${i}`,
              accountId: accountData.id,
              type: 'normal' as const,
            }));

            // Generate fixed pocket (if any)
            const fixedPockets = fixedPocketCount > 0 ? [{
              id: 'fixed-pocket',
              accountId: accountData.id,
              type: 'fixed' as const,
            }] : [];

            const allPockets = [...normalPockets, ...fixedPockets];

            // Generate sub-pockets for fixed pocket
            const subPockets = fixedPocketCount > 0 
              ? Array.from({ length: subPocketCount }, (_, i) => ({
                  id: `subpocket-${i}`,
                  pocketId: 'fixed-pocket',
                }))
              : [];

            // Generate movements
            const movements = Array.from({ length: movementCount }, (_, i) => ({
              id: `movement-${i}`,
              accountId: accountData.id,
            }));

            // Track actual deletions
            let actualPocketsDeleted = 0;
            let actualSubPocketsDeleted = 0;
            let actualMovementsAffected = 0;

            const mockAccountRepo: jest.Mocked<IAccountRepository> = {
              save: jest.fn(),
              findById: jest.fn().mockResolvedValue(account),
              findAllByUserId: jest.fn(),
              existsByNameAndCurrency: jest.fn(),
              existsByNameAndCurrencyExcludingId: jest.fn(),
              update: jest.fn(),
              delete: jest.fn().mockResolvedValue(undefined),
              updateDisplayOrders: jest.fn(),
            };

            const mockPocketRepo: jest.Mocked<IPocketRepository> = {
              findByAccountId: jest.fn().mockResolvedValue(allPockets),
              delete: jest.fn().mockImplementation(async () => {
                actualPocketsDeleted++;
              }),
            };

            const mockSubPocketRepo: jest.Mocked<ISubPocketRepository> = {
              findByPocketId: jest.fn().mockImplementation(async (pocketId) => {
                if (pocketId === 'fixed-pocket') {
                  return subPockets;
                }
                return [];
              }),
              delete: jest.fn().mockImplementation(async () => {
                actualSubPocketsDeleted++;
              }),
            };

            const mockMovementRepo: jest.Mocked<IMovementRepository> = {
              findByAccountId: jest.fn().mockResolvedValue(movements),
              markAsOrphaned: jest.fn().mockImplementation(async () => {
                actualMovementsAffected++;
              }),
              delete: jest.fn().mockImplementation(async () => {
                actualMovementsAffected++;
              }),
            };

            const useCase = new DeleteAccountCascadeUseCase(
              mockAccountRepo,
              mockPocketRepo,
              mockSubPocketRepo,
              mockMovementRepo
            );

            const result = await useCase.execute(
              accountData.id,
              { deleteMovements },
              userId
            );

            // PROPERTY: Returned pocket count matches actual deletions
            expect(result.pockets).toBe(actualPocketsDeleted);
            expect(result.pockets).toBe(normalPocketCount + fixedPocketCount);

            // PROPERTY: Returned sub-pocket count matches actual deletions
            expect(result.subPockets).toBe(actualSubPocketsDeleted);
            expect(result.subPockets).toBe(fixedPocketCount > 0 ? subPocketCount : 0);

            // PROPERTY: Returned movement count matches actual affected movements
            expect(result.movements).toBe(actualMovementsAffected);
            expect(result.movements).toBe(movementCount);

            // PROPERTY: Account name is correctly returned
            expect(result.account).toBe(account.name);

            // PROPERTY: Total entities affected equals sum of all counts
            const totalEntitiesInResult = result.pockets + result.subPockets + result.movements;
            const totalEntitiesActual = actualPocketsDeleted + actualSubPocketsDeleted + actualMovementsAffected;
            expect(totalEntitiesInResult).toBe(totalEntitiesActual);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return accurate counts when orphaning movements', async () => {
      await fc.assert(
        fc.asyncProperty(
          accountArbitrary(),
          fc.string({ minLength: 1, maxLength: 20 }), // userId
          fc.integer({ min: 1, max: 8 }), // number of pockets
          fc.integer({ min: 1, max: 15 }), // number of movements
          async (accountData, userId, pocketCount, movementCount) => {
            const account = new Account(
              accountData.id,
              accountData.name.trim(),
              accountData.color,
              accountData.currency,
              accountData.balance
            );

            const pockets = Array.from({ length: pocketCount }, (_, i) => ({
              id: `pocket-${i}`,
              accountId: accountData.id,
              type: 'normal' as const,
            }));

            const movements = Array.from({ length: movementCount }, (_, i) => ({
              id: `movement-${i}`,
              accountId: accountData.id,
            }));

            const mockAccountRepo: jest.Mocked<IAccountRepository> = {
              save: jest.fn(),
              findById: jest.fn().mockResolvedValue(account),
              findAllByUserId: jest.fn(),
              existsByNameAndCurrency: jest.fn(),
              existsByNameAndCurrencyExcludingId: jest.fn(),
              update: jest.fn(),
              delete: jest.fn().mockResolvedValue(undefined),
              updateDisplayOrders: jest.fn(),
            };

            const mockPocketRepo: jest.Mocked<IPocketRepository> = {
              findByAccountId: jest.fn().mockResolvedValue(pockets),
              delete: jest.fn().mockResolvedValue(undefined),
            };

            const mockSubPocketRepo: jest.Mocked<ISubPocketRepository> = {
              findByPocketId: jest.fn().mockResolvedValue([]),
              delete: jest.fn(),
            };

            const mockMovementRepo: jest.Mocked<IMovementRepository> = {
              findByAccountId: jest.fn().mockResolvedValue(movements),
              markAsOrphaned: jest.fn().mockResolvedValue(undefined),
              delete: jest.fn(),
            };

            const useCase = new DeleteAccountCascadeUseCase(
              mockAccountRepo,
              mockPocketRepo,
              mockSubPocketRepo,
              mockMovementRepo
            );

            const result = await useCase.execute(
              accountData.id,
              { deleteMovements: false }, // Orphan mode
              userId
            );

            // PROPERTY: Pocket count is accurate
            expect(result.pockets).toBe(pocketCount);
            expect(mockPocketRepo.delete).toHaveBeenCalledTimes(pocketCount);

            // PROPERTY: Sub-pocket count is zero (no fixed pockets)
            expect(result.subPockets).toBe(0);

            // PROPERTY: Movement count matches orphaned movements
            expect(result.movements).toBe(movementCount);
            expect(mockMovementRepo.markAsOrphaned).toHaveBeenCalledTimes(movementCount);

            // PROPERTY: No movements were hard deleted
            expect(mockMovementRepo.delete).not.toHaveBeenCalled();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return accurate counts when hard deleting movements', async () => {
      await fc.assert(
        fc.asyncProperty(
          accountArbitrary(),
          fc.string({ minLength: 1, maxLength: 20 }), // userId
          fc.integer({ min: 1, max: 8 }), // number of pockets
          fc.integer({ min: 1, max: 15 }), // number of movements
          async (accountData, userId, pocketCount, movementCount) => {
            const account = new Account(
              accountData.id,
              accountData.name.trim(),
              accountData.color,
              accountData.currency,
              accountData.balance
            );

            const pockets = Array.from({ length: pocketCount }, (_, i) => ({
              id: `pocket-${i}`,
              accountId: accountData.id,
              type: 'normal' as const,
            }));

            const movements = Array.from({ length: movementCount }, (_, i) => ({
              id: `movement-${i}`,
              accountId: accountData.id,
            }));

            const mockAccountRepo: jest.Mocked<IAccountRepository> = {
              save: jest.fn(),
              findById: jest.fn().mockResolvedValue(account),
              findAllByUserId: jest.fn(),
              existsByNameAndCurrency: jest.fn(),
              existsByNameAndCurrencyExcludingId: jest.fn(),
              update: jest.fn(),
              delete: jest.fn().mockResolvedValue(undefined),
              updateDisplayOrders: jest.fn(),
            };

            const mockPocketRepo: jest.Mocked<IPocketRepository> = {
              findByAccountId: jest.fn().mockResolvedValue(pockets),
              delete: jest.fn().mockResolvedValue(undefined),
            };

            const mockSubPocketRepo: jest.Mocked<ISubPocketRepository> = {
              findByPocketId: jest.fn().mockResolvedValue([]),
              delete: jest.fn(),
            };

            const mockMovementRepo: jest.Mocked<IMovementRepository> = {
              findByAccountId: jest.fn().mockResolvedValue(movements),
              markAsOrphaned: jest.fn(),
              delete: jest.fn().mockResolvedValue(undefined),
            };

            const useCase = new DeleteAccountCascadeUseCase(
              mockAccountRepo,
              mockPocketRepo,
              mockSubPocketRepo,
              mockMovementRepo
            );

            const result = await useCase.execute(
              accountData.id,
              { deleteMovements: true }, // Hard delete mode
              userId
            );

            // PROPERTY: Pocket count is accurate
            expect(result.pockets).toBe(pocketCount);
            expect(mockPocketRepo.delete).toHaveBeenCalledTimes(pocketCount);

            // PROPERTY: Sub-pocket count is zero (no fixed pockets)
            expect(result.subPockets).toBe(0);

            // PROPERTY: Movement count matches deleted movements
            expect(result.movements).toBe(movementCount);
            expect(mockMovementRepo.delete).toHaveBeenCalledTimes(movementCount);

            // PROPERTY: No movements were orphaned
            expect(mockMovementRepo.markAsOrphaned).not.toHaveBeenCalled();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return accurate counts with fixed pockets and sub-pockets', async () => {
      await fc.assert(
        fc.asyncProperty(
          accountArbitrary(),
          fc.string({ minLength: 1, maxLength: 20 }), // userId
          fc.integer({ min: 0, max: 5 }), // number of normal pockets
          fc.integer({ min: 1, max: 10 }), // number of sub-pockets
          fc.integer({ min: 0, max: 10 }), // number of movements
          fc.boolean(), // deleteMovements flag
          async (accountData, userId, normalPocketCount, subPocketCount, movementCount, deleteMovements) => {
            const account = new Account(
              accountData.id,
              accountData.name.trim(),
              accountData.color,
              accountData.currency,
              accountData.balance
            );

            const normalPockets = Array.from({ length: normalPocketCount }, (_, i) => ({
              id: `normal-pocket-${i}`,
              accountId: accountData.id,
              type: 'normal' as const,
            }));

            const fixedPocket = {
              id: 'fixed-pocket',
              accountId: accountData.id,
              type: 'fixed' as const,
            };

            const allPockets = [...normalPockets, fixedPocket];

            const subPockets = Array.from({ length: subPocketCount }, (_, i) => ({
              id: `subpocket-${i}`,
              pocketId: 'fixed-pocket',
            }));

            const movements = Array.from({ length: movementCount }, (_, i) => ({
              id: `movement-${i}`,
              accountId: accountData.id,
            }));

            const mockAccountRepo: jest.Mocked<IAccountRepository> = {
              save: jest.fn(),
              findById: jest.fn().mockResolvedValue(account),
              findAllByUserId: jest.fn(),
              existsByNameAndCurrency: jest.fn(),
              existsByNameAndCurrencyExcludingId: jest.fn(),
              update: jest.fn(),
              delete: jest.fn().mockResolvedValue(undefined),
              updateDisplayOrders: jest.fn(),
            };

            const mockPocketRepo: jest.Mocked<IPocketRepository> = {
              findByAccountId: jest.fn().mockResolvedValue(allPockets),
              delete: jest.fn().mockResolvedValue(undefined),
            };

            const mockSubPocketRepo: jest.Mocked<ISubPocketRepository> = {
              findByPocketId: jest.fn().mockImplementation(async (pocketId) => {
                if (pocketId === 'fixed-pocket') {
                  return subPockets;
                }
                return [];
              }),
              delete: jest.fn().mockResolvedValue(undefined),
            };

            const mockMovementRepo: jest.Mocked<IMovementRepository> = {
              findByAccountId: jest.fn().mockResolvedValue(movements),
              markAsOrphaned: jest.fn().mockResolvedValue(undefined),
              delete: jest.fn().mockResolvedValue(undefined),
            };

            const useCase = new DeleteAccountCascadeUseCase(
              mockAccountRepo,
              mockPocketRepo,
              mockSubPocketRepo,
              mockMovementRepo
            );

            const result = await useCase.execute(
              accountData.id,
              { deleteMovements },
              userId
            );

            // PROPERTY: Pocket count includes both normal and fixed pockets
            const expectedPocketCount = normalPocketCount + 1; // +1 for fixed pocket
            expect(result.pockets).toBe(expectedPocketCount);
            expect(mockPocketRepo.delete).toHaveBeenCalledTimes(expectedPocketCount);

            // PROPERTY: Sub-pocket count matches all sub-pockets in fixed pocket
            expect(result.subPockets).toBe(subPocketCount);
            expect(mockSubPocketRepo.delete).toHaveBeenCalledTimes(subPocketCount);

            // PROPERTY: Movement count is accurate
            expect(result.movements).toBe(movementCount);

            // PROPERTY: Movements are handled according to flag
            if (deleteMovements) {
              expect(mockMovementRepo.delete).toHaveBeenCalledTimes(movementCount);
              expect(mockMovementRepo.markAsOrphaned).not.toHaveBeenCalled();
            } else {
              expect(mockMovementRepo.markAsOrphaned).toHaveBeenCalledTimes(movementCount);
              expect(mockMovementRepo.delete).not.toHaveBeenCalled();
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return zero counts for empty account', async () => {
      await fc.assert(
        fc.asyncProperty(
          accountArbitrary(),
          fc.string({ minLength: 1, maxLength: 20 }), // userId
          fc.boolean(), // deleteMovements flag
          async (accountData, userId, deleteMovements) => {
            const account = new Account(
              accountData.id,
              accountData.name.trim(),
              accountData.color,
              accountData.currency,
              accountData.balance
            );

            const mockAccountRepo: jest.Mocked<IAccountRepository> = {
              save: jest.fn(),
              findById: jest.fn().mockResolvedValue(account),
              findAllByUserId: jest.fn(),
              existsByNameAndCurrency: jest.fn(),
              existsByNameAndCurrencyExcludingId: jest.fn(),
              update: jest.fn(),
              delete: jest.fn().mockResolvedValue(undefined),
              updateDisplayOrders: jest.fn(),
            };

            const mockPocketRepo: jest.Mocked<IPocketRepository> = {
              findByAccountId: jest.fn().mockResolvedValue([]), // No pockets
              delete: jest.fn(),
            };

            const mockSubPocketRepo: jest.Mocked<ISubPocketRepository> = {
              findByPocketId: jest.fn().mockResolvedValue([]),
              delete: jest.fn(),
            };

            const mockMovementRepo: jest.Mocked<IMovementRepository> = {
              findByAccountId: jest.fn().mockResolvedValue([]), // No movements
              markAsOrphaned: jest.fn(),
              delete: jest.fn(),
            };

            const useCase = new DeleteAccountCascadeUseCase(
              mockAccountRepo,
              mockPocketRepo,
              mockSubPocketRepo,
              mockMovementRepo
            );

            const result = await useCase.execute(
              accountData.id,
              { deleteMovements },
              userId
            );

            // PROPERTY: All counts should be zero for empty account
            expect(result.pockets).toBe(0);
            expect(result.subPockets).toBe(0);
            expect(result.movements).toBe(0);

            // PROPERTY: Account name is still returned
            expect(result.account).toBe(account.name);

            // PROPERTY: No deletion methods were called
            expect(mockPocketRepo.delete).not.toHaveBeenCalled();
            expect(mockSubPocketRepo.delete).not.toHaveBeenCalled();
            expect(mockMovementRepo.delete).not.toHaveBeenCalled();
            expect(mockMovementRepo.markAsOrphaned).not.toHaveBeenCalled();

            // PROPERTY: Account itself was still deleted
            expect(mockAccountRepo.delete).toHaveBeenCalledWith(accountData.id, userId);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
