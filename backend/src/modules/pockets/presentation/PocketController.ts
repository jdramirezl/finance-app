/**
 * Pocket Controller
 * 
 * Handles HTTP requests for pocket operations.
 * Delegates business logic to use cases.
 * 
 * Requirements: 6.1-6.6, 7.1-7.4
 */

import { Request, Response, NextFunction } from 'express';
import { injectable, inject } from 'tsyringe';
import { CreatePocketUseCase } from '../application/useCases/CreatePocketUseCase';
import { GetPocketsByAccountUseCase } from '../application/useCases/GetPocketsByAccountUseCase';
import { GetPocketByIdUseCase } from '../application/useCases/GetPocketByIdUseCase';
import { UpdatePocketUseCase } from '../application/useCases/UpdatePocketUseCase';
import { DeletePocketUseCase } from '../application/useCases/DeletePocketUseCase';
import { MigrateFixedPocketUseCase } from '../application/useCases/MigrateFixedPocketUseCase';
import { ReorderPocketsUseCase } from '../application/useCases/ReorderPocketsUseCase';
import type { CreatePocketDTO, UpdatePocketDTO, MigratePocketDTO } from '../application/dtos/PocketDTO';
import type { ReorderPocketsDTO } from '../application/useCases/ReorderPocketsUseCase';

@injectable()
export class PocketController {
  constructor(
    @inject(CreatePocketUseCase) private createPocketUseCase: CreatePocketUseCase,
    @inject(GetPocketsByAccountUseCase) private getPocketsByAccountUseCase: GetPocketsByAccountUseCase,
    @inject(GetPocketByIdUseCase) private getPocketByIdUseCase: GetPocketByIdUseCase,
    @inject(UpdatePocketUseCase) private updatePocketUseCase: UpdatePocketUseCase,
    @inject(DeletePocketUseCase) private deletePocketUseCase: DeletePocketUseCase,
    @inject(MigrateFixedPocketUseCase) private migrateFixedPocketUseCase: MigrateFixedPocketUseCase,
    @inject(ReorderPocketsUseCase) private reorderPocketsUseCase: ReorderPocketsUseCase
  ) {}

  /**
   * Create new pocket
   * POST /api/pockets
   * 
   * Requirements: 6.1, 6.2, 6.3
   */
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const dto: CreatePocketDTO = req.body;
      const pocket = await this.createPocketUseCase.execute(dto, userId);

      res.status(201).json(pocket);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get pockets by account
   * GET /api/pockets?accountId=xxx
   * 
   * Requirements: 6.4
   */
  async getByAccount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const accountId = req.query.accountId as string;
      if (!accountId) {
        res.status(400).json({ error: 'Account ID is required' });
        return;
      }

      const pockets = await this.getPocketsByAccountUseCase.execute(accountId, userId);

      res.status(200).json(pockets);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get pocket by ID
   * GET /api/pockets/:id
   * 
   * Requirements: 6.4
   */
  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const pocketId = req.params.id;
      const pocket = await this.getPocketByIdUseCase.execute(pocketId, userId);

      res.status(200).json(pocket);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update pocket
   * PUT /api/pockets/:id
   * 
   * Requirements: 6.1
   */
  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const pocketId = req.params.id;
      const dto: UpdatePocketDTO = req.body;
      const pocket = await this.updatePocketUseCase.execute(pocketId, dto, userId);

      res.status(200).json(pocket);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete pocket (orphans movements)
   * DELETE /api/pockets/:id
   * 
   * Requirements: 6.5
   */
  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const pocketId = req.params.id;
      await this.deletePocketUseCase.execute(pocketId, userId);

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  /**
   * Migrate fixed pocket to new account
   * POST /api/pockets/:id/migrate
   * Body: { targetAccountId: string }
   * 
   * Requirements: 7.1, 7.2, 7.3, 7.4
   */
  async migrate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const pocketId = req.params.id;
      const dto: MigratePocketDTO = req.body;
      const pocket = await this.migrateFixedPocketUseCase.execute(pocketId, dto, userId);

      res.status(200).json(pocket);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Reorder pockets within account
   * POST /api/pockets/reorder
   * Body: { pocketIds: string[] }
   * 
   * Requirements: 6.6
   */
  async reorder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const dto: ReorderPocketsDTO = req.body;
      await this.reorderPocketsUseCase.execute(dto, userId);

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
}
