import { Request, Response, NextFunction } from 'express';
import { injectable, inject } from 'tsyringe';
import { SupabaseClient } from '@supabase/supabase-js';
import { SyncToSheetsUseCase } from '../application/syncToSheetsUseCase';

@injectable()
export class SyncController {
  constructor(
    @inject('SupabaseClient') private supabase: SupabaseClient
  ) {}

  async syncToSheets(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const useCase = new SyncToSheetsUseCase();
      const result = await useCase.execute(userId, this.supabase);

      res.status(200).json({
        spreadsheetUrl: result.spreadsheetUrl,
        syncedAt: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }
}
