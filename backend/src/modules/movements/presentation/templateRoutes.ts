import { Router } from 'express';
import { container } from 'tsyringe';
import { TemplateController } from './TemplateController';
import { authMiddleware } from '../../../shared/middleware/authMiddleware';
import { validateBody } from '../../../shared/middleware/validate';
import { createTemplateSchema, updateTemplateSchema } from './templateSchemas';

const router = Router();
const controller = container.resolve(TemplateController);

router.use(authMiddleware);
router.get('/', (req, res, next) => controller.getAll(req, res, next));
router.get('/:id', (req, res, next) => controller.getById(req, res, next));
router.post('/', validateBody(createTemplateSchema), (req, res, next) => controller.create(req, res, next));
router.put('/:id', validateBody(updateTemplateSchema), (req, res, next) => controller.update(req, res, next));
router.delete('/:id', (req, res, next) => controller.delete(req, res, next));

export default router;
