import 'reflect-metadata';
import { GetMonthlyTrendUseCase } from './GetMonthlyTrendUseCase';
import type { IReportsRepository } from '../../infrastructure/IReportsRepository';

describe('GetMonthlyTrendUseCase', () => {
  let useCase: GetMonthlyTrendUseCase;
  let mockRepo: jest.Mocked<IReportsRepository>;

  beforeEach(() => {
    mockRepo = {
      aggregateByCategory: jest.fn(),
      aggregateMonthly: jest.fn(),
      aggregateByCategoryMonthly: jest.fn(),
    };
    useCase = new GetMonthlyTrendUseCase(mockRepo);
  });

  it('should return monthly trend with net calculated', async () => {
    mockRepo.aggregateMonthly.mockResolvedValue([
      { month: '2024-01', income: 5000, expenses: 3000 },
      { month: '2024-02', income: 4500, expenses: 4000 },
    ]);

    const result = await useCase.execute('user-1', 6);

    expect(result.data).toHaveLength(2);
    expect(result.data[0]).toEqual({ month: '2024-01', income: 5000, expenses: 3000, net: 2000 });
    expect(result.data[1]).toEqual({ month: '2024-02', income: 4500, expenses: 4000, net: 500 });
    expect(mockRepo.aggregateMonthly).toHaveBeenCalledWith('user-1', 6);
  });

  it('should return empty data when no movements exist', async () => {
    mockRepo.aggregateMonthly.mockResolvedValue([]);

    const result = await useCase.execute('user-1', 12);

    expect(result.data).toHaveLength(0);
  });

  it('should throw on missing userId', async () => {
    await expect(useCase.execute('', 6)).rejects.toThrow('User ID is required');
  });

  it('should throw when months is out of range', async () => {
    await expect(useCase.execute('user-1', 0)).rejects.toThrow('months must be between 1 and 24');
    await expect(useCase.execute('user-1', 25)).rejects.toThrow('months must be between 1 and 24');
  });
});
