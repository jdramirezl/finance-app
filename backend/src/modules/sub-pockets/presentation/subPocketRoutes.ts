/**
 * SubPocket Routes
 * 
 * Defines HTTP routes for sub-pocket operations.
 * All routes are protected with authentication middleware.
 * 
 * Requirements: 8.1-8.6, 9.2
 */

import { Router } from 'express';
import { container } from 'tsyringe';
import { SubPocketController } from './SubPocketController';
import { authMiddleware } from '../../../shared/middleware/authMiddleware';

const router = Router();

// Resolve controller from DI container
const controller = container.resolve(SubPocketController);

// Apply authentication middleware to all routes
router.use(authMiddleware);

/**
 * POST /api/sub-pockets
 * Create new sub-pocket
 * 
 * Body: CreateSubPocketDTO
 * Response: 201 + SubPocketResponseDTO
 * Errors: 400 (validation), 409 (not in fixed pocket)
 * 
 * Requirements: 8.1, 8.2
 */
router.post('/', (req, res, next) => controller.create(req, res, next));

/**
 * GET /api/sub-pockets
 * Get sub-pockets by pocket or group
 * 
 * Query params: pocketId OR groupId (one required)
 * Response: 200 + SubPocketResponseDTO[]
 * Errors: 400 (missing filter), 404 (not found)
 * 
 * Requirements: 8.3
 */
router.get('/', (req, res, next) => controller.getByFilter(req, res, next));

/**
 * PUT /api/sub-pockets/:id
 * Update sub-pocket
 * 
 * Body: UpdateSubPocketDTO
 * Response: 200 + SubPocketResponseDTO
 * Errors: 400 (validation), 404 (not found)
 * 
 * Requirements: 8.3
 */
router.put('/:id', (req, res, next) => controller.update(req, res, next));

/**
 * DELETE /api/sub-pockets/:id
 * Delete sub-pocket
 * 
 * Response: 204
 * Errors: 404 (not found), 409 (has movements)
 * 
 * Requirements: 8.5
 */
router.delete('/:id', (req, res, next) => controller.delete(req, res, next));

/**
 * POST /api/sub-pockets/:id/toggle
 * Toggle sub-pocket enabled status
 * 
 * Response: 200 + SubPocketResponseDTO
 * Errors: 404 (not found)
 * 
 * Requirements: 8.4
 */
router.post('/:id/toggle', (req, res, next) => controller.toggle(req, res, next));

/**
 * POST /api/sub-pockets/:id/move-to-group
 * Move sub-pocket to group
 * 
 * Body: { groupId: string | null }
 * Response: 200 + SubPocketResponseDTO
 * Errors: 404 (not found)
 * 
 * Requirements: 9.2
 */
router.post('/:id/move-to-group', (req, res, next) => controller.moveToGroup(req, res, next));

/**
 * POST /api/sub-pockets/reorder
 * Reorder sub-pockets
 * 
 * Body: { subPocketIds: string[] }
 * Response: 204
 * Errors: 400 (validation), 404 (not found)
 * 
 * Requirements: 8.6
 */
router.post('/reorder', (req, res, next) => controller.reorder(req, res, next));

export default router;
