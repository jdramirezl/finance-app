/**
 * Delete SubPocket Use Case
 * 
 * Business logic for deleting a sub-pocket.
 * Nullifies sub_pocket_id on associated movements before deletion.
 * 
 * Requirements: 8.5
 */

import { injectable, inject } from 'tsyringe';
import type { ISubPocketRepository } from '../../infrastructure/ISubPocketRepository';
import { ValidationError } from '../../../../shared/errors/AppError';

@injectable()
export class DeleteSubPocketUseCase {
  constructor(
    @inject('SubPocketRepository') private subPocketRepo: ISubPocketRepository
  ) {}

  async execute(id: string, userId: string): Promise<void> {
    if (!id?.trim()) {
      throw new ValidationError('SubPocket ID is required');
    }

    const subPocket = await this.subPocketRepo.findById(id, userId);
    if (!subPocket) {
      return; // Already deleted — idempotent
    }

    // Detach movements from this sub-pocket before deleting
    await this.subPocketRepo.detachMovements(id, userId);

    await this.subPocketRepo.delete(id, userId);
  }
}
