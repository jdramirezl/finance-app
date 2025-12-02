/**
 * Settings Controller
 * 
 * Handles HTTP requests for settings operations.
 * Delegates business logic to use cases.
 * 
 * Requirements: 14.1-14.3
 */

import { Request, Response, NextFunction } from 'express';
import { injectable, inject } from 'tsyringe';
import { GetSettingsUseCase } from '../application/useCases/GetSettingsUseCase';
import { UpdateSettingsUseCase } from '../application/useCases/UpdateSettingsUseCase';
import type { UpdateSettingsDTO } from '../application/dtos/SettingsDTO';

@injectable()
export class SettingsController {
  constructor(
    @inject(GetSettingsUseCase) private getSettingsUseCase: GetSettingsUseCase,
    @inject(UpdateSettingsUseCase) private updateSettingsUseCase: UpdateSettingsUseCase
  ) {}

  /**
   * Get user settings
   * GET /api/settings
   * 
   * Requirements: 14.1
   */
  async get(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const settings = await this.getSettingsUseCase.execute(userId);

      res.status(200).json(settings);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update user settings
   * PUT /api/settings
   * 
   * Requirements: 14.2, 14.3
   */
  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const dto: UpdateSettingsDTO = req.body;
      const settings = await this.updateSettingsUseCase.execute(userId, dto);

      res.status(200).json(settings);
    } catch (error) {
      next(error);
    }
  }
}
