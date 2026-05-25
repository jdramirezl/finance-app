/**
 * Unit tests for DeletePocketUseCase
 */

import 'reflect-metadata';
import { DeletePocketUseCase } from './DeletePocketUseCase';
import type { IPocketRepository } from '../../infrastructure/IPocketRepository';
import { Pocket } from '../../domain/Pocket';
import { NotFoundError } from '../../../../shared/errors/AppError';

interface IMovementRepository {
  markAsOrphanedByPocketId(pocketId: string, pocketName: string, userId: string): Promise<number>;
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
      existsFixedPocketInAccount: jest.fn(),
      existsFixedPocketForUser: jest.fn(),
      existsFixedPocketForUserExcludingId: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteByAccountId: jest.fn(),
      archive: jest.fn(),
      unarchive: jest.fn(),
      updateDisplayOrders: jest.fn(),
    } as jest.Mocked<IPocketRepository>;

    mockMovementRepo = {
      markAsOrphanedByPocketId: jest.fn(),
    } as jest.Mocked<IMovementRepository>;

    useCase = new DeletePocketUseCase(mockPocketRepo, mockMovementRepo);
  });

  describe('execute', () => {
    it('should delete pocket successfully when no movements exist', async () => {
      const pocketId = 'pocket-1';
      const userId = 'user-1';
      const pocket = new Pocket(pocketId, 'account-1', 'Savings', 'normal', 100, 'USD');

      mockPocketRepo.findById.mockResolvedValue(pocket);
      mockMovementRepo.markAsOrphanedByPocketId.mockResolvedValue(0);

      await useCase.execute(pocketId, userId);

      expect(mockPocketRepo.findById).toHaveBeenCalledWith(pocketId, userId);
      expect(mockMovementRepo.markAsOrphanedByPocketId).toHaveBeenCalledWith(pocketId, 'Savings', userId);
      expect(mockPocketRepo.delete).toHaveBeenCalledWith(pocketId, userId);
    });

    it('should mark all movements as orphaned before deleting pocket', async () => {
      const pocketId = 'pocket-1';
      const userId = 'user-1';
      const pocket = new Pocket(pocketId, 'account-1', 'Savings', 'normal', 100, 'USD');

      mockPocketRepo.findById.mockResolvedValue(pocket);
      mockMovementRepo.markAsOrphanedByPocketId.mockResolvedValue(3);

      await useCase.execute(pocketId, userId);

      expect(mockMovementRepo.markAsOrphanedByPocketId).toHaveBeenCalledWith(pocketId, 'Savings', userId);
      expect(mockPocketRepo.delete).toHaveBeenCalledWith(pocketId, userId);
    });

    it('should throw NotFoundError when pocket does not exist', async () => {
      const pocketId = 'non-existent-pocket';
      const userId = 'user-1';

      mockPocketRepo.findById.mockResolvedValue(null);

      await expect(useCase.execute(pocketId, userId)).rejects.toThrow(NotFoundError);
      await expect(useCase.execute(pocketId, userId)).rejects.toThrow('Pocket not found');

      expect(mockPocketRepo.findById).toHaveBeenCalledWith(pocketId, userId);
      expect(mockMovementRepo.markAsOrphanedByPocketId).not.toHaveBeenCalled();
      expect(mockPocketRepo.delete).not.toHaveBeenCalled();
    });

    it('should throw NotFoundError when pocket belongs to different user', async () => {
      const pocketId = 'pocket-1';
      const userId = 'user-1';

      mockPocketRepo.findById.mockResolvedValue(null);

      await expect(useCase.execute(pocketId, userId)).rejects.toThrow(NotFoundError);

      expect(mockPocketRepo.findById).toHaveBeenCalledWith(pocketId, userId);
      expect(mockMovementRepo.markAsOrphanedByPocketId).not.toHaveBeenCalled();
      expect(mockPocketRepo.delete).not.toHaveBeenCalled();
    });

    it('should handle fixed pocket deletion with movements', async () => {
      const pocketId = 'pocket-1';
      const userId = 'user-1';
      const pocket = new Pocket(pocketId, 'account-1', 'Fixed Expenses', 'fixed', 500, 'USD');

      mockPocketRepo.findById.mockResolvedValue(pocket);
      mockMovementRepo.markAsOrphanedByPocketId.mockResolvedValue(1);

      await useCase.execute(pocketId, userId);

      expect(mockMovementRepo.markAsOrphanedByPocketId).toHaveBeenCalledWith(pocketId, 'Fixed Expenses', userId);
      expect(mockPocketRepo.delete).toHaveBeenCalledWith(pocketId, userId);
    });

    it('should not delete pocket if marking movements as orphaned fails', async () => {
      const pocketId = 'pocket-1';
      const userId = 'user-1';
      const pocket = new Pocket(pocketId, 'account-1', 'Savings', 'normal', 100, 'USD');

      mockPocketRepo.findById.mockResolvedValue(pocket);
      mockMovementRepo.markAsOrphanedByPocketId.mockRejectedValue(new Error('Database error'));

      await expect(useCase.execute(pocketId, userId)).rejects.toThrow('Database error');

      expect(mockPocketRepo.delete).not.toHaveBeenCalled();
    });
  });
});
