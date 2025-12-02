/**
 * Unit tests for GetPocketByIdUseCase
 */

import 'reflect-metadata';
import { GetPocketByIdUseCase } from './GetPocketByIdUseCase';
import type { IPocketRepository } from '../../infrastructure/IPocketRepository';
import { Pocket } from '../../domain/Pocket';
import { NotFoundError } from '../../../../shared/errors/AppError';

describe('GetPocketByIdUseCase', () => {
  let useCase: GetPocketByIdUseCase;
  let mockPocketRepo: jest.Mocked<IPocketRepository>;

  beforeEach(() => {
    // Create mock repository
    mockPocketRepo = {
      findById: jest.fn(),
      save: jest.fn(),
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

    useCase = new GetPocketByIdUseCase(mockPocketRepo);
  });

  describe('execute', () => {
    it('should fetch pocket by ID successfully', async () => {
      // Arrange
      const pocket = new Pocket(
        'pocket-1',
        'account-1',
        'Savings',
        'normal',
        1000,
        'USD'
      );
      mockPocketRepo.findById.mockResolvedValue(pocket);

      // Act
      const result = await useCase.execute('pocket-1', 'user-1');

      // Assert
      expect(mockPocketRepo.findById).toHaveBeenCalledWith('pocket-1', 'user-1');
      expect(result).toEqual({
        id: 'pocket-1',
        accountId: 'account-1',
        name: 'Savings',
        type: 'normal',
        balance: 1000,
        currency: 'USD',
        displayOrder: undefined,
      });
    });

    it('should fetch fixed pocket successfully', async () => {
      // Arrange
      const pocket = new Pocket(
        'pocket-2',
        'account-1',
        'Fixed Expenses',
        'fixed',
        500,
        'USD',
        1
      );
      mockPocketRepo.findById.mockResolvedValue(pocket);

      // Act
      const result = await useCase.execute('pocket-2', 'user-1');

      // Assert
      expect(result).toEqual({
        id: 'pocket-2',
        accountId: 'account-1',
        name: 'Fixed Expenses',
        type: 'fixed',
        balance: 500,
        currency: 'USD',
        displayOrder: 1,
      });
    });

    it('should throw NotFoundError when pocket does not exist', async () => {
      // Arrange
      mockPocketRepo.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(useCase.execute('non-existent', 'user-1'))
        .rejects.toThrow(NotFoundError);
      await expect(useCase.execute('non-existent', 'user-1'))
        .rejects.toThrow('Pocket not found');
    });

    it('should throw NotFoundError when pocket belongs to different user', async () => {
      // Arrange
      // Repository returns null when pocket doesn't belong to user
      mockPocketRepo.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(useCase.execute('pocket-1', 'different-user'))
        .rejects.toThrow(NotFoundError);
    });

    it('should verify ownership through repository', async () => {
      // Arrange
      const pocket = new Pocket(
        'pocket-1',
        'account-1',
        'Savings',
        'normal',
        1000,
        'USD'
      );
      mockPocketRepo.findById.mockResolvedValue(pocket);

      // Act
      await useCase.execute('pocket-1', 'user-1');

      // Assert
      // Repository is called with userId, ensuring ownership check
      expect(mockPocketRepo.findById).toHaveBeenCalledWith('pocket-1', 'user-1');
    });

    it('should preserve pocket balance', async () => {
      // Arrange
      const pocket = new Pocket(
        'pocket-1',
        'account-1',
        'Savings',
        'normal',
        2500.50,
        'USD'
      );
      mockPocketRepo.findById.mockResolvedValue(pocket);

      // Act
      const result = await useCase.execute('pocket-1', 'user-1');

      // Assert
      expect(result.balance).toBe(2500.50);
    });

    it('should handle pockets with display order', async () => {
      // Arrange
      const pocket = new Pocket(
        'pocket-1',
        'account-1',
        'Savings',
        'normal',
        1000,
        'USD',
        5
      );
      mockPocketRepo.findById.mockResolvedValue(pocket);

      // Act
      const result = await useCase.execute('pocket-1', 'user-1');

      // Assert
      expect(result.displayOrder).toBe(5);
    });

    it('should handle pockets without display order', async () => {
      // Arrange
      const pocket = new Pocket(
        'pocket-1',
        'account-1',
        'Savings',
        'normal',
        1000,
        'USD'
      );
      mockPocketRepo.findById.mockResolvedValue(pocket);

      // Act
      const result = await useCase.execute('pocket-1', 'user-1');

      // Assert
      expect(result.displayOrder).toBeUndefined();
    });
  });
});
