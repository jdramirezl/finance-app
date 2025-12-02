/**
 * Property-Based Tests for Movement Filtering Use Cases
 * 
 * Feature: backend-migration
 * Property 34: Movement filtering works correctly (Validates: Requirements 10.5)
 */

import 'reflect-metadata';
import fc from 'fast-check';
import { GetMovementsByAccountUseCase } from './GetMovementsByAccountUseCase';
import { GetMovementsByPocketUseCase } from './GetMovementsByPocketUseCase';
import { GetMovementsByMonthUseCase } from './GetMovementsByMonthUseCase';
import { Movement } from '../../domain/Movement';
import type { IMovementRepository } from '../../infrastructure/IMovementRepository';
import type { MovementType } from '@shared-backend/types';

describe('Movement Filtering Property-Based Tests', () => {
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
      findAll: jest.fn().mockImplementation(async (userId, filters) => {
        let filtered = movements;

        if (filters?.accountId) {
          filtered = filtered.filter(m => m.accountId === filters.accountId);
        }

        if (filters?.pocketId) {
          filtered = filtered.filter(m => m.pocketId === filters.pocketId);
        }

        if (filters?.isPending !== undefined) {
          filtered = filtered.filter(m => m.isPending === filters.isPending);
        }

        if (filters?.startDate) {
          filtered = filtered.filter(m => m.displayedDate >= filters.startDate!);
        }

        if (filters?.endDate) {
          filtered = filtered.filter(m => m.displayedDate <= filters.endDate!);
        }

        if (filters?.year !== undefined && filters?.month !== undefined) {
          filtered = filtered.filter(m => {
            const year = m.displayedDate.getFullYear();
            const month = m.displayedDate.getMonth() + 1;
            return year === filters.year && month === filters.month;
          });
        }

        return filtered;
      }),
      findByAccountId: jest.fn().mockResolvedValue([]),
      findByPocketId: jest.fn().mockResolvedValue([]),
      findBySubPocketId: jest.fn().mockResolvedValue([]),
      findPending: jest.fn().mockResolvedValue([]),
      findOrphaned: jest.fn().mockResolvedValue([]),
      findOrphanedByAccount: jest.fn().mockResolvedValue([]),
      findOrphanedByAccountAndPocket: jest.fn().mockResolvedValue([]),
      findByMonth: jest.fn().mockImplementation(async (year, month) => {
        return movements.filter(m => {
          const mYear = m.displayedDate.getFullYear();
          const mMonth = m.displayedDate.getMonth() + 1;
          return mYear === year && mMonth === month;
        });
      }),
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

  describe('Property 34: Movement filtering works correctly', () => {
    it('should filter movements by accountId', async () => {
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
            { minLength: 5, maxLength: 50 }
          ),
          fc.constantFrom('acc-1', 'acc-2', 'acc-3'),
          async (movementData, targetAccountId) => {
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
            const useCase = new GetMovementsByAccountUseCase(mockRepo);

            const result = await useCase.execute(targetAccountId, 'user-1');

            // All returned movements should belong to the target account
            expect(result.every(m => m.accountId === targetAccountId)).toBe(true);

            // Count should match expected
            const expectedCount = movements.filter(m => m.accountId === targetAccountId).length;
            expect(result.length).toBe(expectedCount);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should filter movements by pocketId', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              id: fc.uuid(),
              accountId: fc.constantFrom('acc-1', 'acc-2'),
              pocketId: fc.constantFrom('pocket-1', 'pocket-2', 'pocket-3'),
              type: fc.constantFrom(...validMovementTypes),
              amount: fc.double({ min: 0.01, max: 10000, noNaN: true }),
              date: fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') }).filter(d => !isNaN(d.getTime())),
              isPending: fc.boolean(),
            }),
            { minLength: 5, maxLength: 50 }
          ),
          fc.constantFrom('pocket-1', 'pocket-2', 'pocket-3'),
          async (movementData, targetPocketId) => {
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
            const useCase = new GetMovementsByPocketUseCase(mockRepo);

            const result = await useCase.execute(targetPocketId, 'user-1');

            // All returned movements should belong to the target pocket
            expect(result.every(m => m.pocketId === targetPocketId)).toBe(true);

            // Count should match expected
            const expectedCount = movements.filter(m => m.pocketId === targetPocketId).length;
            expect(result.length).toBe(expectedCount);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should filter movements by pending status', async () => {
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
              isPending: fc.boolean(),
            }),
            { minLength: 5, maxLength: 50 }
          ),
          fc.constantFrom('acc-1', 'acc-2'),
          fc.boolean(),
          async (movementData, accountId, pendingFilter) => {
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
            const useCase = new GetMovementsByAccountUseCase(mockRepo);

            const result = await useCase.execute(accountId, 'user-1', {
              isPending: pendingFilter,
            });

            // All returned movements should match the pending filter
            expect(result.every(m => m.isPending === pendingFilter)).toBe(true);

            // All returned movements should belong to the account
            expect(result.every(m => m.accountId === accountId)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should filter movements by date range', async () => {
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
              isPending: fc.boolean(),
            }),
            { minLength: 10, maxLength: 50 }
          ),
          fc.constantFrom('acc-1', 'acc-2'),
          fc.date({ min: new Date('2020-01-01'), max: new Date('2024-12-31') }).filter(d => !isNaN(d.getTime())),
          fc.date({ min: new Date('2024-01-01'), max: new Date('2025-12-31') }).filter(d => !isNaN(d.getTime())),
          async (movementData, accountId, startDate, endDate) => {
            // Ensure startDate <= endDate
            if (startDate > endDate) {
              [startDate, endDate] = [endDate, startDate];
            }

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
            const useCase = new GetMovementsByAccountUseCase(mockRepo);

            const result = await useCase.execute(accountId, 'user-1', {
              startDate: startDate.toISOString(),
              endDate: endDate.toISOString(),
            });

            // All returned movements should be within the date range
            expect(
              result.every(m => {
                const date = new Date(m.displayedDate);
                return date >= startDate && date <= endDate;
              })
            ).toBe(true);

            // All returned movements should belong to the account
            expect(result.every(m => m.accountId === accountId)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should filter movements by month', async () => {
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
              isPending: fc.boolean(),
            }),
            { minLength: 10, maxLength: 50 }
          ),
          fc.integer({ min: 2020, max: 2025 }),
          fc.integer({ min: 1, max: 12 }),
          async (movementData, year, month) => {
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
            const useCase = new GetMovementsByMonthUseCase(mockRepo);

            const result = await useCase.execute(year, month, 'user-1');

            // All returned movements should be in the specified month
            expect(
              result.movements.every(m => {
                const date = new Date(m.displayedDate);
                return date.getFullYear() === year && date.getMonth() + 1 === month;
              })
            ).toBe(true);

            // Result should include year and month
            expect(result.year).toBe(year);
            expect(result.month).toBe(month);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should combine multiple filters correctly', async () => {
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
              isPending: fc.boolean(),
            }),
            { minLength: 20, maxLength: 100 }
          ),
          fc.constantFrom('acc-1', 'acc-2'),
          fc.boolean(),
          fc.integer({ min: 2020, max: 2025 }),
          fc.integer({ min: 1, max: 12 }),
          async (movementData, accountId, pendingFilter, year, month) => {
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
            const useCase = new GetMovementsByAccountUseCase(mockRepo);

            const result = await useCase.execute(accountId, 'user-1', {
              isPending: pendingFilter,
              year,
              month,
            });

            // All returned movements should match ALL filters
            expect(
              result.every(m => {
                const date = new Date(m.displayedDate);
                return (
                  m.accountId === accountId &&
                  m.isPending === pendingFilter &&
                  date.getFullYear() === year &&
                  date.getMonth() + 1 === month
                );
              })
            ).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
