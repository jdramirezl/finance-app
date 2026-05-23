import { Request, Response, NextFunction } from 'express';
import { injectable, inject } from 'tsyringe';
import { GetAllSnapshotsUseCase } from '../application/useCases/GetAllSnapshotsUseCase';
import { GetLatestSnapshotUseCase } from '../application/useCases/GetLatestSnapshotUseCase';
import { CreateSnapshotUseCase } from '../application/useCases/CreateSnapshotUseCase';
import { UpdateSnapshotUseCase } from '../application/useCases/UpdateSnapshotUseCase';
import { DeleteSnapshotUseCase } from '../application/useCases/DeleteSnapshotUseCase';

@injectable()
export class NetWorthController {
  constructor(
    @inject(GetAllSnapshotsUseCase) private getAllUseCase: GetAllSnapshotsUseCase,
    @inject(GetLatestSnapshotUseCase) private getLatestUseCase: GetLatestSnapshotUseCase,
    @inject(CreateSnapshotUseCase) private createUseCase: CreateSnapshotUseCase,
    @inject(UpdateSnapshotUseCase) private updateUseCase: UpdateSnapshotUseCase,
    @inject(DeleteSnapshotUseCase) private deleteUseCase: DeleteSnapshotUseCase
  ) {}

  async getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }
      const snapshots = await this.getAllUseCase.execute(userId);
      res.json(snapshots);
    } catch (error) {
      next(error);
    }
  }

  async getLatest(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }
      const snapshot = await this.getLatestUseCase.execute(userId);
      res.json(snapshot);
    } catch (error) {
      next(error);
    }
  }

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }
      const snapshot = await this.createUseCase.execute(userId, req.body);
      res.status(201).json(snapshot);
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }
      const { id } = req.params;
      const snapshot = await this.updateUseCase.execute(id, req.body, userId);
      res.json(snapshot);
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }
      const { id } = req.params;
      await this.deleteUseCase.execute(id, userId);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
}
