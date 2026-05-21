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
import { GetAllMovementsUseCase } from '../application/useCases/GetAllMovementsUseCase';
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
import { CreateTransferUseCase } from '../application/useCases/CreateTransferUseCase';
import { DeleteMovementsByAccountUseCase } from '../application/useCases/DeleteMovementsByAccountUseCase';
import { DeleteMovementsByPocketUseCase } from '../application/useCases/DeleteMovementsByPocketUseCase';
import {
  MarkMovementsAsOrphanedUseCase,
  type MarkMovementsAsOrphanedDTO,
} from '../application/useCases/MarkMovementsAsOrphanedUseCase';
import {
  UpdateMovementsAccountForPocketUseCase,
  type UpdateMovementsAccountForPocketDTO,
} from '../application/useCases/UpdateMovementsAccountForPocketUseCase';
import type { CreateMovementDTO, UpdateMovementDTO } from '../application/dtos/MovementDTO';

@injectable()
export class MovementController {
  constructor(
    @inject(CreateMovementUseCase) private createMovementUseCase: CreateMovementUseCase,
    @inject(GetAllMovementsUseCase) private getAllMovementsUseCase: GetAllMovementsUseCase,
    @inject(GetMovementsByAccountUseCase) private getMovementsByAccountUseCase: GetMovementsByAccountUseCase,
    @inject(GetMovementsByPocketUseCase) private getMovementsByPocketUseCase: GetMovementsByPocketUseCase,
    @inject(GetMovementsByMonthUseCase) private getMovementsByMonthUseCase: GetMovementsByMonthUseCase,
    @inject(GetPendingMovementsUseCase) private getPendingMovementsUseCase: GetPendingMovementsUseCase,
    @inject(GetOrphanedMovementsUseCase) private getOrphanedMovementsUseCase: GetOrphanedMovementsUseCase,
    @inject(UpdateMovementUseCase) private updateMovementUseCase: UpdateMovementUseCase,
    @inject(DeleteMovementUseCase) private deleteMovementUseCase: DeleteMovementUseCase,
    @inject(ApplyPendingMovementUseCase) private applyPendingMovementUseCase: ApplyPendingMovementUseCase,
    @inject(MarkAsPendingUseCase) private markAsPendingUseCase: MarkAsPendingUseCase,
    @inject(RestoreOrphanedMovementsUseCase) private restoreOrphanedMovementsUseCase: RestoreOrphanedMovementsUseCase,
    @inject(CreateTransferUseCase) private createTransferUseCase: CreateTransferUseCase,
    @inject(DeleteMovementsByAccountUseCase) private deleteMovementsByAccountUseCase: DeleteMovementsByAccountUseCase,
    @inject(DeleteMovementsByPocketUseCase) private deleteMovementsByPocketUseCase: DeleteMovementsByPocketUseCase,
    @inject(MarkMovementsAsOrphanedUseCase) private markMovementsAsOrphanedUseCase: MarkMovementsAsOrphanedUseCase,
    @inject(UpdateMovementsAccountForPocketUseCase) private updateMovementsAccountForPocketUseCase: UpdateMovementsAccountForPocketUseCase
  ) { }

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
   * Create transfer (two movements)
   * POST /api/movements/transfer
   */
  async createTransfer(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const dto = req.body;
      const result = await this.createTransferUseCase.execute(dto, userId);

      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get movements with optional filters and pagination
   * GET /api/movements
   *
   * Query params (all optional):
   *   - accountId: filter by account
   *   - pocketId:  filter by pocket
   *   - year + month: return movements for that month (year+month grouped result)
   *   - pending:   filter by pending status (true/false)
   *   - page:      1-based page number (default 1)
   *   - limit:     page size (default 50, max 200)
   *
   * Routing:
   *   - accountId provided  -> GetMovementsByAccountUseCase, returns Movement[]
   *   - pocketId provided   -> GetMovementsByPocketUseCase, returns Movement[]
   *   - year+month provided -> GetMovementsByMonthUseCase, returns { year, month, movements }
   *   - no filter           -> GetAllMovementsUseCase, returns { data, total, page, limit, hasMore }
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

      const { accountId, pocketId, month, pending, year, page, limit } = req.query;

      // Build pagination options for the filtered branches. The filtered
      // branches preserve their existing array response shape and only
      // honor pagination when both page and limit are provided so callers
      // that already work today are not surprised.
      const pagination = {
        limit: limit ? parseInt(limit as string, 10) : undefined,
        offset: (page && limit)
          ? (parseInt(page as string, 10) - 1) * parseInt(limit as string, 10)
          : undefined,
      };

      // Route to the appropriate use case based on which filters were supplied.
      if (accountId) {
        const filters = {
          isPending: pending === 'true' ? true : pending === 'false' ? false : undefined,
          year: year ? parseInt(year as string, 10) : undefined,
          month: month ? parseInt(month as string, 10) : undefined,
        };
        const movements = await this.getMovementsByAccountUseCase.execute(
          accountId as string,
          userId,
          filters,
          pagination
        );
        res.status(200).json(movements);
        return;
      }

      if (pocketId) {
        const filters = {
          isPending: pending === 'true' ? true : pending === 'false' ? false : undefined,
          year: year ? parseInt(year as string, 10) : undefined,
          month: month ? parseInt(month as string, 10) : undefined,
        };
        const movements = await this.getMovementsByPocketUseCase.execute(
          pocketId as string,
          userId,
          filters,
          pagination
        );
        res.status(200).json(movements);
        return;
      }

      if (year && month) {
        const yearNum = parseInt(year as string, 10);
        const monthNum = parseInt(month as string, 10);
        const result = await this.getMovementsByMonthUseCase.execute(
          yearNum,
          monthNum,
          userId
        );
        res.status(200).json(result);
        return;
      }

      // No filter provided -> return a paginated list of every movement
      // for the authenticated user.
      const pageNum = page !== undefined ? parseInt(page as string, 10) : undefined;
      const limitNum = limit !== undefined ? parseInt(limit as string, 10) : undefined;

      const result = await this.getAllMovementsUseCase.execute(userId, {
        page: pageNum,
        limit: limitNum,
      });
      res.status(200).json(result);
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

  /**
   * Bulk-delete every movement for an account
   * DELETE /api/movements/by-account/:accountId
   *
   * Response: 200 + { count: number }
   */
  async deleteByAccount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const accountId = req.params.accountId;
      const result = await this.deleteMovementsByAccountUseCase.execute(accountId, userId);

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Bulk-delete every movement for a pocket
   * DELETE /api/movements/by-pocket/:pocketId
   *
   * Response: 200 + { count: number }
   */
  async deleteByPocket(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const pocketId = req.params.pocketId;
      const result = await this.deleteMovementsByPocketUseCase.execute(pocketId, userId);

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Mark every movement attached to an account or pocket as orphaned
   * POST /api/movements/mark-orphaned
   *
   * Body: { entityId: string, entityType: 'account' | 'pocket' }
   * Response: 200 + { count: number }
   */
  async markOrphaned(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const dto: MarkMovementsAsOrphanedDTO = req.body;
      const result = await this.markMovementsAsOrphanedUseCase.execute(dto, userId);

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Bulk-update the account_id for every movement in a pocket
   * POST /api/movements/update-account
   *
   * Body: { pocketId: string, newAccountId: string }
   * Response: 200 + { count: number }
   */
  async updateAccountForPocket(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const dto: UpdateMovementsAccountForPocketDTO = req.body;
      const result = await this.updateMovementsAccountForPocketUseCase.execute(dto, userId);

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}
