import { Request, Response, NextFunction } from 'express';
import { injectable, inject } from 'tsyringe';
import { GetAllTemplatesUseCase } from '../application/useCases/GetAllTemplatesUseCase';
import { GetTemplateByIdUseCase } from '../application/useCases/GetTemplateByIdUseCase';
import { CreateTemplateUseCase } from '../application/useCases/CreateTemplateUseCase';
import { UpdateTemplateUseCase } from '../application/useCases/UpdateTemplateUseCase';
import { DeleteTemplateUseCase } from '../application/useCases/DeleteTemplateUseCase';

@injectable()
export class TemplateController {
  constructor(
    @inject(GetAllTemplatesUseCase) private getAllUseCase: GetAllTemplatesUseCase,
    @inject(GetTemplateByIdUseCase) private getByIdUseCase: GetTemplateByIdUseCase,
    @inject(CreateTemplateUseCase) private createUseCase: CreateTemplateUseCase,
    @inject(UpdateTemplateUseCase) private updateUseCase: UpdateTemplateUseCase,
    @inject(DeleteTemplateUseCase) private deleteUseCase: DeleteTemplateUseCase
  ) {}

  async getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }
      const templates = await this.getAllUseCase.execute(userId);
      res.json(templates);
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }
      const template = await this.getByIdUseCase.execute(req.params.id, userId);
      res.json(template);
    } catch (error) {
      next(error);
    }
  }

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }
      const template = await this.createUseCase.execute(req.body, userId);
      res.status(201).json(template);
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }
      const template = await this.updateUseCase.execute(req.params.id, req.body, userId);
      res.json(template);
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }
      await this.deleteUseCase.execute(req.params.id, userId);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
}
