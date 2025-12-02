/**
 * Get Pocket By ID Use Case
 * 
 * Fetches a single pocket by ID and verifies ownership.
 * 
 * Requirements: 6.4
 */

import { injectable, inject } from 'tsyringe';
import type { IPocketRepository } from '../../infrastructure/IPocketRepository';
import type { PocketResponseDTO } from '../dtos/PocketDTO';
import { PocketMapper } from '../mappers/PocketMapper';
import { NotFoundError } from '../../../../shared/errors/AppError';

@injectable()
export class GetPocketByIdUseCase {
  constructor(
    @inject('PocketRepository') private pocketRepo: IPocketRepository
  ) {}

  /**
   * Execute the use case
   * 
   * @param pocketId - Pocket ID to fetch
   * @param userId - User ID from authentication (for ownership verification)
   * @returns Pocket with current balance
   * @throws NotFoundError if pocket doesn't exist or user doesn't own it
   */
  async execute(pocketId: string, userId: string): Promise<PocketResponseDTO> {
    // Fetch pocket by ID (Requirement 6.4)
    const pocket = await this.pocketRepo.findById(pocketId, userId);

    // Verify ownership - repository returns null if not found or not owned by user
    if (!pocket) {
      throw new NotFoundError('Pocket not found');
    }

    // TODO: Calculate balance when Movement and SubPocket modules are implemented
    // For now, pocket will have its stored balance value
    // In Phase 3 & 4, we'll:
    // 1. Fetch movements for normal pockets
    // 2. Fetch sub-pockets for fixed pockets
    // 3. Use PocketDomainService to calculate balance

    // Convert to DTO and return
    return PocketMapper.toDTO(pocket);
  }
}
