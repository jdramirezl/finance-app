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
  delete(pocketId: string, userId: string): Promise<void>;
}

/**
 * Minimal SubPocket Repository Interface
 * 
 * This interface will be fully implemented in Phase 3.
 * For now, we define the minimal interface needed for cascade delete.
 */
interface ISubPocketRepository {
  findByPocketId(pocketId: string, userId: string): Promise<Array<{ id: string; pocketId: string }>>;
  delete(subPocketId: string, userId: string): Promise<void>;
}

/**
 * Minimal Movement Repository Interface
 * 
 * This interface will be fully implemented in Phase 4.
 * For now, we define the minimal interface needed for cascade delete.
 */
interface IMovementRepository {
  findByAccountId(accountId: string, userId: string): Promise<Array<{ id: string; accountId: string }>>;
  markAsOrphaned(movementId: string, accountName: string, accountCurrency: string, pocketName: string, userId: string): Promise<void>;
  delete(movementId: string, userId: string): Promise<void>;
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

    // Verify ownership - repository returns null if not found or not owned by user
    if (!account) {
      throw new NotFoundError('Account not found');
    }

    // Initialize counters
    let pocketsDeleted = 0;
    let subPocketsDeleted = 0;
    let movementsAffected = 0;

    // Get all pockets for this account
    const pockets = await this.pocketRepo.findByAccountId(accountId, userId);

    // Process each pocket
    for (const pocket of pockets) {
      // If this is a fixed pocket, delete all sub-pockets first (Requirement 5.4)
      if (pocket.type === 'fixed') {
        const subPockets = await this.subPocketRepo.findByPocketId(pocket.id, userId);
        
        for (const subPocket of subPockets) {
          await this.subPocketRepo.delete(subPocket.id, userId);
          subPocketsDeleted++;
        }
      }

      // Delete the pocket (Requirement 5.3)
      await this.pocketRepo.delete(pocket.id, userId);
      pocketsDeleted++;
    }

    // Handle movements (Requirement 5.1 and 5.2)
    const movements = await this.movementRepo.findByAccountId(accountId, userId);

    for (const movement of movements) {
      if (dto.deleteMovements) {
        // Hard delete movements (Requirement 5.2)
        await this.movementRepo.delete(movement.id, userId);
      } else {
        // Mark movements as orphaned (Requirement 5.1)
        // We need to get pocket name for orphaned data, but for now we'll use a placeholder
        // This will be properly implemented when we have full pocket data
        await this.movementRepo.markAsOrphaned(
          movement.id,
          account.name,
          account.currency,
          '', // Pocket name - will be properly retrieved in Phase 4
          userId
        );
      }
      movementsAffected++;
    }

    // Delete the account itself
    await this.accountRepo.delete(accountId, userId);

    // Return deletion counts (Requirement 5.5)
    return {
      account: account.name,
      pockets: pocketsDeleted,
      subPockets: subPocketsDeleted,
      movements: movementsAffected,
    };
  }
}
