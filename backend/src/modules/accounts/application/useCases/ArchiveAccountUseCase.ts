/**
 * Archive Account Use Case
 *
 * Soft-deletes an account by setting its archived_at timestamp.
 * Also archives every pocket belonging to the account so the user-facing
 * default views hide them too. Historical movements remain intact.
 */

import { injectable, inject } from 'tsyringe';
import type { IAccountRepository } from '../../infrastructure/IAccountRepository';
import type { IPocketRepository } from '../../../pockets/infrastructure/IPocketRepository';
import { NotFoundError } from '../../../../shared/errors/AppError';

@injectable()
export class ArchiveAccountUseCase {
  constructor(
    @inject('AccountRepository') private accountRepo: IAccountRepository,
    @inject('PocketRepository') private pocketRepo: IPocketRepository
  ) {}

  /**
   * Execute the archive use case.
   *
   * @param accountId - Account ID to archive
   * @param userId - User ID from authentication (for ownership verification)
   * @throws NotFoundError if account doesn't exist or user doesn't own it
   */
  async execute(accountId: string, userId: string): Promise<void> {
    // Verify ownership - repository returns null if not found or not owned by user
    const account = await this.accountRepo.findById(accountId, userId);
    if (!account) {
      throw new NotFoundError('Account not found');
    }

    // Archive the account first
    await this.accountRepo.archive(accountId, userId);

    // Cascade archive to active pockets so they disappear from default views.
    // Already-archived pockets are left untouched (keeping their original
    // archived_at timestamp) by skipping includeArchived.
    const pockets = await this.pocketRepo.findByAccountId(accountId, userId);
    await Promise.all(
      pockets.map(pocket => this.pocketRepo.archive(pocket.id, userId))
    );
  }
}
