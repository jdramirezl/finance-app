/**
 * Update Account Use Case
 * 
 * Business logic for updating an existing account.
 * Validates uniqueness if name or currency changed.
 * 
 * Requirements: 4.5
 */

import { injectable, inject } from 'tsyringe';
import type { IAccountRepository } from '../../infrastructure/IAccountRepository';
import type { UpdateAccountDTO, AccountResponseDTO } from '../dtos/AccountDTO';
import { AccountMapper } from '../mappers/AccountMapper';
import { ValidationError, NotFoundError, ConflictError } from '../../../../shared/errors/AppError';

@injectable()
export class UpdateAccountUseCase {
  constructor(
    @inject('AccountRepository') private accountRepo: IAccountRepository
  ) {}

  /**
   * Execute the use case
   * 
   * @param accountId - Account ID to update
   * @param dto - Update data
   * @param userId - User ID from authentication (for ownership verification)
   * @returns Updated account
   * @throws NotFoundError if account doesn't exist or user doesn't own it
   * @throws ValidationError if validation fails
   * @throws ConflictError if uniqueness constraint violated
   */
  async execute(
    accountId: string,
    dto: UpdateAccountDTO,
    userId: string
  ): Promise<AccountResponseDTO> {
    // Fetch existing account (Requirement 4.5)
    const account = await this.accountRepo.findById(accountId, userId);

    // Verify ownership - repository returns null if not found or not owned by user
    if (!account) {
      throw new NotFoundError('Account not found');
    }

    // Validate input if provided
    if (dto.name !== undefined) {
      if (!dto.name?.trim()) {
        throw new ValidationError('Account name cannot be empty');
      }
    }

    if (dto.color !== undefined) {
      if (!dto.color?.match(/^#[0-9A-Fa-f]{6}$/)) {
        throw new ValidationError('Invalid color format - must be hex format like #3b82f6');
      }
    }

    if (dto.currency !== undefined) {
      const validCurrencies = ['USD', 'MXN', 'COP', 'EUR', 'GBP'];
      if (!validCurrencies.includes(dto.currency)) {
        throw new ValidationError(`Invalid currency - must be one of: ${validCurrencies.join(', ')}`);
      }
    }

    // Check uniqueness if name or currency changed (Requirement 4.5)
    const nameChanged = dto.name !== undefined && dto.name.trim() !== account.name;
    const currencyChanged = dto.currency !== undefined && dto.currency !== account.currency;

    if (nameChanged || currencyChanged) {
      const newName = dto.name?.trim() ?? account.name;
      const newCurrency = dto.currency ?? account.currency;

      // Check if another account with this name+currency combination exists
      const exists = await this.accountRepo.existsByNameAndCurrencyExcludingId(
        newName,
        newCurrency,
        userId,
        accountId
      );

      if (exists) {
        throw new ConflictError(
          `An account with name "${newName}" and currency ${newCurrency} already exists`
        );
      }
    }

    // Update account entity
    account.update(
      dto.name?.trim(),
      dto.color,
      dto.currency
    );

    // Persist changes
    await this.accountRepo.update(account, userId);

    // Return updated account
    return AccountMapper.toDTO(account);
  }
}
