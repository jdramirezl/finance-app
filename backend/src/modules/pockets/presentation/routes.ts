/**
 * Pocket Routes
 * 
 * Defines HTTP routes for pocket operations.
 * All routes are protected with authentication middleware.
 * 
 * Requirements: 6.1-6.6, 7.1-7.4
 */

import { Router } from 'express';
import { container } from 'tsyringe';
import { PocketController } from './PocketController';
import { authMiddleware } from '../../../shared/middleware/authMiddleware';

const router = Router();

// Resolve controller from DI container
const controller = container.resolve(PocketController);

// Apply authentication middleware to all routes
router.use(authMiddleware);

/**
 * POST /api/pockets
 * Create new pocket
 * 
 * Body: CreatePocketDTO
 * Response: 201 + PocketResponseDTO
 * Errors: 400 (validation), 409 (duplicate/constraint violation)
 * 
 * Requirements: 6.1, 6.2, 6.3
 */
router.post('/', (req, res, next) => controller.create(req, res, next));

/**
 * GET /api/pockets
 * Get pockets by account
 * 
 * Query params: accountId (required)
 * Response: 200 + PocketResponseDTO[]
 * Errors: 400 (missing accountId), 404 (account not found)
 * 
 * Requirements: 6.4
 */
router.get('/', (req, res, next) => controller.getByAccount(req, res, next));

/**
 * GET /api/pockets/:id
 * Get pocket by ID
 * 
 * Response: 200 + PocketResponseDTO
 * Errors: 404 (not found), 403 (forbidden)
 * 
 * Requirements: 6.4
 */
router.get('/:id', (req, res, next) => controller.getById(req, res, next));

/**
 * PUT /api/pockets/:id
 * Update pocket
 * 
 * Body: UpdatePocketDTO
 * Response: 200 + PocketResponseDTO
 * Errors: 400 (validation), 404 (not found), 409 (duplicate)
 * 
 * Requirements: 6.1
 */
router.put('/:id', (req, res, next) => controller.update(req, res, next));

/**
 * DELETE /api/pockets/:id
 * Delete pocket (orphans movements)
 * 
 * Response: 204
 * Errors: 404 (not found)
 * 
 * Requirements: 6.5
 */
router.delete('/:id', (req, res, next) => controller.delete(req, res, next));

/**
 * POST /api/pockets/:id/migrate
 * Migrate fixed pocket to new account
 * 
 * Body: { targetAccountId: string }
 * Response: 200 + PocketResponseDTO
 * Errors: 400 (validation), 404 (not found), 409 (constraint violation)
 * 
 * Requirements: 7.1, 7.2, 7.3, 7.4
 */
router.post('/:id/migrate', (req, res, next) => controller.migrate(req, res, next));

/**
 * POST /api/pockets/reorder
 * Reorder pockets within account
 * 
 * Body: { pocketIds: string[] }
 * Response: 204
 * Errors: 400 (validation), 404 (not found)
 * 
 * Requirements: 6.6
 */
router.post('/reorder', (req, res, next) => controller.reorder(req, res, next));

export default router;
