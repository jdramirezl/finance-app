/**
 * Property-Based Tests for UpdateMovementUseCase
 * 
 * Feature: backend-migration
 * Property 35: Movement updates recalculate balances conditionally (Validates: Requirements 10.6)
 */

import 'reflect-metadata';
import fc from 'fast-check';
import { UpdateMovementUseCase } from './UpdateMovementUseCase';
import { Movement } from '../../domain/Movement';
import { Account } from '../../../accounts/domain/Account';
import { Pocket } from '../../../pockets/domain/Pocket';
import { SubPocket } from '../../../sub-pockets/domain/SubPocket';
import type { IMovementRepository } from '../../infrastructure/IMovementRepository';
import type { IAccountRepository } from '../../../accounts/infrastructure/IAccountRepository';
import type { IPocketRepository } from '../../../pockets/infrastructure/IPocketRepository';
import type { ISubPocketRepository } from '../../../sub-pockets/infrastructure/ISubPocketRepository';
import type { UpdateMovementDTO } from '../dtos/MovementDTO';
import type { MovementType } from '@shared-backend/types';

describe('UpdateMovementUseCase Property-Based Tests', () => {
  const validMovementTypes: MovementType[] = ['IngresoNormal', 'EgresoNormal', 'IngresoFijo', 'EgresoFijo'];

  // Helper to create mock repositories with an existing movement
  const createMockRepos = (existingMovement: Movement) => {
    const mockAccount = new Account('acc-1', 'Test Account', '#3b82f6', 'USD', 100);
    const mockPocket = new Pocket('pocket-1', 'acc-1', 'Test Pocket', 'normal', 50, 'USD');
    const mockSubPocket = new SubPocket('sub-1', 'pocket-1', 'Test SubPocket', 100, 12, 25);

    const mockMovementRepo: jest.Mocked<IMovementRepository> = {
      save: jest.fn().mockResolvedValue(undefined),
      findById: jest.fn().mockResolvedValue(existingMovement),
      findAll: jest.fn().mockResolvedValue([existingMovement]),
      findByAccountId: jest.fn().mockResolvedValue([existingMovement]),
      findByPocketId: jest.fn().mockResolvedValue([existingMovement]),
      findBySubPocketId: jest.fn().mockResolvedValue([existingMovement]),
      findPending: jest.fn().mockResolvedValue([]),
      findOrphaned: jest.fn().mockResolvedValue([]),
      findOrphanedByAccount: jest.fn().mockResolvedValue([]),
      findOrphanedByAccountAndPocket: jest.fn().mockResolvedValue([]),
      findByMonth: jest.fn().mockResolvedValue([existingMovement]),
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

  describe('Property 35: Movement updates recalculate balances conditionally', () => {
    it('should recalculate balances when amount changes', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...validMovementTypes),
          fc.double({ min: 0.01, max: 10000, noNaN: true }),
          fc.double({ min: 0.01, max: 10000, noNaN: true }),
          fc.date().filter(d => !isNaN(d.getTime())),
          async (type: MovementType, oldAmount: number, newAmount: number, date: Date) => {
            fc.pre(oldAmount !== newAmount); // Only test when amount actually changes
            fc.pre(!isNaN(date.getTime())); // Ensure valid date
            // Create existing movement with old amount
            const existingMovement = new Movement(
              'mov-1',
              type,
              'acc-1',
              'pocket-1',
              oldAmount,
              date,
              'Test movement',
              undefined,
              false // Not pending
            );

            const { mockMovementRepo, mockAccountRepo, mockPocketRepo, mockSubPocketRepo } = createMockRepos(existingMovement);
            const useCase = new UpdateMovementUseCase(
              mockMovementRepo,
              mockAccountRepo,
              mockPocketRepo,
              mockSubPocketRepo
            );

            const dto: UpdateMovementDTO = {
              amount: newAmount, // Change amount
            };

            await useCase.execute('mov-1', dto, 'user-1');

            // Verify that movement was updated
            expect(mockMovementRepo.update).toHaveBeenCalled();

            // Verify that balance recalculation was triggered
            expect(mockAccountRepo.update).toHaveBeenCalled();
            expect(mockPocketRepo.update).toHaveBeenCalled();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should recalculate balances when amount changes from pending to non-pending movement', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...validMovementTypes),
          fc.double({ min: 0.01, max: 10000, noNaN: true }),
          fc.double({ min: 0.01, max: 10000, noNaN: true }),
          fc.date().filter(d => !isNaN(d.getTime())),
          async (type: MovementType, oldAmount: number, newAmount: number, date: Date) => {
            fc.pre(oldAmount !== newAmount); // Only test when amount changes
            fc.pre(!isNaN(date.getTime())); // Ensure valid date

            // Create existing movement that is pending
            const existingMovement = new Movement(
              'mov-1',
              type,
              'acc-1',
              'pocket-1',
              oldAmount,
              date,
              'Test movement',
              undefined,
              true // Initially pending
            );

            const { mockMovementRepo, mockAccountRepo, mockPocketRepo, mockSubPocketRepo } = createMockRepos(existingMovement);
            const useCase = new UpdateMovementUseCase(
              mockMovementRepo,
              mockAccountRepo,
              mockPocketRepo,
              mockSubPocketRepo
            );

            // Change amount (which requires balance recalculation)
            const dto: UpdateMovementDTO = {
              amount: newAmount,
            };

            await useCase.execute('mov-1', dto, 'user-1');

            // Verify that movement was updated
            expect(mockMovementRepo.update).toHaveBeenCalled();

            // Verify that balance recalculation was triggered
            expect(mockAccountRepo.update).toHaveBeenCalled();
            expect(mockPocketRepo.update).toHaveBeenCalled();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should recalculate balances when type changes', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...validMovementTypes),
          fc.constantFrom(...validMovementTypes),
          fc.double({ min: 0.01, max: 10000, noNaN: true }),
          fc.date().filter(d => !isNaN(d.getTime())),
          async (oldType: MovementType, newType: MovementType, amount: number, date: Date) => {
            fc.pre(oldType !== newType); // Only test when type actually changes
            fc.pre(!isNaN(date.getTime())); // Ensure valid date

            // Create existing movement with old type
            const existingMovement = new Movement(
              'mov-1',
              oldType,
              'acc-1',
              'pocket-1',
              amount,
              date,
              'Test movement',
              undefined,
              false
            );

            const { mockMovementRepo, mockAccountRepo, mockPocketRepo, mockSubPocketRepo } = createMockRepos(existingMovement);
            const useCase = new UpdateMovementUseCase(
              mockMovementRepo,
              mockAccountRepo,
              mockPocketRepo,
              mockSubPocketRepo
            );

            const dto: UpdateMovementDTO = {
              type: newType, // Change type
            };

            await useCase.execute('mov-1', dto, 'user-1');

            // Verify that movement was updated
            expect(mockMovementRepo.update).toHaveBeenCalled();

            // Verify that balance recalculation was triggered
            expect(mockAccountRepo.update).toHaveBeenCalled();
            expect(mockPocketRepo.update).toHaveBeenCalled();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should NOT recalculate balances when only notes change', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...validMovementTypes),
          fc.double({ min: 0.01, max: 10000, noNaN: true }),
          fc.date().filter(d => !isNaN(d.getTime())),
          fc.string({ minLength: 1, maxLength: 200 }),
          fc.string({ minLength: 1, maxLength: 200 }),
          async (type: MovementType, amount: number, date: Date, oldNotes: string, newNotes: string) => {
            fc.pre(oldNotes !== newNotes); // Only test when notes actually change
            fc.pre(!isNaN(date.getTime())); // Ensure valid date

            // Create existing movement with old notes
            const existingMovement = new Movement(
              'mov-1',
              type,
              'acc-1',
              'pocket-1',
              amount,
              date,
              oldNotes,
              undefined,
              false
            );

            const { mockMovementRepo, mockAccountRepo, mockPocketRepo, mockSubPocketRepo } = createMockRepos(existingMovement);
            const useCase = new UpdateMovementUseCase(
              mockMovementRepo,
              mockAccountRepo,
              mockPocketRepo,
              mockSubPocketRepo
            );

            const dto: UpdateMovementDTO = {
              notes: newNotes, // Only change notes
            };

            await useCase.execute('mov-1', dto, 'user-1');

            // Verify that movement was updated
            expect(mockMovementRepo.update).toHaveBeenCalled();

            // Verify that balance recalculation was NOT triggered
            expect(mockAccountRepo.update).not.toHaveBeenCalled();
            expect(mockPocketRepo.update).not.toHaveBeenCalled();
            expect(mockSubPocketRepo.update).not.toHaveBeenCalled();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should NOT recalculate balances when only displayedDate changes', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...validMovementTypes),
          fc.double({ min: 0.01, max: 10000, noNaN: true }),
          fc.date().filter(d => !isNaN(d.getTime())),
          fc.date().filter(d => !isNaN(d.getTime())),
          async (type: MovementType, amount: number, oldDate: Date, newDate: Date) => {
            fc.pre(oldDate.getTime() !== newDate.getTime()); // Only test when date actually changes
            fc.pre(!isNaN(oldDate.getTime()) && !isNaN(newDate.getTime())); // Ensure valid dates

            // Create existing movement with old date
            const existingMovement = new Movement(
              'mov-1',
              type,
              'acc-1',
              'pocket-1',
              amount,
              oldDate,
              'Test movement',
              undefined,
              false
            );

            const { mockMovementRepo, mockAccountRepo, mockPocketRepo, mockSubPocketRepo } = createMockRepos(existingMovement);
            const useCase = new UpdateMovementUseCase(
              mockMovementRepo,
              mockAccountRepo,
              mockPocketRepo,
              mockSubPocketRepo
            );

            const dto: UpdateMovementDTO = {
              displayedDate: newDate.toISOString(), // Only change date
            };

            await useCase.execute('mov-1', dto, 'user-1');

            // Verify that movement was updated
            expect(mockMovementRepo.update).toHaveBeenCalled();

            // Verify that balance recalculation was NOT triggered
            expect(mockAccountRepo.update).not.toHaveBeenCalled();
            expect(mockPocketRepo.update).not.toHaveBeenCalled();
            expect(mockSubPocketRepo.update).not.toHaveBeenCalled();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should recalculate balances when amount changes on movement with subPocket', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('IngresoFijo', 'EgresoFijo'),
          fc.double({ min: 0.01, max: 10000, noNaN: true }),
          fc.double({ min: 0.01, max: 10000, noNaN: true }),
          fc.date().filter(d => !isNaN(d.getTime())),
          async (type: MovementType, oldAmount: number, newAmount: number, date: Date) => {
            fc.pre(oldAmount !== newAmount); // Only test when amount changes
            fc.pre(!isNaN(date.getTime())); // Ensure valid date

            // Create existing movement with subPocketId
            const existingMovement = new Movement(
              'mov-1',
              type,
              'acc-1',
              'pocket-1',
              oldAmount,
              date,
              'Test movement',
              'sub-1', // Has sub-pocket
              false
            );

            const { mockMovementRepo, mockAccountRepo, mockPocketRepo, mockSubPocketRepo } = createMockRepos(existingMovement);
            const useCase = new UpdateMovementUseCase(
              mockMovementRepo,
              mockAccountRepo,
              mockPocketRepo,
              mockSubPocketRepo
            );

            const dto: UpdateMovementDTO = {
              amount: newAmount, // Change amount
            };

            await useCase.execute('mov-1', dto, 'user-1');

            // Verify that movement was updated
            expect(mockMovementRepo.update).toHaveBeenCalled();

            // Verify that all three balances were recalculated
            expect(mockAccountRepo.update).toHaveBeenCalled();
            expect(mockPocketRepo.update).toHaveBeenCalled();
            expect(mockSubPocketRepo.update).toHaveBeenCalled();
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
