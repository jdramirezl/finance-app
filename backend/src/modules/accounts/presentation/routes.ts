/**
 * Account Routes
 * 
 * Defines HTTP routes for account operations.
 * All routes are protected with authentication middleware.
 * 
 * Requirements: 4.1-4.7, 5.1-5.5
 */

import { Router } from 'express';
import { container } from 'tsyringe';
import { AccountController } from './AccountController';
import { authMiddleware } from '../../../shared/middleware/authMiddleware';

const router = Router();

// Resolve controller from DI container
const controller = container.resolve(AccountController);

// Apply authentication middleware to all routes
router.use(authMiddleware);

/**
 * POST /api/accounts
 * Create new account
 * 
 * Body: CreateAccountDTO
 * Response: 201 + AccountResponseDTO
 * Errors: 400 (validation), 409 (duplicate)
 * 
 * Requirements: 4.1, 4.2, 4.3
 */
router.post('/', (req, res, next) => controller.create(req, res, next));

/**
 * GET /api/accounts
 * Get all accounts for user
 * 
 * Query params: ?skipInvestmentPrices=true (optional)
 * Response: 200 + AccountResponseDTO[]
 * 
 * Requirements: 4.4
 */
router.get('/', (req, res, next) => controller.getAll(req, res, next));

/**
 * GET /api/accounts/:id
 * Get account by ID
 * 
 * Response: 200 + AccountResponseDTO
 * Errors: 404 (not found), 403 (forbidden)
 * 
 * Requirements: 4.4
 */
router.get('/:id', (req, res, next) => controller.getById(req, res, next));

/**
 * PUT /api/accounts/:id
 * Update account
 * 
 * Body: UpdateAccountDTO
 * Response: 200 + AccountResponseDTO
 * Errors: 400 (validation), 404 (not found), 409 (duplicate)
 * 
 * Requirements: 4.5
 */
router.put('/:id', (req, res, next) => controller.update(req, res, next));

/**
 * DELETE /api/accounts/:id
 * Delete account (requires no pockets)
 * 
 * Response: 204
 * Errors: 404 (not found), 409 (has pockets)
 * 
 * Requirements: 4.6
 */
router.delete('/:id', (req, res, next) => controller.delete(req, res, next));

/**
 * POST /api/accounts/:id/cascade
 * Delete account with all related data
 * 
 * Body: { deleteMovements: boolean }
 * Response: 200 + CascadeDeleteResultDTO
 * Errors: 404 (not found)
 * 
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
 */
router.post('/:id/cascade', (req, res, next) => controller.deleteCascade(req, res, next));

/**
 * POST /api/accounts/reorder
 * Reorder accounts
 * 
 * Body: { accountIds: string[] }
 * Response: 204
 * Errors: 400 (validation), 404 (not found)
 * 
 * Requirements: 4.7
 */
router.post('/reorder', (req, res, next) => controller.reorder(req, res, next));

export default router;
