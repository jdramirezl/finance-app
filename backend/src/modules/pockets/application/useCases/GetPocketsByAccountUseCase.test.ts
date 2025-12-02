/**
 * Unit tests for GetPocketsByAccountUseCase
 */

import 'reflect-metadata';
import { GetPocketsByAccountUseCase } from './GetPocketsByAccountUseCase';
import type { IPocketRepository } from '../../infrastructure/IPocketRepository';
import type { IAccountRepository } from '../../../accounts/infrastructure/IAccountRepository';
import { Pocket } from '../../domain/Pocket';
import { Account } from '../../../accounts/domain/Account';
import { NotFoundError } from '../../../../shared/errors/AppError';
import type { Currency } from '@shared-backend/types';

describe('GetPocketsByAccountUseCase', () => {
  let useCase: GetPocketsByAccountUseCase;
  let mockPocketRepo: jest.Mocked<IPocketRepository>;
  let mockAccountRepo: jest.Mocked<IAccountRepository>;

  const userId = 'user-123';
  const accountId = 'account-456';

  beforeEach(() => {
    mockPocketRepo = {
      save: jest.fn(),
      findById: jest.fn(),
      findByAccountId: jest.fn(),
      findAllByUserId: jest.fn(),
      existsByNameInAccount: jest.fn(),
      existsByNameInAccountExcludingId: jest.fn(),
      existsFixedPocketForUser: jest.fn(),
      existsFixedPocketForUserExcludingId: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      updateDisplayOrders: jest.fn(),
    };

    mockAccountRepo = {
      save: jest.fn(),
      findById: jest.fn(),
      findAllByUserId: jest.fn(),
      existsByNameAndCurrency: jest.fn(),
      existsByNameAndCurrencyExcludingId: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      updateDisplayOrders: jest.fn(),
    };

    useCase = new GetPocketsByAccountUseCase(mockPocketRepo, mockAccountRepo);
  });

  describe('execute', () => {
    it('should return pockets for the account sorted by display order', async () => {
      // Arrange
      const account = new Account(
        accountId,
        'Test Account',
        '#3b82f6',
        'USD' as Currency,
        1000
      );

      const pocket1 = new Pocket(
        'pocket-1',
        accountId,
        'Savings',
        'normal',
        500,
        'USD' as Currency,
        2
      );

      const pocket2 = new Pocket(
        'pocket-2',
        accountId,
        'Checking',
        'normal',
        300,
        'USD' as Currency,
        1
      );

      const pocket3 = new Pocket(
        'pocket-3',
        accountId,
        'Emergency',
        'normal',
        200,
        'USD' as Currency,
        3
      );

      mockAccountRepo.findById.mockResolvedValue(account);
      mockPocketRepo.findByAccountId.mockResolvedValue([pocket1, pocket2, pocket3]);

      // Act
      const result = await useCase.execute(accountId, userId);

      // Assert
      expect(mockAccountRepo.findById).toHaveBeenCalledWith(accountId, userId);
      expect(mockPocketRepo.findByAccountId).toHaveBeenCalledWith(accountId, userId);
      expect(result).toHaveLength(3);
      
      // Should be sorted by display order
      expect(result[0].name).toBe('Checking'); // displayOrder: 1
      expect(result[1].name).toBe('Savings');  // displayOrder: 2
      expect(result[2].name).toBe('Emergency'); // displayOrder: 3
    });

    it('should handle pockets with undefined display order', async () => {
      // Arrange
      const account = new Account(
        accountId,
        'Test Account',
        '#3b82f6',
        'USD' as Currency,
        1000
      );

      const pocket1 = new Pocket(
        'pocket-1',
        accountId,
        'Savings',
        'normal',
        500,
        'USD' as Currency,
        1
      );

      const pocket2 = new Pocket(
        'pocket-2',
        accountId,
        'Checking',
        'normal',
        300,
        'USD' as Currency,
        undefined // No display order
      );

      const pocket3 = new Pocket(
        'pocket-3',
        accountId,
        'Emergency',
        'normal',
        200,
        'USD' as Currency,
        2
      );

      mockAccountRepo.findById.mockResolvedValue(account);
      mockPocketRepo.findByAccountId.mockResolvedValue([pocket1, pocket2, pocket3]);

      // Act
      const result = await useCase.execute(accountId, userId);

      // Assert
      expect(result).toHaveLength(3);
      
      // Pockets with display order should come first, undefined last
      expect(result[0].name).toBe('Savings');   // displayOrder: 1
      expect(result[1].name).toBe('Emergency'); // displayOrder: 2
      expect(result[2].name).toBe('Checking');  // displayOrder: undefined
    });

    it('should return empty array when account has no pockets', async () => {
      // Arrange
      const account = new Account(
        accountId,
        'Test Account',
        '#3b82f6',
        'USD' as Currency,
        0
      );

      mockAccountRepo.findById.mockResolvedValue(account);
      mockPocketRepo.findByAccountId.mockResolvedValue([]);

      // Act
      const result = await useCase.execute(accountId, userId);

      // Assert
      expect(result).toHaveLength(0);
      expect(result).toEqual([]);
    });

    it('should throw NotFoundError when account does not exist', async () => {
      // Arrange
      mockAccountRepo.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(useCase.execute(accountId, userId))
        .rejects
        .toThrow(NotFoundError);

      await expect(useCase.execute(accountId, userId))
        .rejects
        .toThrow('Account not found');

      expect(mockPocketRepo.findByAccountId).not.toHaveBeenCalled();
    });

    it('should include all pocket properties in response', async () => {
      // Arrange
      const account = new Account(
        accountId,
        'Test Account',
        '#3b82f6',
        'USD' as Currency,
        1000
      );

      const pocket = new Pocket(
        'pocket-1',
        accountId,
        'Savings',
        'fixed',
        500,
        'USD' as Currency,
        1
      );

      mockAccountRepo.findById.mockResolvedValue(account);
      mockPocketRepo.findByAccountId.mockResolvedValue([pocket]);

      // Act
      const result = await useCase.execute(accountId, userId);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: 'pocket-1',
        accountId: accountId,
        name: 'Savings',
        type: 'fixed',
        balance: 500,
        currency: 'USD',
        displayOrder: 1,
      });
    });

    it('should handle mixed pocket types (normal and fixed)', async () => {
      // Arrange
      const account = new Account(
        accountId,
        'Test Account',
        '#3b82f6',
        'USD' as Currency,
        1000
      );

      const normalPocket = new Pocket(
        'pocket-1',
        accountId,
        'Checking',
        'normal',
        300,
        'USD' as Currency,
        1
      );

      const fixedPocket = new Pocket(
        'pocket-2',
        accountId,
        'Fixed Expenses',
        'fixed',
        -50,
        'USD' as Currency,
        2
      );

      mockAccountRepo.findById.mockResolvedValue(account);
      mockPocketRepo.findByAccountId.mockResolvedValue([normalPocket, fixedPocket]);

      // Act
      const result = await useCase.execute(accountId, userId);

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0].type).toBe('normal');
      expect(result[1].type).toBe('fixed');
      expect(result[1].balance).toBe(-50); // Fixed pockets can have negative balance
    });
  });
});
