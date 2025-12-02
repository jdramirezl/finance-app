/**
 * Property-Based Tests for ApplyPendingMovementUseCase
 * 
 * Feature: backend-migration
 * Property 37: Applying pending movement updates state and balances (Validates: Requirements 11.1)
 */

import 'reflect-metadata';
import fc from 'fast-check';
import { ApplyPendingMovementUseCase } from './ApplyPendingMovementUseCase';
import { Movement } from '../../domain/Movement';
import { Account } from '../../../accounts/domain/Account';
import { Pocket } from '../../../pockets/domain/Pocket';
import { SubPocket } from '../../../sub-pockets/domain/SubPocket';
import type { IMovementRepository } from '../../infrastructure/IMovementRepository';
import type { IAccountRepository } from '../../../accounts/infrastructure/IAccountRepository';
import type { IPocketRepository } from '../../../pockets/infrastructure/IPocketRepository';
import type { ISubPocketRepository } from '../../../sub-pockets/infrastructure/ISubPocketRepository';
import type { MovementType } from '@shared-backend/types';

describe('ApplyPendingMovementUseCase Property-Based Tests', () => {
  const validMovementTypes: MovementType[] = ['IngresoNormal', 'EgresoNormal', 'IngresoFijo', 'EgresoFijo'];

  // Helper to create mock repositories with a pending movement
  const createMockRepos = (pendingMovement: Movement) => {
    const mockAccount = new Account('acc-1', 'Test Account', '#3b82f6', 'USD', 100);
    const mockPocket = new Pocket('pocket-1', 'acc-1', 'Test Pocket', 'normal', 50, 'USD');
    const mockSubPocket = new SubPocket('sub-1', 'pocket-1', 'Test SubPocket', 100, 12, 25);

    const mockMovementRepo: jest.Mocked<IMovementRepository> = {
      save: jest.fn().mockResolvedValue(undefined),
      findById: jest.fn().mockResolvedValue(pendingMovement),
      findAll: jest.fn().mockResolvedValue([pendingMovement]),
      findByAccountId: jest.fn().mockResolvedValue([pendingMovement]),
      findByPocketId: jest.fn().mockResolvedValue([pendingMovement]),
      findBySubPocketId: jest.fn().mockResolvedValue([pendingMovement]),
      findPending: jest.fn().mockResolvedValue([pendingMovement]),
      findOrphaned: jest.fn().mockResolvedValue([]),
      findOrphanedByAccount: jest.fn().mockResolvedValue([]),
      findOrphanedByAccountAndPocket: jest.fn().mockResolvedValue([]),
      findByMonth: jest.fn().mockResolvedValue([pendingMovement]),
      update: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn().mockResolvedValue(undefined),
      deleteByAccountId: jest.fn().mockResolvedValue(0),
      deleteByPocketId: jest.fn().mockResolvedValue(0),
      markAsOrphanedByAccountId: jest.fn().mockResolvedValue(0),
      markAsOrphanedByPocketId: jest.fn().mockResolvedValue(0),
      updateAccountIdByPocketId: jest.fn().mockResolvedValue(0),
      count: jest.fn().mockResolvedValue(1),
    };

    const mockAccountRepo: jest.Mocked<IAccountRepository> = {
      save: jest.fn().mockResolvedValue(undefined),
      findById: jest.fn().mockResolvedValue(mockAccount),
      findAllByUserId: jest.fn().mockResolvedValue([mockAccount]),
      existsByNameAndCurrency: jest.fn().mockResolvedValue(false),
      existsByNameAndCurrencyExcludingId: jest.fn().mockResolvedValue(false),
      update: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn().mockResolvedValue(undefined),
      updateDisplayOrders: jest.fn().mockResolvedValue(undefined),
    };

    const mockPocketRepo: jest.Mocked<IPocketRepository> = {
      save: jest.fn().mockResolvedValue(undefined),
      findById: jest.fn().mockResolvedValue(mockPocket),
      findByAccountId: jest.fn().mockResolvedValue([mockPocket]),
      findAllByUserId: jest.fn().mockResolvedValue([mockPocket]),
      existsByNameInAccount: jest.fn().mockResolvedValue(false),
      existsByNameInAccountExcludingId: jest.fn().mockResolvedValue(false),
      existsFixedPocketForUser: jest.fn().mockResolvedValue(false),
      existsFixedPocketForUserExcludingId: jest.fn().mockResolvedValue(false),
      update: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn().mockResolvedValue(undefined),
      updateDisplayOrders: jest.fn().mockResolvedValue(undefined),
    };

    const mockSubPocketRepo: jest.Mocked<ISubPocketRepository> = {
      save: jest.fn().mockResolvedValue(undefined),
      findById: jest.fn().mockResolvedValue(mockSubPocket),
      findByPocketId: jest.fn().mockResolvedValue([mockSubPocket]),
      findByGroupId: jest.fn().mockResolvedValue([]),
      findAllByUserId: jest.fn().mockResolvedValue([mockSubPocket]),
      update: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn().mockResolvedValue(undefined),
      updateDisplayOrders: jest.fn().mockResolvedValue(undefined),
      countMovements: jest.fn().mockResolvedValue(1),
      hasMovements: jest.fn().mockResolvedValue(true),
    };

    return { mockMovementRepo, mockAccountRepo, mockPocketRepo, mockSubPocketRepo };
  };

  describe('Property 37: Applying pending movement updates state and balances', () => {
    it('should set isPending to false for any pending movement', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...validMovementTypes),
          fc.double({ min: 0.01, max: 10000, noNaN: true }),
          fc.date().filter(d => !isNaN(d.getTime())),
          async (type: MovementType, amount: number, date: Date) => {
            fc.pre(!isNaN(date.getTime())); // Ensure valid date

            // Create pending movement
            const pendingMovement = new Movement(
              'mov-1',
              type,
              'acc-1',
              'pocket-1',
              amount,
              date,
              'Pending movement',
              undefined,
              true // Initially pending
            );

            const { mockMovementRepo, mockAccountRepo, mockPocketRepo, mockSubPocketRepo } = createMockRepos(pendingMovement);
            const useCase = new ApplyPendingMovementUseCase(
              mockMovementRepo,
              mockAccountRepo,
              mockPocketRepo,
              mockSubPocketRepo
            );

            const result = await useCase.execute('mov-1', 'user-1');

            // Verify that movement was updated
            expect(mockMovementRepo.update).toHaveBeenCalled();

            // Verify that isPending is now false in the result
            expect(result.isPending).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should recalculate account and pocket balances after applying pending movement', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...validMovementTypes),
          fc.double({ min: 0.01, max: 10000, noNaN: true }),
          fc.date().filter(d => !isNaN(d.getTime())),
          async (type: MovementType, amount: number, date: Date) => {
            fc.pre(!isNaN(date.getTime())); // Ensure valid date

            // Create pending movement
            const pendingMovement = new Movement(
              'mov-1',
              type,
              'acc-1',
              'pocket-1',
              amount,
              date,
              'Pending movement',
              undefined,
              true // Initially pending
            );

            const { mockMovementRepo, mockAccountRepo, mockPocketRepo, mockSubPocketRepo } = createMockRepos(pendingMovement);
            const useCase = new ApplyPendingMovementUseCase(
              mockMovementRepo,
              mockAccountRepo,
              mockPocketRepo,
              mockSubPocketRepo
            );

            await useCase.execute('mov-1', 'user-1');

            // Verify that balance recalculation was triggered
            expect(mockAccountRepo.update).toHaveBeenCalled();
            expect(mockPocketRepo.update).toHaveBeenCalled();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should recalculate sub-pocket balance when applying pending movement with subPocketId', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('IngresoFijo', 'EgresoFijo'),
          fc.double({ min: 0.01, max: 10000, noNaN: true }),
          fc.date().filter(d => !isNaN(d.getTime())),
          async (type: MovementType, amount: number, date: Date) => {
            fc.pre(!isNaN(date.getTime())); // Ensure valid date

            // Create pending movement with sub-pocket
            const pendingMovement = new Movement(
              'mov-1',
              type,
              'acc-1',
              'pocket-1',
              amount,
              date,
              'Pending movement',
              'sub-1', // Has sub-pocket
              true // Initially pending
            );

            const { mockMovementRepo, mockAccountRepo, mockPocketRepo, mockSubPocketRepo } = createMockRepos(pendingMovement);
            const useCase = new ApplyPendingMovementUseCase(
              mockMovementRepo,
              mockAccountRepo,
              mockPocketRepo,
              mockSubPocketRepo
            );

            await useCase.execute('mov-1', 'user-1');

            // Verify that all three balances were recalculated
            expect(mockAccountRepo.update).toHaveBeenCalled();
            expect(mockPocketRepo.update).toHaveBeenCalled();
            expect(mockSubPocketRepo.update).toHaveBeenCalled();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should work for both income and expense pending movements', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...validMovementTypes),
          fc.double({ min: 0.01, max: 10000, noNaN: true }),
          fc.date().filter(d => !isNaN(d.getTime())),
          async (type: MovementType, amount: number, date: Date) => {
            fc.pre(!isNaN(date.getTime())); // Ensure valid date

            // Create pending movement
            const pendingMovement = new Movement(
              'mov-1',
              type,
              'acc-1',
              'pocket-1',
              amount,
              date,
              'Pending movement',
              undefined,
              true // Initially pending
            );

            const { mockMovementRepo, mockAccountRepo, mockPocketRepo, mockSubPocketRepo } = createMockRepos(pendingMovement);
            const useCase = new ApplyPendingMovementUseCase(
              mockMovementRepo,
              mockAccountRepo,
              mockPocketRepo,
              mockSubPocketRepo
            );

            const result = await useCase.execute('mov-1', 'user-1');

            // Verify that movement was applied
            expect(result.isPending).toBe(false);
            expect(mockMovementRepo.update).toHaveBeenCalled();
            expect(mockAccountRepo.update).toHaveBeenCalled();
            expect(mockPocketRepo.update).toHaveBeenCalled();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should throw error when trying to apply non-pending movement', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...validMovementTypes),
          fc.double({ min: 0.01, max: 10000, noNaN: true }),
          fc.date().filter(d => !isNaN(d.getTime())),
          async (type: MovementType, amount: number, date: Date) => {
            fc.pre(!isNaN(date.getTime())); // Ensure valid date

            // Create non-pending movement
            const nonPendingMovement = new Movement(
              'mov-1',
              type,
              'acc-1',
              'pocket-1',
              amount,
              date,
              'Non-pending movement',
              undefined,
              false // Not pending
            );

            const { mockMovementRepo, mockAccountRepo, mockPocketRepo, mockSubPocketRepo } = createMockRepos(nonPendingMovement);
            const useCase = new ApplyPendingMovementUseCase(
              mockMovementRepo,
              mockAccountRepo,
              mockPocketRepo,
              mockSubPocketRepo
            );

            // Should throw validation error
            await expect(useCase.execute('mov-1', 'user-1')).rejects.toThrow('Movement is not pending');
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
