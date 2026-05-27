/**
 * Currency Routes
 * 
 * Defines HTTP routes for currency operations (exchange rates and conversion).
 * All routes are protected with authentication middleware.
 * 
 * Requirements: 15.1-15.4
 */

import { Router } from 'express';
import { container } from 'tsyringe';
import { CurrencyController } from './CurrencyController';
import { authMiddleware } from '../../../shared/middleware/authMiddleware';
import { validateBody } from '../../../shared/middleware/validate';
import { convertCurrencySchema, convertBatchSchema, forceRefreshSchema } from './schemas';

const router = Router();

// Resolve controller from DI container
const controller = container.resolve(CurrencyController);

// Apply authentication middleware to all routes
router.use(authMiddleware);

/**
 * GET /api/currency/rates?from=USD&to=MXN
 * Get exchange rate between two currencies
 * 
 * Query params: from (Currency), to (Currency)
 * Response: 200 + ExchangeRateResponseDTO
 * Errors: 400 (validation)
 * 
 * Requirements: 15.1, 15.2
 */
router.get('/rates', (req, res, next) => controller.getRate(req, res, next));

/**
 * POST /api/currency/convert
 * Convert currency amount
 * 
 * Body: ConvertCurrencyDTO
 * Response: 200 + ConvertCurrencyResponseDTO
 * Errors: 400 (validation)
 * 
 * Requirements: 15.3, 15.4
 */
router.post('/convert', validateBody(convertCurrencySchema), (req, res, next) => controller.convert(req, res, next));

/**
 * POST /api/currency/convert-batch
 * Convert multiple currency amounts in a single request.
 *
 * Body: { conversions: Array<{ amount: number, from: Currency, to: Currency }> }
 * Response: 200 + { results: Array<{ amount, convertedAmount, rate, from, to }> }
 * Errors: 400 (validation)
 *
 * Reduces the number of round trips required to consolidate balances across
 * currencies (e.g. for the dashboard total or net-worth snapshot).
 */
router.post('/convert-batch', validateBody(convertBatchSchema), (req, res, next) => controller.convertBatch(req, res, next));

/**
 * POST /api/currency/force-refresh
 * Delete cached rate and fetch fresh from API.
 * Body: { from: Currency, to: Currency }
 */
router.post('/force-refresh', validateBody(forceRefreshSchema), (req, res, next) => controller.forceRefresh(req, res, next));

export default router;
