/**
 * Property-Based Tests for ReorderPocketsUseCase
 * 
 * Feature: backend-migration, Property 19: Pocket reordering updates display order
 * Validates: Requirements 6.6
 * 
 * These tests verify that pocket reordering properly updates the displayOrder
 * field for each pocket to match its position in the provided list.
 */

import 'reflect-metadata';
import fc from 'fast-check';
import { ReorderPocketsUseCase } from './ReorderPocketsUseCase';
import type { IPocketRepository } from '../../infrastructure/IPocketRepository';
import { Pocket } from '../../domain/Pocket';
import type { Currency, PocketType } from '@shared-backend/types';
import { NotFoundError, ValidationError } from '../../../../shared/errors/AppError';

describe('ReorderPocketsUseCase Property-Based Tests', () => {
  const validCurrencies: Currency[] = ['USD', 'MXN', 'COP', 'EUR', 'GBP'];
  const validPocketTypes: PocketType[] = ['normal', 'fixed'];

  // Helper to generate valid hex colors
  const validHexColor = () => 
    fc.tuple(
      fc.integer({ min: 0, max: 255 }),
      fc.integer({ min: 0, max: 255 }),
      fc.integer({ min: 0, max: 255 })
    ).map(([r, g, b]) => 
      `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
    );

  describe('Property 19: Pocket reordering updates display order', () => {
    it('should update displayOrder for all pockets in the list', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 20 }), // userId
          fc.uuid(), // accountId (all pockets must belong to same account)
          fc.array(
            fc.record({
              id: fc.uuid(),
              name: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
              type: fc.constantFrom(...validPocketTypes),
              currency: fc.constantFrom(...validCurrencies),
            }),
            { minLength: 1, maxLength: 10 }
          ),
          async (userId: string, accountId: string, pocketConfigs) => {
            // Create pockets all belonging to the same account
            const pockets = pocketConfigs.map(config => 
              new Pocket(
                config.id,
                accountId,
                config.name.trim(),
                config.type,
                0,
                config.currency
              )
            );

            // Extract pocket IDs in order
            const pocketIds = pockets.map(p => p.id);

            // Create mock repository
            const mockRepo: jest.Mocked<IPocketRepository> = {
              save: jest.fn().mockResolvedValue(undefined),
              findById: jest.fn().mockImplementation(async (id: string, uid: string) => {
                if (uid !== userId) return null;
                return pockets.find(p => p.id === id) || null;
              }),
              findByAccountId: jest.fn().mockResolvedValue(pockets),
              findAllByUserId: jest.fn().mockResolvedValue(pockets),
              existsByNameInAccount: jest.fn().mockResolvedValue(false),
              existsByNameInAccountExcludingId: jest.fn().mockResolvedValue(false),
              existsFixedPocketForUser: jest.fn().mockResolvedValue(false),
              existsFixedPocketForUserExcludingId: jest.fn().mockResolvedValue(false),
              update: jest.fn().mockResolvedValue(undefined),
              delete: jest.fn().mockResolvedValue(undefined),
              updateDisplayOrders: jest.fn().mockResolvedValue(undefined),
            };

            const useCase = new ReorderPocketsUseCase(mockRepo);

            // Execute reordering
            await useCase.execute({ pocketIds }, userId);

            // Verify that updateDisplayOrders was called with correct parameters
            expect(mockRepo.updateDisplayOrders).toHaveBeenCalledWith(pocketIds, userId);
            expect(mockRepo.updateDisplayOrders).toHaveBeenCalledTimes(1);

            // Verify that all pockets were checked for existence
            expect(mockRepo.findById).toHaveBeenCalledTimes(pocketIds.length);
            pocketIds.forEach(id => {
              expect(mockRepo.findById).toHaveBeenCalledWith(id, userId);
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle reordering with different permutations of the same pockets', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 20 }), // userId
          fc.uuid(), // accountId
          fc.array(
            fc.record({
              id: fc.uuid(),
              name: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
              type: fc.constantFrom(...validPocketTypes),
              currency: fc.constantFrom(...validCurrencies),
            }),
            { minLength: 2, maxLength: 5 }
          ),
          async (userId: string, accountId: string, pocketConfigs) => {
            // Create pockets
            const pockets = pocketConfigs.map(config => 
              new Pocket(
                config.id,
                accountId,
                config.name.trim(),
                config.type,
                0,
                config.currency
              )
            );

            // Get original order
            const originalOrder = pockets.map(p => p.id);

            // Create a shuffled order (different from original)
            const shuffledOrder = [...originalOrder].sort(() => Math.random() - 0.5);

            // Skip if the shuffle resulted in the same order
            if (JSON.stringify(originalOrder) === JSON.stringify(shuffledOrder)) {
              return;
            }

            // Create mock repository
            const mockRepo: jest.Mocked<IPocketRepository> = {
              save: jest.fn().mockResolvedValue(undefined),
              findById: jest.fn().mockImplementation(async (id: string, uid: string) => {
                if (uid !== userId) return null;
                return pockets.find(p => p.id === id) || null;
              }),
              findByAccountId: jest.fn().mockResolvedValue(pockets),
              findAllByUserId: jest.fn().mockResolvedValue(pockets),
              existsByNameInAccount: jest.fn().mockResolvedValue(false),
              existsByNameInAccountExcludingId: jest.fn().mockResolvedValue(false),
              existsFixedPocketForUser: jest.fn().mockResolvedValue(false),
              existsFixedPocketForUserExcludingId: jest.fn().mockResolvedValue(false),
              update: jest.fn().mockResolvedValue(undefined),
              delete: jest.fn().mockResolvedValue(undefined),
              updateDisplayOrders: jest.fn().mockResolvedValue(undefined),
            };

            const useCase = new ReorderPocketsUseCase(mockRepo);

            // Execute reordering with shuffled order
            await useCase.execute({ pocketIds: shuffledOrder }, userId);

            // Verify that updateDisplayOrders was called with the shuffled order
            expect(mockRepo.updateDisplayOrders).toHaveBeenCalledWith(shuffledOrder, userId);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject reordering if any pocket does not exist', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 20 }), // userId
          fc.uuid(), // accountId
          fc.array(
            fc.record({
              id: fc.uuid(),
              name: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
              type: fc.constantFrom(...validPocketTypes),
              currency: fc.constantFrom(...validCurrencies),
            }),
            { minLength: 1, maxLength: 5 }
          ),
          fc.uuid(), // non-existent pocket ID
          async (userId: string, accountId: string, pocketConfigs, nonExistentId) => {
            // Create pockets
            const pockets = pocketConfigs.map(config => 
              new Pocket(
                config.id,
                accountId,
                config.name.trim(),
                config.type,
                0,
                config.currency
              )
            );

            // Ensure the non-existent ID is not in the list
            if (pockets.some(p => p.id === nonExistentId)) {
              return;
            }

            // Create pocket IDs list with the non-existent ID
            const pocketIds = [...pockets.map(p => p.id), nonExistentId];

            // Create mock repository
            const mockRepo: jest.Mocked<IPocketRepository> = {
              save: jest.fn().mockResolvedValue(undefined),
              findById: jest.fn().mockImplementation(async (id: string, uid: string) => {
                if (uid !== userId) return null;
                if (id === nonExistentId) return null; // Non-existent pocket
                return pockets.find(p => p.id === id) || null;
              }),
              findByAccountId: jest.fn().mockResolvedValue(pockets),
              findAllByUserId: jest.fn().mockResolvedValue(pockets),
              existsByNameInAccount: jest.fn().mockResolvedValue(false),
              existsByNameInAccountExcludingId: jest.fn().mockResolvedValue(false),
              existsFixedPocketForUser: jest.fn().mockResolvedValue(false),
              existsFixedPocketForUserExcludingId: jest.fn().mockResolvedValue(false),
              update: jest.fn().mockResolvedValue(undefined),
              delete: jest.fn().mockResolvedValue(undefined),
              updateDisplayOrders: jest.fn().mockResolvedValue(undefined),
            };

            const useCase = new ReorderPocketsUseCase(mockRepo);

            // Should throw NotFoundError
            await expect(useCase.execute({ pocketIds }, userId)).rejects.toThrow(NotFoundError);

            // Verify that updateDisplayOrders was NOT called
            expect(mockRepo.updateDisplayOrders).not.toHaveBeenCalled();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject reordering if pockets belong to different user', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 20 }), // userId1
          fc.string({ minLength: 1, maxLength: 20 }), // userId2
          fc.uuid(), // accountId
          fc.array(
            fc.record({
              id: fc.uuid(),
              name: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
              type: fc.constantFrom(...validPocketTypes),
              currency: fc.constantFrom(...validCurrencies),
            }),
            { minLength: 1, maxLength: 5 }
          ),
          async (userId1: string, userId2: string, accountId: string, pocketConfigs) => {
            // Skip if users are the same
            if (userId1 === userId2) {
              return;
            }

            // Create pockets for userId1
            const pockets = pocketConfigs.map(config => 
              new Pocket(
                config.id,
                accountId,
                config.name.trim(),
                config.type,
                0,
                config.currency
              )
            );

            const pocketIds = pockets.map(p => p.id);

            // Create mock repository that returns pockets only for userId1
            const mockRepo: jest.Mocked<IPocketRepository> = {
              save: jest.fn().mockResolvedValue(undefined),
              findById: jest.fn().mockImplementation(async (id: string, uid: string) => {
                // Only return pockets for userId1
                if (uid !== userId1) return null;
                return pockets.find(p => p.id === id) || null;
              }),
              findByAccountId: jest.fn().mockImplementation(async (accId: string, uid: string) => {
                return uid === userId1 && accId === accountId ? pockets : [];
              }),
              findAllByUserId: jest.fn().mockImplementation(async (uid: string) => {
                return uid === userId1 ? pockets : [];
              }),
              existsByNameInAccount: jest.fn().mockResolvedValue(false),
              existsByNameInAccountExcludingId: jest.fn().mockResolvedValue(false),
              existsFixedPocketForUser: jest.fn().mockResolvedValue(false),
              existsFixedPocketForUserExcludingId: jest.fn().mockResolvedValue(false),
              update: jest.fn().mockResolvedValue(undefined),
              delete: jest.fn().mockResolvedValue(undefined),
              updateDisplayOrders: jest.fn().mockResolvedValue(undefined),
            };

            const useCase = new ReorderPocketsUseCase(mockRepo);

            // userId2 trying to reorder userId1's pockets should fail
            await expect(useCase.execute({ pocketIds }, userId2)).rejects.toThrow(NotFoundError);

            // Verify that updateDisplayOrders was NOT called
            expect(mockRepo.updateDisplayOrders).not.toHaveBeenCalled();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject reordering if pockets belong to different accounts', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 20 }), // userId
          fc.uuid(), // accountId1
          fc.uuid(), // accountId2
          fc.array(
            fc.record({
              id: fc.uuid(),
              name: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
              type: fc.constantFrom(...validPocketTypes),
              currency: fc.constantFrom(...validCurrencies),
            }),
            { minLength: 2, maxLength: 5 }
          ),
          async (userId: string, accountId1: string, accountId2: string, pocketConfigs) => {
            // Skip if accounts are the same
            if (accountId1 === accountId2) {
              return;
            }

            // Split pockets between two accounts
            const midpoint = Math.floor(pocketConfigs.length / 2);
            const pockets1 = pocketConfigs.slice(0, midpoint).map(config => 
              new Pocket(
                config.id,
                accountId1,
                config.name.trim(),
                config.type,
                0,
                config.currency
              )
            );
            const pockets2 = pocketConfigs.slice(midpoint).map(config => 
              new Pocket(
                config.id,
                accountId2,
                config.name.trim(),
                config.type,
                0,
                config.currency
              )
            );

            // Skip if we don't have pockets in both accounts
            if (pockets1.length === 0 || pockets2.length === 0) {
              return;
            }

            const allPockets = [...pockets1, ...pockets2];
            const pocketIds = allPockets.map(p => p.id);

            // Create mock repository
            const mockRepo: jest.Mocked<IPocketRepository> = {
              save: jest.fn().mockResolvedValue(undefined),
              findById: jest.fn().mockImplementation(async (id: string, uid: string) => {
                if (uid !== userId) return null;
                return allPockets.find(p => p.id === id) || null;
              }),
              findByAccountId: jest.fn().mockResolvedValue([]),
              findAllByUserId: jest.fn().mockResolvedValue(allPockets),
              existsByNameInAccount: jest.fn().mockResolvedValue(false),
              existsByNameInAccountExcludingId: jest.fn().mockResolvedValue(false),
              existsFixedPocketForUser: jest.fn().mockResolvedValue(false),
              existsFixedPocketForUserExcludingId: jest.fn().mockResolvedValue(false),
              update: jest.fn().mockResolvedValue(undefined),
              delete: jest.fn().mockResolvedValue(undefined),
              updateDisplayOrders: jest.fn().mockResolvedValue(undefined),
            };

            const useCase = new ReorderPocketsUseCase(mockRepo);

            // Should throw ValidationError because pockets belong to different accounts
            await expect(useCase.execute({ pocketIds }, userId)).rejects.toThrow(ValidationError);

            // Verify that updateDisplayOrders was NOT called
            expect(mockRepo.updateDisplayOrders).not.toHaveBeenCalled();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle single pocket reordering', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 20 }), // userId
          fc.uuid(), // accountId
          fc.uuid(), // pocketId
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          fc.constantFrom(...validPocketTypes),
          fc.constantFrom(...validCurrencies),
          async (userId: string, accountId: string, pocketId: string, name: string, type: PocketType, currency: Currency) => {
            // Create single pocket
            const pocket = new Pocket(
              pocketId,
              accountId,
              name.trim(),
              type,
              0,
              currency
            );

            const pocketIds = [pocketId];

            // Create mock repository
            const mockRepo: jest.Mocked<IPocketRepository> = {
              save: jest.fn().mockResolvedValue(undefined),
              findById: jest.fn().mockImplementation(async (id: string, uid: string) => {
                if (uid !== userId || id !== pocketId) return null;
                return pocket;
              }),
              findByAccountId: jest.fn().mockResolvedValue([pocket]),
              findAllByUserId: jest.fn().mockResolvedValue([pocket]),
              existsByNameInAccount: jest.fn().mockResolvedValue(false),
              existsByNameInAccountExcludingId: jest.fn().mockResolvedValue(false),
              existsFixedPocketForUser: jest.fn().mockResolvedValue(false),
              existsFixedPocketForUserExcludingId: jest.fn().mockResolvedValue(false),
              update: jest.fn().mockResolvedValue(undefined),
              delete: jest.fn().mockResolvedValue(undefined),
              updateDisplayOrders: jest.fn().mockResolvedValue(undefined),
            };

            const useCase = new ReorderPocketsUseCase(mockRepo);

            // Execute reordering with single pocket
            await useCase.execute({ pocketIds }, userId);

            // Verify that updateDisplayOrders was called
            expect(mockRepo.updateDisplayOrders).toHaveBeenCalledWith(pocketIds, userId);
            expect(mockRepo.findById).toHaveBeenCalledWith(pocketId, userId);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject empty pocket list', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 20 }), // userId
          async (userId: string) => {
            const pocketIds: string[] = [];

            // Create mock repository
            const mockRepo: jest.Mocked<IPocketRepository> = {
              save: jest.fn().mockResolvedValue(undefined),
              findById: jest.fn().mockResolvedValue(null),
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

            const useCase = new ReorderPocketsUseCase(mockRepo);

            // Should throw ValidationError for empty list
            await expect(useCase.execute({ pocketIds }, userId)).rejects.toThrow(ValidationError);

            // Verify that updateDisplayOrders was NOT called
            expect(mockRepo.updateDisplayOrders).not.toHaveBeenCalled();
            expect(mockRepo.findById).not.toHaveBeenCalled();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject duplicate pocket IDs', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 20 }), // userId
          fc.uuid(), // accountId
          fc.array(
            fc.record({
              id: fc.uuid(),
              name: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
              type: fc.constantFrom(...validPocketTypes),
              currency: fc.constantFrom(...validCurrencies),
            }),
            { minLength: 2, maxLength: 5 }
          ),
          async (userId: string, accountId: string, pocketConfigs) => {
            // Create pockets
            const pockets = pocketConfigs.map(config => 
              new Pocket(
                config.id,
                accountId,
                config.name.trim(),
                config.type,
                0,
                config.currency
              )
            );

            // Create list with duplicate ID
            const pocketIds = pockets.map(p => p.id);
            const duplicateIds = [...pocketIds, pocketIds[0]]; // Add first ID again

            // Create mock repository
            const mockRepo: jest.Mocked<IPocketRepository> = {
              save: jest.fn().mockResolvedValue(undefined),
              findById: jest.fn().mockImplementation(async (id: string, uid: string) => {
                if (uid !== userId) return null;
                return pockets.find(p => p.id === id) || null;
              }),
              findByAccountId: jest.fn().mockResolvedValue(pockets),
              findAllByUserId: jest.fn().mockResolvedValue(pockets),
              existsByNameInAccount: jest.fn().mockResolvedValue(false),
              existsByNameInAccountExcludingId: jest.fn().mockResolvedValue(false),
              existsFixedPocketForUser: jest.fn().mockResolvedValue(false),
              existsFixedPocketForUserExcludingId: jest.fn().mockResolvedValue(false),
              update: jest.fn().mockResolvedValue(undefined),
              delete: jest.fn().mockResolvedValue(undefined),
              updateDisplayOrders: jest.fn().mockResolvedValue(undefined),
            };

            const useCase = new ReorderPocketsUseCase(mockRepo);

            // Should throw ValidationError for duplicate IDs
            await expect(useCase.execute({ pocketIds: duplicateIds }, userId)).rejects.toThrow(ValidationError);

            // Verify that updateDisplayOrders was NOT called
            expect(mockRepo.updateDisplayOrders).not.toHaveBeenCalled();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve pocket order exactly as provided in the list', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 20 }), // userId
          fc.uuid(), // accountId
          fc.array(
            fc.record({
              id: fc.uuid(),
              name: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
              type: fc.constantFrom(...validPocketTypes),
              currency: fc.constantFrom(...validCurrencies),
            }),
            { minLength: 3, maxLength: 10 }
          ),
          async (userId: string, accountId: string, pocketConfigs) => {
            // Create pockets
            const pockets = pocketConfigs.map(config => 
              new Pocket(
                config.id,
                accountId,
                config.name.trim(),
                config.type,
                0,
                config.currency
              )
            );

            // Create a specific order
            const pocketIds = pockets.map(p => p.id);

            // Create mock repository
            const mockRepo: jest.Mocked<IPocketRepository> = {
              save: jest.fn().mockResolvedValue(undefined),
              findById: jest.fn().mockImplementation(async (id: string, uid: string) => {
                if (uid !== userId) return null;
                return pockets.find(p => p.id === id) || null;
              }),
              findByAccountId: jest.fn().mockResolvedValue(pockets),
              findAllByUserId: jest.fn().mockResolvedValue(pockets),
              existsByNameInAccount: jest.fn().mockResolvedValue(false),
              existsByNameInAccountExcludingId: jest.fn().mockResolvedValue(false),
              existsFixedPocketForUser: jest.fn().mockResolvedValue(false),
              existsFixedPocketForUserExcludingId: jest.fn().mockResolvedValue(false),
              update: jest.fn().mockResolvedValue(undefined),
              delete: jest.fn().mockResolvedValue(undefined),
              updateDisplayOrders: jest.fn().mockResolvedValue(undefined),
            };

            const useCase = new ReorderPocketsUseCase(mockRepo);

            // Execute reordering
            await useCase.execute({ pocketIds }, userId);

            // Verify that the exact order was passed to updateDisplayOrders
            const callArgs = mockRepo.updateDisplayOrders.mock.calls[0];
            expect(callArgs[0]).toEqual(pocketIds);
            
            // Verify order is preserved (each ID at its expected position)
            pocketIds.forEach((id, index) => {
              expect(callArgs[0][index]).toBe(id);
            });
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
