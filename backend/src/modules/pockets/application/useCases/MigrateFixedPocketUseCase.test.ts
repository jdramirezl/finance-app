/**
 * Unit tests for MigrateFixedPocketUseCase
 * 
 * Tests the business logic for migrating fixed pockets between accounts
 */

import 'reflect-metadata';
import { MigrateFixedPocketUseCase } from './MigrateFixedPocketUseCase';
import { Pocket } from '../../domain/Pocket';
import { Account } from '../../../accounts/domain/Account';
import { ValidationError, NotFoundError } from '../../../../shared/errors/AppError';
import type { Currency } from '@shared-backend/types';

interface IMovementRepository {
  findByPocketId(pocketId: string, userId: string): Promise<Array<{ id: string; pocketId: string; accountId: string }>>;
  updateAccountId(movementId: string, newAccountId: string, userId: string): Promise<void>;
}

interface IPocketRepository {
  save(pocket: Pocket, userId: string): Promise<void>;
  findById(id: string, userId: string): Promise<Pocket | null>;
  findByAccountId(accountId: string, userId: string): Promise<Pocket[]>;
  findAllByUserId(userId: string): Promise<Pocket[]>;
  existsByNameInAccount(name: string, accountId: string, userId: string): Promise<boolean>;
  existsByNameInAccountExcludingId(name: string, accountId: string, userId: string, excludeId: string): Promise<boolean>;
  existsFixedPocketForUser(userId: string): Promise<boolean>;
  existsFixedPocketForUserExcludingId(userId: string, excludeId: string): Promise<boolean>;
  update(pocket: Pocket, userId: string): Promise<void>;
  delete(id: string, userId: string): Promise<void>;
  updateDisplayOrders(pocketIds: string[], userId: string): Promise<void>;
}

interface IAccountRepository {
  save(account: Account, userId: string): Promise<void>;
  findById(id: string, userId: string): Promise<Account | null>;
  findAllByUserId(userId: string): Promise<Account[]>;
  existsByNameAndCurrency(name: string, currency: Currency, userId: string): Promise<boolean>;
  existsByNameAndCurrencyExcludingId(name: string, currency: Currency, userId: string, excludeId: string): Promise<boolean>;
  update(account: Account, userId: string): Promise<void>;
  delete(id: string, userId: string): Promise<void>;
  updateDisplayOrders(accountIds: string[], userId: string): Promise<void>;
}

describe('MigrateFixedPocketUseCase', () => {
  let useCase: MigrateFixedPocketUseCase;
  let mockPocketRepo: jest.Mocked<IPocketRepository>;
  let mockAccountRepo: jest.Mocked<IAccountRepository>;
  let mockMovementRepo: jest.Mocked<IMovementRepository>;

  const userId = 'user-123';
  const sourceAccountId = 'account-source';
  const targetAccountId = 'account-target';
  const pocketId = 'pocket-fixed';

  beforeEach(() => {
    mockPocketRepo = {
      findById: jest.fn(),
      findByAccountId: jest.fn(),
      update: jest.fn(),
    } as any;

    mockAccountRepo = {
      findById: jest.fn(),
      update: jest.fn(),
    } as any;

    mockMovementRepo = {
      findByPocketId: jest.fn(),
      updateAccountId: jest.fn(),
    } as any;

    useCase = new MigrateFixedPocketUseCase(
      mockPocketRepo,
      mockAccountRepo,
      mockMovementRepo
    );
  });

  describe('Validation', () => {
    it('should throw ValidationError if target account ID is missing', async () => {
      await expect(
        useCase.execute(pocketId, { targetAccountId: '' }, userId)
      ).rejects.toThrow(ValidationError);

      await expect(
        useCase.execute(pocketId, { targetAccountId: '   ' }, userId)
      ).rejects.toThrow(ValidationError);
    });

    it('should throw NotFoundError if pocket does not exist', async () => {
      mockPocketRepo.findById.mockResolvedValue(null);

      await expect(
        useCase.execute(pocketId, { targetAccountId }, userId)
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw ValidationError if pocket is not fixed type', async () => {
      const normalPocket = new Pocket(
        pocketId,
        sourceAccountId,
        'Normal Pocket',
        'normal',
        100,
        'USD' as Currency
      );

      mockPocketRepo.findById.mockResolvedValue(normalPocket);

      await expect(
        useCase.execute(pocketId, { targetAccountId }, userId)
      ).rejects.toThrow(ValidationError);
      
      expect(mockPocketRepo.findById).toHaveBeenCalledWith(pocketId, userId);
    });

    it('should throw NotFoundError if source account does not exist', async () => {
      const fixedPocket = new Pocket(
        pocketId,
        sourceAccountId,
        'Fixed Expenses',
        'fixed',
        500,
        'USD' as Currency
      );

      mockPocketRepo.findById.mockResolvedValue(fixedPocket);
      mockAccountRepo.findById.mockResolvedValueOnce(null); // Source account

      await expect(
        useCase.execute(pocketId, { targetAccountId }, userId)
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw NotFoundError if target account does not exist', async () => {
      const fixedPocket = new Pocket(
        pocketId,
        sourceAccountId,
        'Fixed Expenses',
        'fixed',
        500,
        'USD' as Currency
      );

      const sourceAccount = new Account(
        sourceAccountId,
        'Source Account',
        '#3b82f6',
        'USD' as Currency,
        1000
      );

      mockPocketRepo.findById.mockResolvedValue(fixedPocket);
      mockAccountRepo.findById.mockResolvedValueOnce(sourceAccount); // Source account
      mockAccountRepo.findById.mockResolvedValueOnce(null); // Target account

      await expect(
        useCase.execute(pocketId, { targetAccountId }, userId)
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw ValidationError if target account is investment type', async () => {
      const fixedPocket = new Pocket(
        pocketId,
        sourceAccountId,
        'Fixed Expenses',
        'fixed',
        500,
        'USD' as Currency
      );

      const sourceAccount = new Account(
        sourceAccountId,
        'Source Account',
        '#3b82f6',
        'USD' as Currency,
        1000
      );

      const investmentAccount = new Account(
        targetAccountId,
        'Investment Account',
        '#10b981',
        'USD' as Currency,
        5000,
        'investment',
        'VOO',
        5000,
        10
      );

      mockPocketRepo.findById.mockResolvedValue(fixedPocket);
      mockAccountRepo.findById.mockResolvedValueOnce(sourceAccount);
      mockAccountRepo.findById.mockResolvedValueOnce(investmentAccount);

      await expect(
        useCase.execute(pocketId, { targetAccountId }, userId)
      ).rejects.toThrow(ValidationError);
      
      expect(mockAccountRepo.findById).toHaveBeenCalledTimes(2);
    });

    it('should throw ValidationError if target account is same as source', async () => {
      const fixedPocket = new Pocket(
        pocketId,
        sourceAccountId,
        'Fixed Expenses',
        'fixed',
        500,
        'USD' as Currency
      );

      const sourceAccount = new Account(
        sourceAccountId,
        'Source Account',
        '#3b82f6',
        'USD' as Currency,
        1000
      );

      mockPocketRepo.findById.mockResolvedValue(fixedPocket);
      mockAccountRepo.findById.mockResolvedValueOnce(sourceAccount);
      mockAccountRepo.findById.mockResolvedValueOnce(sourceAccount);

      await expect(
        useCase.execute(pocketId, { targetAccountId: sourceAccountId }, userId)
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('Successful Migration', () => {
    it('should migrate fixed pocket and update all movements', async () => {
      const fixedPocket = new Pocket(
        pocketId,
        sourceAccountId,
        'Fixed Expenses',
        'fixed',
        500,
        'USD' as Currency
      );

      const sourceAccount = new Account(
        sourceAccountId,
        'Source Account',
        '#3b82f6',
        'USD' as Currency,
        1500
      );

      const targetAccount = new Account(
        targetAccountId,
        'Target Account',
        '#10b981',
        'USD' as Currency,
        2000
      );

      const movements = [
        { id: 'mov-1', pocketId, accountId: sourceAccountId },
        { id: 'mov-2', pocketId, accountId: sourceAccountId },
        { id: 'mov-3', pocketId, accountId: sourceAccountId },
      ];

      const sourcePockets = [
        new Pocket('pocket-1', sourceAccountId, 'Pocket 1', 'normal', 1000, 'USD' as Currency),
      ];

      const targetPockets = [
        new Pocket('pocket-2', targetAccountId, 'Pocket 2', 'normal', 2000, 'USD' as Currency),
        fixedPocket, // Will be included after migration
      ];

      mockPocketRepo.findById.mockResolvedValue(fixedPocket);
      mockAccountRepo.findById.mockResolvedValueOnce(sourceAccount);
      mockAccountRepo.findById.mockResolvedValueOnce(targetAccount);
      mockMovementRepo.findByPocketId.mockResolvedValue(movements);
      mockPocketRepo.findByAccountId.mockResolvedValueOnce(sourcePockets);
      mockPocketRepo.findByAccountId.mockResolvedValueOnce(targetPockets);

      const result = await useCase.execute(pocketId, { targetAccountId }, userId);

      // Verify all movements were updated
      expect(mockMovementRepo.updateAccountId).toHaveBeenCalledTimes(3);
      expect(mockMovementRepo.updateAccountId).toHaveBeenCalledWith('mov-1', targetAccountId, userId);
      expect(mockMovementRepo.updateAccountId).toHaveBeenCalledWith('mov-2', targetAccountId, userId);
      expect(mockMovementRepo.updateAccountId).toHaveBeenCalledWith('mov-3', targetAccountId, userId);

      // Verify pocket was updated
      expect(mockPocketRepo.update).toHaveBeenCalledWith(
        expect.objectContaining({
          id: pocketId,
          accountId: targetAccountId,
        }),
        userId
      );

      // Verify both accounts were updated
      expect(mockAccountRepo.update).toHaveBeenCalledTimes(2);
      expect(mockAccountRepo.update).toHaveBeenCalledWith(sourceAccount, userId);
      expect(mockAccountRepo.update).toHaveBeenCalledWith(targetAccount, userId);

      // Verify result
      expect(result).toEqual({
        id: pocketId,
        accountId: targetAccountId,
        name: 'Fixed Expenses',
        type: 'fixed',
        balance: 500,
        currency: 'USD',
        displayOrder: undefined,
      });
    });

    it('should handle migration with no movements', async () => {
      const fixedPocket = new Pocket(
        pocketId,
        sourceAccountId,
        'Fixed Expenses',
        'fixed',
        0,
        'USD' as Currency
      );

      const sourceAccount = new Account(
        sourceAccountId,
        'Source Account',
        '#3b82f6',
        'USD' as Currency,
        1000
      );

      const targetAccount = new Account(
        targetAccountId,
        'Target Account',
        '#10b981',
        'USD' as Currency,
        2000
      );

      mockPocketRepo.findById.mockResolvedValue(fixedPocket);
      mockAccountRepo.findById.mockResolvedValueOnce(sourceAccount);
      mockAccountRepo.findById.mockResolvedValueOnce(targetAccount);
      mockMovementRepo.findByPocketId.mockResolvedValue([]);
      mockPocketRepo.findByAccountId.mockResolvedValue([]);

      const result = await useCase.execute(pocketId, { targetAccountId }, userId);

      // Verify no movement updates were called
      expect(mockMovementRepo.updateAccountId).not.toHaveBeenCalled();

      // Verify pocket was still updated
      expect(mockPocketRepo.update).toHaveBeenCalled();

      // Verify both accounts were updated
      expect(mockAccountRepo.update).toHaveBeenCalledTimes(2);

      expect(result.accountId).toBe(targetAccountId);
    });
  });
});
