/**
 * Investment Routes
 * 
 * Defines HTTP routes for investment account operations.
 * All routes are protected with authentication middleware.
 * 
 * Requirements: 13.1-13.6
 */

import { Router } from 'express';
import { container } from 'tsyringe';
import { InvestmentController } from './InvestmentController';
import { authMiddleware } from '../../../shared/middleware/authMiddleware';

const router = Router();

// Resolve controller from DI container
const controller = container.resolve(InvestmentController);

// Apply authentication middleware to all routes
router.use(authMiddleware);

/**
 * GET /api/investments/prices/:symbol
 * Get stock price by symbol
 * 
 * Response: 200 + { symbol: string, price: number, cachedAt: string }
 * 
 * Requirements: 13.1, 13.2, 13.3, 13.4
 */
router.get('/prices/:symbol', (req, res, next) => controller.getPriceBySymbol(req, res, next));

/**
 * GET /api/investments/:accountId/price
 * Get current stock price for an investment account
 * 
 * Query params: ?symbol=VOO (required)
 * Response: 200 + { symbol: string, price: number, cachedAt: string }
 * 
 * Requirements: 13.1, 13.2, 13.3, 13.4
 */
router.get('/:accountId/price', (req, res, next) => controller.getPrice(req, res, next));

/**
 * POST /api/investments/:accountId/update
 * Update investment account (shares and montoInvertido)
 * 
 * Body: { shares?: number, montoInvertido?: number }
 * Response: 200 + { message: string }
 * Errors: 400 (validation), 404 (not found), 403 (not investment account)
 * 
 * Requirements: 13.6
 */
router.post('/:accountId/update', (req, res, next) => controller.updateInvestment(req, res, next));

export default router;
