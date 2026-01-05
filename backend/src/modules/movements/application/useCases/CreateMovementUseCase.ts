/**
 * Create Movement Use Case
 * 
 * Business logic for creating a new movement.
 * Validates input, verifies references exist, and recalculates balances if not pending.
 * 
 * Requirements: 10.1, 10.2, 10.3, 10.4
 */

import { injectable, inject } from 'tsyringe';
import { Movement } from '../../domain/Movement';
import { MovementDomainService } from '../../domain/MovementDomainService';
import type { IMovementRepository } from '../../infrastructure/IMovementRepository';
import type { IAccountRepository } from '../../../accounts/infrastructure/IAccountRepository';
import type { IPocketRepository } from '../../../pockets/infrastructure/IPocketRepository';
import type { ISubPocketRepository } from '../../../sub-pockets/infrastructure/ISubPocketRepository';
import type { CreateMovementDTO, MovementResponseDTO } from '../dtos/MovementDTO';
import { generateId } from '../../../../shared/utils/idGenerator';
import { MovementMapper } from '../mappers/MovementMapper';
import { ValidationError, NotFoundError } from '../../../../shared/errors/AppError';

@injectable()
export class CreateMovementUseCase {
  private domainService: MovementDomainService;

  constructor(
    @inject('MovementRepository') private movementRepo: IMovementRepository,
    @inject('AccountRepository') private accountRepo: IAccountRepository,
    @inject('PocketRepository') private pocketRepo: IPocketRepository,
    @inject('SubPocketRepository') private subPocketRepo: ISubPocketRepository
  ) {
    this.domainService = new MovementDomainService();
  }

  async execute(dto: CreateMovementDTO, userId: string): Promise<MovementResponseDTO> {
    // Validate input (Requirement 10.1)
    this.validateInput(dto);

    // Verify references exist (Requirement 10.2)
    await this.verifyReferences(dto, userId);

    // Parse date
    const displayedDate = new Date(dto.displayedDate);
    if (isNaN(displayedDate.getTime())) {
      throw new ValidationError('Invalid displayed date format');
    }

    // Create domain entity
    const movement = new Movement(
      generateId(),
      dto.type,
      dto.accountId,
      dto.pocketId,
      dto.amount,
      displayedDate,
      dto.notes,
      dto.subPocketId,
      dto.isPending || false
    );

    // Persist movement
    await this.movementRepo.save(movement, userId);

    // Recalculate balances if not pending (Requirements 10.3, 10.4)
    if (!movement.isPending) {
      await this.recalculateBalances(movement, userId);
    }

    // Return DTO
    return MovementMapper.toDTO(movement);
  }

  /**
   * Validate input data
   */
  private validateInput(dto: CreateMovementDTO): void {
    // Validate amount
    if (dto.amount === undefined || dto.amount === null) {
      throw new ValidationError('Amount is required');
    }

    if (dto.amount < 0) {
      throw new ValidationError('Amount cannot be negative');
    }

    // Validate type
    const validTypes = ['IngresoNormal', 'EgresoNormal', 'IngresoFijo', 'EgresoFijo'];
    if (!validTypes.includes(dto.type)) {
      throw new ValidationError(`Invalid movement type - must be one of: ${validTypes.join(', ')}`);
    }

    // Validate accountId
    if (!dto.accountId?.trim()) {
      throw new ValidationError('Account ID is required');
    }

    // Validate pocketId
    if (!dto.pocketId?.trim()) {
      throw new ValidationError('Pocket ID is required');
    }

    // Validate displayedDate
    if (!dto.displayedDate?.trim()) {
      throw new ValidationError('Displayed date is required');
    }
  }

  /**
   * Verify that all referenced entities exist
   */
  private async verifyReferences(dto: CreateMovementDTO, userId: string): Promise<void> {
    // Verify account exists
    const account = await this.accountRepo.findById(dto.accountId, userId);
    if (!account) {
      throw new NotFoundError(`Account with ID ${dto.accountId} not found`);
    }

    // Verify pocket exists and belongs to the account
    const pocket = await this.pocketRepo.findById(dto.pocketId, userId);
    if (!pocket) {
      throw new NotFoundError(`Pocket with ID ${dto.pocketId} not found`);
    }

    if (pocket.accountId !== dto.accountId) {
      throw new ValidationError('Pocket does not belong to the specified account');
    }

    // Verify sub-pocket exists if provided
    if (dto.subPocketId) {
      const subPocket = await this.subPocketRepo.findById(dto.subPocketId, userId);
      if (!subPocket) {
        throw new NotFoundError(`SubPocket with ID ${dto.subPocketId} not found`);
      }

      if (subPocket.pocketId !== dto.pocketId) {
        throw new ValidationError('SubPocket does not belong to the specified pocket');
      }

      // Verify pocket is fixed type if sub-pocket is specified
      if (pocket.type !== 'fixed') {
        throw new ValidationError('SubPockets can only be used with fixed type pockets');
      }
    }
  }

  /**
   * Recalculate balances for affected entities
   */
  private async recalculateBalances(movement: Movement, userId: string): Promise<void> {
    const affected = this.domainService.getAffectedEntities(movement);

    // Get all movements for affected entities
    const accountMovements = await this.movementRepo.findByAccountId(affected.accountId, userId);
    const pocketMovements = await this.movementRepo.findByPocketId(affected.pocketId, userId);

    // Recalculate account balance
    const account = await this.accountRepo.findById(affected.accountId, userId);
    if (account) {
      const newBalance = this.domainService.calculateAccountBalance(accountMovements, affected.accountId);
      account.updateBalance(newBalance);
      await this.accountRepo.update(account, userId);
    }

    // Recalculate pocket balance
    const pocket = await this.pocketRepo.findById(affected.pocketId, userId);
    if (pocket) {
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
