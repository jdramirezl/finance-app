/**
 * Delete Account Use Case
 * 
 * Business logic for deleting an account.
 * Checks for pockets before deletion - account can only be deleted if it has no pockets.
 * 
 * Requirements: 4.6
 */

import { injectable, inject } from 'tsyringe';
import type { IAccountRepository } from '../../infrastructure/IAccountRepository';
import { NotFoundError, ConflictError } from '../../../../shared/errors/AppError';

/**
 * Minimal Pocket Repository Interface
 * 
 * This interface will be fully implemented in Phase 2.
 * For now, we define the minimal interface needed for checking pockets.
 */
interface IPocketRepository {
  findByAccountId(accountId: string, userId: string): Promise<Array<{ id: string; accountId: string; balance: number }>>;
}

@injectable()
export class DeleteAccountUseCase {
  constructor(
    @inject('AccountRepository') private accountRepo: IAccountRepository,
    @inject('PocketRepository') private pocketRepo: IPocketRepository
  ) {}

  /**
   * Execute the use case
   * 
   * @param accountId - Account ID to delete
   * @param userId - User ID from authentication (for ownership verification)
   * @throws NotFoundError if account doesn't exist or user doesn't own it
   * @throws ConflictError if account has pockets (Requirement 4.6)
   */
  async execute(accountId: string, userId: string): Promise<void> {
    // Fetch existing account to verify ownership
    const account = await this.accountRepo.findById(accountId, userId);

    // Verify ownership - repository returns null if not found or not owned by user
    if (!account) {
      throw new NotFoundError('Account not found');
    }

    // Check for pockets (Requirement 4.6)
    const pockets = await this.pocketRepo.findByAccountId(accountId, userId);

    if (pockets.length > 0) {
      throw new ConflictError(
        `Cannot delete account "${account.name}" because it has ${pockets.length} pocket(s). ` +
        'Please delete all pockets first or use cascade delete.'
      );
    }

    // Delete account if no pockets exist
    await this.accountRepo.delete(accountId, userId);
  }
}
