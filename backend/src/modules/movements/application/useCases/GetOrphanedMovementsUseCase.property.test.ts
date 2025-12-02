/**
 * Property-Based Tests for GetOrphanedMovementsUseCase
 * 
 * Feature: backend-migration
 * Property 40: Orphaned movement query filters correctly (Validates: Requirements 12.1)
 */

import 'reflect-metadata';
import fc from 'fast-check';
import { GetOrphanedMovementsUseCase } from './GetOrphanedMovementsUseCase';
import { Movement } from '../../domain/Movement';
import type { IMovementRepository } from '../../infrastructure/IMovementRepository';
import type { MovementType, Currency } from '@shared-backend/types';

describe('GetOrphanedMovementsUseCase Property-Based Tests', () => {
  const validMovementTypes: MovementType[] = ['IngresoNormal', 'EgresoNormal', 'IngresoFijo', 'EgresoFijo'];
  const validCurrencies: Currency[] = ['USD', 'MXN', 'COP', 'EUR', 'GBP'];

  // Helper to create a mock movement
  const createMockMovement = (
    id: string,
    accountId: string,
    pocketId: string,
    type: MovementType,
    amount: number,
    date: Date,
    isOrphaned: boolean,
    orphanedAccountName?: string,
    orphanedAccountCurrency?: Currency,
    orphanedPocketName?: string
  ): Movement => {
    const movement = new Movement(id, type, accountId, pocketId, amount, date, undefined, undefined, false);
    
    if (isOrphaned && orphanedAccountName && orphanedAccountCurrency && orphanedPocketName) {
      movement.markAsOrphaned(orphanedAccountName, orphanedAccountCurrency, orphanedPocketName);
    }
    
    return movement;
  };

  // Helper to create mock repository with movements
  const createMockRepoWithMovements = (movements: Movement[]) => {
    const mockRepo: jest.Mocked<IMovementRepository> = {
      save: jest.fn().mockResolvedValue(undefined),
      findById: jest.fn().mockResolvedValue(null),
      findAll: jest.fn().mockResolvedValue([]),
      findByAccountId: jest.fn().mockResolvedValue([]),
      findByPocketId: jest.fn().mockResolvedValue([]),
      findBySubPocketId: jest.fn().mockResolvedValue([]),
      findPending: jest.fn().mockResolvedValue([]),
      findOrphaned: jest.fn().mockResolvedValue(movements.filter(m => m.isOrphaned)),
      findOrphanedByAccount: jest.fn().mockResolvedValue([]),
      findOrphanedByAccountAndPocket: jest.fn().mockResolvedValue([]),
      findByMonth: jest.fn().mockResolvedValue([]),
      update: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn().mockResolvedValue(undefined),
      deleteByAccountId: jest.fn().mockResolvedValue(0),
      deleteByPocketId: jest.fn().mockResolvedValue(0),
      markAsOrphanedByAccountId: jest.fn().mockResolvedValue(0),
      markAsOrphanedByPocketId: jest.fn().mockResolvedValue(0),
      updateAccountIdByPocketId: jest.fn().mockResolvedValue(0),
      count: jest.fn().mockResolvedValue(0),
    };

    return mockRepo;
  };

  describe('Property 40: Orphaned movement query filters correctly', () => {
    it('should return only orphaned movements', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              id: fc.uuid(),
              accountId: fc.constantFrom('acc-1', 'acc-2', 'acc-3'),
              pocketId: fc.constantFrom('pocket-1', 'pocket-2'),
              type: fc.constantFrom(...validMovementTypes),
              amount: fc.double({ min: 0.01, max: 10000, noNaN: true }),
              date: fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') }).filter(d => !isNaN(d.getTime())),
              isOrphaned: fc.boolean(),
              orphanedAccountName: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
              orphanedAccountCurrency: fc.constantFrom(...validCurrencies),
              orphanedPocketName: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
            }),
            { minLength: 10, maxLength: 100 }
          ),
          async (movementData) => {
            // Create movements from data
            const movements = movementData.map(data =>
              createMockMovement(
                data.id,
                data.accountId,
                data.pocketId,
                data.type,
                data.amount,
                data.date,
                data.isOrphaned,
                data.orphanedAccountName,
                data.orphanedAccountCurrency,
                data.orphanedPocketName
              )
            );

            const mockRepo = createMockRepoWithMovements(movements);
            const useCase = new GetOrphanedMovementsUseCase(mockRepo);

            const result = await useCase.execute('user-1');

            // All returned movements should be orphaned
            expect(result.every(m => m.isOrphaned === true)).toBe(true);

            // Count should match expected
            const expectedCount = movements.filter(m => m.isOrphaned).length;
            expect(result.length).toBe(expectedCount);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return empty array when no orphaned movements exist', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              id: fc.uuid(),
              accountId: fc.constantFrom('acc-1', 'acc-2'),
              pocketId: fc.constantFrom('pocket-1', 'pocket-2'),
              type: fc.constantFrom(...validMovementTypes),
              amount: fc.double({ min: 0.01, max: 10000, noNaN: true }),
              date: fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') }).filter(d => !isNaN(d.getTime())),
            }),
            { minLength: 5, maxLength: 50 }
          ),
          async (movementData) => {
            // Create all non-orphaned movements
            const movements = movementData.map(data =>
              createMockMovement(
                data.id,
                data.accountId,
                data.pocketId,
                data.type,
                data.amount,
                data.date,
                false // All non-orphaned
              )
            );

            const mockRepo = createMockRepoWithMovements(movements);
            const useCase = new GetOrphanedMovementsUseCase(mockRepo);

            const result = await useCase.execute('user-1');

            // Should return empty array
            expect(result).toEqual([]);
            expect(result.length).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return all movements when all are orphaned', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              id: fc.uuid(),
              accountId: fc.constantFrom('acc-1', 'acc-2'),
              pocketId: fc.constantFrom('pocket-1', 'pocket-2'),
              type: fc.constantFrom(...validMovementTypes),
              amount: fc.double({ min: 0.01, max: 10000, noNaN: true }),
              date: fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') }).filter(d => !isNaN(d.getTime())),
              orphanedAccountName: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
              orphanedAccountCurrency: fc.constantFrom(...validCurrencies),
              orphanedPocketName: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
            }),
            { minLength: 5, maxLength: 50 }
          ),
          async (movementData) => {
            // Create all orphaned movements
            const movements = movementData.map(data =>
              createMockMovement(
                data.id,
                data.accountId,
                data.pocketId,
                data.type,
                data.amount,
                data.date,
                true, // All orphaned
                data.orphanedAccountName,
                data.orphanedAccountCurrency,
                data.orphanedPocketName
              )
            );

            const mockRepo = createMockRepoWithMovements(movements);
            const useCase = new GetOrphanedMovementsUseCase(mockRepo);

            const result = await useCase.execute('user-1');

            // Should return all movements
            expect(result.length).toBe(movements.length);
            expect(result.every(m => m.isOrphaned === true)).toBe(true);
            
            // All orphaned movements should have orphaned metadata
            expect(result.every(m => 
              m.orphanedAccountName !== undefined &&
              m.orphanedAccountCurrency !== undefined &&
              m.orphanedPocketName !== undefined
            )).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
