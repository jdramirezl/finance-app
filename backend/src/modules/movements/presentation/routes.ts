/**
 * Movement Routes
 * 
 * Defines HTTP routes for movement operations.
 * All routes are protected with authentication middleware.
 * 
 * Requirements: 10.1-10.7, 11.1-11.3, 12.1-12.5
 */

import { Router } from 'express';
import { container } from 'tsyringe';
import { MovementController } from './MovementController';
import { authMiddleware } from '../../../shared/middleware/authMiddleware';

const router = Router();

// Resolve controller from DI container
const controller = container.resolve(MovementController);

// Apply authentication middleware to all routes
router.use(authMiddleware);

/**
 * POST /api/movements
 * Create new movement
 * 
 * Body: CreateMovementDTO
 * Response: 201 + MovementResponseDTO
 * Errors: 400 (validation), 404 (invalid references)
 * 
 * Requirements: 10.1, 10.2, 10.3, 10.4
 */
router.post('/', (req, res, next) => controller.create(req, res, next));

/**
 * POST /api/movements/batch
 * Atomically create multiple movements
 * 
 * Body: { movements: BatchMovementParams[] }
 * Response: 201 + MovementResponseDTO[]
 */
router.post('/batch', (req, res, next) => controller.batchCreate(req, res, next));

/**
 * POST /api/movements/transfer
 * Create transfer (two movements)
 * 
 * Body: CreateTransferDTO
 * Response: 201 + { expense: Movement, income: Movement }
 */
router.post('/transfer', (req, res, next) => controller.createTransfer(req, res, next));

/**
 * GET /api/movements
 * Get movements with optional filters and pagination.
 *
 * Query params (all optional):
 *   - accountId: filter by account
 *   - pocketId:  filter by pocket
 *   - year + month: return movements for that month
 *   - pending:   filter by pending status (true/false)
 *   - page:      1-based page number (default 1, no-filter branch only)
 *   - limit:     page size (default 50, max 200, no-filter branch only)
 *
 * Response shape depends on which filter (if any) was provided:
 *   - accountId  -> 200 + MovementResponseDTO[]
 *   - pocketId   -> 200 + MovementResponseDTO[]
 *   - year+month -> 200 + { year, month, movements: MovementResponseDTO[] }
 *   - no filter  -> 200 + PaginatedMovementsDTO
 *                   { data, total, page, limit, hasMore }
 *
 * Errors: 400 (invalid pagination), 404 (not found)
 *
 * Requirements: 10.5
 */
router.get('/', (req, res, next) => controller.getAll(req, res, next));

/**
 * GET /api/movements/pending
 * Get pending movements
 * 
 * Response: 200 + MovementResponseDTO[]
 * 
 * Requirements: 11.3
 */
router.get('/pending', (req, res, next) => controller.getPending(req, res, next));

/**
 * GET /api/movements/orphaned
 * Get orphaned movements
 * 
 * Response: 200 + MovementResponseDTO[]
 * 
 * Requirements: 12.1
 */
router.get('/orphaned', (req, res, next) => controller.getOrphaned(req, res, next));

/**
 * POST /api/movements/restore-orphaned
 * Restore orphaned movements
 * 
 * Response: 200 + { restored: number, failed: number }
 * 
 * Requirements: 12.2, 12.3, 12.4, 12.5
 */
router.post('/restore-orphaned', (req, res, next) => controller.restoreOrphaned(req, res, next));

/**
 * DELETE /api/movements/by-account/:accountId
 * Bulk-delete every movement for an account
 *
 * Response: 200 + { count: number }
 */
router.delete('/by-account/:accountId', (req, res, next) => controller.deleteByAccount(req, res, next));

/**
 * DELETE /api/movements/by-pocket/:pocketId
 * Bulk-delete every movement for a pocket
 *
 * Response: 200 + { count: number }
 */
router.delete('/by-pocket/:pocketId', (req, res, next) => controller.deleteByPocket(req, res, next));

/**
 * POST /api/movements/mark-orphaned
 * Mark every movement attached to an account or pocket as orphaned
 *
 * Body: { entityId: string, entityType: 'account' | 'pocket' }
 * Response: 200 + { count: number }
 */
router.post('/mark-orphaned', (req, res, next) => controller.markOrphaned(req, res, next));

/**
 * POST /api/movements/update-account
 * Bulk-update the account_id for every movement in a pocket
 *
 * Body: { pocketId: string, newAccountId: string }
 * Response: 200 + { count: number }
 */
router.post('/update-account', (req, res, next) => controller.updateAccountForPocket(req, res, next));

/**
 * PUT /api/movements/:id
 * Update movement
 * 
 * Body: UpdateMovementDTO
 * Response: 200 + MovementResponseDTO
 * Errors: 400 (validation), 404 (not found)
 * 
 * Requirements: 10.6
 */
router.put('/:id', (req, res, next) => controller.update(req, res, next));

/**
 * DELETE /api/movements/:id
 * Delete movement
 * 
 * Response: 204
 * Errors: 404 (not found)
 * 
 * Requirements: 10.7
 */
router.delete('/:id', (req, res, next) => controller.delete(req, res, next));

/**
 * POST /api/movements/:id/apply
 * Apply pending movement
 * 
 * Response: 200 + MovementResponseDTO
 * Errors: 404 (not found), 400 (not pending)
 * 
 * Requirements: 11.1
 */
router.post('/:id/apply', (req, res, next) => controller.applyPending(req, res, next));

/**
 * POST /api/movements/:id/mark-pending
 * Mark movement as pending
 * 
 * Response: 200 + MovementResponseDTO
 * Errors: 404 (not found), 400 (already pending)
 * 
 * Requirements: 11.2
 */
router.post('/:id/mark-pending', (req, res, next) => controller.markAsPending(req, res, next));

export default router;
