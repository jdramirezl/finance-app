/**
 * Mark Movements As Orphaned Use Case
 *
 * Bulk-marks every movement attached to a given account or pocket as
 * orphaned, capturing the parent's name and currency at the moment of
 * orphaning so the data can be matched back later by
 * RestoreOrphanedMovementsUseCase.
 *
 * Resolves the parent entity server-side so the frontend no longer needs
 * to fetch account/pocket details before calling this endpoint.
 */

import { injectable, inject } from 'tsyringe';
import type { IMovementRepository } from '../../infrastructure/IMovementRepository';
import type { IAccountRepository } from '../../../accounts/infrastructure/IAccountRepository';
import type { IPocketRepository } from '../../../pockets/infrastructure/IPocketRepository';
import { NotFoundError, ValidationError } from '../../../../shared/errors/AppError';

export type OrphanEntityType = 'account' | 'pocket';

export interface MarkMovementsAsOrphanedDTO {
  entityId: string;
  entityType: OrphanEntityType;
}

export interface MarkMovementsAsOrphanedResult {
  count: number;
}

@injectable()
export class MarkMovementsAsOrphanedUseCase {
  constructor(
    @inject('MovementRepository') private movementRepo: IMovementRepository,
    @inject('AccountRepository') private accountRepo: IAccountRepository,
    @inject('PocketRepository') private pocketRepo: IPocketRepository
  ) {}

  async execute(
    dto: MarkMovementsAsOrphanedDTO,
    userId: string
  ): Promise<MarkMovementsAsOrphanedResult> {
    if (!dto?.entityId?.trim()) {
      throw new ValidationError('entityId is required');
    }

    if (dto.entityType === 'account') {
      const account = await this.accountRepo.findById(dto.entityId, userId);
      if (!account) {
        throw new NotFoundError(`Account with ID ${dto.entityId} not found`);
      }
      const count = await this.movementRepo.markAsOrphanedByAccountId(
        dto.entityId,
        account.name,
        account.currency,
        userId
      );
      return { count };
    }

    if (dto.entityType === 'pocket') {
      const pocket = await this.pocketRepo.findById(dto.entityId, userId);
      if (!pocket) {
        throw new NotFoundError(`Pocket with ID ${dto.entityId} not found`);
      }
      const count = await this.movementRepo.markAsOrphanedByPocketId(
        dto.entityId,
        pocket.name,
        userId
      );
      return { count };
    }

    throw new ValidationError(
      `Invalid entityType '${dto.entityType}' - must be 'account' or 'pocket'`
    );
  }
}
