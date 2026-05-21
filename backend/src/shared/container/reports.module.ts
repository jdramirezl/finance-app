import { container } from 'tsyringe';
import type { IReportsRepository } from '../../modules/reports/infrastructure/IReportsRepository';
import { SupabaseReportsRepository } from '../../modules/reports/infrastructure/SupabaseReportsRepository';
import { GetSpendingByCategoryUseCase } from '../../modules/reports/application/useCases/GetSpendingByCategoryUseCase';
import { GetMonthlyTrendUseCase } from '../../modules/reports/application/useCases/GetMonthlyTrendUseCase';
import { GetCategoryTrendUseCase } from '../../modules/reports/application/useCases/GetCategoryTrendUseCase';
import { ReportsController } from '../../modules/reports/presentation/ReportsController';

export function registerReportsModule(): void {
  container.register<IReportsRepository>('ReportsRepository', {
    useClass: SupabaseReportsRepository,
  });
  container.register(GetSpendingByCategoryUseCase, { useClass: GetSpendingByCategoryUseCase });
  container.register(GetMonthlyTrendUseCase, { useClass: GetMonthlyTrendUseCase });
  container.register(GetCategoryTrendUseCase, { useClass: GetCategoryTrendUseCase });
  container.register(ReportsController, { useClass: ReportsController });
}
