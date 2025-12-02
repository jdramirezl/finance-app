/**
 * Movement Controller
 * 
 * Handles HTTP requests for movement operations.
 * Delegates business logic to use cases.
 * 
 * Requirements: 10.1-10.7, 11.1-11.3, 12.1-12.5
 */

import { Request, Response, NextFunction } from 'express';
import { injectable, inject } from 'tsyringe';
import { CreateMovementUseCase } from '../application/useCases/CreateMovementUseCase';
import { GetMovementsByAccountUseCase } from '../application/useCases/GetMovementsByAccountUseCase';
import { GetMovementsByPocketUseCase } from '../application/useCases/GetMovementsByPocketUseCase';
import { GetMovementsByMonthUseCase } from '../application/useCases/GetMovementsByMonthUseCase';
import { GetPendingMovementsUseCase } from '../application/useCases/GetPendingMovementsUseCase';
import { GetOrphanedMovementsUseCase } from '../application/useCases/GetOrphanedMovementsUseCase';
import { UpdateMovementUseCase } from '../application/useCases/UpdateMovementUseCase';
import { DeleteMovementUseCase } from '../application/useCases/DeleteMovementUseCase';
import { ApplyPendingMovementUseCase } from '../application/useCases/ApplyPendingMovementUseCase';
import { MarkAsPendingUseCase } from '../application/useCases/MarkAsPendingUseCase';
import { RestoreOrphanedMovementsUseCase } from '../application/useCases/RestoreOrphanedMovementsUseCase';
import type { CreateMovementDTO, UpdateMovementDTO } from '../application/dtos/MovementDTO';

@injectable()
export class MovementController {
  constructor(
    @inject(CreateMovementUseCase) private createMovementUseCase: CreateMovementUseCase,
    @inject(GetMovementsByAccountUseCase) private getMovementsByAccountUseCase: GetMovementsByAccountUseCase,
    @inject(GetMovementsByPocketUseCase) private getMovementsByPocketUseCase: GetMovementsByPocketUseCase,
    @inject(GetMovementsByMonthUseCase) private getMovementsByMonthUseCase: GetMovementsByMonthUseCase,
    @inject(GetPendingMovementsUseCase) private getPendingMovementsUseCase: GetPendingMovementsUseCase,
    @inject(GetOrphanedMovementsUseCase) private getOrphanedMovementsUseCase: GetOrphanedMovementsUseCase,
    @inject(UpdateMovementUseCase) private updateMovementUseCase: UpdateMovementUseCase,
    @inject(DeleteMovementUseCase) private deleteMovementUseCase: DeleteMovementUseCase,
    @inject(ApplyPendingMovementUseCase) private applyPendingMovementUseCase: ApplyPendingMovementUseCase,
    @inject(MarkAsPendingUseCase) private markAsPendingUseCase: MarkAsPendingUseCase,
    @inject(RestoreOrphanedMovementsUseCase) private restoreOrphanedMovementsUseCase: RestoreOrphanedMovementsUseCase
  ) {}

  /**
   * Create new movement
   * POST /api/movements
   * 
   * Requirements: 10.1, 10.2, 10.3, 10.4
   */
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const dto: CreateMovementDTO = req.body;
      const movement = await this.createMovementUseCase.execute(dto, userId);

      res.status(201).json(movement);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get movements with filters
   * GET /api/movements?accountId=xxx&pocketId=xxx&month=2024-11&pending=true
   * 
   * Requirements: 10.5
   */
  async getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { accountId, pocketId, month, pending, year } = req.query;

      // Route to appropriate use case based on query parameters
      if (accountId) {
        const filters = {
          isPending: pending === 'true' ? true : pending === 'false' ? false : undefined,
          year: year ? parseInt(year as string) : undefined,
          month: month ? parseInt(month as string) : undefined,
        };
        const movements = await this.getMovementsByAccountUseCase.execute(
          accountId as string,
          userId,
          filters
        );
        res.status(200).json(movements);
      } else if (pocketId) {
        const filters = {
          isPending: pending === 'true' ? true : pending === 'false' ? false : undefined,
          year: year ? parseInt(year as string) : undefined,
          month: month ? parseInt(month as string) : undefined,
        };
        const movements = await this.getMovementsByPocketUseCase.execute(
          pocketId as string,
          userId,
          filters
        );
        res.status(200).json(movements);
      } else if (year && month) {
        const yearNum = parseInt(year as string);
        const monthNum = parseInt(month as string);
        const result = await this.getMovementsByMonthUseCase.execute(
          yearNum,
          monthNum,
          userId
        );
        res.status(200).json(result);
      } else {
        res.status(400).json({ error: 'At least one filter parameter is required (accountId, pocketId, or year+month)' });
      }
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get pending movements
   * GET /api/movements/pending
   * 
   * Requirements: 11.3
   */
  async getPending(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const movements = await this.getPendingMovementsUseCase.execute(userId);

      res.status(200).json(movements);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get orphaned movements
   * GET /api/movements/orphaned
   * 
   * Requirements: 12.1
   */
  async getOrphaned(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const movements = await this.getOrphanedMovementsUseCase.execute(userId);

      res.status(200).json(movements);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update movement
   * PUT /api/movements/:id
   * 
   * Requirements: 10.6
   */
  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const movementId = req.params.id;
      const dto: UpdateMovementDTO = req.body;
      const movement = await this.updateMovementUseCase.execute(movementId, dto, userId);

      res.status(200).json(movement);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete movement
   * DELETE /api/movements/:id
   * 
   * Requirements: 10.7
   */
  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const movementId = req.params.id;
      await this.deleteMovementUseCase.execute(movementId, userId);

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  /**
   * Apply pending movement
   * POST /api/movements/:id/apply
   * 
   * Requirements: 11.1
   */
  async applyPending(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const movementId = req.params.id;
      const movement = await this.applyPendingMovementUseCase.execute(movementId, userId);

      res.status(200).json(movement);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Mark movement as pending
   * POST /api/movements/:id/mark-pending
   * 
   * Requirements: 11.2
   */
  async markAsPending(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const movementId = req.params.id;
      const movement = await this.markAsPendingUseCase.execute(movementId, userId);

      res.status(200).json(movement);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Restore orphaned movements
   * POST /api/movements/restore-orphaned
   * 
   * Requirements: 12.2, 12.3, 12.4, 12.5
   */
  async restoreOrphaned(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const result = await this.restoreOrphanedMovementsUseCase.execute(userId);

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}
