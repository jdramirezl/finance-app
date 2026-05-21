import { injectable, inject } from 'tsyringe';
import type { IReportsRepository } from '../../infrastructure/IReportsRepository';
import type { CategoryTrendDTO } from '../dtos/ReportsDTO';
import { ValidationError } from '../../../../shared/errors/AppError';

@injectable()
export class GetCategoryTrendUseCase {
  constructor(
    @inject('ReportsRepository') private reportsRepo: IReportsRepository
  ) {}

  async execute(userId: string, category: string, months: number): Promise<CategoryTrendDTO> {
    if (!userId?.trim()) throw new ValidationError('User ID is required');
    if (!category?.trim()) throw new ValidationError('category is required');
    if (months < 1 || months > 24) throw new ValidationError('months must be between 1 and 24');

    const rows = await this.reportsRepo.aggregateByCategoryMonthly(userId, category, months);

    return { data: rows, category };
  }
}
