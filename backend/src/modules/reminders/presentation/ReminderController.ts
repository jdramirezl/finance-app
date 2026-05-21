import { Request, Response, NextFunction } from 'express';
import { injectable, inject } from 'tsyringe';
import { GetAllRemindersUseCase } from '../application/useCases/GetAllRemindersUseCase';
import { CreateReminderUseCase } from '../application/useCases/CreateReminderUseCase';
import { UpdateReminderUseCase } from '../application/useCases/UpdateReminderUseCase';
import { DeleteReminderUseCase } from '../application/useCases/DeleteReminderUseCase';
import { MarkReminderAsPaidUseCase } from '../application/useCases/MarkReminderAsPaidUseCase';
import { CreateReminderExceptionUseCase } from '../application/useCases/CreateReminderExceptionUseCase';
import { SplitReminderSeriesUseCase } from '../application/useCases/SplitReminderSeriesUseCase';

@injectable()
export class ReminderController {
  constructor(
    @inject(GetAllRemindersUseCase) private getAllUseCase: GetAllRemindersUseCase,
    @inject(CreateReminderUseCase) private createUseCase: CreateReminderUseCase,
    @inject(UpdateReminderUseCase) private updateUseCase: UpdateReminderUseCase,
    @inject(DeleteReminderUseCase) private deleteUseCase: DeleteReminderUseCase,
    @inject(MarkReminderAsPaidUseCase) private markAsPaidUseCase: MarkReminderAsPaidUseCase,
    @inject(CreateReminderExceptionUseCase) private createExceptionUseCase: CreateReminderExceptionUseCase,
    @inject(SplitReminderSeriesUseCase) private splitSeriesUseCase: SplitReminderSeriesUseCase
  ) {}

  async getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }

      const reminders = await this.getAllUseCase.execute(userId);
      res.json(reminders);
    } catch (error) {
      next(error);
    }
  }

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }

      const reminder = await this.createUseCase.execute(userId, req.body);
      res.status(201).json(reminder);
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }

      const reminder = await this.updateUseCase.execute(req.params.id, req.body, userId);
      res.json(reminder);
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

  async markAsPaid(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }

      const reminder = await this.markAsPaidUseCase.execute(req.params.id, userId, req.body.movementId);
      res.json(reminder);
    } catch (error) {
      next(error);
    }
  }

  async createException(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }

      const exceptionData = { ...req.body, reminderId: req.params.id };
      const exception = await this.createExceptionUseCase.execute(exceptionData, userId);
      res.status(201).json(exception);
    } catch (error) {
      next(error);
    }
  }

  async splitSeries(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }

      const { splitDate, newDetails } = req.body;
      const result = await this.splitSeriesUseCase.execute(userId, req.params.id, splitDate, newDetails);
      res.status(200).json(result || { message: 'Series ended' });
    } catch (error) {
      next(error);
    }
  }
}
