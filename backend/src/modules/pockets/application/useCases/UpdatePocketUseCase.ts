/**
 * Update Pocket Use Case
 * 
 * Business logic for updating an existing pocket.
 * Validates uniqueness if name changed.
 * 
 * Requirements: 6.1
 */

import { injectable, inject } from 'tsyringe';
import type { IPocketRepository } from '../../infrastructure/IPocketRepository';
import type { UpdatePocketDTO, PocketResponseDTO } from '../dtos/PocketDTO';
import { PocketMapper } from '../mappers/PocketMapper';
import { ValidationError, ConflictError, NotFoundError } from '../../../../shared/errors/AppError';

@injectable()
export class UpdatePocketUseCase {
  constructor(
    @inject('PocketRepository') private pocketRepo: IPocketRepository
  ) {}

  async execute(
    pocketId: string,
    dto: UpdatePocketDTO,
    userId: string
  ): Promise<PocketResponseDTO> {
    // Validate pocket ID
    if (!pocketId?.trim()) {
      throw new ValidationError('Pocket ID is required');
    }

    // Fetch existing pocket
    const pocket = await this.pocketRepo.findById(pocketId, userId);
    if (!pocket) {
      throw new NotFoundError('Pocket not found');
    }

    // If name is being changed, validate it
    if (dto.name !== undefined) {
      const trimmedName = dto.name.trim();
      
      if (!trimmedName) {
        throw new ValidationError('Pocket name cannot be empty');
      }

      // Requirement 6.1: Check uniqueness if name changed
      if (trimmedName !== pocket.name) {
        const nameExists = await this.pocketRepo.existsByNameInAccount(
          trimmedName,
          pocket.accountId,
          userId
        );

        if (nameExists) {
          throw new ConflictError(
            `A pocket with name "${trimmedName}" already exists in this account`
          );
        }
      }

      // Update the pocket entity
      pocket.update(trimmedName);
    }

    // Persist changes
    await this.pocketRepo.update(pocket, userId);

    // Return DTO
    return PocketMapper.toDTO(pocket);
  }
}
