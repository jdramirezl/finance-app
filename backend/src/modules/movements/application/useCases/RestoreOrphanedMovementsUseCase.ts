/**
 * Restore Orphaned Movements Use Case
 * 
 * Business logic for restoring orphaned movements by matching them to accounts and pockets.
 * Matches movements to accounts by name and currency, then to pockets by name.
 * Recalculates balances for affected entities after restoration.
 * 
 * Requirements: 12.2, 12.3, 12.4, 12.5
 */

import { injectable, inject } from 'tsyringe';
import { MovementDomainService } from '../../domain/MovementDomainService';
import type { IMovementRepository } from '../../infrastructure/IMovementRepository';
import type { IAccountRepository } from '../../../accounts/infrastructure/IAccountRepository';
import type { IPocketRepository } from '../../../pockets/infrastructure/IPocketRepository';
import type { ISubPocketRepository } from '../../../sub-pockets/infrastructure/ISubPocketRepository';

interface RestoreResult {
  restored: number;
  failed: number;
}

@injectable()
export class RestoreOrphanedMovementsUseCase {
  private domainService: MovementDomainService;

  constructor(
    @inject('MovementRepository') private movementRepo: IMovementRepository,
    @inject('AccountRepository') private accountRepo: IAccountRepository,
    @inject('PocketRepository') private pocketRepo: IPocketRepository,
    @inject('SubPocketRepository') private subPocketRepo: ISubPocketRepository
  ) {
    this.domainService = new MovementDomainService();
  }

  async execute(userId: string): Promise<RestoreResult> {
    // Get all orphaned movements for the user
    const orphanedMovements = await this.movementRepo.findOrphaned(userId);

    let restored = 0;
    let failed = 0;

    // Get all accounts and pockets for the user (for matching)
    const accounts = await this.accountRepo.findAllByUserId(userId);
    const pockets = await this.pocketRepo.findAllByUserId(userId);

    // Track which entities need balance recalculation
    const affectedAccountIds = new Set<string>();
    const affectedPocketIds = new Set<string>();
    const affectedSubPocketIds = new Set<string>();

    // Try to restore each orphaned movement
    for (const movement of orphanedMovements) {
      try {
        // Match movement to account by name and currency (Requirement 12.2)
        const matchedAccount = accounts.find(
          acc => acc.name === movement.orphanedAccountName && 
                 acc.currency === movement.orphanedAccountCurrency
        );

        if (!matchedAccount) {
          failed++;
          continue;
        }

        // Match movement to pocket by name within matched account (Requirement 12.3)
        const matchedPocket = pockets.find(
          pocket => pocket.accountId === matchedAccount.id && 
                   pocket.name === movement.orphanedPocketName
        );

        if (!matchedPocket) {
          failed++;
          continue;
        }

        // Try to match sub-pocket if the movement had one
        let matchedSubPocketId: string | undefined;
        if (movement.subPocketId) {
          // Get sub-pockets for the matched pocket
          const subPockets = await this.subPocketRepo.findByPocketId(matchedPocket.id, userId);
          // For now, we don't have orphaned sub-pocket name, so we can't match
          // This is a limitation - we'll just set it to undefined
          matchedSubPocketId = undefined;
        }

        // Restore the movement (Requirement 12.4)
        movement.restoreFromOrphaned(
          matchedAccount.id,
          matchedPocket.id,
          matchedSubPocketId
        );

        // Persist the restored movement
        await this.movementRepo.update(movement, userId);

        // Track affected entities for balance recalculation
        affectedAccountIds.add(matchedAccount.id);
        affectedPocketIds.add(matchedPocket.id);
        if (matchedSubPocketId) {
          affectedSubPocketIds.add(matchedSubPocketId);
        }

        restored++;
      } catch (error) {
        // If restoration fails for any reason, count as failed
        failed++;
      }
    }

    // Recalculate balances for all affected entities (Requirement 12.5)
    await this.recalculateBalances(
      Array.from(affectedAccountIds),
      Array.from(affectedPocketIds),
      Array.from(affectedSubPocketIds),
      userId
    );

    return { restored, failed };
  }

  /**
   * Recalculate balances for all affected entities after restoration
   */
  private async recalculateBalances(
    accountIds: string[],
    pocketIds: string[],
    subPocketIds: string[],
    userId: string
  ): Promise<void> {
    // Recalculate account balances
    for (const accountId of accountIds) {
      const account = await this.accountRepo.findById(accountId, userId);
      if (account) {
        const accountMovements = await this.movementRepo.findByAccountId(accountId, userId);
        const newBalance = this.domainService.calculateAccountBalance(accountMovements, accountId);
        account.updateBalance(newBalance);
        await this.accountRepo.update(account, userId);
      }
    }

    // Recalculate pocket balances
    for (const pocketId of pocketIds) {
      const pocket = await this.pocketRepo.findById(pocketId, userId);
      if (pocket) {
        const pocketMovements = await this.movementRepo.findByPocketId(pocketId, userId);
        const newBalance = this.domainService.calculatePocketBalance(pocketMovements, pocketId);
        pocket.updateBalance(newBalance);
        await this.pocketRepo.update(pocket, userId);
      }
    }

    // Recalculate sub-pocket balances
    for (const subPocketId of subPocketIds) {
      const subPocket = await this.subPocketRepo.findById(subPocketId, userId);
      if (subPocket) {
        const subPocketMovements = await this.movementRepo.findBySubPocketId(subPocketId, userId);
        const newBalance = this.domainService.calculateSubPocketBalance(subPocketMovements, subPocketId);
        subPocket.updateBalance(newBalance);
        await this.subPocketRepo.update(subPocket, userId);
      }
    }
  }
}
