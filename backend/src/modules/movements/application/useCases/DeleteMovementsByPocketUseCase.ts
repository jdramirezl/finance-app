/**
 * Delete Movements By Pocket Use Case
 *
 * Hard-deletes every movement belonging to a specific pocket in a single
 * bulk database operation. Used by pocket deletion flows. Pocket and
 * account balances are reconciled by database triggers.
 */

import { injectable, inject } from 'tsyringe';
import type { IMovementRepository } from '../../infrastructure/IMovementRepository';
import type { DeleteMovementsBulkResult } from './DeleteMovementsByAccountUseCase';

@injectable()
export class DeleteMovementsByPocketUseCase {
  constructor(
    @inject('MovementRepository') private movementRepo: IMovementRepository
  ) {}

  async execute(pocketId: string, userId: string): Promise<DeleteMovementsBulkResult> {
    const count = await this.movementRepo.deleteByPocketId(pocketId, userId);
    return { count };
  }
}
