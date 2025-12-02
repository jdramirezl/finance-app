/**
 * Delete Pocket Use Case
 * 
 * Business logic for deleting a pocket.
 * Marks all movements as orphaned before deletion.
 * 
 * Requirements: 6.5
 */

import { injectable, inject } from 'tsyringe';
import type { IPocketRepository } from '../../infrastructure/IPocketRepository';
import { NotFoundError } from '../../../../shared/errors/AppError';

/**
 * Minimal Movement Repository Interface
 * 
 * This interface will be fully implemented in Phase 4.
 * For now, we define the minimal interface needed for pocket deletion.
 */
interface IMovementRepository {
  markAsOrphanedByPocketId(pocketId: string, pocketName: string, userId: string): Promise<number>;
}

@injectable()
export class DeletePocketUseCase {
  constructor(
    @inject('PocketRepository') private pocketRepo: IPocketRepository,
    @inject('MovementRepository') private movementRepo: IMovementRepository
  ) {}

  /**
   * Execute the delete pocket use case
   * 
   * @param pocketId - Pocket ID to delete
   * @param userId - User ID from authentication (for ownership verification)
   * @throws NotFoundError if pocket doesn't exist or user doesn't own it
   */
  async execute(pocketId: string, userId: string): Promise<void> {
    // Fetch existing pocket to verify ownership
    const pocket = await this.pocketRepo.findById(pocketId, userId);

    // Verify ownership - repository returns null if not found or not owned by user
    if (!pocket) {
      throw new NotFoundError('Pocket not found');
    }

    // Requirement 6.5: Mark all movements as orphaned
    await this.movementRepo.markAsOrphanedByPocketId(pocketId, pocket.name, userId);

    // Delete the pocket
    await this.pocketRepo.delete(pocketId, userId);
  }
}
