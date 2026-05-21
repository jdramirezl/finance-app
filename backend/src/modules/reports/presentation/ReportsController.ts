import { Request, Response, NextFunction } from 'express';
import { injectable, inject } from 'tsyringe';
import { GetSpendingByCategoryUseCase } from '../application/useCases/GetSpendingByCategoryUseCase';
import { GetMonthlyTrendUseCase } from '../application/useCases/GetMonthlyTrendUseCase';
import { GetCategoryTrendUseCase } from '../application/useCases/GetCategoryTrendUseCase';

@injectable()
export class ReportsController {
  constructor(
    @inject(GetSpendingByCategoryUseCase) private spendingByCategoryUseCase: GetSpendingByCategoryUseCase,
    @inject(GetMonthlyTrendUseCase) private monthlyTrendUseCase: GetMonthlyTrendUseCase,
    @inject(GetCategoryTrendUseCase) private categoryTrendUseCase: GetCategoryTrendUseCase
  ) {}

  async getSpendingByCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const { startDate, endDate } = req.query as { startDate: string; endDate: string };
      const result = await this.spendingByCategoryUseCase.execute(userId, startDate, endDate);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async getMonthlyTrend(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const { months } = req.query as unknown as { months: number };
      const result = await this.monthlyTrendUseCase.execute(userId, months);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async getCategoryTrend(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const { category, months } = req.query as unknown as { category: string; months: number };
      const result = await this.categoryTrendUseCase.execute(userId, category, months);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
}
