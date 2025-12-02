/**
 * Update Movement Use Case
 * 
 * Business logic for updating an existing movement.
 * Recalculates balances if amount or pending status changed.
 * 
 * Requirements: 10.6
 */

import { injectable, inject } from 'tsyringe';
import { Movement } from '../../domain/Movement';
import { MovementDomainService } from '../../domain/MovementDomainService';
import type { IMovementRepository } from '../../infrastructure/IMovementRepository';
import type { IAccountRepository } from '../../../accounts/infrastructure/IAccountRepository';
import type { IPocketRepository } from '../../../pockets/infrastructure/IPocketRepository';
import type { ISubPocketRepository } from '../../../sub-pockets/infrastructure/ISubPocketRepository';
import type { UpdateMovementDTO, MovementResponseDTO } from '../dtos/MovementDTO';
import { MovementMapper } from '../mappers/MovementMapper';
import { ValidationError, NotFoundError } from '../../../../shared/errors/AppError';

@injectable()
export class UpdateMovementUseCase {
  private domainService: MovementDomainService;

  constructor(
    @inject('MovementRepository') private movementRepo: IMovementRepository,
    @inject('AccountRepository') private accountRepo: IAccountRepository,
    @inject('PocketRepository') private pocketRepo: IPocketRepository,
    @inject('SubPocketRepository') private subPocketRepo: ISubPocketRepository
  ) {
    this.domainService = new MovementDomainService();
  }

  async execute(id: string, dto: UpdateMovementDTO, userId: string): Promise<MovementResponseDTO> {
    // Find existing movement
    const existingMovement = await this.movementRepo.findById(id, userId);
    if (!existingMovement) {
      throw new NotFoundError(`Movement with ID ${id} not found`);
    }

    // Store old state for balance recalculation
    const oldMovement = new Movement(
      existingMovement.id,
      existingMovement.type,
      existingMovement.accountId,
      existingMovement.pocketId,
      existingMovement.amount,
      existingMovement.displayedDate,
      existingMovement.notes,
      existingMovement.subPocketId,
      existingMovement.isPending,
      existingMovement.isOrphaned,
      existingMovement.orphanedAccountName,
      existingMovement.orphanedAccountCurrency,
      existingMovement.orphanedPocketName
    );

    // Validate input if provided
    if (dto.amount !== undefined) {
      if (dto.amount <= 0) {
        throw new ValidationError('Amount must be positive');
      }
    }

    if (dto.type !== undefined) {
      const validTypes = ['IngresoNormal', 'EgresoNormal', 'IngresoFijo', 'EgresoFijo'];
      if (!validTypes.includes(dto.type)) {
        throw new ValidationError(`Invalid movement type - must be one of: ${validTypes.join(', ')}`);
      }
    }

    // Parse date if provided
    let displayedDate: Date | undefined;
    if (dto.displayedDate !== undefined) {
      displayedDate = new Date(dto.displayedDate);
      if (isNaN(displayedDate.getTime())) {
        throw new ValidationError('Invalid displayed date format');
      }
    }

    // Update movement entity
    existingMovement.update(
      dto.type,
      dto.amount,
      displayedDate,
      dto.notes,
      dto.subPocketId,
      dto.accountId,
      dto.pocketId
    );

    // Persist changes
    await this.movementRepo.update(existingMovement, userId);

    // Recalculate balances if needed (Requirement 10.6)
    if (this.domainService.requiresBalanceRecalculation(oldMovement, existingMovement)) {
      await this.recalculateBalances(oldMovement, existingMovement, userId);
    }

    // Return DTO
    return MovementMapper.toDTO(existingMovement);
  }

  /**
   * Recalculate balances for all affected entities
   * Handles cases where movement references changed (account, pocket, sub-pocket)
   */
  private async recalculateBalances(
    oldMovement: Movement,
    newMovement: Movement,
    userId: string
  ): Promise<void> {
    // Get all affected entities (both old and new)
    const affected = this.domainService.getAllAffectedEntities(oldMovement, newMovement);

    // Recalculate account balances
    for (const accountId of affected.accountIds) {
      const account = await this.accountRepo.findById(accountId, userId);
      if (account) {
        const accountMovements = await this.movementRepo.findByAccountId(accountId, userId);
        const newBalance = this.domainService.calculateAccountBalance(accountMovements, accountId);
        account.updateBalance(newBalance);
        await this.accountRepo.update(account, userId);
      }
    }

    // Recalculate pocket balances
    for (const pocketId of affected.pocketIds) {
      const pocket = await this.pocketRepo.findById(pocketId, userId);
      if (pocket) {
        const pocketMovements = await this.movementRepo.findByPocketId(pocketId, userId);
        const newBalance = this.domainService.calculatePocketBalance(pocketMovements, pocketId);
        pocket.updateBalance(newBalance);
        await this.pocketRepo.update(pocket, userId);
      }
    }

    // Recalculate sub-pocket balances
    for (const subPocketId of affected.subPocketIds) {
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
