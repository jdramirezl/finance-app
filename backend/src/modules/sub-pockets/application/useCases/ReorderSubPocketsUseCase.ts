/**
 * Reorder SubPockets Use Case
 * 
 * Business logic for reordering sub-pockets within a pocket.
 * Updates display order for all specified sub-pockets.
 * 
 * Requirements: 8.6
 */

import { injectable, inject } from 'tsyringe';
import type { ISubPocketRepository } from '../../infrastructure/ISubPocketRepository';
import { ValidationError, NotFoundError } from '../../../../shared/errors/AppError';

@injectable()
export class ReorderSubPocketsUseCase {
  constructor(
    @inject('SubPocketRepository') private subPocketRepo: ISubPocketRepository
  ) {}

  async execute(subPocketIds: string[], userId: string): Promise<void> {
    // Validation
    if (!subPocketIds || subPocketIds.length === 0) {
      throw new ValidationError('SubPocket IDs are required');
    }

    // Verify all sub-pockets exist and belong to user
    const subPockets = await Promise.all(
      subPocketIds.map(id => this.subPocketRepo.findById(id, userId))
    );

    // Check if any sub-pocket was not found
    const notFoundIndex = subPockets.findIndex(sp => sp === null);
    if (notFoundIndex !== -1) {
      throw new NotFoundError(`SubPocket with ID ${subPocketIds[notFoundIndex]} not found`);
    }

    // Verify all sub-pockets belong to the same pocket
    const pocketIds = new Set(subPockets.map(sp => sp!.pocketId));
    if (pocketIds.size > 1) {
      throw new ValidationError('All sub-pockets must belong to the same pocket');
    }

    // Requirement 8.6: Update display order for each sub-pocket
    subPockets.forEach((subPocket, index) => {
      subPocket!.updateDisplayOrder(index);
    });

    // Persist changes using repository batch update
    await this.subPocketRepo.updateDisplayOrders(subPocketIds, userId);
  }
}
