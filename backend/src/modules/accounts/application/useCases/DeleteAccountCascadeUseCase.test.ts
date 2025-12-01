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

// Mock interfaces for dependencies
interface IPocketRepository {
  findByAccountId(accountId: string, userId: string): Promise<Array<{ id: string; accountId: string; type: string }>>;
  delete(pocketId: string, userId: string): Promise<void>;
}

interface ISubPocketRepository {
  findByPocketId(pocketId: string, userId: string): Promise<Array<{ id: string; pocketId: string }>>;
  delete(subPocketId: string, userId: string): Promise<void>;
}

interface IMovementRepository {
  findByAccountId(accountId: string, userId: string): Promise<Array<{ id: string; accountId: string }>>;
  markAsOrphaned(movementId: string, accountName: string, accountCurrency: string, pocketName: string, userId: string): Promise<void>;
  delete(movementId: string, userId: string): Promise<void>;
}

describe('DeleteAccountCascadeUseCase', () => {
  let useCase: DeleteAccountCascadeUseCase;
  let mockAccountRepo: jest.Mocked<IAccountRepository>;
  let mockPocketRepo: jest.Mocked<IPocketRepository>;
  let mockSubPocketRepo: jest.Mocked<ISubPocketRepository>;
  let mockMovementRepo: jest.Mocked<IMovementRepository>;

  beforeEach(() => {
    // Create mock repositories
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
      delete: jest.fn(),
    } as jest.Mocked<IPocketRepository>;

    mockSubPocketRepo = {
      findByPocketId: jest.fn(),
      delete: jest.fn(),
    } as jest.Mocked<ISubPocketRepository>;

    mockMovementRepo = {
      findByAccountId: jest.fn(),
      markAsOrphaned: jest.fn(),
      delete: jest.fn(),
    } as jest.Mocked<IMovementRepository>;

    // Create use case with mocked dependencies
    useCase = new DeleteAccountCascadeUseCase(
      mockAccountRepo,
      mockPocketRepo,
      mockSubPocketRepo,
      mockMovementRepo
    );
  });

  describe('execute', () => {
    it('should cascade delete account with orphan flag for movements', async () => {
      // Arrange
      const accountId = 'account-1';
      const userId = 'user-1';
      const account = new Account(accountId, 'Test Account', '#3b82f6', 'USD', 1000);

      const pockets = [
        { id: 'pocket-1', accountId, type: 'normal' },
        { id: 'pocket-2', accountId, type: 'normal' },
      ];

      const movements = [
        { id: 'movement-1', accountId },
        { id: 'movement-2', accountId },
        { id: 'movement-3', accountId },
      ];

      mockAccountRepo.findById.mockResolvedValue(account);
      mockPocketRepo.findByAccountId.mockResolvedValue(pockets);
      mockSubPocketRepo.findByPocketId.mockResolvedValue([]);
      mockMovementRepo.findByAccountId.mockResolvedValue(movements);
      mockPocketRepo.delete.mockResolvedValue(undefined);
      mockMovementRepo.markAsOrphaned.mockResolvedValue(undefined);
      mockAccountRepo.delete.mockResolvedValue(undefined);

      // Act
      const result = await useCase.execute(accountId, { deleteMovements: false }, userId);

      // Assert
      expect(mockAccountRepo.findById).toHaveBeenCalledWith(accountId, userId);
      expect(mockPocketRepo.findByAccountId).toHaveBeenCalledWith(accountId, userId);
      expect(mockMovementRepo.findByAccountId).toHaveBeenCalledWith(accountId, userId);
      
      // Verify movements were marked as orphaned (Requirement 5.1)
      expect(mockMovementRepo.markAsOrphaned).toHaveBeenCalledTimes(3);
      expect(mockMovementRepo.delete).not.toHaveBeenCalled();
      
      // Verify pockets were deleted (Requirement 5.3)
      expect(mockPocketRepo.delete).toHaveBeenCalledTimes(2);
      
      // Verify account was deleted
      expect(mockAccountRepo.delete).toHaveBeenCalledWith(accountId, userId);
      
      // Verify counts (Requirement 5.5)
      expect(result).toEqual({
        account: 'Test Account',
        pockets: 2,
        subPockets: 0,
        movements: 3,
      });
    });

    it('should cascade delete account with hard delete flag for movements', async () => {
      // Arrange
      const accountId = 'account-1';
      const userId = 'user-1';
      const account = new Account(accountId, 'Test Account', '#3b82f6', 'USD', 1000);

      const pockets = [
        { id: 'pocket-1', accountId, type: 'normal' },
      ];

      const movements = [
        { id: 'movement-1', accountId },
        { id: 'movement-2', accountId },
      ];

      mockAccountRepo.findById.mockResolvedValue(account);
      mockPocketRepo.findByAccountId.mockResolvedValue(pockets);
      mockSubPocketRepo.findByPocketId.mockResolvedValue([]);
      mockMovementRepo.findByAccountId.mockResolvedValue(movements);
      mockPocketRepo.delete.mockResolvedValue(undefined);
      mockMovementRepo.delete.mockResolvedValue(undefined);
      mockAccountRepo.delete.mockResolvedValue(undefined);

      // Act
      const result = await useCase.execute(accountId, { deleteMovements: true }, userId);

      // Assert
      expect(mockAccountRepo.findById).toHaveBeenCalledWith(accountId, userId);
      expect(mockPocketRepo.findByAccountId).toHaveBeenCalledWith(accountId, userId);
      expect(mockMovementRepo.findByAccountId).toHaveBeenCalledWith(accountId, userId);
      
      // Verify movements were hard deleted (Requirement 5.2)
      expect(mockMovementRepo.delete).toHaveBeenCalledTimes(2);
      expect(mockMovementRepo.markAsOrphaned).not.toHaveBeenCalled();
      
      // Verify pockets were deleted
      expect(mockPocketRepo.delete).toHaveBeenCalledTimes(1);
      
      // Verify account was deleted
      expect(mockAccountRepo.delete).toHaveBeenCalledWith(accountId, userId);
      
      // Verify counts
      expect(result).toEqual({
        account: 'Test Account',
        pockets: 1,
        subPockets: 0,
        movements: 2,
      });
    });

    it('should delete sub-pockets when deleting fixed pocket', async () => {
      // Arrange
      const accountId = 'account-1';
      const userId = 'user-1';
      const account = new Account(accountId, 'Test Account', '#3b82f6', 'USD', 1000);

      const pockets = [
        { id: 'pocket-1', accountId, type: 'fixed' },
        { id: 'pocket-2', accountId, type: 'normal' },
      ];

      const subPockets = [
        { id: 'subpocket-1', pocketId: 'pocket-1' },
        { id: 'subpocket-2', pocketId: 'pocket-1' },
        { id: 'subpocket-3', pocketId: 'pocket-1' },
      ];

      mockAccountRepo.findById.mockResolvedValue(account);
      mockPocketRepo.findByAccountId.mockResolvedValue(pockets);
      mockSubPocketRepo.findByPocketId.mockResolvedValue(subPockets);
      mockMovementRepo.findByAccountId.mockResolvedValue([]);
      mockSubPocketRepo.delete.mockResolvedValue(undefined);
      mockPocketRepo.delete.mockResolvedValue(undefined);
      mockAccountRepo.delete.mockResolvedValue(undefined);

      // Act
      const result = await useCase.execute(accountId, { deleteMovements: false }, userId);

      // Assert
      expect(mockSubPocketRepo.findByPocketId).toHaveBeenCalledWith('pocket-1', userId);
      
      // Verify sub-pockets were deleted (Requirement 5.4)
      expect(mockSubPocketRepo.delete).toHaveBeenCalledTimes(3);
      expect(mockSubPocketRepo.delete).toHaveBeenCalledWith('subpocket-1', userId);
      expect(mockSubPocketRepo.delete).toHaveBeenCalledWith('subpocket-2', userId);
      expect(mockSubPocketRepo.delete).toHaveBeenCalledWith('subpocket-3', userId);
      
      // Verify pockets were deleted
      expect(mockPocketRepo.delete).toHaveBeenCalledTimes(2);
      
      // Verify counts
      expect(result).toEqual({
        account: 'Test Account',
        pockets: 2,
        subPockets: 3,
        movements: 0,
      });
    });

    it('should handle account with no pockets or movements', async () => {
      // Arrange
      const accountId = 'account-1';
      const userId = 'user-1';
      const account = new Account(accountId, 'Empty Account', '#3b82f6', 'USD', 0);

      mockAccountRepo.findById.mockResolvedValue(account);
      mockPocketRepo.findByAccountId.mockResolvedValue([]);
      mockMovementRepo.findByAccountId.mockResolvedValue([]);
      mockAccountRepo.delete.mockResolvedValue(undefined);

      // Act
      const result = await useCase.execute(accountId, { deleteMovements: false }, userId);

      // Assert
      expect(mockAccountRepo.findById).toHaveBeenCalledWith(accountId, userId);
      expect(mockPocketRepo.findByAccountId).toHaveBeenCalledWith(accountId, userId);
      expect(mockMovementRepo.findByAccountId).toHaveBeenCalledWith(accountId, userId);
      expect(mockAccountRepo.delete).toHaveBeenCalledWith(accountId, userId);
      
      // Verify counts
      expect(result).toEqual({
        account: 'Empty Account',
        pockets: 0,
        subPockets: 0,
        movements: 0,
      });
    });

    it('should throw NotFoundError when account does not exist', async () => {
      // Arrange
      const accountId = 'non-existent';
      const userId = 'user-1';

      mockAccountRepo.findById.mockResolvedValue(null);

      // Act & Assert
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
      // Arrange
      const accountId = 'account-1';
      const userId = 'user-2'; // Different user

      // Repository returns null for accounts not owned by user
      mockAccountRepo.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(
        useCase.execute(accountId, { deleteMovements: true }, userId)
      ).rejects.toThrow(NotFoundError);
      
      await expect(
        useCase.execute(accountId, { deleteMovements: true }, userId)
      ).rejects.toThrow('Account not found');

      expect(mockAccountRepo.findById).toHaveBeenCalledWith(accountId, userId);
      expect(mockPocketRepo.findByAccountId).not.toHaveBeenCalled();
      expect(mockAccountRepo.delete).not.toHaveBeenCalled();
    });

    it('should handle complex scenario with fixed pocket, sub-pockets, and movements', async () => {
      // Arrange
      const accountId = 'account-1';
      const userId = 'user-1';
      const account = new Account(accountId, 'Complex Account', '#3b82f6', 'USD', 5000);

      const pockets = [
        { id: 'pocket-1', accountId, type: 'fixed' },
        { id: 'pocket-2', accountId, type: 'normal' },
        { id: 'pocket-3', accountId, type: 'normal' },
      ];

      const subPockets = [
        { id: 'subpocket-1', pocketId: 'pocket-1' },
        { id: 'subpocket-2', pocketId: 'pocket-1' },
      ];

      const movements = [
        { id: 'movement-1', accountId },
        { id: 'movement-2', accountId },
        { id: 'movement-3', accountId },
        { id: 'movement-4', accountId },
        { id: 'movement-5', accountId },
      ];

      mockAccountRepo.findById.mockResolvedValue(account);
      mockPocketRepo.findByAccountId.mockResolvedValue(pockets);
      mockSubPocketRepo.findByPocketId.mockResolvedValue(subPockets);
      mockMovementRepo.findByAccountId.mockResolvedValue(movements);
      mockSubPocketRepo.delete.mockResolvedValue(undefined);
      mockPocketRepo.delete.mockResolvedValue(undefined);
      mockMovementRepo.delete.mockResolvedValue(undefined);
      mockAccountRepo.delete.mockResolvedValue(undefined);

      // Act
      const result = await useCase.execute(accountId, { deleteMovements: true }, userId);

      // Assert
      // Verify sub-pockets were deleted
      expect(mockSubPocketRepo.delete).toHaveBeenCalledTimes(2);
      
      // Verify all pockets were deleted
      expect(mockPocketRepo.delete).toHaveBeenCalledTimes(3);
      
      // Verify all movements were hard deleted
      expect(mockMovementRepo.delete).toHaveBeenCalledTimes(5);
      
      // Verify account was deleted
      expect(mockAccountRepo.delete).toHaveBeenCalledWith(accountId, userId);
      
      // Verify accurate counts (Requirement 5.5)
      expect(result).toEqual({
        account: 'Complex Account',
        pockets: 3,
        subPockets: 2,
        movements: 5,
      });
    });

    it('should not query sub-pockets for normal pockets', async () => {
      // Arrange
      const accountId = 'account-1';
      const userId = 'user-1';
      const account = new Account(accountId, 'Test Account', '#3b82f6', 'USD', 1000);

      const pockets = [
        { id: 'pocket-1', accountId, type: 'normal' },
        { id: 'pocket-2', accountId, type: 'normal' },
      ];

      mockAccountRepo.findById.mockResolvedValue(account);
      mockPocketRepo.findByAccountId.mockResolvedValue(pockets);
      mockMovementRepo.findByAccountId.mockResolvedValue([]);
      mockPocketRepo.delete.mockResolvedValue(undefined);
      mockAccountRepo.delete.mockResolvedValue(undefined);

      // Act
      await useCase.execute(accountId, { deleteMovements: false }, userId);

      // Assert
      // Should not query for sub-pockets since no fixed pockets
      expect(mockSubPocketRepo.findByPocketId).not.toHaveBeenCalled();
      expect(mockSubPocketRepo.delete).not.toHaveBeenCalled();
    });
  });
});
