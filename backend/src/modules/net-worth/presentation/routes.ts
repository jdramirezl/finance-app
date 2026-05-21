import { Router } from 'express';
import { container } from 'tsyringe';
import { NetWorthController } from './NetWorthController';
import { authMiddleware as requireAuth } from '../../../shared/middleware/authMiddleware';

const router = Router();
const controller = container.resolve(NetWorthController);

router.use(requireAuth);
router.get('/', (req, res, next) => controller.getAll(req, res, next));
router.get('/latest', (req, res, next) => controller.getLatest(req, res, next));
router.post('/', (req, res, next) => controller.create(req, res, next));
router.put('/:id', (req, res, next) => controller.update(req, res, next));
router.delete('/:id', (req, res, next) => controller.delete(req, res, next));

export default router;
