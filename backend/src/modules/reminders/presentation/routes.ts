import { Router } from 'express';
import { container } from 'tsyringe';
import { ReminderController } from '../interfaces/ReminderController';
import { authMiddleware as requireAuth } from '../../../shared/middleware/authMiddleware';

const router = Router();
const controller = container.resolve(ReminderController);

router.use(requireAuth);

router.get('/', controller.getAll);
router.post('/', controller.create);
router.put('/:id', controller.update);
router.delete('/:id', controller.delete);
router.post('/:id/pay', controller.markAsPaid);
router.post('/:id/exceptions', controller.createException);
router.post('/:id/split', controller.splitSeries);

export default router;
