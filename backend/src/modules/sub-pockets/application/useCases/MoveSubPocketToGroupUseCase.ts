/**
 * Move SubPocket To Group Use Case
 * 
 * Business logic for moving a sub-pocket to a different fixed expense group.
 * 
 * Requirements: 9.2
 */

import { injectable, inject } from 'tsyringe';
import type { ISubPocketRepository } from '../../infrastructure/ISubPocketRepository';
import type { SubPocketResponseDTO } from '../dtos/SubPocketDTO';
import { SubPocketMapper } from '../mappers/SubPocketMapper';
import { ValidationError, NotFoundError } from '../../../../shared/errors/AppError';

@injectable()
export class MoveSubPocketToGroupUseCase {
  constructor(
    @inject('SubPocketRepository') private subPocketRepo: ISubPocketRepository
  ) {}

  async execute(
    id: string,
    groupId: string | undefined,
    userId: string
  ): Promise<SubPocketResponseDTO> {
    // Validation
    if (!id?.trim()) {
      throw new ValidationError('SubPocket ID is required');
    }

    // Fetch sub-pocket
    const subPocket = await this.subPocketRepo.findById(id, userId);
    if (!subPocket) {
      throw new NotFoundError('SubPocket not found');
    }

    // Requirement 9.2: Update group reference
    // groupId can be undefined to move to default group (no group)
    subPocket.updateGroupId(groupId);

    // Persist changes
    await this.subPocketRepo.update(subPocket, userId);

    // Return DTO
    return SubPocketMapper.toDTO(subPocket);
  }
}
