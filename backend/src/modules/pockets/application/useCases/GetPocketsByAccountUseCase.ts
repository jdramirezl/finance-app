/**
 * Get Pockets By Account Use Case
 * 
 * Fetches all pockets for a specific account, calculates balances,
 * and sorts by display order.
 * 
 * Requirements: 6.4
 */

import { injectable, inject } from 'tsyringe';
import type { IPocketRepository } from '../../infrastructure/IPocketRepository';
import type { IAccountRepository } from '../../../accounts/infrastructure/IAccountRepository';
import type { PocketResponseDTO } from '../dtos/PocketDTO';
import { PocketMapper } from '../mappers/PocketMapper';
import { PocketDomainService } from '../../domain/PocketDomainService';
import { NotFoundError, ForbiddenError } from '../../../../shared/errors/AppError';

@injectable()
export class GetPocketsByAccountUseCase {
  private domainService: PocketDomainService;

  constructor(
    @inject('PocketRepository') private pocketRepo: IPocketRepository,
    @inject('AccountRepository') private accountRepo: IAccountRepository
  ) {
    this.domainService = new PocketDomainService();
  }

  async execute(
    accountId: string,
    userId: string,
    includeArchived: boolean = false
  ): Promise<PocketResponseDTO[]> {
    // Verify account exists and belongs to user
    const account = await this.accountRepo.findById(accountId, userId);
    if (!account) {
      throw new NotFoundError('Account not found');
    }

    // Fetch pockets for the account, optionally including archived ones.
    // The default (false) preserves the pre-archive contract for every
    // existing caller; only opt-in callers see archived rows.
    const pockets = await this.pocketRepo.findByAccountId(accountId, userId, includeArchived);

    // Sort by display order (nulls last)
    const sortedPockets = pockets.sort((a, b) => {
      if (a.displayOrder === undefined && b.displayOrder === undefined) return 0;
      if (a.displayOrder === undefined) return 1;
      if (b.displayOrder === undefined) return -1;
      return a.displayOrder - b.displayOrder;
    });

    // Convert to DTOs
    return PocketMapper.toDTOArray(sortedPockets);
  }
}
