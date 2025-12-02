/**
 * Property-Based Tests for CreateMovementUseCase
 * 
 * Feature: backend-migration
 * Property 31: Movement validation rejects invalid inputs (Validates: Requirements 10.1)
 * Property 32: Non-pending movements affect balances (Validates: Requirements 10.3)
 * Property 33: Pending movements don't affect balances (Validates: Requirements 10.4)
 */

import 'reflect-metadata';
import fc from 'fast-check';
import { CreateMovementUseCase } from './CreateMovementUseCase';
import { Account } from '../../../accounts/domain/Account';
import { Pocket } from '../../../pockets/domain/Pocket';
import { SubPocket } from '../../../sub-pockets/domain/SubPocket';
import type { IMovementRepository } from '../../infrastructure/IMovementRepository';
import type { IAccountRepository } from '../../../accounts/infrastructure/IAccountRepository';
import type { IPocketRepository } from '../../../pockets/infrastructure/IPocketRepository';
import type { ISubPocketRepository } from '../../../sub-pockets/infrastructure/ISubPocketRepository';
import type { CreateMovementDTO } from '../dtos/MovementDTO';
import type { MovementType, Currency } from '@shared-backend/types';
import { ValidationError } from '../../../../shared/errors/AppError';

describe('CreateMovementUseCase Property-Based Tests', () => {
  const validMovementTypes: MovementType[] = ['IngresoNormal', 'EgresoNormal', 'IngresoFijo', 'EgresoFijo'];
  const validCurrencies: Currency[] = ['USD', 'MXN', 'COP', 'EUR', 'GBP'];

  // Helper to create mock repositories
  const createMockRepos = (
    accountExists = true,
    pocketExists = true,
    subPocketExists = true,
    pocketType: 'normal' | 'fixed' = 'normal'
  ) => {
    const mockAccount = new Account('acc-1', 'Test Account', '#3b82f6', 'USD', 0);
    const mockPocket = new Pocket('pocket-1', 'acc-1', 'Test Pocket', pocketType, 0, 'USD');
    const mockSubPocket = new SubPocket('sub-1', 'pocket-1', 'Test SubPocket', 100, 12, 0);

    const mockMovementRepo: jest.Mocked<IMovementRepository> = {
      save: jest.fn().mockResolvedValue(undefined),
      findById: jest.fn().mockResolvedValue(null),
      findAll: jest.fn().mockResolvedValue([]),
      findByAccountId: jest.fn().mockResolvedValue([]),
      findByPocketId: jest.fn().mockResolvedValue([]),
      findBySubPocketId: jest.fn().mockResolvedValue([]),
      findPending: jest.fn().mockResolvedValue([]),
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

    const mockAccountRepo: jest.Mocked<IAccountRepository> = {
      save: jest.fn().mockResolvedValue(undefined),
      findById: jest.fn().mockResolvedValue(accountExists ? mockAccount : null),
      findAllByUserId: jest.fn().mockResolvedValue([mockAccount]),
      existsByNameAndCurrency: jest.fn().mockResolvedValue(false),
      existsByNameAndCurrencyExcludingId: jest.fn().mockResolvedValue(false),
      update: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn().mockResolvedValue(undefined),
      updateDisplayOrders: jest.fn().mockResolvedValue(undefined),
    };

    const mockPocketRepo: jest.Mocked<IPocketRepository> = {
      save: jest.fn().mockResolvedValue(undefined),
      findById: jest.fn().mockResolvedValue(pocketExists ? mockPocket : null),
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
      findById: jest.fn().mockResolvedValue(subPocketExists ? mockSubPocket : null),
      findByPocketId: jest.fn().mockResolvedValue([mockSubPocket]),
      findByGroupId: jest.fn().mockResolvedValue([]),
      findAllByUserId: jest.fn().mockResolvedValue([mockSubPocket]),
      update: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn().mockResolvedValue(undefined),
      updateDisplayOrders: jest.fn().mockResolvedValue(undefined),
      countMovements: jest.fn().mockResolvedValue(0),
      hasMovements: jest.fn().mockResolvedValue(false),
    };

    return { mockMovementRepo, mockAccountRepo, mockPocketRepo, mockSubPocketRepo };
  };

  describe('Property 31: Movement validation rejects invalid inputs', () => {
    it('should reject movements with non-positive amounts', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.oneof(
            fc.constant(0),
            fc.integer({ max: -1 }),
            fc.double({ max: 0, noNaN: true })
          ),
          fc.constantFrom(...validMovementTypes),
          fc.date().filter(d => !isNaN(d.getTime())),
          async (invalidAmount: number, type: MovementType, date: Date) => {
            const { mockMovementRepo, mockAccountRepo, mockPocketRepo, mockSubPocketRepo } = createMockRepos();
            const useCase = new CreateMovementUseCase(
              mockMovementRepo,
              mockAccountRepo,
              mockPocketRepo,
              mockSubPocketRepo
            );

            const dto: CreateMovementDTO = {
              type,
              accountId: 'acc-1',
              pocketId: 'pocket-1',
              amount: invalidAmount,
              displayedDate: date.toISOString(),
            };

            await expect(useCase.execute(dto, 'user-1')).rejects.toThrow(ValidationError);
            expect(mockMovementRepo.save).not.toHaveBeenCalled();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject movements with invalid type', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string().filter(s => !validMovementTypes.includes(s as MovementType)),
          fc.double({ min: 0.01, max: 10000, noNaN: true }),
          fc.date().filter(d => !isNaN(d.getTime())),
          async (invalidType: string, amount: number, date: Date) => {
            const { mockMovementRepo, mockAccountRepo, mockPocketRepo, mockSubPocketRepo } = createMockRepos();
            const useCase = new CreateMovementUseCase(
              mockMovementRepo,
              mockAccountRepo,
              mockPocketRepo,
              mockSubPocketRepo
            );

            const dto: CreateMovementDTO = {
              type: invalidType as MovementType,
              accountId: 'acc-1',
              pocketId: 'pocket-1',
              amount,
              displayedDate: date.toISOString(),
            };

            await expect(useCase.execute(dto, 'user-1')).rejects.toThrow(ValidationError);
            expect(mockMovementRepo.save).not.toHaveBeenCalled();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject movements with empty accountId or pocketId', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...validMovementTypes),
          fc.double({ min: 0.01, max: 10000, noNaN: true }),
          fc.date().filter(d => !isNaN(d.getTime())),
          fc.boolean(),
          async (type: MovementType, amount: number, date: Date, emptyAccount: boolean) => {
            const { mockMovementRepo, mockAccountRepo, mockPocketRepo, mockSubPocketRepo } = createMockRepos();
            const useCase = new CreateMovementUseCase(
              mockMovementRepo,
              mockAccountRepo,
              mockPocketRepo,
              mockSubPocketRepo
            );

            const dto: CreateMovementDTO = {
              type,
              accountId: emptyAccount ? '' : 'acc-1',
              pocketId: emptyAccount ? 'pocket-1' : '',
              amount,
              displayedDate: date.toISOString(),
            };

            await expect(useCase.execute(dto, 'user-1')).rejects.toThrow(ValidationError);
            expect(mockMovementRepo.save).not.toHaveBeenCalled();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should accept valid movements', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...validMovementTypes),
          fc.double({ min: 0.01, max: 10000, noNaN: true }),
          fc.date().filter(d => !isNaN(d.getTime())),
          fc.option(fc.string({ minLength: 1, maxLength: 200 }), { nil: undefined }),
          async (type: MovementType, amount: number, date: Date, notes: string | undefined) => {
            const { mockMovementRepo, mockAccountRepo, mockPocketRepo, mockSubPocketRepo } = createMockRepos();
            const useCase = new CreateMovementUseCase(
              mockMovementRepo,
              mockAccountRepo,
              mockPocketRepo,
              mockSubPocketRepo
            );

            const dto: CreateMovementDTO = {
              type,
              accountId: 'acc-1',
              pocketId: 'pocket-1',
              amount,
              displayedDate: date.toISOString(),
              notes,
              isPending: true, // Use pending to avoid balance recalculation complexity
            };

            const result = await useCase.execute(dto, 'user-1');

            expect(result.type).toBe(type);
            expect(result.amount).toBe(amount);
            expect(result.accountId).toBe('acc-1');
            expect(result.pocketId).toBe('pocket-1');
            expect(mockMovementRepo.save).toHaveBeenCalled();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 32: Non-pending movements affect balances', () => {
    it('should recalculate balances for non-pending movements', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...validMovementTypes),
          fc.double({ min: 0.01, max: 10000, noNaN: true }),
          fc.date().filter(d => !isNaN(d.getTime())),
          async (type: MovementType, amount: number, date: Date) => {
            const { mockMovementRepo, mockAccountRepo, mockPocketRepo, mockSubPocketRepo } = createMockRepos();
            const useCase = new CreateMovementUseCase(
              mockMovementRepo,
              mockAccountRepo,
              mockPocketRepo,
              mockSubPocketRepo
            );

            const dto: CreateMovementDTO = {
              type,
              accountId: 'acc-1',
              pocketId: 'pocket-1',
              amount,
              displayedDate: date.toISOString(),
              isPending: false, // Non-pending
            };

            await useCase.execute(dto, 'user-1');

            // Verify that balance recalculation was triggered
            expect(mockAccountRepo.update).toHaveBeenCalled();
            expect(mockPocketRepo.update).toHaveBeenCalled();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should recalculate sub-pocket balance when sub-pocket is specified', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('IngresoFijo', 'EgresoFijo'),
          fc.double({ min: 0.01, max: 10000, noNaN: true }),
          fc.date().filter(d => !isNaN(d.getTime())),
          async (type: MovementType, amount: number, date: Date) => {
            const { mockMovementRepo, mockAccountRepo, mockPocketRepo, mockSubPocketRepo } = createMockRepos(
              true,
              true,
              true,
              'fixed' // Pocket must be fixed type for sub-pockets
            );
            const useCase = new CreateMovementUseCase(
              mockMovementRepo,
              mockAccountRepo,
              mockPocketRepo,
              mockSubPocketRepo
            );

            const dto: CreateMovementDTO = {
              type,
              accountId: 'acc-1',
              pocketId: 'pocket-1',
              amount,
              displayedDate: date.toISOString(),
              subPocketId: 'sub-1',
              isPending: false, // Non-pending
            };

            await useCase.execute(dto, 'user-1');

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

  describe('Property 33: Pending movements don\'t affect balances', () => {
    it('should not recalculate balances for pending movements', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...validMovementTypes),
          fc.double({ min: 0.01, max: 10000, noNaN: true }),
          fc.date().filter(d => !isNaN(d.getTime())),
          async (type: MovementType, amount: number, date: Date) => {
            const { mockMovementRepo, mockAccountRepo, mockPocketRepo, mockSubPocketRepo } = createMockRepos();
            const useCase = new CreateMovementUseCase(
              mockMovementRepo,
              mockAccountRepo,
              mockPocketRepo,
              mockSubPocketRepo
            );

            const dto: CreateMovementDTO = {
              type,
              accountId: 'acc-1',
              pocketId: 'pocket-1',
              amount,
              displayedDate: date.toISOString(),
              isPending: true, // Pending
            };

            await useCase.execute(dto, 'user-1');

            // Verify that movement was saved
            expect(mockMovementRepo.save).toHaveBeenCalled();

            // Verify that balance recalculation was NOT triggered
            expect(mockAccountRepo.update).not.toHaveBeenCalled();
            expect(mockPocketRepo.update).not.toHaveBeenCalled();
            expect(mockSubPocketRepo.update).not.toHaveBeenCalled();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should not recalculate sub-pocket balance for pending movements with sub-pocket', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('IngresoFijo', 'EgresoFijo'),
          fc.double({ min: 0.01, max: 10000, noNaN: true }),
          fc.date().filter(d => !isNaN(d.getTime())),
          async (type: MovementType, amount: number, date: Date) => {
            const { mockMovementRepo, mockAccountRepo, mockPocketRepo, mockSubPocketRepo } = createMockRepos(
              true,
              true,
              true,
              'fixed'
            );
            const useCase = new CreateMovementUseCase(
              mockMovementRepo,
              mockAccountRepo,
              mockPocketRepo,
              mockSubPocketRepo
            );

            const dto: CreateMovementDTO = {
              type,
              accountId: 'acc-1',
              pocketId: 'pocket-1',
              amount,
              displayedDate: date.toISOString(),
              subPocketId: 'sub-1',
              isPending: true, // Pending
            };

            await useCase.execute(dto, 'user-1');

            // Verify that movement was saved
            expect(mockMovementRepo.save).toHaveBeenCalled();

            // Verify that NO balance recalculation was triggered
            expect(mockAccountRepo.update).not.toHaveBeenCalled();
            expect(mockPocketRepo.update).not.toHaveBeenCalled();
            expect(mockSubPocketRepo.update).not.toHaveBeenCalled();
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
