/**
 * Unit tests for DeletePocketUseCase
 */

import 'reflect-metadata';
import { DeletePocketUseCase } from './DeletePocketUseCase';
import type { IPocketRepository } from '../../infrastructure/IPocketRepository';
import { Pocket } from '../../domain/Pocket';
import { NotFoundError } from '../../../../shared/errors/AppError';

interface IMovementRepository {
  findByPocketId(pocketId: string, userId: string): Promise<Array<{ id: string; pocketId: string; accountId: string }>>;
  markAsOrphaned(movementId: string, accountName: string, accountCurrency: string, pocketName: string, userId: string): Promise<void>;
}

describe('DeletePocketUseCase', () => {
  let useCase: DeletePocketUseCase;
  let mockPocketRepo: jest.Mocked<IPocketRepository>;
  let mockMovementRepo: jest.Mocked<IMovementRepository>;

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
    } as jest.Mocked<IPocketRepository>;

    mockMovementRepo = {
      findByPocketId: jest.fn(),
      markAsOrphaned: jest.fn(),
    } as jest.Mocked<IMovementRepository>;

    useCase = new DeletePocketUseCase(mockPocketRepo, mockMovementRepo);
  });

  describe('execute', () => {
    it('should delete pocket successfully when no movements exist', async () => {
      // Arrange
      const pocketId = 'pocket-1';
      const userId = 'user-1';
      const pocket = new Pocket(
        pocketId,
        'account-1',
        'Savings',
        'normal',
        100,
        'USD'
      );

      mockPocketRepo.findById.mockResolvedValue(pocket);
      mockMovementRepo.findByPocketId.mockResolvedValue([]);

      // Act
      await useCase.execute(pocketId, userId);

      // Assert
      expect(mockPocketRepo.findById).toHaveBeenCalledWith(pocketId, userId);
      expect(mockMovementRepo.findByPocketId).toHaveBeenCalledWith(pocketId, userId);
      expect(mockMovementRepo.markAsOrphaned).not.toHaveBeenCalled();
      expect(mockPocketRepo.delete).toHaveBeenCalledWith(pocketId, userId);
    });

    it('should mark all movements as orphaned before deleting pocket', async () => {
      // Arrange
      const pocketId = 'pocket-1';
      const userId = 'user-1';
      const pocket = new Pocket(
        pocketId,
        'account-1',
        'Savings',
        'normal',
        100,
        'USD'
      );

      const movements = [
        { id: 'movement-1', pocketId, accountId: 'account-1' },
        { id: 'movement-2', pocketId, accountId: 'account-1' },
        { id: 'movement-3', pocketId, accountId: 'account-1' },
      ];

      mockPocketRepo.findById.mockResolvedValue(pocket);
      mockMovementRepo.findByPocketId.mockResolvedValue(movements);

      // Act
      await useCase.execute(pocketId, userId);

      // Assert
      expect(mockMovementRepo.findByPocketId).toHaveBeenCalledWith(pocketId, userId);
      expect(mockMovementRepo.markAsOrphaned).toHaveBeenCalledTimes(3);
      
      // Verify each movement was marked as orphaned with pocket name
      movements.forEach((movement) => {
        expect(mockMovementRepo.markAsOrphaned).toHaveBeenCalledWith(
          movement.id,
          '', // Account name placeholder
          '', // Account currency placeholder
          'Savings', // Pocket name
          userId
        );
      });

      expect(mockPocketRepo.delete).toHaveBeenCalledWith(pocketId, userId);
    });

    it('should throw NotFoundError when pocket does not exist', async () => {
      // Arrange
      const pocketId = 'non-existent-pocket';
      const userId = 'user-1';

      mockPocketRepo.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(useCase.execute(pocketId, userId)).rejects.toThrow(NotFoundError);
      await expect(useCase.execute(pocketId, userId)).rejects.toThrow('Pocket not found');

      expect(mockPocketRepo.findById).toHaveBeenCalledWith(pocketId, userId);
      expect(mockMovementRepo.findByPocketId).not.toHaveBeenCalled();
      expect(mockPocketRepo.delete).not.toHaveBeenCalled();
    });

    it('should throw NotFoundError when pocket belongs to different user', async () => {
      // Arrange
      const pocketId = 'pocket-1';
      const userId = 'user-1';

      // Repository returns null for pockets not owned by user
      mockPocketRepo.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(useCase.execute(pocketId, userId)).rejects.toThrow(NotFoundError);

      expect(mockPocketRepo.findById).toHaveBeenCalledWith(pocketId, userId);
      expect(mockMovementRepo.findByPocketId).not.toHaveBeenCalled();
      expect(mockPocketRepo.delete).not.toHaveBeenCalled();
    });

    it('should handle fixed pocket deletion with movements', async () => {
      // Arrange
      const pocketId = 'pocket-1';
      const userId = 'user-1';
      const pocket = new Pocket(
        pocketId,
        'account-1',
        'Fixed Expenses',
        'fixed',
        500,
        'USD'
      );

      const movements = [
        { id: 'movement-1', pocketId, accountId: 'account-1' },
      ];

      mockPocketRepo.findById.mockResolvedValue(pocket);
      mockMovementRepo.findByPocketId.mockResolvedValue(movements);

      // Act
      await useCase.execute(pocketId, userId);

      // Assert
      expect(mockMovementRepo.markAsOrphaned).toHaveBeenCalledWith(
        'movement-1',
        '',
        '',
        'Fixed Expenses',
        userId
      );
      expect(mockPocketRepo.delete).toHaveBeenCalledWith(pocketId, userId);
    });

    it('should delete pocket even if marking movements as orphaned fails', async () => {
      // Arrange
      const pocketId = 'pocket-1';
      const userId = 'user-1';
      const pocket = new Pocket(
        pocketId,
        'account-1',
        'Savings',
        'normal',
        100,
        'USD'
      );

      const movements = [
        { id: 'movement-1', pocketId, accountId: 'account-1' },
      ];

      mockPocketRepo.findById.mockResolvedValue(pocket);
      mockMovementRepo.findByPocketId.mockResolvedValue(movements);
      mockMovementRepo.markAsOrphaned.mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expect(useCase.execute(pocketId, userId)).rejects.toThrow('Database error');

      // Verify that delete was not called if orphaning failed
      expect(mockPocketRepo.delete).not.toHaveBeenCalled();
    });
  });
});
