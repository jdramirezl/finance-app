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
      getExchangeRateHistory: jest.fn(),
    };
    useCase = new GetMonthlyTrendUseCase(mockRepo);
  });

  it('should return monthly trend with per-currency income and expenses', async () => {
    mockRepo.aggregateMonthly.mockResolvedValue([
      { month: '2024-01', income: [{ currency: 'MXN', amount: 5000 }], expenses: [{ currency: 'MXN', amount: 3000 }] },
      { month: '2024-02', income: [{ currency: 'MXN', amount: 4500 }], expenses: [{ currency: 'MXN', amount: 4000 }] },
    ]);

    const result = await useCase.execute('user-1', 6);

    expect(result.data).toHaveLength(2);
    expect(result.data[0]).toEqual({
      month: '2024-01',
      income: [{ currency: 'MXN', amount: 5000 }],
      expenses: [{ currency: 'MXN', amount: 3000 }],
    });
    expect(result.data[1]).toEqual({
      month: '2024-02',
      income: [{ currency: 'MXN', amount: 4500 }],
      expenses: [{ currency: 'MXN', amount: 4000 }],
    });
  });

  it('should handle multi-currency months', async () => {
    mockRepo.aggregateMonthly.mockResolvedValue([
      {
        month: '2024-01',
        income: [{ currency: 'MXN', amount: 3000 }, { currency: 'USD', amount: 200 }],
        expenses: [{ currency: 'MXN', amount: 2000 }, { currency: 'COP', amount: 500000 }],
      },
    ]);

    const result = await useCase.execute('user-1', 6);

    expect(result.data[0].income).toHaveLength(2);
    expect(result.data[0].expenses).toHaveLength(2);
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
