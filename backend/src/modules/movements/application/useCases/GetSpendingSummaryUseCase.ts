/**
 * Get Spending Summary Use Case
 *
 * Computes expense totals for multiple periods (today, this week, last week,
 * this month, last month) grouped by currency. Calls the repository in
 * parallel for all periods.
 */

import { injectable, inject } from 'tsyringe';
import type { IMovementRepository } from '../../infrastructure/IMovementRepository';
import type { SpendingSummaryDTO, CurrencyTotal } from '../dtos/SpendingSummaryDTO';
import { ValidationError } from '../../../../shared/errors/AppError';

@injectable()
export class GetSpendingSummaryUseCase {
  constructor(
    @inject('MovementRepository') private movementRepo: IMovementRepository
  ) {}

  async execute(userId: string): Promise<SpendingSummaryDTO> {
    if (!userId?.trim()) {
      throw new ValidationError('User ID is required');
    }

    const now = new Date();

    // Today: start of day to now
    const todayStart = startOfDay(now);

    // This week: Monday 00:00 to now
    const thisWeekStart = startOfWeek(now);

    // Last week: previous Monday 00:00 to previous Sunday 23:59:59
    const lastWeekStart = new Date(thisWeekStart);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);
    const lastWeekEnd = new Date(thisWeekStart);
    lastWeekEnd.setMilliseconds(-1);

    // This month: 1st of month 00:00 to now
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Last month: 1st of previous month to last day of previous month
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

    const [today, thisWeek, lastWeek, thisMonth, lastMonth] = await Promise.all([
      this.movementRepo.sumExpensesByPeriod(userId, todayStart, now),
      this.movementRepo.sumExpensesByPeriod(userId, thisWeekStart, now),
      this.movementRepo.sumExpensesByPeriod(userId, lastWeekStart, lastWeekEnd),
      this.movementRepo.sumExpensesByPeriod(userId, thisMonthStart, now),
      this.movementRepo.sumExpensesByPeriod(userId, lastMonthStart, lastMonthEnd),
    ]);

    const toTotals = (data: { currency: string; total: number }[]): CurrencyTotal[] =>
      data.map(({ currency, total }) => ({ currency, amount: total }));

    return {
      today: { totals: toTotals(today) },
      thisWeek: { totals: toTotals(thisWeek) },
      lastWeek: { totals: toTotals(lastWeek) },
      thisMonth: { totals: toTotals(thisMonth) },
      lastMonth: { totals: toTotals(lastMonth) },
    };
  }
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  // getDay(): 0=Sun, 1=Mon... We want Monday as start
  const diff = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
}
