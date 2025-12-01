/**
 * Reorder Accounts Use Case
 * 
 * Business logic for reordering accounts by updating their display order.
 * Verifies all accounts belong to the user before updating.
 * 
 * Requirements: 4.7
 */

import { injectable, inject } from 'tsyringe';
import type { IAccountRepository } from '../../infrastructure/IAccountRepository';
import { ValidationError, NotFoundError } from '../../../../shared/errors/AppError';

export interface ReorderAccountsDTO {
  accountIds: string[];
}

@injectable()
export class ReorderAccountsUseCase {
  constructor(
    @inject('AccountRepository') private accountRepo: IAccountRepository
  ) {}

  /**
   * Execute the use case
   * 
   * @param dto - Array of account IDs in desired order
   * @param userId - User ID from authentication (for ownership verification)
   * @throws ValidationError if input is invalid
   * @throws NotFoundError if any account doesn't exist or user doesn't own it
   */
  async execute(dto: ReorderAccountsDTO, userId: string): Promise<void> {
    // Validate input (Requirement 4.7)
    if (!dto.accountIds || !Array.isArray(dto.accountIds)) {
      throw new ValidationError('Account IDs must be provided as an array');
    }

    if (dto.accountIds.length === 0) {
      throw new ValidationError('At least one account ID must be provided');
    }

    // Check for duplicate IDs
    const uniqueIds = new Set(dto.accountIds);
    if (uniqueIds.size !== dto.accountIds.length) {
      throw new ValidationError('Duplicate account IDs are not allowed');
    }

    // Verify all accounts belong to user (Requirement 4.7)
    // Fetch all accounts to verify ownership
    const accounts = await Promise.all(
      dto.accountIds.map(id => this.accountRepo.findById(id, userId))
    );

    // Check if any account was not found or doesn't belong to user
    const notFoundIndex = accounts.findIndex(account => account === null);
    if (notFoundIndex !== -1) {
      throw new NotFoundError(
        `Account with ID ${dto.accountIds[notFoundIndex]} not found or access denied`
      );
    }

    // Update display order for each account (Requirement 4.7)
    // The order in the array determines the display order (0-indexed)
    const validAccounts = accounts.filter((a): a is NonNullable<typeof a> => a !== null);
    
    validAccounts.forEach((account, index) => {
      account.updateDisplayOrder(index);
    });

    // Persist changes using batch update
    await this.accountRepo.updateDisplayOrders(dto.accountIds, userId);
  }
}
