/**
 * Create SubPocket Use Case
 * 
 * Business logic for creating a new sub-pocket.
 * Validates that the sub-pocket belongs to a fixed pocket.
 * 
 * Requirements: 8.1, 8.2
 */

import { injectable, inject } from 'tsyringe';
import { SubPocket } from '../../domain/SubPocket';
import type { ISubPocketRepository } from '../../infrastructure/ISubPocketRepository';
import type { IPocketRepository } from '../../../pockets/infrastructure/IPocketRepository';
import type { CreateSubPocketDTO, SubPocketResponseDTO } from '../dtos/SubPocketDTO';
import { generateId } from '../../../../shared/utils/idGenerator';
import { SubPocketMapper } from '../mappers/SubPocketMapper';
import { ValidationError, NotFoundError } from '../../../../shared/errors/AppError';

@injectable()
export class CreateSubPocketUseCase {
  constructor(
    @inject('SubPocketRepository') private subPocketRepo: ISubPocketRepository,
    @inject('PocketRepository') private pocketRepo: IPocketRepository
  ) {}

  async execute(dto: CreateSubPocketDTO, userId: string): Promise<SubPocketResponseDTO> {
    // Validation
    if (!dto.name?.trim()) {
      throw new ValidationError('SubPocket name is required');
    }

    if (!dto.pocketId?.trim()) {
      throw new ValidationError('Pocket ID is required');
    }

    if (dto.valueTotal === undefined || dto.valueTotal === null) {
      throw new ValidationError('Value total is required');
    }

    if (dto.valueTotal <= 0) {
      throw new ValidationError('Value total must be positive');
    }

    if (dto.periodicityMonths === undefined || dto.periodicityMonths === null) {
      throw new ValidationError('Periodicity months is required');
    }

    if (dto.periodicityMonths <= 0) {
      throw new ValidationError('Periodicity months must be positive');
    }

    if (!Number.isInteger(dto.periodicityMonths)) {
      throw new ValidationError('Periodicity months must be an integer');
    }

    // Requirement 8.1: Verify pocket exists and belongs to user
    const pocket = await this.pocketRepo.findById(dto.pocketId, userId);
    if (!pocket) {
      throw new NotFoundError('Pocket not found');
    }

    // Requirement 8.1: Validate that pocket is of type 'fixed'
    if (pocket.type !== 'fixed') {
      throw new ValidationError('SubPockets can only be created in fixed type pockets');
    }

    // Create domain entity
    // Requirement 8.2: Monthly contribution is calculated automatically by the entity
    const subPocket = new SubPocket(
      generateId(),
      dto.pocketId,
      dto.name.trim(),
      dto.valueTotal,
      dto.periodicityMonths,
      0, // Initial balance
      true, // Default enabled
      dto.groupId
    );

    // Persist sub-pocket
    await this.subPocketRepo.save(subPocket, userId);

    // Return DTO
    return SubPocketMapper.toDTO(subPocket);
  }
}
