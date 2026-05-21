import { injectable, inject } from 'tsyringe';
import type { IReportsRepository } from '../../infrastructure/IReportsRepository';
import type { MonthlyTrendDTO } from '../dtos/ReportsDTO';
import { ValidationError } from '../../../../shared/errors/AppError';

@injectable()
export class GetMonthlyTrendUseCase {
  constructor(
    @inject('ReportsRepository') private reportsRepo: IReportsRepository
  ) {}

  async execute(userId: string, months: number): Promise<MonthlyTrendDTO> {
    if (!userId?.trim()) throw new ValidationError('User ID is required');
    if (months < 1 || months > 24) throw new ValidationError('months must be between 1 and 24');

    const rows = await this.reportsRepo.aggregateMonthly(userId, months);

    const data = rows.map(r => ({
      month: r.month,
      income: r.income,
      expenses: r.expenses,
      net: r.income - r.expenses,
    }));

    return { data, currency: 'MXN' };
  }
}
