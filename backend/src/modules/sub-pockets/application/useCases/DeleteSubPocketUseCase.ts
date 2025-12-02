/**
 * Delete SubPocket Use Case
 * 
 * Business logic for deleting a sub-pocket.
 * Prevents deletion if the sub-pocket has movements.
 * 
 * Requirements: 8.5
 */

import { injectable, inject } from 'tsyringe';
import type { ISubPocketRepository } from '../../infrastructure/ISubPocketRepository';
import { ValidationError, NotFoundError, ConflictError } from '../../../../shared/errors/AppError';

@injectable()
export class DeleteSubPocketUseCase {
  constructor(
    @inject('SubPocketRepository') private subPocketRepo: ISubPocketRepository
  ) {}

  async execute(id: string, userId: string): Promise<void> {
    // Validation
    if (!id?.trim()) {
      throw new ValidationError('SubPocket ID is required');
    }

    // Verify sub-pocket exists
    const subPocket = await this.subPocketRepo.findById(id, userId);
    if (!subPocket) {
      throw new NotFoundError('SubPocket not found');
    }

    // Requirement 8.5: Check if sub-pocket has movements
    const hasMovements = await this.subPocketRepo.hasMovements(id, userId);
    if (hasMovements) {
      throw new ConflictError(
        'Cannot delete sub-pocket with existing movements. Please delete or reassign movements first.'
      );
    }

    // Delete sub-pocket
    await this.subPocketRepo.delete(id, userId);
  }
}
