import 'reflect-metadata';
import { GetCategoryTrendUseCase } from './GetCategoryTrendUseCase';
import type { IReportsRepository } from '../../infrastructure/IReportsRepository';

describe('GetCategoryTrendUseCase', () => {
  let useCase: GetCategoryTrendUseCase;
  let mockRepo: jest.Mocked<IReportsRepository>;

  beforeEach(() => {
    mockRepo = {
      aggregateByCategory: jest.fn(),
      aggregateMonthly: jest.fn(),
      aggregateByCategoryMonthly: jest.fn(),
      getExchangeRateHistory: jest.fn(),
    };
    useCase = new GetCategoryTrendUseCase(mockRepo);
  });

  it('should return category trend data with per-currency totals', async () => {
    mockRepo.aggregateByCategoryMonthly.mockResolvedValue([
      { month: '2024-01', totals: [{ currency: 'MXN', amount: 450 }], count: 15 },
      { month: '2024-02', totals: [{ currency: 'MXN', amount: 380 }], count: 12 },
    ]);

    const result = await useCase.execute('user-1', 'Food', 6);

    expect(result.category).toBe('Food');
    expect(result.data).toHaveLength(2);
    expect(result.data[0]).toEqual({ month: '2024-01', totals: [{ currency: 'MXN', amount: 450 }], count: 15 });
    expect(mockRepo.aggregateByCategoryMonthly).toHaveBeenCalledWith('user-1', 'Food', 6);
  });

  it('should handle multi-currency category data', async () => {
    mockRepo.aggregateByCategoryMonthly.mockResolvedValue([
      { month: '2024-01', totals: [{ currency: 'MXN', amount: 300 }, { currency: 'USD', amount: 50 }], count: 10 },
    ]);

    const result = await useCase.execute('user-1', 'Food', 6);

    expect(result.data[0].totals).toHaveLength(2);
  });

  it('should return empty data when no movements for category', async () => {
    mockRepo.aggregateByCategoryMonthly.mockResolvedValue([]);

    const result = await useCase.execute('user-1', 'Food', 6);

    expect(result.data).toHaveLength(0);
    expect(result.category).toBe('Food');
  });

  it('should throw on missing userId', async () => {
    await expect(useCase.execute('', 'Food', 6)).rejects.toThrow('User ID is required');
  });

  it('should throw on missing category', async () => {
    await expect(useCase.execute('user-1', '', 6)).rejects.toThrow('category is required');
  });

  it('should throw when months is out of range', async () => {
    await expect(useCase.execute('user-1', 'Food', 0)).rejects.toThrow('months must be between 1 and 24');
    await expect(useCase.execute('user-1', 'Food', 25)).rejects.toThrow('months must be between 1 and 24');
  });
});
