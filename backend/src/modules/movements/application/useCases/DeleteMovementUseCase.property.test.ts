/**
 * Property-Based Tests for DeleteMovementUseCase
 * 
 * Feature: backend-migration
 * Property 36: Movement deletion recalculates balances (Validates: Requirements 10.7)
 */

import 'reflect-metadata';
import fc from 'fast-check';
import { DeleteMovementUseCase } from './DeleteMovementUseCase';
import { Movement } from '../../domain/Movement';
import { Account } from '../../../accounts/domain/Account';
import { Pocket } from '../../../pockets/domain/Pocket';
import { SubPocket } from '../../../sub-pockets/domain/SubPocket';
import type { IMovementRepository } from '../../infrastructure/IMovementRepository';
import type { IAccountRepository } from '../../../accounts/infrastructure/IAccountRepository';
import type { IPocketRepository } from '../../../pockets/infrastructure/IPocketRepository';
import type { ISubPocketRepository } from '../../../sub-pockets/infrastructure/ISubPocketRepository';
import type { MovementType } from '@shared-backend/types';

describe('DeleteMovementUseCase Property-Based Tests', () => {
  const validMovementTypes: MovementType[] = ['IngresoNormal', 'EgresoNormal', 'IngresoFijo', 'EgresoFijo'];

  // Helper to create mock repositories with an existing movement
  const createMockRepos = (movementToDelete: Movement, remainingMovements: Movement[] = []) => {
    const mockAccount = new Account('acc-1', 'Test Account', '#3b82f6', 'USD', 100);
    const mockPocket = new Pocket('pocket-1', 'acc-1', 'Test Pocket', 'normal', 50, 'USD');
    const mockSubPocket = new SubPocket('sub-1', 'pocket-1', 'Test SubPocket', 100, 12, 25);

    const mockMovementRepo: jest.Mocked<IMovementRepository> = {
      save: jest.fn().mockResolvedValue(undefined),
      findById: jest.fn().mockResolvedValue(movementToDelete),
      findAll: jest.fn().mockResolvedValue(remainingMovements),
      findByAccountId: jest.fn().mockResolvedValue(remainingMovements),
      findByPocketId: jest.fn().mockResolvedValue(remainingMovements),
      findBySubPocketId: jest.fn().mockResolvedValue(remainingMovements),
      findPending: jest.fn().mockResolvedValue([]),
      findOrphaned: jest.fn().mockResolvedValue([]),
      findOrphanedByAccount: jest.fn().mockResolvedValue([]),
      findOrphanedByAccountAndPocket: jest.fn().mockResolvedValue([]),
      findByMonth: jest.fn().mockResolvedValue(remainingMovements),
      update: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn().mockResolvedValue(undefined),
      deleteByAccountId: jest.fn().mockResolvedValue(0),
      deleteByPocketId: jest.fn().mockResolvedValue(0),
      markAsOrphanedByAccountId: jest.fn().mockResolvedValue(0),
      markAsOrphanedByPocketId: jest.fn().mockResolvedValue(0),
      updateAccountIdByPocketId: jest.fn().mockResolvedValue(0),
      count: jest.fn().mockResolvedValue(remainingMovements.length),
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
      countMovements: jest.fn().mockResolvedValue(remainingMovements.length),
      hasMovements: jest.fn().mockResolvedValue(remainingMovements.length > 0),
    };

    return { mockMovementRepo, mockAccountRepo, mockPocketRepo, mockSubPocketRepo };
  };

  describe('Property 36: Movement deletion recalculates balances', () => {
    it('should recalculate account and pocket balances after deleting any movement', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...validMovementTypes),
          fc.double({ min: 0.01, max: 10000, noNaN: true }),
          fc.date().filter(d => !isNaN(d.getTime())),
          fc.boolean(),
          async (type: MovementType, amount: number, date: Date, isPending: boolean) => {
            fc.pre(!isNaN(date.getTime())); // Ensure valid date

            // Create movement to delete
            const movementToDelete = new Movement(
              'mov-1',
              type,
              'acc-1',
              'pocket-1',
              amount,
              date,
              'Movement to delete',
              undefined,
              isPending
            );

            const { mockMovementRepo, mockAccountRepo, mockPocketRepo, mockSubPocketRepo } = createMockRepos(movementToDelete);
            const useCase = new DeleteMovementUseCase(
              mockMovementRepo,
              mockAccountRepo,
              mockPocketRepo,
              mockSubPocketRepo
            );

            await useCase.execute('mov-1', 'user-1');

            // Verify that movement was deleted
            expect(mockMovementRepo.delete).toHaveBeenCalledWith('mov-1', 'user-1');

            // Verify that balance recalculation was triggered for account and pocket
            expect(mockAccountRepo.update).toHaveBeenCalled();
            expect(mockPocketRepo.update).toHaveBeenCalled();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should recalculate sub-pocket balance when deleting movement with subPocketId', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('IngresoFijo', 'EgresoFijo'),
          fc.double({ min: 0.01, max: 10000, noNaN: true }),
          fc.date().filter(d => !isNaN(d.getTime())),
          fc.boolean(),
          async (type: MovementType, amount: number, date: Date, isPending: boolean) => {
            fc.pre(!isNaN(date.getTime())); // Ensure valid date

            // Create movement with sub-pocket to delete
            const movementToDelete = new Movement(
              'mov-1',
              type,
              'acc-1',
              'pocket-1',
              amount,
              date,
              'Movement to delete',
              'sub-1', // Has sub-pocket
              isPending
            );

            const { mockMovementRepo, mockAccountRepo, mockPocketRepo, mockSubPocketRepo } = createMockRepos(movementToDelete);
            const useCase = new DeleteMovementUseCase(
              mockMovementRepo,
              mockAccountRepo,
              mockPocketRepo,
              mockSubPocketRepo
            );

            await useCase.execute('mov-1', 'user-1');

            // Verify that movement was deleted
            expect(mockMovementRepo.delete).toHaveBeenCalledWith('mov-1', 'user-1');

            // Verify that all three balances were recalculated
            expect(mockAccountRepo.update).toHaveBeenCalled();
            expect(mockPocketRepo.update).toHaveBeenCalled();
            expect(mockSubPocketRepo.update).toHaveBeenCalled();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should recalculate balances correctly when deleting income movement', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('IngresoNormal', 'IngresoFijo'),
          fc.double({ min: 0.01, max: 10000, noNaN: true }),
          fc.date().filter(d => !isNaN(d.getTime())),
          async (type: MovementType, amount: number, date: Date) => {
            fc.pre(!isNaN(date.getTime())); // Ensure valid date

            // Create income movement to delete
            const movementToDelete = new Movement(
              'mov-1',
              type,
              'acc-1',
              'pocket-1',
              amount,
              date,
              'Income to delete',
              undefined,
              false // Not pending
            );

            const { mockMovementRepo, mockAccountRepo, mockPocketRepo, mockSubPocketRepo } = createMockRepos(movementToDelete);
            const useCase = new DeleteMovementUseCase(
              mockMovementRepo,
              mockAccountRepo,
              mockPocketRepo,
              mockSubPocketRepo
            );

            await useCase.execute('mov-1', 'user-1');

            // Verify deletion and balance recalculation
            expect(mockMovementRepo.delete).toHaveBeenCalledWith('mov-1', 'user-1');
            expect(mockAccountRepo.update).toHaveBeenCalled();
            expect(mockPocketRepo.update).toHaveBeenCalled();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should recalculate balances correctly when deleting expense movement', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('EgresoNormal', 'EgresoFijo'),
          fc.double({ min: 0.01, max: 10000, noNaN: true }),
          fc.date().filter(d => !isNaN(d.getTime())),
          async (type: MovementType, amount: number, date: Date) => {
            fc.pre(!isNaN(date.getTime())); // Ensure valid date

            // Create expense movement to delete
            const movementToDelete = new Movement(
              'mov-1',
              type,
              'acc-1',
              'pocket-1',
              amount,
              date,
              'Expense to delete',
              undefined,
              false // Not pending
            );

            const { mockMovementRepo, mockAccountRepo, mockPocketRepo, mockSubPocketRepo } = createMockRepos(movementToDelete);
            const useCase = new DeleteMovementUseCase(
              mockMovementRepo,
              mockAccountRepo,
              mockPocketRepo,
              mockSubPocketRepo
            );

            await useCase.execute('mov-1', 'user-1');

            // Verify deletion and balance recalculation
            expect(mockMovementRepo.delete).toHaveBeenCalledWith('mov-1', 'user-1');
            expect(mockAccountRepo.update).toHaveBeenCalled();
            expect(mockPocketRepo.update).toHaveBeenCalled();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should recalculate balances even when deleting pending movement', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...validMovementTypes),
          fc.double({ min: 0.01, max: 10000, noNaN: true }),
          fc.date().filter(d => !isNaN(d.getTime())),
          async (type: MovementType, amount: number, date: Date) => {
            fc.pre(!isNaN(date.getTime())); // Ensure valid date

            // Create pending movement to delete
            const movementToDelete = new Movement(
              'mov-1',
              type,
              'acc-1',
              'pocket-1',
              amount,
              date,
              'Pending movement to delete',
              undefined,
              true // Pending
            );

            const { mockMovementRepo, mockAccountRepo, mockPocketRepo, mockSubPocketRepo } = createMockRepos(movementToDelete);
            const useCase = new DeleteMovementUseCase(
              mockMovementRepo,
              mockAccountRepo,
              mockPocketRepo,
              mockSubPocketRepo
            );

            await useCase.execute('mov-1', 'user-1');

            // Verify deletion and balance recalculation
            expect(mockMovementRepo.delete).toHaveBeenCalledWith('mov-1', 'user-1');
            expect(mockAccountRepo.update).toHaveBeenCalled();
            expect(mockPocketRepo.update).toHaveBeenCalled();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should recalculate balances even when deleting orphaned movement', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...validMovementTypes),
          fc.double({ min: 0.01, max: 10000, noNaN: true }),
          fc.date().filter(d => !isNaN(d.getTime())),
          async (type: MovementType, amount: number, date: Date) => {
            fc.pre(!isNaN(date.getTime())); // Ensure valid date

            // Create orphaned movement to delete
            const movementToDelete = new Movement(
              'mov-1',
              type,
              'acc-1',
              'pocket-1',
              amount,
              date,
              'Orphaned movement to delete',
              undefined,
              false,
              true, // Orphaned
              'Old Account',
              'USD',
              'Old Pocket'
            );

            const { mockMovementRepo, mockAccountRepo, mockPocketRepo, mockSubPocketRepo } = createMockRepos(movementToDelete);
            const useCase = new DeleteMovementUseCase(
              mockMovementRepo,
              mockAccountRepo,
              mockPocketRepo,
              mockSubPocketRepo
            );

            await useCase.execute('mov-1', 'user-1');

            // Verify deletion and balance recalculation
            expect(mockMovementRepo.delete).toHaveBeenCalledWith('mov-1', 'user-1');
            expect(mockAccountRepo.update).toHaveBeenCalled();
            expect(mockPocketRepo.update).toHaveBeenCalled();
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
