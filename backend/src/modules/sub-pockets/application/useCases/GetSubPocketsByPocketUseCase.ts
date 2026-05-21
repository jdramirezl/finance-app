/**
 * Get SubPockets By Pocket Use Case
 * 
 * Fetches all sub-pockets for a specific pocket and calculates their balances.
 * 
 * Requirements: 8.3
 */

import { injectable, inject } from 'tsyringe';
import type { ISubPocketRepository } from '../../infrastructure/ISubPocketRepository';
import type { IPocketRepository } from '../../../pockets/infrastructure/IPocketRepository';
import type { SubPocketResponseDTO } from '../dtos/SubPocketDTO';
import { SubPocketMapper } from '../mappers/SubPocketMapper';
import { SubPocketDomainService } from '../../domain/SubPocketDomainService';
import { ValidationError, NotFoundError } from '../../../../shared/errors/AppError';

@injectable()
export class GetSubPocketsByPocketUseCase {
  private domainService: SubPocketDomainService;

  constructor(
    @inject('SubPocketRepository') private subPocketRepo: ISubPocketRepository,
    @inject('PocketRepository') private pocketRepo: IPocketRepository
  ) {
    this.domainService = new SubPocketDomainService();
  }

  async execute(pocketId: string, userId: string): Promise<SubPocketResponseDTO[]> {
    // Validation
    if (!pocketId?.trim()) {
      throw new ValidationError('Pocket ID is required');
    }

    // Verify pocket exists and belongs to user
    const pocket = await this.pocketRepo.findById(pocketId, userId);
    if (!pocket) {
      throw new NotFoundError('Pocket not found');
    }

    // Fetch sub-pockets
    const subPockets = await this.subPocketRepo.findByPocketId(pocketId, userId);

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
