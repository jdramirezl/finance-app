/**
 * Unit tests for ArchivePocketUseCase
 */

import 'reflect-metadata';
import { ArchivePocketUseCase } from './ArchivePocketUseCase';
import type { IPocketRepository } from '../../infrastructure/IPocketRepository';
import { Pocket } from '../../domain/Pocket';
import { NotFoundError } from '../../../../shared/errors/AppError';

describe('ArchivePocketUseCase', () => {
  let useCase: ArchivePocketUseCase;
  let mockPocketRepo: jest.Mocked<IPocketRepository>;

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
      archive: jest.fn(),
      unarchive: jest.fn(),
      deleteByAccountId: jest.fn(),
      updateDisplayOrders: jest.fn(),
    } as jest.Mocked<IPocketRepository>;

    useCase = new ArchivePocketUseCase(mockPocketRepo);
  });

  it('should archive an existing pocket', async () => {
    const pocketId = 'pocket-1';
    const userId = 'user-1';
    const pocket = new Pocket(pocketId, 'account-1', 'Savings', 'normal', 100, 'USD');

    mockPocketRepo.findById.mockResolvedValue(pocket);

    await useCase.execute(pocketId, userId);

    expect(mockPocketRepo.findById).toHaveBeenCalledWith(pocketId, userId);
    expect(mockPocketRepo.archive).toHaveBeenCalledWith(pocketId, userId);
  });

  it('should throw NotFoundError when pocket does not exist', async () => {
    mockPocketRepo.findById.mockResolvedValue(null);

    await expect(useCase.execute('missing', 'user-1')).rejects.toThrow(NotFoundError);
    await expect(useCase.execute('missing', 'user-1')).rejects.toThrow('Pocket not found');

    expect(mockPocketRepo.archive).not.toHaveBeenCalled();
  });
});
