/**
 * Create Account Use Case
 * 
 * Business logic for creating a new account.
 * Validates uniqueness and business rules.
 * 
 * Requirements: 4.1, 4.2, 4.3
 */

import { injectable, inject } from 'tsyringe';
import { Account } from '../../domain/Account';
import type { IAccountRepository } from '../../infrastructure/IAccountRepository';
import type { CreateAccountDTO, AccountResponseDTO } from '../dtos/AccountDTO';
import { generateId } from '../../../../shared/utils/idGenerator';
import { AccountMapper } from '../mappers/AccountMapper';
import { ValidationError, ConflictError } from '../../../../shared/errors/AppError';

@injectable()
export class CreateAccountUseCase {
  constructor(
    @inject('AccountRepository') private accountRepo: IAccountRepository
  ) {}

  async execute(dto: CreateAccountDTO, userId: string): Promise<AccountResponseDTO> {
    // Validation (Requirement 4.1)
    if (!dto.name?.trim()) {
      throw new ValidationError('Account name is required');
    }

    if (!dto.color?.match(/^#[0-9A-Fa-f]{6}$/)) {
      throw new ValidationError('Invalid color format - must be hex format like #3b82f6');
    }

    if (!dto.currency) {
      throw new ValidationError('Currency is required');
    }

    // Validate investment account requirements (Requirement 4.3)
    if (dto.type === 'investment' && !dto.stockSymbol?.trim()) {
      throw new ValidationError('Investment accounts must have a stock symbol');
    }

    // Check uniqueness (name + currency combination) (Requirement 4.2)
    const exists = await this.accountRepo.existsByNameAndCurrency(
      dto.name.trim(),
      dto.currency,
      userId
    );

    if (exists) {
      throw new ConflictError(
        `An account with name "${dto.name}" and currency ${dto.currency} already exists`
      );
    }

    // Create domain entity
    const account = new Account(
      generateId(),
      dto.name.trim(),
      dto.color,
      dto.currency,
      0, // Initial balance
      dto.type || 'normal',
      dto.stockSymbol?.trim()
    );

    // Persist account
    await this.accountRepo.save(account, userId);

    // TODO: For investment accounts, create default pockets (will be implemented in Phase 2)
    // Investment accounts should have default pockets created automatically

    // Return DTO
    return AccountMapper.toDTO(account);
  }
}
