import 'reflect-metadata';
import { CreateSnapshotUseCase } from './CreateSnapshotUseCase';
import type { INetWorthSnapshotRepository } from '../../infrastructure/INetWorthSnapshotRepository';
import type { NetWorthSnapshot, CreateSnapshotDTO } from '../../domain/NetWorthSnapshot';

describe('CreateSnapshotUseCase', () => {
  let useCase: CreateSnapshotUseCase;
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
    useCase = new CreateSnapshotUseCase(mockRepo);
  });

  it('should create a snapshot and return it', async () => {
    const dto: CreateSnapshotDTO = {
      totalNetWorth: 15000,
      baseCurrency: 'USD',
      breakdown: { USD: 10000, MXN: 5000 },
    };
    const expected: NetWorthSnapshot = {
      id: 'snap-1',
      userId: 'user-1',
      snapshotDate: '2026-05-21',
      totalNetWorth: 15000,
      baseCurrency: 'USD',
      breakdown: { USD: 10000, MXN: 5000 },
      createdAt: '2026-05-21T00:00:00Z',
    };
    mockRepo.create.mockResolvedValue(expected);

    const result = await useCase.execute('user-1', dto);

    expect(result).toEqual(expected);
    expect(mockRepo.create).toHaveBeenCalledWith('user-1', dto);
  });

  it('should pass userId correctly to repository', async () => {
    const dto: CreateSnapshotDTO = { totalNetWorth: 0, baseCurrency: 'MXN', breakdown: {} };
    mockRepo.create.mockResolvedValue({ id: 'snap-2', userId: 'user-2', snapshotDate: '2026-01-01', totalNetWorth: 0, baseCurrency: 'MXN', breakdown: {}, createdAt: '' });

    await useCase.execute('user-2', dto);

    expect(mockRepo.create).toHaveBeenCalledWith('user-2', dto);
  });
});
