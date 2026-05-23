import { Router } from 'express';
import { container } from 'tsyringe';
import { ReportsController } from './ReportsController';
import { authMiddleware } from '../../../shared/middleware/authMiddleware';
import { validateQuery } from '../../../shared/middleware/validate';
import { spendingByCategoryQuerySchema, monthlyTrendQuerySchema, categoryTrendQuerySchema, exchangeRateHistoryQuerySchema } from './schemas';

const router = Router();
const controller = container.resolve(ReportsController);

router.use(authMiddleware);

router.get(
  '/spending-by-category',
  validateQuery(spendingByCategoryQuerySchema),
  (req, res, next) => controller.getSpendingByCategory(req, res, next)
);

router.get(
  '/monthly-trend',
  validateQuery(monthlyTrendQuerySchema),
  (req, res, next) => controller.getMonthlyTrend(req, res, next)
);

router.get(
  '/category-trend',
  validateQuery(categoryTrendQuerySchema),
  (req, res, next) => controller.getCategoryTrend(req, res, next)
);

router.get(
  '/exchange-rate-history',
  validateQuery(exchangeRateHistoryQuerySchema),
  (req, res, next) => controller.getExchangeRateHistory(req, res, next)
);

export default router;
