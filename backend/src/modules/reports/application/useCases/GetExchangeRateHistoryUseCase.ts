import { injectable, inject } from 'tsyringe';
import type { IReportsRepository, ExchangeRateHistoryRow } from '../../infrastructure/IReportsRepository';
import { ValidationError } from '../../../../shared/errors/AppError';

@injectable()
export class GetExchangeRateHistoryUseCase {
  constructor(
    @inject('ReportsRepository') private reportsRepo: IReportsRepository
  ) {}

  async execute(base: string, target: string, days: number): Promise<{ data: ExchangeRateHistoryRow[] }> {
    if (!base?.trim()) throw new ValidationError('base currency is required');
    if (!target?.trim()) throw new ValidationError('target currency is required');
    if (days < 1 || days > 365) throw new ValidationError('days must be between 1 and 365');

    const data = await this.reportsRepo.getExchangeRateHistory(base, target, days);
    return { data };
  }
}
