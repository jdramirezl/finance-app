/**
 * FixedExpenseGroup Controller
 * 
 * Handles HTTP requests for fixed expense group operations.
 * Delegates business logic to use cases.
 * 
 * Requirements: 9.1-9.4
 */

import { Request, Response, NextFunction } from 'express';
import { injectable, inject } from 'tsyringe';
import { CreateFixedExpenseGroupUseCase } from '../application/useCases/CreateFixedExpenseGroupUseCase';
import { GetAllGroupsUseCase } from '../application/useCases/GetAllGroupsUseCase';
import { UpdateGroupUseCase } from '../application/useCases/UpdateGroupUseCase';
import { DeleteGroupUseCase } from '../application/useCases/DeleteGroupUseCase';
import { ToggleGroupUseCase } from '../application/useCases/ToggleGroupUseCase';
import type { CreateGroupDTO, UpdateGroupDTO } from '../application/dtos/FixedExpenseGroupDTO';

@injectable()
export class FixedExpenseGroupController {
  constructor(
    @inject(CreateFixedExpenseGroupUseCase) private createGroupUseCase: CreateFixedExpenseGroupUseCase,
    @inject(GetAllGroupsUseCase) private getAllGroupsUseCase: GetAllGroupsUseCase,
    @inject(UpdateGroupUseCase) private updateGroupUseCase: UpdateGroupUseCase,
    @inject(DeleteGroupUseCase) private deleteGroupUseCase: DeleteGroupUseCase,
    @inject(ToggleGroupUseCase) private toggleGroupUseCase: ToggleGroupUseCase
  ) {}

  /**
   * Create new fixed expense group
   * POST /api/fixed-expense-groups
   * 
   * Requirements: 9.1
   */
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const dto: CreateGroupDTO = req.body;
      const group = await this.createGroupUseCase.execute(dto, userId);

      res.status(201).json(group);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all fixed expense groups
   * GET /api/fixed-expense-groups
   * 
   * Requirements: 9.1
   */
  async getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const groups = await this.getAllGroupsUseCase.execute(userId);

      res.status(200).json(groups);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update fixed expense group
   * PUT /api/fixed-expense-groups/:id
   * 
   * Requirements: 9.1
   */
  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const groupId = req.params.id;
      const dto: UpdateGroupDTO = req.body;
      const group = await this.updateGroupUseCase.execute(groupId, dto, userId);

      res.status(200).json(group);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete fixed expense group (moves sub-pockets to default)
   * DELETE /api/fixed-expense-groups/:id
   * 
   * Requirements: 9.3
   */
  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const groupId = req.params.id;
      await this.deleteGroupUseCase.execute(groupId, userId);

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  /**
   * Toggle group and all sub-pockets
   * POST /api/fixed-expense-groups/:id/toggle
   * 
   * Requirements: 9.4
   */
  async toggle(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const groupId = req.params.id;
      const group = await this.toggleGroupUseCase.execute(groupId, userId);

      res.status(200).json(group);
    } catch (error) {
      next(error);
    }
  }
}
