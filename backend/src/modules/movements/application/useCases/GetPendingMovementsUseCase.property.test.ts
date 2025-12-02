/**
 * Property-Based Tests for GetPendingMovementsUseCase
 * 
 * Feature: backend-migration
 * Property 39: Pending movement query filters correctly (Validates: Requirements 11.3)
 */

import 'reflect-metadata';
import fc from 'fast-check';
import { GetPendingMovementsUseCase } from './GetPendingMovementsUseCase';
import { Movement } from '../../domain/Movement';
import type { IMovementRepository } from '../../infrastructure/IMovementRepository';
import type { MovementType } from '@shared-backend/types';

describe('GetPendingMovementsUseCase Property-Based Tests', () => {
  const validMovementTypes: MovementType[] = ['IngresoNormal', 'EgresoNormal', 'IngresoFijo', 'EgresoFijo'];

  // Helper to create a mock movement
  const createMockMovement = (
    id: string,
    accountId: string,
    pocketId: string,
    type: MovementType,
    amount: number,
    date: Date,
    isPending: boolean
  ): Movement => {
    return new Movement(id, type, accountId, pocketId, amount, date, undefined, undefined, isPending);
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
      findPending: jest.fn().mockResolvedValue(movements.filter(m => m.isPending)),
      findOrphaned: jest.fn().mockResolvedValue([]),
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

  describe('Property 39: Pending movement query filters correctly', () => {
    it('should return only pending movements', async () => {
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
              isPending: fc.boolean(),
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
                data.isPending
              )
            );

            const mockRepo = createMockRepoWithMovements(movements);
            const useCase = new GetPendingMovementsUseCase(mockRepo);

            const result = await useCase.execute('user-1');

            // All returned movements should be pending
            expect(result.every(m => m.isPending === true)).toBe(true);

            // Count should match expected
            const expectedCount = movements.filter(m => m.isPending).length;
            expect(result.length).toBe(expectedCount);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return empty array when no pending movements exist', async () => {
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
            // Create all non-pending movements
            const movements = movementData.map(data =>
              createMockMovement(
                data.id,
                data.accountId,
                data.pocketId,
                data.type,
                data.amount,
                data.date,
                false // All non-pending
              )
            );

            const mockRepo = createMockRepoWithMovements(movements);
            const useCase = new GetPendingMovementsUseCase(mockRepo);

            const result = await useCase.execute('user-1');

            // Should return empty array
            expect(result).toEqual([]);
            expect(result.length).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return all movements when all are pending', async () => {
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
            // Create all pending movements
            const movements = movementData.map(data =>
              createMockMovement(
                data.id,
                data.accountId,
                data.pocketId,
                data.type,
                data.amount,
                data.date,
                true // All pending
              )
            );

            const mockRepo = createMockRepoWithMovements(movements);
            const useCase = new GetPendingMovementsUseCase(mockRepo);

            const result = await useCase.execute('user-1');

            // Should return all movements
            expect(result.length).toBe(movements.length);
            expect(result.every(m => m.isPending === true)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
