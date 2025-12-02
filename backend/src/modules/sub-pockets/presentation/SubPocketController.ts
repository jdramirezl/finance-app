/**
 * SubPocket Controller
 * 
 * Handles HTTP requests for sub-pocket operations.
 * Delegates business logic to use cases.
 * 
 * Requirements: 8.1-8.6
 */

import { Request, Response, NextFunction } from 'express';
import { injectable, inject } from 'tsyringe';
import { CreateSubPocketUseCase } from '../application/useCases/CreateSubPocketUseCase';
import { GetSubPocketsByPocketUseCase } from '../application/useCases/GetSubPocketsByPocketUseCase';
import { GetSubPocketsByGroupUseCase } from '../application/useCases/GetSubPocketsByGroupUseCase';
import { UpdateSubPocketUseCase } from '../application/useCases/UpdateSubPocketUseCase';
import { DeleteSubPocketUseCase } from '../application/useCases/DeleteSubPocketUseCase';
import { ToggleSubPocketEnabledUseCase } from '../application/useCases/ToggleSubPocketEnabledUseCase';
import { MoveSubPocketToGroupUseCase } from '../application/useCases/MoveSubPocketToGroupUseCase';
import { ReorderSubPocketsUseCase } from '../application/useCases/ReorderSubPocketsUseCase';
import type { CreateSubPocketDTO, UpdateSubPocketDTO } from '../application/dtos/SubPocketDTO';

interface MoveToGroupDTO {
  groupId: string | null;
}

interface ReorderSubPocketsDTO {
  subPocketIds: string[];
}

@injectable()
export class SubPocketController {
  constructor(
    @inject(CreateSubPocketUseCase) private createSubPocketUseCase: CreateSubPocketUseCase,
    @inject(GetSubPocketsByPocketUseCase) private getSubPocketsByPocketUseCase: GetSubPocketsByPocketUseCase,
    @inject(GetSubPocketsByGroupUseCase) private getSubPocketsByGroupUseCase: GetSubPocketsByGroupUseCase,
    @inject(UpdateSubPocketUseCase) private updateSubPocketUseCase: UpdateSubPocketUseCase,
    @inject(DeleteSubPocketUseCase) private deleteSubPocketUseCase: DeleteSubPocketUseCase,
    @inject(ToggleSubPocketEnabledUseCase) private toggleSubPocketEnabledUseCase: ToggleSubPocketEnabledUseCase,
    @inject(MoveSubPocketToGroupUseCase) private moveSubPocketToGroupUseCase: MoveSubPocketToGroupUseCase,
    @inject(ReorderSubPocketsUseCase) private reorderSubPocketsUseCase: ReorderSubPocketsUseCase
  ) {}

  /**
   * Create new sub-pocket
   * POST /api/sub-pockets
   * 
   * Requirements: 8.1, 8.2
   */
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const dto: CreateSubPocketDTO = req.body;
      const subPocket = await this.createSubPocketUseCase.execute(dto, userId);

      res.status(201).json(subPocket);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get sub-pockets by pocket or group
   * GET /api/sub-pockets?pocketId=xxx
   * GET /api/sub-pockets?groupId=xxx
   * 
   * Requirements: 8.3
   */
  async getByFilter(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const pocketId = req.query.pocketId as string;
      const groupId = req.query.groupId as string;

      if (pocketId) {
        const subPockets = await this.getSubPocketsByPocketUseCase.execute(pocketId, userId);
        res.status(200).json(subPockets);
        return;
      }

      if (groupId) {
        const subPockets = await this.getSubPocketsByGroupUseCase.execute(groupId, userId);
        res.status(200).json(subPockets);
        return;
      }

      res.status(400).json({ error: 'Either pocketId or groupId is required' });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update sub-pocket
   * PUT /api/sub-pockets/:id
   * 
   * Requirements: 8.3
   */
  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const subPocketId = req.params.id;
      const dto: UpdateSubPocketDTO = req.body;
      const subPocket = await this.updateSubPocketUseCase.execute(subPocketId, dto, userId);

      res.status(200).json(subPocket);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete sub-pocket
   * DELETE /api/sub-pockets/:id
   * 
   * Requirements: 8.5
   */
  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const subPocketId = req.params.id;
      await this.deleteSubPocketUseCase.execute(subPocketId, userId);

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  /**
   * Toggle sub-pocket enabled status
   * POST /api/sub-pockets/:id/toggle
   * 
   * Requirements: 8.4
   */
  async toggle(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const subPocketId = req.params.id;
      const subPocket = await this.toggleSubPocketEnabledUseCase.execute(subPocketId, userId);

      res.status(200).json(subPocket);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Move sub-pocket to group
   * POST /api/sub-pockets/:id/move-to-group
   * Body: { groupId: string | null }
   * 
   * Requirements: 9.2
   */
  async moveToGroup(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const subPocketId = req.params.id;
      const dto: MoveToGroupDTO = req.body;
      // Convert null to undefined for the use case
      const groupId = dto.groupId === null ? undefined : dto.groupId;
      const subPocket = await this.moveSubPocketToGroupUseCase.execute(subPocketId, groupId, userId);

      res.status(200).json(subPocket);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Reorder sub-pockets
   * POST /api/sub-pockets/reorder
   * Body: { subPocketIds: string[] }
   * 
   * Requirements: 8.6
   */
  async reorder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const dto: ReorderSubPocketsDTO = req.body;
      await this.reorderSubPocketsUseCase.execute(dto.subPocketIds, userId);

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
}
