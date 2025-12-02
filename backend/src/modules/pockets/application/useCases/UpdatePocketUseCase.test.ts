/**
 * UpdatePocketUseCase Unit Tests
 * 
 * Tests the business logic for updating pockets with mocked repository.
 */

import 'reflect-metadata';
import { UpdatePocketUseCase } from './UpdatePocketUseCase';
import type { IPocketRepository } from '../../infrastructure/IPocketRepository';
import { Pocket } from '../../domain/Pocket';
import { ValidationError, ConflictError, NotFoundError } from '../../../../shared/errors/AppError';

describe('UpdatePocketUseCase', () => {
  let useCase: UpdatePocketUseCase;
  let mockRepo: jest.Mocked<IPocketRepository>;

  beforeEach(() => {
    // Create mock repository
    mockRepo = {
      save: jest.fn(),
      findById: jest.fn(),
      findByAccountId: jest.fn(),
      findAllByUserId: jest.fn(),
      existsByNameInAccount: jest.fn(),
      existsFixedPocketForUser: jest.fn(),
      existsFixedPocketForUserExcludingId: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      updateDisplayOrders: jest.fn(),
    } as any;

    useCase = new UpdatePocketUseCase(mockRepo);
  });

  describe('Validation', () => {
    it('should throw ValidationError if pocket ID is empty', async () => {
      await expect(
        useCase.execute('', { name: 'Updated' }, 'user-123')
      ).rejects.toThrow(ValidationError);

      await expect(
        useCase.execute('', { name: 'Updated' }, 'user-123')
      ).rejects.toThrow('Pocket ID is required');
    });

    it('should throw NotFoundError if pocket does not exist', async () => {
      mockRepo.findById.mockResolvedValue(null);

      await expect(
        useCase.execute('pocket-123', { name: 'Updated' }, 'user-123')
      ).rejects.toThrow(NotFoundError);

      await expect(
        useCase.execute('pocket-123', { name: 'Updated' }, 'user-123')
      ).rejects.toThrow('Pocket not found');
    });

    it('should throw ValidationError if name is empty string', async () => {
      const existingPocket = new Pocket(
        'pocket-123',
        'account-123',
        'Original Name',
        'normal',
        100,
        'USD'
      );
      mockRepo.findById.mockResolvedValue(existingPocket);

      await expect(
        useCase.execute('pocket-123', { name: '' }, 'user-123')
      ).rejects.toThrow(ValidationError);

      await expect(
        useCase.execute('pocket-123', { name: '' }, 'user-123')
      ).rejects.toThrow('Pocket name cannot be empty');
    });

    it('should throw ValidationError if name is only whitespace', async () => {
      const existingPocket = new Pocket(
        'pocket-123',
        'account-123',
        'Original Name',
        'normal',
        100,
        'USD'
      );
      mockRepo.findById.mockResolvedValue(existingPocket);

      await expect(
        useCase.execute('pocket-123', { name: '   ' }, 'user-123')
      ).rejects.toThrow(ValidationError);

      await expect(
        useCase.execute('pocket-123', { name: '   ' }, 'user-123')
      ).rejects.toThrow('Pocket name cannot be empty');
    });
  });

  describe('Uniqueness Validation (Requirement 6.1)', () => {
    it('should throw ConflictError if new name already exists in account', async () => {
      const existingPocket = new Pocket(
        'pocket-123',
        'account-123',
        'Original Name',
        'normal',
        100,
        'USD'
      );
      mockRepo.findById.mockResolvedValue(existingPocket);
      mockRepo.existsByNameInAccount.mockResolvedValue(true);

      await expect(
        useCase.execute('pocket-123', { name: 'Duplicate Name' }, 'user-123')
      ).rejects.toThrow(ConflictError);

      await expect(
        useCase.execute('pocket-123', { name: 'Duplicate Name' }, 'user-123')
      ).rejects.toThrow('A pocket with name "Duplicate Name" already exists in this account');
    });

    it('should not check uniqueness if name is unchanged', async () => {
      const existingPocket = new Pocket(
        'pocket-123',
        'account-123',
        'Same Name',
        'normal',
        100,
        'USD'
      );
      mockRepo.findById.mockResolvedValue(existingPocket);
      mockRepo.update.mockResolvedValue();

      const result = await useCase.execute(
        'pocket-123',
        { name: 'Same Name' },
        'user-123'
      );

      expect(mockRepo.existsByNameInAccount).not.toHaveBeenCalled();
      expect(mockRepo.update).toHaveBeenCalledWith(existingPocket, 'user-123');
      expect(result.name).toBe('Same Name');
    });

    it('should check uniqueness if name is changed (case sensitive)', async () => {
      const existingPocket = new Pocket(
        'pocket-123',
        'account-123',
        'Original Name',
        'normal',
        100,
        'USD'
      );
      mockRepo.findById.mockResolvedValue(existingPocket);
      mockRepo.existsByNameInAccount.mockResolvedValue(false);
      mockRepo.update.mockResolvedValue();

      await useCase.execute('pocket-123', { name: 'New Name' }, 'user-123');

      expect(mockRepo.existsByNameInAccount).toHaveBeenCalledWith(
        'New Name',
        'account-123',
        'user-123'
      );
    });
  });

  describe('Successful Update', () => {
    it('should update pocket name successfully', async () => {
      const existingPocket = new Pocket(
        'pocket-123',
        'account-123',
        'Original Name',
        'normal',
        100,
        'USD',
        1
      );
      mockRepo.findById.mockResolvedValue(existingPocket);
      mockRepo.existsByNameInAccount.mockResolvedValue(false);
      mockRepo.update.mockResolvedValue();

      const result = await useCase.execute(
        'pocket-123',
        { name: 'Updated Name' },
        'user-123'
      );

      expect(result).toEqual({
        id: 'pocket-123',
        accountId: 'account-123',
        name: 'Updated Name',
        type: 'normal',
        balance: 100,
        currency: 'USD',
        displayOrder: 1,
      });

      expect(mockRepo.update).toHaveBeenCalledWith(existingPocket, 'user-123');
    });

    it('should trim whitespace from name', async () => {
      const existingPocket = new Pocket(
        'pocket-123',
        'account-123',
        'Original Name',
        'normal',
        100,
        'USD'
      );
      mockRepo.findById.mockResolvedValue(existingPocket);
      mockRepo.existsByNameInAccount.mockResolvedValue(false);
      mockRepo.update.mockResolvedValue();

      const result = await useCase.execute(
        'pocket-123',
        { name: '  Updated Name  ' },
        'user-123'
      );

      expect(result.name).toBe('Updated Name');
      expect(mockRepo.existsByNameInAccount).toHaveBeenCalledWith(
        'Updated Name',
        'account-123',
        'user-123'
      );
    });

    it('should preserve other pocket properties', async () => {
      const existingPocket = new Pocket(
        'pocket-123',
        'account-123',
        'Original Name',
        'fixed',
        250.50,
        'EUR',
        3
      );
      mockRepo.findById.mockResolvedValue(existingPocket);
      mockRepo.existsByNameInAccount.mockResolvedValue(false);
      mockRepo.update.mockResolvedValue();

      const result = await useCase.execute(
        'pocket-123',
        { name: 'Updated Name' },
        'user-123'
      );

      expect(result).toEqual({
        id: 'pocket-123',
        accountId: 'account-123',
        name: 'Updated Name',
        type: 'fixed',
        balance: 250.50,
        currency: 'EUR',
        displayOrder: 3,
      });
    });

    it('should handle update with no changes (empty DTO)', async () => {
      const existingPocket = new Pocket(
        'pocket-123',
        'account-123',
        'Original Name',
        'normal',
        100,
        'USD'
      );
      mockRepo.findById.mockResolvedValue(existingPocket);
      mockRepo.update.mockResolvedValue();

      const result = await useCase.execute('pocket-123', {}, 'user-123');

      expect(result.name).toBe('Original Name');
      expect(mockRepo.existsByNameInAccount).not.toHaveBeenCalled();
      expect(mockRepo.update).toHaveBeenCalledWith(existingPocket, 'user-123');
    });
  });

  describe('Edge Cases', () => {
    it('should handle pocket with no display order', async () => {
      const existingPocket = new Pocket(
        'pocket-123',
        'account-123',
        'Original Name',
        'normal',
        100,
        'USD'
        // No display order
      );
      mockRepo.findById.mockResolvedValue(existingPocket);
      mockRepo.existsByNameInAccount.mockResolvedValue(false);
      mockRepo.update.mockResolvedValue();

      const result = await useCase.execute(
        'pocket-123',
        { name: 'Updated Name' },
        'user-123'
      );

      expect(result.displayOrder).toBeUndefined();
    });

    it('should handle pocket with zero balance', async () => {
      const existingPocket = new Pocket(
        'pocket-123',
        'account-123',
        'Original Name',
        'normal',
        0,
        'USD'
      );
      mockRepo.findById.mockResolvedValue(existingPocket);
      mockRepo.existsByNameInAccount.mockResolvedValue(false);
      mockRepo.update.mockResolvedValue();

      const result = await useCase.execute(
        'pocket-123',
        { name: 'Updated Name' },
        'user-123'
      );

      expect(result.balance).toBe(0);
    });

    it('should handle pocket with negative balance (fixed pocket)', async () => {
      const existingPocket = new Pocket(
        'pocket-123',
        'account-123',
        'Fixed Expenses',
        'fixed',
        -150.75,
        'USD'
      );
      mockRepo.findById.mockResolvedValue(existingPocket);
      mockRepo.existsByNameInAccount.mockResolvedValue(false);
      mockRepo.update.mockResolvedValue();

      const result = await useCase.execute(
        'pocket-123',
        { name: 'Updated Fixed Expenses' },
        'user-123'
      );

      expect(result.balance).toBe(-150.75);
    });
  });
});
