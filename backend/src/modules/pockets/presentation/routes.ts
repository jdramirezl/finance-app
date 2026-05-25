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
import { validateBody } from '../../../shared/middleware/validate';
import { createPocketSchema, updatePocketSchema, migratePocketSchema, reorderPocketsSchema } from './schemas';

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
router.post('/', validateBody(createPocketSchema), (req, res, next) => controller.create(req, res, next));

/**
 * GET /api/pockets
 * Get pockets — either for a single account or for the whole user.
 *
 * Query params:
 *   accountId         (optional) - scope to a single account
 *   include_archived  (optional) - include soft-archived pockets when "true";
 *                                  honoured on both the per-account and
 *                                  all-pockets branches
 * Response: 200 + PocketResponseDTO[]
 * Errors: 404 (account not found, only when accountId is supplied)
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
router.put('/:id', validateBody(updatePocketSchema), (req, res, next) => controller.update(req, res, next));

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
router.post('/:id/migrate', validateBody(migratePocketSchema), (req, res, next) => controller.migrate(req, res, next));

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
router.post('/reorder', validateBody(reorderPocketsSchema), (req, res, next) => controller.reorder(req, res, next));

/**
 * PATCH /api/pockets/:id/archive
 * Soft-delete (archive) a pocket.
 *
 * Response: 204
 * Errors: 404 (not found)
 */
router.patch('/:id/archive', (req, res, next) => controller.archive(req, res, next));

/**
 * PATCH /api/pockets/:id/unarchive
 * Restore a previously archived pocket.
 *
 * Response: 204
 * Errors: 404 (not found)
 */
router.patch('/:id/unarchive', (req, res, next) => controller.unarchive(req, res, next));

export default router;
