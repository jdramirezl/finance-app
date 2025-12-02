/**
 * Get SubPockets By Group Use Case
 * 
 * Fetches all sub-pockets for a specific fixed expense group.
 * 
 * Requirements: 8.3
 */

import { injectable, inject } from 'tsyringe';
import type { ISubPocketRepository } from '../../infrastructure/ISubPocketRepository';
import type { SubPocketResponseDTO } from '../dtos/SubPocketDTO';
import { SubPocketMapper } from '../mappers/SubPocketMapper';
import { ValidationError } from '../../../../shared/errors/AppError';

@injectable()
export class GetSubPocketsByGroupUseCase {
  constructor(
    @inject('SubPocketRepository') private subPocketRepo: ISubPocketRepository
  ) {}

  async execute(groupId: string, userId: string): Promise<SubPocketResponseDTO[]> {
    // Validation
    if (!groupId?.trim()) {
      throw new ValidationError('Group ID is required');
    }

    // Fetch sub-pockets by group
    const subPockets = await this.subPocketRepo.findByGroupId(groupId, userId);

    // Sort by display order
    const sortedSubPockets = subPockets.sort((a, b) => {
      const orderA = a.displayOrder ?? Number.MAX_SAFE_INTEGER;
      const orderB = b.displayOrder ?? Number.MAX_SAFE_INTEGER;
      return orderA - orderB;
    });

    // Convert to DTOs
    return sortedSubPockets.map(sp => SubPocketMapper.toDTO(sp));
  }
}
