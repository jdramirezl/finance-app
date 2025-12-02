/**
 * Property-Based Tests for RestoreOrphanedMovementsUseCase
 * 
 * Feature: backend-migration
 * Property 41: Orphaned movement restoration matches by account (Validates: Requirements 12.2)
 * Property 42: Orphaned movement restoration matches by pocket (Validates: Requirements 12.3)
 * Property 43: Orphaned movement restoration updates state (Validates: Requirements 12.4)
 * Property 44: Orphaned movement restoration recalculates balances (Validates: Requirements 12.5)
 */

import 'reflect-metadata';
import fc from 'fast-check';
import { RestoreOrphanedMovementsUseCase } from './RestoreOrphanedMovementsUseCase';
import { Movement } from '../../domain/Movement';
import { Account } from '../../../accounts/domain/Account';
import { Pocket } from '../../../pockets/domain/Pocket';
import { SubPocket } from '../../../sub-pockets/domain/SubPocket';
import type { IMovementRepository } from '../../infrastructure/IMovementRepository';
import type { IAccountRepository } from '../../../accounts/infrastructure/IAccountRepository';
import type { IPocketRepository } from '../../../pockets/infrastructure/IPocketRepository';
import type { ISubPocketRepository } from '../../../sub-pockets/infrastructure/ISubPocketRepository';
import type { MovementType, Currency } from '@shared-backend/types';

describe('RestoreOrphanedMovementsUseCase Property-Based Tests', () => {
  const validMovementTypes: MovementType[] = ['IngresoNormal', 'EgresoNormal', 'IngresoFijo', 'EgresoFijo'];
  const validCurrencies: Currency[] = ['USD', 'MXN', 'COP', 'EUR', 'GBP'];

  // Helper to create mock repositories
  const createMockRepos = (
    orphanedMovements: Movement[],
    accounts: Account[],
    pockets: Pocket[]
  ) => {
    const mockSubPocket = new SubPocket('sub-1', 'pocket-1', 'Test SubPocket', 100, 12, 25);

    const mockMovementRepo: jest.Mocked<IMovementRepository> = {
      save: jest.fn().mockResolvedValue(undefined),
      findById: jest.fn().mockResolvedValue(null),
      findAll: jest.fn().mockResolvedValue([]),
      findByAccountId: jest.fn().mockResolvedValue([]),
      findByPocketId: jest.fn().mockResolvedValue([]),
      findBySubPocketId: jest.fn().mockResolvedValue([]),
      findPending: jest.fn().mockResolvedValue([]),
      findOrphaned: jest.fn().mockResolvedValue(orphanedMovements),
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
      findById: jest.fn().mockImplementation(async (id: string) => {
        return accounts.find(acc => acc.id === id) || null;
      }),
      findAllByUserId: jest.fn().mockResolvedValue(accounts),
      existsByNameAndCurrency: jest.fn().mockResolvedValue(false),
      existsByNameAndCurrencyExcludingId: jest.fn().mockResolvedValue(false),
      update: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn().mockResolvedValue(undefined),
      updateDisplayOrders: jest.fn().mockResolvedValue(undefined),
    };

    const mockPocketRepo: jest.Mocked<IPocketRepository> = {
      save: jest.fn().mockResolvedValue(undefined),
      findById: jest.fn().mockImplementation(async (id: string) => {
        return pockets.find(pocket => pocket.id === id) || null;
      }),
      findByAccountId: jest.fn().mockResolvedValue([]),
      findAllByUserId: jest.fn().mockResolvedValue(pockets),
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
      countMovements: jest.fn().mockResolvedValue(0),
      hasMovements: jest.fn().mockResolvedValue(false),
    };

    return { mockMovementRepo, mockAccountRepo, mockPocketRepo, mockSubPocketRepo };
  };

  describe('Property 41: Orphaned movement restoration matches by account', () => {
    it('should restore orphaned movement when matching account exists', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...validMovementTypes),
          fc.double({ min: 0.01, max: 10000, noNaN: true }),
          fc.date().filter(d => !isNaN(d.getTime())),
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          fc.constantFrom(...validCurrencies),
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          async (type: MovementType, amount: number, date: Date, accountName: string, currency: Currency, pocketName: string) => {
            fc.pre(!isNaN(date.getTime())); // Ensure valid date

            // Create matching account
            const matchingAccount = new Account('acc-1', accountName, '#3b82f6', currency, 0);

            // Create matching pocket
            const matchingPocket = new Pocket('pocket-1', 'acc-1', pocketName, 'normal', 0, currency);

            // Create orphaned movement with matching account name and currency
            const orphanedMovement = new Movement(
              'mov-1',
              type,
              'old-acc-id',
              'old-pocket-id',
              amount,
              date,
              'Orphaned movement',
              undefined,
              false,
              true, // Orphaned
              accountName, // Matches account name
              currency, // Matches account currency
              pocketName // Matches pocket name
            );

            const { mockMovementRepo, mockAccountRepo, mockPocketRepo, mockSubPocketRepo } = createMockRepos(
              [orphanedMovement],
              [matchingAccount],
              [matchingPocket]
            );

            const useCase = new RestoreOrphanedMovementsUseCase(
              mockMovementRepo,
              mockAccountRepo,
              mockPocketRepo,
              mockSubPocketRepo
            );

            const result = await useCase.execute('user-1');

            // Verify that movement was restored
            expect(result.restored).toBe(1);
            expect(result.failed).toBe(0);
            expect(mockMovementRepo.update).toHaveBeenCalled();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should fail to restore when no matching account exists', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...validMovementTypes),
          fc.double({ min: 0.01, max: 10000, noNaN: true }),
          fc.date().filter(d => !isNaN(d.getTime())),
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          fc.constantFrom(...validCurrencies),
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          async (type: MovementType, amount: number, date: Date, accountName: string, currency: Currency, differentAccountName: string, pocketName: string) => {
            fc.pre(!isNaN(date.getTime())); // Ensure valid date
            fc.pre(accountName !== differentAccountName); // Ensure names are different

            // Create account with different name
            const nonMatchingAccount = new Account('acc-1', differentAccountName, '#3b82f6', currency, 0);

            // Create pocket
            const pocket = new Pocket('pocket-1', 'acc-1', pocketName, 'normal', 0, currency);

            // Create orphaned movement
            const orphanedMovement = new Movement(
              'mov-1',
              type,
              'old-acc-id',
              'old-pocket-id',
              amount,
              date,
              'Orphaned movement',
              undefined,
              false,
              true, // Orphaned
              accountName, // Different from account name
              currency,
              pocketName
            );

            const { mockMovementRepo, mockAccountRepo, mockPocketRepo, mockSubPocketRepo } = createMockRepos(
              [orphanedMovement],
              [nonMatchingAccount],
              [pocket]
            );

            const useCase = new RestoreOrphanedMovementsUseCase(
              mockMovementRepo,
              mockAccountRepo,
              mockPocketRepo,
              mockSubPocketRepo
            );

            const result = await useCase.execute('user-1');

            // Verify that restoration failed
            expect(result.restored).toBe(0);
            expect(result.failed).toBe(1);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 42: Orphaned movement restoration matches by pocket', () => {
    it('should restore when matching pocket exists in matching account', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...validMovementTypes),
          fc.double({ min: 0.01, max: 10000, noNaN: true }),
          fc.date().filter(d => !isNaN(d.getTime())),
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          fc.constantFrom(...validCurrencies),
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          async (type: MovementType, amount: number, date: Date, accountName: string, currency: Currency, pocketName: string) => {
            fc.pre(!isNaN(date.getTime())); // Ensure valid date

            // Create matching account
            const matchingAccount = new Account('acc-1', accountName, '#3b82f6', currency, 0);

            // Create matching pocket in matching account
            const matchingPocket = new Pocket('pocket-1', 'acc-1', pocketName, 'normal', 0, currency);

            // Create orphaned movement
            const orphanedMovement = new Movement(
              'mov-1',
              type,
              'old-acc-id',
              'old-pocket-id',
              amount,
              date,
              'Orphaned movement',
              undefined,
              false,
              true, // Orphaned
              accountName,
              currency,
              pocketName // Matches pocket name
            );

            const { mockMovementRepo, mockAccountRepo, mockPocketRepo, mockSubPocketRepo } = createMockRepos(
              [orphanedMovement],
              [matchingAccount],
              [matchingPocket]
            );

            const useCase = new RestoreOrphanedMovementsUseCase(
              mockMovementRepo,
              mockAccountRepo,
              mockPocketRepo,
              mockSubPocketRepo
            );

            const result = await useCase.execute('user-1');

            // Verify that movement was restored
            expect(result.restored).toBe(1);
            expect(result.failed).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should fail when pocket name does not match', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...validMovementTypes),
          fc.double({ min: 0.01, max: 10000, noNaN: true }),
          fc.date().filter(d => !isNaN(d.getTime())),
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          fc.constantFrom(...validCurrencies),
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          async (type: MovementType, amount: number, date: Date, accountName: string, currency: Currency, pocketName: string, differentPocketName: string) => {
            fc.pre(!isNaN(date.getTime())); // Ensure valid date
            fc.pre(pocketName !== differentPocketName); // Ensure names are different

            // Create matching account
            const matchingAccount = new Account('acc-1', accountName, '#3b82f6', currency, 0);

            // Create pocket with different name
            const nonMatchingPocket = new Pocket('pocket-1', 'acc-1', differentPocketName, 'normal', 0, currency);

            // Create orphaned movement
            const orphanedMovement = new Movement(
              'mov-1',
              type,
              'old-acc-id',
              'old-pocket-id',
              amount,
              date,
              'Orphaned movement',
              undefined,
              false,
              true, // Orphaned
              accountName,
              currency,
              pocketName // Different from pocket name
            );

            const { mockMovementRepo, mockAccountRepo, mockPocketRepo, mockSubPocketRepo } = createMockRepos(
              [orphanedMovement],
              [matchingAccount],
              [nonMatchingPocket]
            );

            const useCase = new RestoreOrphanedMovementsUseCase(
              mockMovementRepo,
              mockAccountRepo,
              mockPocketRepo,
              mockSubPocketRepo
            );

            const result = await useCase.execute('user-1');

            // Verify that restoration failed
            expect(result.restored).toBe(0);
            expect(result.failed).toBe(1);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 43: Orphaned movement restoration updates state', () => {
    it('should set isOrphaned to false after successful restoration', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...validMovementTypes),
          fc.double({ min: 0.01, max: 10000, noNaN: true }),
          fc.date().filter(d => !isNaN(d.getTime())),
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          fc.constantFrom(...validCurrencies),
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          async (type: MovementType, amount: number, date: Date, accountName: string, currency: Currency, pocketName: string) => {
            fc.pre(!isNaN(date.getTime())); // Ensure valid date

            // Create matching account and pocket
            const matchingAccount = new Account('acc-1', accountName, '#3b82f6', currency, 0);
            const matchingPocket = new Pocket('pocket-1', 'acc-1', pocketName, 'normal', 0, currency);

            // Create orphaned movement
            const orphanedMovement = new Movement(
              'mov-1',
              type,
              'old-acc-id',
              'old-pocket-id',
              amount,
              date,
              'Orphaned movement',
              undefined,
              false,
              true, // Initially orphaned
              accountName,
              currency,
              pocketName
            );

            const { mockMovementRepo, mockAccountRepo, mockPocketRepo, mockSubPocketRepo } = createMockRepos(
              [orphanedMovement],
              [matchingAccount],
              [matchingPocket]
            );

            const useCase = new RestoreOrphanedMovementsUseCase(
              mockMovementRepo,
              mockAccountRepo,
              mockPocketRepo,
              mockSubPocketRepo
            );

            await useCase.execute('user-1');

            // Verify that movement was updated (which means isOrphaned was set to false)
            expect(mockMovementRepo.update).toHaveBeenCalled();
            
            // Verify the movement passed to update has isOrphaned = false
            const updateCall = mockMovementRepo.update.mock.calls[0];
            const updatedMovement = updateCall[0];
            expect(updatedMovement.isOrphaned).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 44: Orphaned movement restoration recalculates balances', () => {
    it('should recalculate account and pocket balances after restoration', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...validMovementTypes),
          fc.double({ min: 0.01, max: 10000, noNaN: true }),
          fc.date().filter(d => !isNaN(d.getTime())),
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          fc.constantFrom(...validCurrencies),
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          async (type: MovementType, amount: number, date: Date, accountName: string, currency: Currency, pocketName: string) => {
            fc.pre(!isNaN(date.getTime())); // Ensure valid date

            // Create matching account and pocket
            const matchingAccount = new Account('acc-1', accountName, '#3b82f6', currency, 0);
            const matchingPocket = new Pocket('pocket-1', 'acc-1', pocketName, 'normal', 0, currency);

            // Create orphaned movement
            const orphanedMovement = new Movement(
              'mov-1',
              type,
              'old-acc-id',
              'old-pocket-id',
              amount,
              date,
              'Orphaned movement',
              undefined,
              false,
              true, // Orphaned
              accountName,
              currency,
              pocketName
            );

            const { mockMovementRepo, mockAccountRepo, mockPocketRepo, mockSubPocketRepo } = createMockRepos(
              [orphanedMovement],
              [matchingAccount],
              [matchingPocket]
            );

            const useCase = new RestoreOrphanedMovementsUseCase(
              mockMovementRepo,
              mockAccountRepo,
              mockPocketRepo,
              mockSubPocketRepo
            );

            await useCase.execute('user-1');

            // Verify that balance recalculation was triggered
            expect(mockAccountRepo.update).toHaveBeenCalled();
            expect(mockPocketRepo.update).toHaveBeenCalled();
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
