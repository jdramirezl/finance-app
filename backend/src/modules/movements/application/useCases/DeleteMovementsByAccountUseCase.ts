/**
 * Delete Movements By Account Use Case
 *
 * Hard-deletes every movement belonging to a specific account in a single
 * bulk database operation. Used by cascade delete and similar bulk flows
 * where balances are reconciled by database triggers (or the caller is
 * removing the parent account itself, making local recalculation moot).
 */

import { injectable, inject } from 'tsyringe';
import type { IMovementRepository } from '../../infrastructure/IMovementRepository';

export interface DeleteMovementsBulkResult {
  count: number;
}

@injectable()
export class DeleteMovementsByAccountUseCase {
  constructor(
    @inject('MovementRepository') private movementRepo: IMovementRepository
  ) {}

  async execute(accountId: string, userId: string): Promise<DeleteMovementsBulkResult> {
    const count = await this.movementRepo.deleteByAccountId(accountId, userId);
    return { count };
  }
}
