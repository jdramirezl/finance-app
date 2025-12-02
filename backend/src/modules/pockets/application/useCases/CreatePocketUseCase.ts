/**
 * Create Pocket Use Case
 * 
 * Business logic for creating a new pocket.
 * Validates uniqueness and business rules.
 * 
 * Requirements: 6.1, 6.2, 6.3
 */

import { injectable, inject } from 'tsyringe';
import { Pocket } from '../../domain/Pocket';
import type { IPocketRepository } from '../../infrastructure/IPocketRepository';
import type { IAccountRepository } from '../../../accounts/infrastructure/IAccountRepository';
import type { CreatePocketDTO, PocketResponseDTO } from '../dtos/PocketDTO';
import { generateId } from '../../../../shared/utils/idGenerator';
import { PocketMapper } from '../mappers/PocketMapper';
import { ValidationError, ConflictError, NotFoundError } from '../../../../shared/errors/AppError';

@injectable()
export class CreatePocketUseCase {
  constructor(
    @inject('PocketRepository') private pocketRepo: IPocketRepository,
    @inject('AccountRepository') private accountRepo: IAccountRepository
  ) {}

  async execute(dto: CreatePocketDTO, userId: string): Promise<PocketResponseDTO> {
    // Validation
    if (!dto.name?.trim()) {
      throw new ValidationError('Pocket name is required');
    }

    if (!dto.accountId?.trim()) {
      throw new ValidationError('Account ID is required');
    }

    if (!dto.type) {
      throw new ValidationError('Pocket type is required');
    }

    if (dto.type !== 'normal' && dto.type !== 'fixed') {
      throw new ValidationError('Pocket type must be either "normal" or "fixed"');
    }

    // Verify account exists and belongs to user
    const account = await this.accountRepo.findById(dto.accountId, userId);
    if (!account) {
      throw new NotFoundError('Account not found');
    }

    // Derive currency from account if not provided
    const currency = dto.currency || account.currency;

    // Requirement 6.3: Investment accounts cannot have fixed pockets
    if (account.type === 'investment' && dto.type === 'fixed') {
      throw new ValidationError('Investment accounts cannot have fixed pockets');
    }

    // Requirement 6.1: Check pocket name uniqueness within account
    const nameExists = await this.pocketRepo.existsByNameInAccount(
      dto.name.trim(),
      dto.accountId,
      userId
    );

    if (nameExists) {
      throw new ConflictError(
        `A pocket with name "${dto.name}" already exists in this account`
      );
    }

    // Requirement 6.2: Check fixed pocket global uniqueness
    if (dto.type === 'fixed') {
      const fixedExists = await this.pocketRepo.existsFixedPocketForUser(userId);
      if (fixedExists) {
        throw new ConflictError(
          'Only one fixed pocket is allowed per user. A fixed pocket already exists.'
        );
      }
    }

    // Create domain entity
    const pocket = new Pocket(
      generateId(),
      dto.accountId,
      dto.name.trim(),
      dto.type,
      0, // Initial balance
      currency // Use derived currency
    );

    // Persist pocket
    await this.pocketRepo.save(pocket, userId);

    // Return DTO
    return PocketMapper.toDTO(pocket);
  }
}
