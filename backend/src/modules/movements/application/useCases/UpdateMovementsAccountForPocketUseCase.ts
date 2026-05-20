/**
 * Update Movements Account For Pocket Use Case
 *
 * Bulk-updates the account_id column for every movement belonging to a
 * given pocket. Used during pocket migration when a pocket changes its
 * parent account so the historical movements stay consistent with the
 * pocket's current account.
 */

import { injectable, inject } from 'tsyringe';
import type { IMovementRepository } from '../../infrastructure/IMovementRepository';
import { ValidationError } from '../../../../shared/errors/AppError';

export interface UpdateMovementsAccountForPocketDTO {
  pocketId: string;
  newAccountId: string;
}

export interface UpdateMovementsAccountForPocketResult {
  count: number;
}

@injectable()
export class UpdateMovementsAccountForPocketUseCase {
  constructor(
    @inject('MovementRepository') private movementRepo: IMovementRepository
  ) {}

  async execute(
    dto: UpdateMovementsAccountForPocketDTO,
    userId: string
  ): Promise<UpdateMovementsAccountForPocketResult> {
    if (!dto?.pocketId?.trim()) {
      throw new ValidationError('pocketId is required');
    }
    if (!dto?.newAccountId?.trim()) {
      throw new ValidationError('newAccountId is required');
    }

    const count = await this.movementRepo.updateAccountIdByPocketId(
      dto.pocketId,
      dto.newAccountId,
      userId
    );
    return { count };
  }
}
