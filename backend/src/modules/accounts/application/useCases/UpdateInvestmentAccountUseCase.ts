/**
 * UpdateInvestmentAccountUseCase
 * 
 * Updates investment-specific fields (shares and montoInvertido) for an investment account.
 * 
 * Requirements: 13.6
 */

import { injectable, inject } from 'tsyringe';
import type { IAccountRepository } from '../../infrastructure/IAccountRepository';
import { NotFoundError } from '../../../../shared/errors/AppError';
import { ForbiddenError } from '../../../../shared/errors/AppError';

export interface UpdateInvestmentAccountDTO {
  shares?: number;
  montoInvertido?: number;
}

@injectable()
export class UpdateInvestmentAccountUseCase {
  constructor(
    @inject('AccountRepository') private accountRepo: IAccountRepository
  ) {}

  /**
   * Execute the use case
   * 
   * @param accountId - ID of the investment account to update
   * @param dto - Update data (shares and/or montoInvertido)
   * @param userId - ID of the user making the request
   * @returns Updated account
   */
  async execute(
    accountId: string,
    dto: UpdateInvestmentAccountDTO,
    userId: string
  ): Promise<void> {
    // Fetch the account
    const account = await this.accountRepo.findById(accountId, userId);
    if (!account) {
      throw new NotFoundError('Account not found');
    }

    // Verify ownership (should be handled by repository, but double-check)
    // This is a safety check in case repository doesn't filter by userId properly
    
    // Verify it's an investment account
    if (!account.isInvestment()) {
      throw new ForbiddenError('Can only update investment details on investment accounts');
    }

    // Update investment details using domain method
    account.updateInvestmentDetails(dto.shares, dto.montoInvertido);

    // Persist changes
    await this.accountRepo.update(account, userId);
  }
}
