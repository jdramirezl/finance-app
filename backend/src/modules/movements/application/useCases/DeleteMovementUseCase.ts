/**
 * Delete Movement Use Case
 * 
 * Business logic for deleting a movement.
 * Recalculates balances for affected entities after deletion.
 * 
 * Requirements: 10.7
 */

import { injectable, inject } from 'tsyringe';
import { MovementDomainService } from '../../domain/MovementDomainService';
import type { IMovementRepository } from '../../infrastructure/IMovementRepository';
import type { IAccountRepository } from '../../../accounts/infrastructure/IAccountRepository';
import type { IPocketRepository } from '../../../pockets/infrastructure/IPocketRepository';
import type { ISubPocketRepository } from '../../../sub-pockets/infrastructure/ISubPocketRepository';
import type { IReminderRepository } from '../../../reminders/interfaces/IReminderRepository';
import { NotFoundError } from '../../../../shared/errors/AppError';

@injectable()
export class DeleteMovementUseCase {
  private domainService: MovementDomainService;

  constructor(
    @inject('MovementRepository') private movementRepo: IMovementRepository,
    @inject('AccountRepository') private accountRepo: IAccountRepository,
    @inject('PocketRepository') private pocketRepo: IPocketRepository,
    @inject('SubPocketRepository') private subPocketRepo: ISubPocketRepository,
    @inject('ReminderRepository') private reminderRepo: IReminderRepository
  ) {
    this.domainService = new MovementDomainService();
  }

  async execute(id: string, userId: string): Promise<void> {
    // Find existing movement
    const movement = await this.movementRepo.findById(id, userId);
    if (!movement) {
      throw new NotFoundError(`Movement with ID ${id} not found`);
    }

    // Check if there is a linked reminder
    const linkedReminder = await this.reminderRepo.findByLinkedMovementId(id);
    if (linkedReminder) {
      // Un-pay the reminder
      await this.reminderRepo.update(linkedReminder.id, {
        isPaid: false,
        linkedMovementId: null
      });
    }

    // Delete the movement
    await this.movementRepo.delete(id, userId);

    // Skip balance recalculation for orphaned movements (they don't have real accounts/pockets)
    if (movement.isOrphaned) {
      return;
    }

    // Get affected entities before deletion
    const affected = this.domainService.getAffectedEntities(movement);

    // Recalculate balances for affected entities (Requirement 10.7)
    await this.recalculateBalances(affected, userId);
  }

  /**
   * Recalculate balances for all affected entities after deletion
   */
  private async recalculateBalances(
    affected: { accountId: string; pocketId: string; subPocketId?: string },
    userId: string
  ): Promise<void> {
    // Recalculate account balance
    const account = await this.accountRepo.findById(affected.accountId, userId);
    if (account) {
      const accountMovements = await this.movementRepo.findByAccountId(affected.accountId, userId);
      const newBalance = this.domainService.calculateAccountBalance(accountMovements, affected.accountId);
      account.updateBalance(newBalance);
      await this.accountRepo.update(account, userId);
    }

    // Recalculate pocket balance
    const pocket = await this.pocketRepo.findById(affected.pocketId, userId);
    if (pocket) {
      const pocketMovements = await this.movementRepo.findByPocketId(affected.pocketId, userId);
      const newBalance = this.domainService.calculatePocketBalance(pocketMovements, affected.pocketId);
      pocket.updateBalance(newBalance);
      await this.pocketRepo.update(pocket, userId);
    }

    // Recalculate sub-pocket balance if applicable
    if (affected.subPocketId) {
      const subPocket = await this.subPocketRepo.findById(affected.subPocketId, userId);
      if (subPocket) {
        const subPocketMovements = await this.movementRepo.findBySubPocketId(affected.subPocketId, userId);
        const newBalance = this.domainService.calculateSubPocketBalance(subPocketMovements, affected.subPocketId);
        subPocket.updateBalance(newBalance);
        await this.subPocketRepo.update(subPocket, userId);
      }
    }
  }
}
