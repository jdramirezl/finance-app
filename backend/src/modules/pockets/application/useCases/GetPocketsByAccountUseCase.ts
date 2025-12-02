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

  async execute(accountId: string, userId: string): Promise<PocketResponseDTO[]> {
    // Verify account exists and belongs to user
    const account = await this.accountRepo.findById(accountId, userId);
    if (!account) {
      throw new NotFoundError('Account not found');
    }

    // Fetch pockets for the account
    const pockets = await this.pocketRepo.findByAccountId(accountId, userId);

    // TODO: Calculate balances when Movement and SubPocket modules are implemented
    // For now, pockets will have their stored balance values
    // In Phase 3 & 4, we'll:
    // 1. Fetch movements for normal pockets
    // 2. Fetch sub-pockets for fixed pockets
    // 3. Use PocketDomainService to calculate balances

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
