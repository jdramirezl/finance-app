/**
 * Delete Account Use Case Tests
 * 
 * Tests for DeleteAccountUseCase business logic.
 */

import 'reflect-metadata';
import { DeleteAccountUseCase } from './DeleteAccountUseCase';
import type { IAccountRepository } from '../../infrastructure/IAccountRepository';
import { Account } from '../../domain/Account';
import { NotFoundError, ConflictError } from '../../../../shared/errors/AppError';

// Mock interfaces for dependencies
interface IPocketRepository {
  findByAccountId(accountId: string, userId: string): Promise<Array<{ id: string; accountId: string; balance: number }>>;
}

describe('DeleteAccountUseCase', () => {
  let useCase: DeleteAccountUseCase;
  let mockAccountRepo: jest.Mocked<IAccountRepository>;
  let mockPocketRepo: jest.Mocked<IPocketRepository>;

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
    } as jest.Mocked<IPocketRepository>;

    // Create use case with mocked dependencies
    useCase = new DeleteAccountUseCase(mockAccountRepo, mockPocketRepo);
  });

  describe('execute', () => {
    it('should delete account successfully when no pockets exist', async () => {
      // Arrange
      const accountId = 'account-1';
      const userId = 'user-1';
      const account = new Account(accountId, 'Test Account', '#3b82f6', 'USD', 1000);

      mockAccountRepo.findById.mockResolvedValue(account);
      mockPocketRepo.findByAccountId.mockResolvedValue([]); // No pockets
      mockAccountRepo.delete.mockResolvedValue(undefined);

      // Act
      await useCase.execute(accountId, userId);

      // Assert
      expect(mockAccountRepo.findById).toHaveBeenCalledWith(accountId, userId);
      expect(mockPocketRepo.findByAccountId).toHaveBeenCalledWith(accountId, userId);
      expect(mockAccountRepo.delete).toHaveBeenCalledWith(accountId, userId);
    });

    it('should throw NotFoundError when account does not exist', async () => {
      // Arrange
      const accountId = 'non-existent';
      const userId = 'user-1';

      mockAccountRepo.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(useCase.execute(accountId, userId)).rejects.toThrow(NotFoundError);
      await expect(useCase.execute(accountId, userId)).rejects.toThrow('Account not found');

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
      await expect(useCase.execute(accountId, userId)).rejects.toThrow(NotFoundError);
      await expect(useCase.execute(accountId, userId)).rejects.toThrow('Account not found');

      expect(mockAccountRepo.findById).toHaveBeenCalledWith(accountId, userId);
      expect(mockPocketRepo.findByAccountId).not.toHaveBeenCalled();
      expect(mockAccountRepo.delete).not.toHaveBeenCalled();
    });

    it('should throw ConflictError when account has pockets', async () => {
      // Arrange
      const accountId = 'account-1';
      const userId = 'user-1';
      const account = new Account(accountId, 'Test Account', '#3b82f6', 'USD', 1000);

      const pockets = [
        { id: 'pocket-1', accountId, balance: 500 },
        { id: 'pocket-2', accountId, balance: 500 },
      ];

      mockAccountRepo.findById.mockResolvedValue(account);
      mockPocketRepo.findByAccountId.mockResolvedValue(pockets);

      // Act & Assert
      await expect(useCase.execute(accountId, userId)).rejects.toThrow(ConflictError);
      await expect(useCase.execute(accountId, userId)).rejects.toThrow(
        'Cannot delete account "Test Account" because it has 2 pocket(s)'
      );

      expect(mockAccountRepo.findById).toHaveBeenCalledWith(accountId, userId);
      expect(mockPocketRepo.findByAccountId).toHaveBeenCalledWith(accountId, userId);
      expect(mockAccountRepo.delete).not.toHaveBeenCalled();
    });

    it('should throw ConflictError with correct message for single pocket', async () => {
      // Arrange
      const accountId = 'account-1';
      const userId = 'user-1';
      const account = new Account(accountId, 'Savings', '#10b981', 'USD', 1000);

      const pockets = [
        { id: 'pocket-1', accountId, balance: 1000 },
      ];

      mockAccountRepo.findById.mockResolvedValue(account);
      mockPocketRepo.findByAccountId.mockResolvedValue(pockets);

      // Act & Assert
      await expect(useCase.execute(accountId, userId)).rejects.toThrow(ConflictError);
      await expect(useCase.execute(accountId, userId)).rejects.toThrow(
        'Cannot delete account "Savings" because it has 1 pocket(s)'
      );

      expect(mockAccountRepo.findById).toHaveBeenCalledWith(accountId, userId);
      expect(mockPocketRepo.findByAccountId).toHaveBeenCalledWith(accountId, userId);
      expect(mockAccountRepo.delete).not.toHaveBeenCalled();
    });

    it('should suggest cascade delete in error message', async () => {
      // Arrange
      const accountId = 'account-1';
      const userId = 'user-1';
      const account = new Account(accountId, 'Test', '#3b82f6', 'USD', 1000);

      mockAccountRepo.findById.mockResolvedValue(account);
      mockPocketRepo.findByAccountId.mockResolvedValue([
        { id: 'pocket-1', accountId, balance: 500 },
      ]);

      // Act & Assert
      await expect(useCase.execute(accountId, userId)).rejects.toThrow(
        'use cascade delete'
      );
    });
  });
});
