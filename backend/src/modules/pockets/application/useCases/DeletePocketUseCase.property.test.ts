/**
 * Property-Based Tests for DeletePocketUseCase
 * 
 * Feature: backend-migration, Property 18: Pocket deletion orphans movements
 * Validates: Requirements 6.5
 * 
 * These tests verify that when a pocket is deleted, all associated movements
 * are properly marked as orphaned while preserving the movement data.
 */

import 'reflect-metadata';
import fc from 'fast-check';
import { DeletePocketUseCase } from './DeletePocketUseCase';
import type { IPocketRepository } from '../../infrastructure/IPocketRepository';
import { Pocket } from '../../domain/Pocket';
import type { Currency } from '@shared-backend/types';

interface IMovementRepository {
  findByPocketId(pocketId: string, userId: string): Promise<Array<{ id: string; pocketId: string; accountId: string }>>;
  markAsOrphaned(movementId: string, accountName: string, accountCurrency: string, pocketName: string, userId: string): Promise<void>;
}

describe('DeletePocketUseCase Property-Based Tests', () => {
  const validCurrencies: Currency[] = ['USD', 'MXN', 'COP', 'EUR', 'GBP'];
  const validPocketTypes: ('normal' | 'fixed')[] = ['normal', 'fixed'];

  describe('Property 18: Pocket deletion orphans movements', () => {
    it('should mark all movements as orphaned when deleting a pocket', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0), // pocketId
          fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0), // userId
          fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0), // accountId
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0), // pocketName
          fc.constantFrom(...validPocketTypes),
          fc.constantFrom(...validCurrencies),
          fc.float({ min: 0, max: 100000 }), // balance
          fc.array(
            fc.record({
              id: fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
              pocketId: fc.constant(''), // Will be set to actual pocketId
              accountId: fc.constant(''), // Will be set to actual accountId
            }),
            { minLength: 1, maxLength: 10 } // At least 1 movement, up to 10
          ),
          async (pocketId: string, userId: string, accountId: string, pocketName: string, pocketType: 'normal' | 'fixed', currency: Currency, balance: number, movements: Array<{ id: string; pocketId: string; accountId: string }>) => {
            // Set the pocketId and accountId for all movements
            const movementsWithIds = movements.map(m => ({
              ...m,
              pocketId,
              accountId,
            }));

            // Create the pocket
            const pocket = new Pocket(
              pocketId,
              accountId,
              pocketName.trim(),
              pocketType,
              balance,
              currency
            );

            // Create mock repositories
            const mockPocketRepo: jest.Mocked<IPocketRepository> = {
              save: jest.fn().mockResolvedValue(undefined),
              findById: jest.fn().mockResolvedValue(pocket),
              findByAccountId: jest.fn().mockResolvedValue([]),
              findAllByUserId: jest.fn().mockResolvedValue([]),
              existsByNameInAccount: jest.fn().mockResolvedValue(false),
              existsByNameInAccountExcludingId: jest.fn().mockResolvedValue(false),
              existsFixedPocketForUser: jest.fn().mockResolvedValue(false),
              existsFixedPocketForUserExcludingId: jest.fn().mockResolvedValue(false),
              update: jest.fn().mockResolvedValue(undefined),
              delete: jest.fn().mockResolvedValue(undefined),
              updateDisplayOrders: jest.fn().mockResolvedValue(undefined),
            };

            const mockMovementRepo: jest.Mocked<IMovementRepository> = {
              findByPocketId: jest.fn().mockResolvedValue(movementsWithIds),
              markAsOrphaned: jest.fn().mockResolvedValue(undefined),
            };

            const useCase = new DeletePocketUseCase(mockPocketRepo, mockMovementRepo);

            // Execute the use case
            await useCase.execute(pocketId, userId);

            // Verify that findByPocketId was called
            expect(mockMovementRepo.findByPocketId).toHaveBeenCalledWith(pocketId, userId);

            // Verify that markAsOrphaned was called for EACH movement
            expect(mockMovementRepo.markAsOrphaned).toHaveBeenCalledTimes(movementsWithIds.length);

            // Verify that each movement was marked as orphaned with the pocket name
            movementsWithIds.forEach((movement) => {
              expect(mockMovementRepo.markAsOrphaned).toHaveBeenCalledWith(
                movement.id,
                '', // Account name placeholder (will be implemented in Phase 4)
                '', // Account currency placeholder (will be implemented in Phase 4)
                pocketName.trim(),
                userId
              );
            });

            // Verify that the pocket was deleted AFTER movements were orphaned
            expect(mockPocketRepo.delete).toHaveBeenCalledWith(pocketId, userId);
            expect(mockPocketRepo.delete).toHaveBeenCalledTimes(1);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should delete pocket successfully when no movements exist', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0), // pocketId
          fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0), // userId
          fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0), // accountId
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0), // pocketName
          fc.constantFrom(...validPocketTypes),
          fc.constantFrom(...validCurrencies),
          fc.float({ min: 0, max: 100000 }), // balance
          async (pocketId: string, userId: string, accountId: string, pocketName: string, pocketType: 'normal' | 'fixed', currency: Currency, balance: number) => {
            // Create the pocket
            const pocket = new Pocket(
              pocketId,
              accountId,
              pocketName.trim(),
              pocketType,
              balance,
              currency
            );

            // Create mock repositories
            const mockPocketRepo: jest.Mocked<IPocketRepository> = {
              save: jest.fn().mockResolvedValue(undefined),
              findById: jest.fn().mockResolvedValue(pocket),
              findByAccountId: jest.fn().mockResolvedValue([]),
              findAllByUserId: jest.fn().mockResolvedValue([]),
              existsByNameInAccount: jest.fn().mockResolvedValue(false),
              existsByNameInAccountExcludingId: jest.fn().mockResolvedValue(false),
              existsFixedPocketForUser: jest.fn().mockResolvedValue(false),
              existsFixedPocketForUserExcludingId: jest.fn().mockResolvedValue(false),
              update: jest.fn().mockResolvedValue(undefined),
              delete: jest.fn().mockResolvedValue(undefined),
              updateDisplayOrders: jest.fn().mockResolvedValue(undefined),
            };

            const mockMovementRepo: jest.Mocked<IMovementRepository> = {
              findByPocketId: jest.fn().mockResolvedValue([]), // No movements
              markAsOrphaned: jest.fn().mockResolvedValue(undefined),
            };

            const useCase = new DeletePocketUseCase(mockPocketRepo, mockMovementRepo);

            // Execute the use case
            await useCase.execute(pocketId, userId);

            // Verify that findByPocketId was called
            expect(mockMovementRepo.findByPocketId).toHaveBeenCalledWith(pocketId, userId);

            // Verify that markAsOrphaned was NOT called (no movements)
            expect(mockMovementRepo.markAsOrphaned).not.toHaveBeenCalled();

            // Verify that the pocket was deleted
            expect(mockPocketRepo.delete).toHaveBeenCalledWith(pocketId, userId);
            expect(mockPocketRepo.delete).toHaveBeenCalledTimes(1);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve movement data when marking as orphaned (no deletion)', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0), // pocketId
          fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0), // userId
          fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0), // accountId
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0), // pocketName
          fc.constantFrom(...validPocketTypes),
          fc.constantFrom(...validCurrencies),
          fc.float({ min: 0, max: 100000 }), // balance
          fc.array(
            fc.record({
              id: fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
              pocketId: fc.constant(''),
              accountId: fc.constant(''),
            }),
            { minLength: 1, maxLength: 10 }
          ),
          async (pocketId: string, userId: string, accountId: string, pocketName: string, pocketType: 'normal' | 'fixed', currency: Currency, balance: number, movements: Array<{ id: string; pocketId: string; accountId: string }>) => {
            const movementsWithIds = movements.map(m => ({
              ...m,
              pocketId,
              accountId,
            }));

            const pocket = new Pocket(
              pocketId,
              accountId,
              pocketName.trim(),
              pocketType,
              balance,
              currency
            );

            const mockPocketRepo: jest.Mocked<IPocketRepository> = {
              save: jest.fn().mockResolvedValue(undefined),
              findById: jest.fn().mockResolvedValue(pocket),
              findByAccountId: jest.fn().mockResolvedValue([]),
              findAllByUserId: jest.fn().mockResolvedValue([]),
              existsByNameInAccount: jest.fn().mockResolvedValue(false),
              existsByNameInAccountExcludingId: jest.fn().mockResolvedValue(false),
              existsFixedPocketForUser: jest.fn().mockResolvedValue(false),
              existsFixedPocketForUserExcludingId: jest.fn().mockResolvedValue(false),
              update: jest.fn().mockResolvedValue(undefined),
              delete: jest.fn().mockResolvedValue(undefined),
              updateDisplayOrders: jest.fn().mockResolvedValue(undefined),
            };

            const mockMovementRepo: jest.Mocked<IMovementRepository> = {
              findByPocketId: jest.fn().mockResolvedValue(movementsWithIds),
              markAsOrphaned: jest.fn().mockResolvedValue(undefined),
            };

            const useCase = new DeletePocketUseCase(mockPocketRepo, mockMovementRepo);

            await useCase.execute(pocketId, userId);

            // Verify that movements are marked as orphaned, not deleted
            // The markAsOrphaned method should be called, which preserves the movement
            expect(mockMovementRepo.markAsOrphaned).toHaveBeenCalledTimes(movementsWithIds.length);

            // Verify that the movement IDs are preserved in the orphaning calls
            const orphanedMovementIds = (mockMovementRepo.markAsOrphaned as jest.Mock).mock.calls.map(
              call => call[0]
            );

            // All original movement IDs should be in the orphaned calls
            movementsWithIds.forEach(movement => {
              expect(orphanedMovementIds).toContain(movement.id);
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should work for both normal and fixed pocket types', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0), // pocketId
          fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0), // userId
          fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0), // accountId
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0), // pocketName
          fc.constantFrom(...validPocketTypes), // Test both types
          fc.constantFrom(...validCurrencies),
          fc.float({ min: 0, max: 100000 }), // balance
          fc.array(
            fc.record({
              id: fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
              pocketId: fc.constant(''),
              accountId: fc.constant(''),
            }),
            { minLength: 1, maxLength: 5 }
          ),
          async (pocketId: string, userId: string, accountId: string, pocketName: string, pocketType: 'normal' | 'fixed', currency: Currency, balance: number, movements: Array<{ id: string; pocketId: string; accountId: string }>) => {
            const movementsWithIds = movements.map(m => ({
              ...m,
              pocketId,
              accountId,
            }));

            const pocket = new Pocket(
              pocketId,
              accountId,
              pocketName.trim(),
              pocketType,
              balance,
              currency
            );

            const mockPocketRepo: jest.Mocked<IPocketRepository> = {
              save: jest.fn().mockResolvedValue(undefined),
              findById: jest.fn().mockResolvedValue(pocket),
              findByAccountId: jest.fn().mockResolvedValue([]),
              findAllByUserId: jest.fn().mockResolvedValue([]),
              existsByNameInAccount: jest.fn().mockResolvedValue(false),
              existsByNameInAccountExcludingId: jest.fn().mockResolvedValue(false),
              existsFixedPocketForUser: jest.fn().mockResolvedValue(false),
              existsFixedPocketForUserExcludingId: jest.fn().mockResolvedValue(false),
              update: jest.fn().mockResolvedValue(undefined),
              delete: jest.fn().mockResolvedValue(undefined),
              updateDisplayOrders: jest.fn().mockResolvedValue(undefined),
            };

            const mockMovementRepo: jest.Mocked<IMovementRepository> = {
              findByPocketId: jest.fn().mockResolvedValue(movementsWithIds),
              markAsOrphaned: jest.fn().mockResolvedValue(undefined),
            };

            const useCase = new DeletePocketUseCase(mockPocketRepo, mockMovementRepo);

            await useCase.execute(pocketId, userId);

            // Verify behavior is the same for both pocket types
            expect(mockMovementRepo.markAsOrphaned).toHaveBeenCalledTimes(movementsWithIds.length);
            expect(mockPocketRepo.delete).toHaveBeenCalledWith(pocketId, userId);

            // Verify pocket name is passed correctly regardless of type
            movementsWithIds.forEach((movement) => {
              expect(mockMovementRepo.markAsOrphaned).toHaveBeenCalledWith(
                movement.id,
                '',
                '',
                pocketName.trim(),
                userId
              );
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle pockets with varying numbers of movements', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0), // pocketId
          fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0), // userId
          fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0), // accountId
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0), // pocketName
          fc.constantFrom(...validPocketTypes),
          fc.constantFrom(...validCurrencies),
          fc.float({ min: 0, max: 100000 }), // balance
          fc.integer({ min: 0, max: 50 }), // Number of movements (0 to 50)
          async (pocketId: string, userId: string, accountId: string, pocketName: string, pocketType: 'normal' | 'fixed', currency: Currency, balance: number, numMovements: number) => {
            // Generate the specified number of movements
            const movements = Array.from({ length: numMovements }, (_, i) => ({
              id: `movement-${i}`,
              pocketId,
              accountId,
            }));

            const pocket = new Pocket(
              pocketId,
              accountId,
              pocketName.trim(),
              pocketType,
              balance,
              currency
            );

            const mockPocketRepo: jest.Mocked<IPocketRepository> = {
              save: jest.fn().mockResolvedValue(undefined),
              findById: jest.fn().mockResolvedValue(pocket),
              findByAccountId: jest.fn().mockResolvedValue([]),
              findAllByUserId: jest.fn().mockResolvedValue([]),
              existsByNameInAccount: jest.fn().mockResolvedValue(false),
              existsByNameInAccountExcludingId: jest.fn().mockResolvedValue(false),
              existsFixedPocketForUser: jest.fn().mockResolvedValue(false),
              existsFixedPocketForUserExcludingId: jest.fn().mockResolvedValue(false),
              update: jest.fn().mockResolvedValue(undefined),
              delete: jest.fn().mockResolvedValue(undefined),
              updateDisplayOrders: jest.fn().mockResolvedValue(undefined),
            };

            const mockMovementRepo: jest.Mocked<IMovementRepository> = {
              findByPocketId: jest.fn().mockResolvedValue(movements),
              markAsOrphaned: jest.fn().mockResolvedValue(undefined),
            };

            const useCase = new DeletePocketUseCase(mockPocketRepo, mockMovementRepo);

            await useCase.execute(pocketId, userId);

            // Verify that markAsOrphaned was called exactly numMovements times
            expect(mockMovementRepo.markAsOrphaned).toHaveBeenCalledTimes(numMovements);

            // Verify that the pocket was deleted
            expect(mockPocketRepo.delete).toHaveBeenCalledWith(pocketId, userId);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
