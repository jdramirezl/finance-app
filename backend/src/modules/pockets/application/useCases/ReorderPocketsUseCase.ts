/**
 * Reorder Pockets Use Case
 * 
 * Business logic for reordering pockets within an account by updating their display order.
 * Verifies all pockets belong to the same account before updating.
 * 
 * Requirements: 6.6
 */

import { injectable, inject } from 'tsyringe';
import type { IPocketRepository } from '../../infrastructure/IPocketRepository';
import { ValidationError, NotFoundError } from '../../../../shared/errors/AppError';

export interface ReorderPocketsDTO {
  pocketIds: string[];
}

@injectable()
export class ReorderPocketsUseCase {
  constructor(
    @inject('PocketRepository') private pocketRepo: IPocketRepository
  ) {}

  /**
   * Execute the use case
   * 
   * @param dto - Array of pocket IDs in desired order
   * @param userId - User ID from authentication (for ownership verification)
   * @throws ValidationError if input is invalid or pockets belong to different accounts
   * @throws NotFoundError if any pocket doesn't exist or user doesn't own it
   */
  async execute(dto: ReorderPocketsDTO, userId: string): Promise<void> {
    // Validate input (Requirement 6.6)
    if (!dto.pocketIds || !Array.isArray(dto.pocketIds)) {
      throw new ValidationError('Pocket IDs must be provided as an array');
    }

    if (dto.pocketIds.length === 0) {
      throw new ValidationError('At least one pocket ID must be provided');
    }

    // Check for duplicate IDs
    const uniqueIds = new Set(dto.pocketIds);
    if (uniqueIds.size !== dto.pocketIds.length) {
      throw new ValidationError('Duplicate pocket IDs are not allowed');
    }

    // Verify all pockets belong to user (Requirement 6.6)
    // Fetch all pockets to verify ownership
    const pockets = await Promise.all(
      dto.pocketIds.map(id => this.pocketRepo.findById(id, userId))
    );

    // Check if any pocket was not found or doesn't belong to user
    const notFoundIndex = pockets.findIndex(pocket => pocket === null);
    if (notFoundIndex !== -1) {
      throw new NotFoundError(
        `Pocket with ID ${dto.pocketIds[notFoundIndex]} not found or access denied`
      );
    }

    // Verify all pockets belong to the same account (Requirement 6.6)
    const validPockets = pockets.filter((p): p is NonNullable<typeof p> => p !== null);
    
    if (validPockets.length === 0) {
      throw new ValidationError('No valid pockets found');
    }

    const firstAccountId = validPockets[0].accountId;
    const allSameAccount = validPockets.every(pocket => pocket.accountId === firstAccountId);

    if (!allSameAccount) {
      throw new ValidationError('All pockets must belong to the same account');
    }

    // Update display order for each pocket (Requirement 6.6)
    // The order in the array determines the display order (0-indexed)
    validPockets.forEach((pocket, index) => {
      pocket.updateDisplayOrder(index);
    });

    // Persist changes using batch update
    await this.pocketRepo.updateDisplayOrders(dto.pocketIds, userId);
  }
}
