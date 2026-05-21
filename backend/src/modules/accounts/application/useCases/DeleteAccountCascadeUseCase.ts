/**
 * Delete Account Cascade Use Case
 * 
 * Business logic for cascade deleting an account with all related data.
 * Handles deletion of sub-pockets, movements (orphan or hard delete), pockets, and account.
 * 
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
 */

import { injectable, inject } from 'tsyringe';
import type { IAccountRepository } from '../../infrastructure/IAccountRepository';
import type { CascadeDeleteResultDTO } from '../dtos/AccountDTO';
import { NotFoundError } from '../../../../shared/errors/AppError';

/**
 * Minimal Pocket Repository Interface
 * 
 * This interface will be fully implemented in Phase 2.
 * For now, we define the minimal interface needed for cascade delete.
 */
interface IPocketRepository {
  findByAccountId(accountId: string, userId: string): Promise<Array<{ id: string; accountId: string; type: string }>>;
  deleteByAccountId(accountId: string, userId: string): Promise<number>;
}

/**
 * Minimal SubPocket Repository Interface
 * 
 * This interface will be fully implemented in Phase 3.
 * For now, we define the minimal interface needed for cascade delete.
 */
interface ISubPocketRepository {
  deleteByPocketIds(pocketIds: string[], userId: string): Promise<number>;
}

/**
 * Minimal Movement Repository Interface
 * 
 * This interface will be fully implemented in Phase 4.
 * For now, we define the minimal interface needed for cascade delete.
 */
interface IMovementRepository {
  markAsOrphanedByAccountId(accountId: string, accountName: string, accountCurrency: any, userId: string): Promise<number>;
  deleteByAccountId(accountId: string, userId: string): Promise<number>;
}

export interface DeleteAccountCascadeDTO {
  deleteMovements: boolean;
}

@injectable()
export class DeleteAccountCascadeUseCase {
  constructor(
    @inject('AccountRepository') private accountRepo: IAccountRepository,
    @inject('PocketRepository') private pocketRepo: IPocketRepository,
    @inject('SubPocketRepository') private subPocketRepo: ISubPocketRepository,
    @inject('MovementRepository') private movementRepo: IMovementRepository
  ) {}

  /**
   * Execute the cascade delete use case
   * 
   * @param accountId - Account ID to delete
   * @param dto - Delete options (deleteMovements flag)
   * @param userId - User ID from authentication (for ownership verification)
   * @returns CascadeDeleteResultDTO with counts of deleted entities
   * @throws NotFoundError if account doesn't exist or user doesn't own it
   */
  async execute(
    accountId: string,
    dto: DeleteAccountCascadeDTO,
    userId: string
  ): Promise<CascadeDeleteResultDTO> {
    // Fetch existing account to verify ownership
    const account = await this.accountRepo.findById(accountId, userId);

    if (!account) {
      throw new NotFoundError('Account not found');
    }

    // 1. Fetch all pockets for this account (1 query)
    const pockets = await this.pocketRepo.findByAccountId(accountId, userId);
    const pocketIds = pockets.map(p => p.id);

    // 2. Bulk delete all sub-pockets for those pocket IDs (1 query)
    const subPocketsDeleted = await this.subPocketRepo.deleteByPocketIds(pocketIds, userId);

    // 3. Bulk delete all pockets for the account (1 query)
    const pocketsDeleted = await this.pocketRepo.deleteByAccountId(accountId, userId);

    // 4. Handle movements (1 query)
    let movementsAffected = 0;
    if (dto.deleteMovements) {
      movementsAffected = await this.movementRepo.deleteByAccountId(accountId, userId);
    } else {
      movementsAffected = await this.movementRepo.markAsOrphanedByAccountId(
        accountId,
        account.name,
        account.currency,
        userId
      );
    }

    // 5. Delete the account (1 query)
    await this.accountRepo.delete(accountId, userId);

    return {
      account: account.name,
      pockets: pocketsDeleted,
      subPockets: subPocketsDeleted,
      movements: movementsAffected,
    };
  }
}
