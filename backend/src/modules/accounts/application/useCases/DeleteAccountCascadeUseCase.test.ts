/**
 * Delete Account Cascade Use Case Tests
 * 
 * Tests for DeleteAccountCascadeUseCase business logic.
 */

import 'reflect-metadata';
import { DeleteAccountCascadeUseCase } from './DeleteAccountCascadeUseCase';
import type { IAccountRepository } from '../../infrastructure/IAccountRepository';
import { Account } from '../../domain/Account';
import { NotFoundError } from '../../../../shared/errors/AppError';

describe('DeleteAccountCascadeUseCase', () => {
  let useCase: DeleteAccountCascadeUseCase;
  let mockAccountRepo: jest.Mocked<IAccountRepository>;
  let mockPocketRepo: any;
  let mockSubPocketRepo: any;
  let mockMovementRepo: any;

  beforeEach(() => {
    mockAccountRepo = {
      save: jest.fn(),
      findById: jest.fn(),
      findAllByUserId: jest.fn(),
      existsByNameAndCurrency: jest.fn(),
      existsByNameAndCurrencyExcludingId: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      updateDisplayOrders: jest.fn(),
    } as jest.Mocked<IAccountRepository>;

    mockPocketRepo = {
      findByAccountId: jest.fn(),
      deleteByAccountId: jest.fn(),
    };

    mockSubPocketRepo = {
      deleteByPocketIds: jest.fn(),
    };

    mockMovementRepo = {
      markAsOrphanedByAccountId: jest.fn(),
      deleteByAccountId: jest.fn(),
    };

    useCase = new DeleteAccountCascadeUseCase(
      mockAccountRepo,
      mockPocketRepo,
      mockSubPocketRepo,
      mockMovementRepo
    );
  });

  describe('execute', () => {
    it('should cascade delete account with orphan flag for movements', async () => {
      const accountId = 'account-1';
      const userId = 'user-1';
      const account = new Account(accountId, 'Test Account', '#3b82f6', 'USD', 1000);

      const pockets = [
        { id: 'pocket-1', accountId, type: 'normal' },
        { id: 'pocket-2', accountId, type: 'normal' },
      ];

      mockAccountRepo.findById.mockResolvedValue(account);
      mockPocketRepo.findByAccountId.mockResolvedValue(pockets);
      mockSubPocketRepo.deleteByPocketIds.mockResolvedValue(0);
      mockPocketRepo.deleteByAccountId.mockResolvedValue(2);
      mockMovementRepo.markAsOrphanedByAccountId.mockResolvedValue(3);
      mockAccountRepo.delete.mockResolvedValue(undefined);

      const result = await useCase.execute(accountId, { deleteMovements: false }, userId);

      expect(mockAccountRepo.findById).toHaveBeenCalledWith(accountId, userId);
      expect(mockPocketRepo.findByAccountId).toHaveBeenCalledWith(accountId, userId);
      expect(mockSubPocketRepo.deleteByPocketIds).toHaveBeenCalledWith(['pocket-1', 'pocket-2'], userId);
      expect(mockPocketRepo.deleteByAccountId).toHaveBeenCalledWith(accountId, userId);
      expect(mockMovementRepo.markAsOrphanedByAccountId).toHaveBeenCalledWith(
        accountId, 'Test Account', 'USD', userId
      );
      expect(mockMovementRepo.deleteByAccountId).not.toHaveBeenCalled();
      expect(mockAccountRepo.delete).toHaveBeenCalledWith(accountId, userId);

      expect(result).toEqual({
        account: 'Test Account',
        pockets: 2,
        subPockets: 0,
        movements: 3,
      });
    });

    it('should cascade delete account with hard delete flag for movements', async () => {
      const accountId = 'account-1';
      const userId = 'user-1';
      const account = new Account(accountId, 'Test Account', '#3b82f6', 'USD', 1000);

      const pockets = [
        { id: 'pocket-1', accountId, type: 'normal' },
      ];

      mockAccountRepo.findById.mockResolvedValue(account);
      mockPocketRepo.findByAccountId.mockResolvedValue(pockets);
      mockSubPocketRepo.deleteByPocketIds.mockResolvedValue(0);
      mockPocketRepo.deleteByAccountId.mockResolvedValue(1);
      mockMovementRepo.deleteByAccountId.mockResolvedValue(2);
      mockAccountRepo.delete.mockResolvedValue(undefined);

      const result = await useCase.execute(accountId, { deleteMovements: true }, userId);

      expect(mockMovementRepo.deleteByAccountId).toHaveBeenCalledWith(accountId, userId);
      expect(mockMovementRepo.markAsOrphanedByAccountId).not.toHaveBeenCalled();
      expect(mockAccountRepo.delete).toHaveBeenCalledWith(accountId, userId);

      expect(result).toEqual({
        account: 'Test Account',
        pockets: 1,
        subPockets: 0,
        movements: 2,
      });
    });

    it('should delete sub-pockets when deleting account with fixed pocket', async () => {
      const accountId = 'account-1';
      const userId = 'user-1';
      const account = new Account(accountId, 'Test Account', '#3b82f6', 'USD', 1000);

      const pockets = [
        { id: 'pocket-1', accountId, type: 'fixed' },
        { id: 'pocket-2', accountId, type: 'normal' },
      ];

      mockAccountRepo.findById.mockResolvedValue(account);
      mockPocketRepo.findByAccountId.mockResolvedValue(pockets);
      mockSubPocketRepo.deleteByPocketIds.mockResolvedValue(3);
      mockPocketRepo.deleteByAccountId.mockResolvedValue(2);
      mockMovementRepo.markAsOrphanedByAccountId.mockResolvedValue(0);
      mockAccountRepo.delete.mockResolvedValue(undefined);

      const result = await useCase.execute(accountId, { deleteMovements: false }, userId);

      expect(mockSubPocketRepo.deleteByPocketIds).toHaveBeenCalledWith(['pocket-1', 'pocket-2'], userId);

      expect(result).toEqual({
        account: 'Test Account',
        pockets: 2,
        subPockets: 3,
        movements: 0,
      });
    });

    it('should handle account with no pockets or movements', async () => {
      const accountId = 'account-1';
      const userId = 'user-1';
      const account = new Account(accountId, 'Empty Account', '#3b82f6', 'USD', 0);

      mockAccountRepo.findById.mockResolvedValue(account);
      mockPocketRepo.findByAccountId.mockResolvedValue([]);
      mockSubPocketRepo.deleteByPocketIds.mockResolvedValue(0);
      mockPocketRepo.deleteByAccountId.mockResolvedValue(0);
      mockMovementRepo.markAsOrphanedByAccountId.mockResolvedValue(0);
      mockAccountRepo.delete.mockResolvedValue(undefined);

      const result = await useCase.execute(accountId, { deleteMovements: false }, userId);

      expect(mockAccountRepo.findById).toHaveBeenCalledWith(accountId, userId);
      expect(mockAccountRepo.delete).toHaveBeenCalledWith(accountId, userId);

      expect(result).toEqual({
        account: 'Empty Account',
        pockets: 0,
        subPockets: 0,
        movements: 0,
      });
    });

    it('should throw NotFoundError when account does not exist', async () => {
      const accountId = 'non-existent';
      const userId = 'user-1';

      mockAccountRepo.findById.mockResolvedValue(null);

      await expect(
        useCase.execute(accountId, { deleteMovements: false }, userId)
      ).rejects.toThrow(NotFoundError);

      await expect(
        useCase.execute(accountId, { deleteMovements: false }, userId)
      ).rejects.toThrow('Account not found');

      expect(mockAccountRepo.findById).toHaveBeenCalledWith(accountId, userId);
      expect(mockPocketRepo.findByAccountId).not.toHaveBeenCalled();
      expect(mockAccountRepo.delete).not.toHaveBeenCalled();
    });

    it('should throw NotFoundError when user does not own the account', async () => {
      const accountId = 'account-1';
      const userId = 'user-2';

      mockAccountRepo.findById.mockResolvedValue(null);

      await expect(
        useCase.execute(accountId, { deleteMovements: true }, userId)
      ).rejects.toThrow(NotFoundError);

      await expect(
        useCase.execute(accountId, { deleteMovements: true }, userId)
      ).rejects.toThrow('Account not found');

      expect(mockPocketRepo.findByAccountId).not.toHaveBeenCalled();
      expect(mockAccountRepo.delete).not.toHaveBeenCalled();
    });

    it('should handle complex scenario with fixed pocket, sub-pockets, and movements', async () => {
      const accountId = 'account-1';
      const userId = 'user-1';
      const account = new Account(accountId, 'Complex Account', '#3b82f6', 'USD', 5000);

      const pockets = [
        { id: 'pocket-1', accountId, type: 'fixed' },
        { id: 'pocket-2', accountId, type: 'normal' },
        { id: 'pocket-3', accountId, type: 'normal' },
      ];

      mockAccountRepo.findById.mockResolvedValue(account);
      mockPocketRepo.findByAccountId.mockResolvedValue(pockets);
      mockSubPocketRepo.deleteByPocketIds.mockResolvedValue(2);
      mockPocketRepo.deleteByAccountId.mockResolvedValue(3);
      mockMovementRepo.deleteByAccountId.mockResolvedValue(5);
      mockAccountRepo.delete.mockResolvedValue(undefined);

      const result = await useCase.execute(accountId, { deleteMovements: true }, userId);

      expect(mockSubPocketRepo.deleteByPocketIds).toHaveBeenCalledWith(
        ['pocket-1', 'pocket-2', 'pocket-3'], userId
      );
      expect(mockPocketRepo.deleteByAccountId).toHaveBeenCalledWith(accountId, userId);
      expect(mockMovementRepo.deleteByAccountId).toHaveBeenCalledWith(accountId, userId);
      expect(mockAccountRepo.delete).toHaveBeenCalledWith(accountId, userId);

      expect(result).toEqual({
        account: 'Complex Account',
        pockets: 3,
        subPockets: 2,
        movements: 5,
      });
    });
  });
});
