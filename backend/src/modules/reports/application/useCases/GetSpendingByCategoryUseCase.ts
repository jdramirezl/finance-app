import { injectable, inject } from 'tsyringe';
import type { IReportsRepository, CurrencyAmount } from '../../infrastructure/IReportsRepository';
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

    // Compute total expenses per currency across all categories
    const totalMap = new Map<string, number>();
    for (const row of rows) {
      for (const { currency, amount } of row.totals) {
        totalMap.set(currency, (totalMap.get(currency) || 0) + amount);
      }
    }
    const totalExpenses: CurrencyAmount[] = Array.from(totalMap.entries())
      .map(([currency, amount]) => ({ currency, amount }));

    // Sum all amounts (raw) for percentage calculation
    const grandTotal = totalExpenses.reduce((sum, t) => sum + t.amount, 0);

    const data = rows
      .map(r => {
        const catTotal = r.totals.reduce((sum, t) => sum + t.amount, 0);
        return {
          category: r.category,
          totals: r.totals,
          count: r.count,
          percentage: grandTotal > 0 ? Math.round((catTotal / grandTotal) * 10000) / 100 : 0,
        };
      })
      .sort((a, b) => {
        const aTotal = a.totals.reduce((s, t) => s + t.amount, 0);
        const bTotal = b.totals.reduce((s, t) => s + t.amount, 0);
        return bTotal - aTotal;
      });

    return { data, totalExpenses };
  }
}
