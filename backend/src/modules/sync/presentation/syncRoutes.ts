import { Router } from 'express';
import { container } from 'tsyringe';
import { SyncController } from './syncController';
import { authMiddleware } from '../../../shared/middleware/authMiddleware';

const router = Router();
const controller = container.resolve(SyncController);

router.use(authMiddleware);

router.post('/', (req, res, next) => controller.syncToSheets(req, res, next));

export default router;
