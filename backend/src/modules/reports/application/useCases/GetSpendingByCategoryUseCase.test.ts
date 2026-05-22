import 'reflect-metadata';
import { GetSpendingByCategoryUseCase } from './GetSpendingByCategoryUseCase';
import type { IReportsRepository } from '../../infrastructure/IReportsRepository';

describe('GetSpendingByCategoryUseCase', () => {
  let useCase: GetSpendingByCategoryUseCase;
  let mockRepo: jest.Mocked<IReportsRepository>;

  beforeEach(() => {
    mockRepo = {
      aggregateByCategory: jest.fn(),
      aggregateMonthly: jest.fn(),
      aggregateByCategoryMonthly: jest.fn(),
      getExchangeRateHistory: jest.fn(),
    };
    useCase = new GetSpendingByCategoryUseCase(mockRepo);
  });

  it('should return spending grouped by category with per-currency totals', async () => {
    mockRepo.aggregateByCategory.mockResolvedValue([
      { category: 'Food', totals: [{ currency: 'MXN', amount: 500 }], count: 10 },
      { category: 'Transport', totals: [{ currency: 'MXN', amount: 300 }], count: 5 },
      { category: 'Bills', totals: [{ currency: 'MXN', amount: 200 }], count: 2 },
    ]);

    const result = await useCase.execute('user-1', '2024-01-01', '2024-01-31');

    expect(result.totalExpenses).toEqual([{ currency: 'MXN', amount: 1000 }]);
    expect(result.data).toHaveLength(3);
    expect(result.data[0]).toEqual({
      category: 'Food', totals: [{ currency: 'MXN', amount: 500 }], count: 10, percentage: 50,
    });
    expect(result.data[1]).toEqual({
      category: 'Transport', totals: [{ currency: 'MXN', amount: 300 }], count: 5, percentage: 30,
    });
    expect(result.data[2]).toEqual({
      category: 'Bills', totals: [{ currency: 'MXN', amount: 200 }], count: 2, percentage: 20,
    });
  });

  it('should handle multi-currency totals', async () => {
    mockRepo.aggregateByCategory.mockResolvedValue([
      { category: 'Food', totals: [{ currency: 'MXN', amount: 400 }, { currency: 'USD', amount: 100 }], count: 8 },
      { category: 'Bills', totals: [{ currency: 'MXN', amount: 500 }], count: 3 },
    ]);

    const result = await useCase.execute('user-1', '2024-01-01', '2024-01-31');

    expect(result.totalExpenses).toEqual(
      expect.arrayContaining([
        { currency: 'MXN', amount: 900 },
        { currency: 'USD', amount: 100 },
      ])
    );
    expect(result.data).toHaveLength(2);
  });

  it('should return empty data when no expenses exist', async () => {
    mockRepo.aggregateByCategory.mockResolvedValue([]);

    const result = await useCase.execute('user-1', '2024-01-01', '2024-01-31');

    expect(result.data).toHaveLength(0);
    expect(result.totalExpenses).toEqual([]);
  });

  it('should sort by total descending', async () => {
    mockRepo.aggregateByCategory.mockResolvedValue([
      { category: 'Transport', totals: [{ currency: 'MXN', amount: 100 }], count: 2 },
      { category: 'Food', totals: [{ currency: 'MXN', amount: 500 }], count: 10 },
    ]);

    const result = await useCase.execute('user-1', '2024-01-01', '2024-01-31');

    expect(result.data[0].category).toBe('Food');
    expect(result.data[1].category).toBe('Transport');
  });

  it('should throw on missing userId', async () => {
    await expect(useCase.execute('', '2024-01-01', '2024-01-31'))
      .rejects.toThrow('User ID is required');
  });

  it('should throw on invalid startDate', async () => {
    await expect(useCase.execute('user-1', 'invalid', '2024-01-31'))
      .rejects.toThrow('Invalid startDate');
  });

  it('should throw when startDate is after endDate', async () => {
    await expect(useCase.execute('user-1', '2024-02-01', '2024-01-01'))
      .rejects.toThrow('startDate must be before endDate');
  });
});
