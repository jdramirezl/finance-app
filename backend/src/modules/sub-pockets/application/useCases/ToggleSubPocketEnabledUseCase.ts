/**
 * Toggle SubPocket Enabled Use Case
 * 
 * Business logic for toggling the enabled status of a sub-pocket.
 * 
 * Requirements: 8.4
 */

import { injectable, inject } from 'tsyringe';
import type { ISubPocketRepository } from '../../infrastructure/ISubPocketRepository';
import type { SubPocketResponseDTO } from '../dtos/SubPocketDTO';
import { SubPocketMapper } from '../mappers/SubPocketMapper';
import { ValidationError, NotFoundError } from '../../../../shared/errors/AppError';

@injectable()
export class ToggleSubPocketEnabledUseCase {
  constructor(
    @inject('SubPocketRepository') private subPocketRepo: ISubPocketRepository
  ) {}

  async execute(id: string, userId: string): Promise<SubPocketResponseDTO> {
    // Validation
    if (!id?.trim()) {
      throw new ValidationError('SubPocket ID is required');
    }

    // Fetch sub-pocket
    const subPocket = await this.subPocketRepo.findById(id, userId);
    if (!subPocket) {
      throw new NotFoundError('SubPocket not found');
    }

    // Requirement 8.4: Toggle enabled status
    subPocket.toggleEnabled();

    // Persist changes
    await this.subPocketRepo.update(subPocket, userId);

    // Return DTO
    return SubPocketMapper.toDTO(subPocket);
  }
}
