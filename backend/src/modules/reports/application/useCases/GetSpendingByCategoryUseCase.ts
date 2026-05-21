import { injectable, inject } from 'tsyringe';
import type { IReportsRepository } from '../../infrastructure/IReportsRepository';
import type { SpendingByCategoryDTO } from '../dtos/ReportsDTO';
import { ValidationError } from '../../../../shared/errors/AppError';

@injectable()
export class GetSpendingByCategoryUseCase {
  constructor(
    @inject('ReportsRepository') private reportsRepo: IReportsRepository
  ) {}

  async execute(userId: string, startDate: string, endDate: string): Promise<SpendingByCategoryDTO> {
    if (!userId?.trim()) throw new ValidationError('User ID is required');
    if (!startDate) throw new ValidationError('startDate is required');
    if (!endDate) throw new ValidationError('endDate is required');

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime())) throw new ValidationError('Invalid startDate');
    if (isNaN(end.getTime())) throw new ValidationError('Invalid endDate');
    if (start > end) throw new ValidationError('startDate must be before endDate');

    const rows = await this.reportsRepo.aggregateByCategory(userId, start, end);

    const totalExpenses = rows.reduce((sum, r) => sum + r.total, 0);

    const data = rows
      .map(r => ({
        category: r.category,
        total: r.total,
        count: r.count,
        percentage: totalExpenses > 0 ? Math.round((r.total / totalExpenses) * 10000) / 100 : 0,
      }))
      .sort((a, b) => b.total - a.total);

    return { data, totalExpenses, currency: 'MXN' };
  }
}
