/**
 * Mark As Pending Use Case
 * 
 * Business logic for marking a movement as pending (setting isPending to true).
 * Recalculates balances for affected entities after marking as pending.
 * 
 * Requirements: 11.2
 */

import { injectable, inject } from 'tsyringe';
import { MovementDomainService } from '../../domain/MovementDomainService';
import type { IMovementRepository } from '../../infrastructure/IMovementRepository';
import type { IAccountRepository } from '../../../accounts/infrastructure/IAccountRepository';
import type { IPocketRepository } from '../../../pockets/infrastructure/IPocketRepository';
import type { ISubPocketRepository } from '../../../sub-pockets/infrastructure/ISubPocketRepository';
import type { MovementResponseDTO } from '../dtos/MovementDTO';
import { MovementMapper } from '../mappers/MovementMapper';
import { NotFoundError, ValidationError } from '../../../../shared/errors/AppError';

@injectable()
export class MarkAsPendingUseCase {
  private domainService: MovementDomainService;

  constructor(
    @inject('MovementRepository') private movementRepo: IMovementRepository,
    @inject('AccountRepository') private accountRepo: IAccountRepository,
    @inject('PocketRepository') private pocketRepo: IPocketRepository,
    @inject('SubPocketRepository') private subPocketRepo: ISubPocketRepository
  ) {
    this.domainService = new MovementDomainService();
  }

  async execute(id: string, userId: string): Promise<MovementResponseDTO> {
    // Find existing movement
    const movement = await this.movementRepo.findById(id, userId);
    if (!movement) {
      throw new NotFoundError(`Movement with ID ${id} not found`);
    }

    // Verify movement is not already pending
    if (movement.isPending) {
      throw new ValidationError('Movement is already pending');
    }

    // Set isPending to true (Requirement 11.2)
    movement.markAsPending();

    // Persist changes
    await this.movementRepo.update(movement, userId);

    // Recalculate balances for affected entities (Requirement 11.2)
    await this.recalculateBalances(movement, userId);

    // Return DTO
    return MovementMapper.toDTO(movement);
  }

  /**
   * Recalculate balances for all affected entities after marking as pending
   */
  private async recalculateBalances(movement: any, userId: string): Promise<void> {
    const affected = this.domainService.getAffectedEntities(movement);

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
