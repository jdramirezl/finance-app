import 'reflect-metadata';
import { DeleteSnapshotUseCase } from './DeleteSnapshotUseCase';
import type { INetWorthSnapshotRepository } from '../../infrastructure/INetWorthSnapshotRepository';
import { NotFoundError } from '../../../../shared/errors/AppError';

describe('DeleteSnapshotUseCase', () => {
  let useCase: DeleteSnapshotUseCase;
  let mockRepo: jest.Mocked<INetWorthSnapshotRepository>;

  beforeEach(() => {
    mockRepo = {
      findAll: jest.fn(),
      findLatest: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    useCase = new DeleteSnapshotUseCase(mockRepo);
  });

  it('should delete snapshot when user owns it', async () => {
    mockRepo.findById.mockResolvedValue({
      id: 'snap-1', userId: 'user-1', snapshotDate: '2026-01-01',
      totalNetWorth: 1000, baseCurrency: 'USD', breakdown: {}, createdAt: '',
    });
    mockRepo.delete.mockResolvedValue(undefined);

    await useCase.execute('snap-1', 'user-1');

    expect(mockRepo.delete).toHaveBeenCalledWith('snap-1');
  });

  it('should throw NotFoundError when snapshot does not exist', async () => {
    mockRepo.findById.mockResolvedValue(null);

    await expect(useCase.execute('nonexistent', 'user-1'))
      .rejects.toThrow(NotFoundError);
  });

  it('should throw NotFoundError when userId does not match (ownership)', async () => {
    mockRepo.findById.mockResolvedValue({
      id: 'snap-1', userId: 'other-user', snapshotDate: '2026-01-01',
      totalNetWorth: 1000, baseCurrency: 'USD', breakdown: {}, createdAt: '',
    });

    await expect(useCase.execute('snap-1', 'user-1'))
      .rejects.toThrow(NotFoundError);
    expect(mockRepo.delete).not.toHaveBeenCalled();
  });
});
