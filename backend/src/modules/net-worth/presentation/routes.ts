/**
 * NetWorthSnapshot Routes
 */

import { Router } from 'express';
import { NetWorthSnapshotController } from '../interfaces/NetWorthSnapshotController';
import { NetWorthSnapshotService } from '../application/NetWorthSnapshotService';
import { SupabaseNetWorthSnapshotRepository } from '../infrastructure/SupabaseNetWorthSnapshotRepository';
import { authMiddleware as requireAuth } from '../../../shared/middleware/authMiddleware';

const router = Router();

// Initialize dependencies
const repository = new SupabaseNetWorthSnapshotRepository();
const service = new NetWorthSnapshotService(repository);
const controller = new NetWorthSnapshotController(service);

// Apply auth middleware to all routes
router.use(requireAuth);

// Routes
router.get('/', controller.getAll);
router.get('/latest', controller.getLatest);
router.post('/', controller.create);
router.delete('/:id', controller.delete);

export default router;
