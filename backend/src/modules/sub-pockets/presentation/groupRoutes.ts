/**
 * FixedExpenseGroup Routes
 * 
 * Defines HTTP routes for fixed expense group operations.
 * All routes are protected with authentication middleware.
 * 
 * Requirements: 9.1-9.4
 */

import { Router } from 'express';
import { container } from 'tsyringe';
import { FixedExpenseGroupController } from './FixedExpenseGroupController';
import { authMiddleware } from '../../../shared/middleware/authMiddleware';

const router = Router();

// Resolve controller from DI container
const controller = container.resolve(FixedExpenseGroupController);

// Apply authentication middleware to all routes
router.use(authMiddleware);

/**
 * POST /api/fixed-expense-groups
 * Create new fixed expense group
 * 
 * Body: CreateGroupDTO
 * Response: 201 + GroupResponseDTO
 * Errors: 400 (validation)
 * 
 * Requirements: 9.1
 */
router.post('/', (req, res, next) => controller.create(req, res, next));

/**
 * GET /api/fixed-expense-groups
 * Get all fixed expense groups
 * 
 * Response: 200 + GroupResponseDTO[]
 * 
 * Requirements: 9.1
 */
router.get('/', (req, res, next) => controller.getAll(req, res, next));

/**
 * PUT /api/fixed-expense-groups/:id
 * Update fixed expense group
 * 
 * Body: UpdateGroupDTO
 * Response: 200 + GroupResponseDTO
 * Errors: 400 (validation), 404 (not found)
 * 
 * Requirements: 9.1
 */
router.put('/:id', (req, res, next) => controller.update(req, res, next));

/**
 * DELETE /api/fixed-expense-groups/:id
 * Delete fixed expense group (moves sub-pockets to default)
 * 
 * Response: 204
 * Errors: 404 (not found)
 * 
 * Requirements: 9.3
 */
router.delete('/:id', (req, res, next) => controller.delete(req, res, next));

/**
 * POST /api/fixed-expense-groups/reorder
 * Reorder fixed expense groups
 * 
 * Body: { ids: string[] }
 * Response: 200
 * 
 * Requirements: 9.1
 */
router.post('/reorder', (req, res, next) => controller.reorder(req, res, next));

/**
 * POST /api/fixed-expense-groups/:id/toggle
 * Toggle group and all sub-pockets
 * 
 * Response: 200 + GroupResponseDTO
 * Errors: 404 (not found)
 * 
 * Requirements: 9.4
 */
router.post('/:id/toggle', (req, res, next) => controller.toggle(req, res, next));

export default router;
