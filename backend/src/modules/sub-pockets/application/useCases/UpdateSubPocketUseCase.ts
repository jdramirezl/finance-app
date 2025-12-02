/**
 * Update SubPocket Use Case
 * 
 * Business logic for updating an existing sub-pocket.
 * 
 * Requirements: 8.3
 */

import { injectable, inject } from 'tsyringe';
import type { ISubPocketRepository } from '../../infrastructure/ISubPocketRepository';
import type { UpdateSubPocketDTO, SubPocketResponseDTO } from '../dtos/SubPocketDTO';
import { SubPocketMapper } from '../mappers/SubPocketMapper';
import { ValidationError, NotFoundError } from '../../../../shared/errors/AppError';

@injectable()
export class UpdateSubPocketUseCase {
  constructor(
    @inject('SubPocketRepository') private subPocketRepo: ISubPocketRepository
  ) {}

  async execute(
    id: string,
    dto: UpdateSubPocketDTO,
    userId: string
  ): Promise<SubPocketResponseDTO> {
    // Validation
    if (!id?.trim()) {
      throw new ValidationError('SubPocket ID is required');
    }

    // Fetch existing sub-pocket
    const subPocket = await this.subPocketRepo.findById(id, userId);
    if (!subPocket) {
      throw new NotFoundError('SubPocket not found');
    }

    // Validate update data
    if (dto.name !== undefined && !dto.name.trim()) {
      throw new ValidationError('SubPocket name cannot be empty');
    }

    if (dto.valueTotal !== undefined && dto.valueTotal <= 0) {
      throw new ValidationError('Value total must be positive');
    }

    if (dto.periodicityMonths !== undefined) {
      if (dto.periodicityMonths <= 0) {
        throw new ValidationError('Periodicity months must be positive');
      }
      if (!Number.isInteger(dto.periodicityMonths)) {
        throw new ValidationError('Periodicity months must be an integer');
      }
    }

    // Update entity
    subPocket.update(
      dto.name?.trim(),
      dto.valueTotal,
      dto.periodicityMonths
    );

    // Persist changes
    await this.subPocketRepo.update(subPocket, userId);

    // Return DTO
    return SubPocketMapper.toDTO(subPocket);
  }
}
