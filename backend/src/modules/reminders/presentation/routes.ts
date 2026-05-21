import { Router } from 'express';
import { container } from 'tsyringe';
import { ReminderController } from './ReminderController';
import { authMiddleware } from '../../../shared/middleware/authMiddleware';

const router = Router();
const controller = container.resolve(ReminderController);

router.use(authMiddleware);

router.get('/', (req, res, next) => controller.getAll(req, res, next));
router.post('/', (req, res, next) => controller.create(req, res, next));
router.put('/:id', (req, res, next) => controller.update(req, res, next));
router.delete('/:id', (req, res, next) => controller.delete(req, res, next));
router.post('/:id/pay', (req, res, next) => controller.markAsPaid(req, res, next));
router.post('/:id/exceptions', (req, res, next) => controller.createException(req, res, next));
router.post('/:id/split', (req, res, next) => controller.splitSeries(req, res, next));

export default router;
