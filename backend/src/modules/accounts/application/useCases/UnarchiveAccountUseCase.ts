/**
 * Unarchive Account Use Case
 *
 * Restores a previously archived account by clearing its archived_at
 * timestamp. Pockets are NOT auto-restored; the user must unarchive them
 * individually so they can review what should come back.
 */

import { injectable, inject } from 'tsyringe';
import type { IAccountRepository } from '../../infrastructure/IAccountRepository';
import { NotFoundError } from '../../../../shared/errors/AppError';

@injectable()
export class UnarchiveAccountUseCase {
  constructor(
    @inject('AccountRepository') private accountRepo: IAccountRepository
  ) {}

  /**
   * Execute the unarchive use case.
   *
   * @param accountId - Account ID to restore
   * @param userId - User ID from authentication (for ownership verification)
   * @throws NotFoundError if account doesn't exist or user doesn't own it
   */
  async execute(accountId: string, userId: string): Promise<void> {
    // Verify ownership including archived rows so we can restore them
    const account = await this.accountRepo.findById(accountId, userId);
    if (!account) {
      throw new NotFoundError('Account not found');
    }

    await this.accountRepo.unarchive(accountId, userId);
  }
}
