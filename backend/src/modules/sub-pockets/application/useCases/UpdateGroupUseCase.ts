/**
 * UpdateGroupUseCase
 * 
 * Use case for updating a fixed expense group.
 * Requirements: 9.1
 */

import { inject, injectable } from 'tsyringe';
import type { IFixedExpenseGroupRepository } from '../../infrastructure/IFixedExpenseGroupRepository';
import type { UpdateGroupDTO, GroupResponseDTO } from '../dtos/FixedExpenseGroupDTO';
import { FixedExpenseGroupMapper } from '../mappers/FixedExpenseGroupMapper';
import { NotFoundError } from '../../../../shared/errors/AppError';

@injectable()
export class UpdateGroupUseCase {
  constructor(
    @inject('FixedExpenseGroupRepository')
    private groupRepository: IFixedExpenseGroupRepository
  ) {}

  async execute(
    id: string,
    dto: UpdateGroupDTO,
    userId: string
  ): Promise<GroupResponseDTO> {
    // Fetch existing group
    const group = await this.groupRepository.findById(id, userId);
    if (!group) {
      throw new NotFoundError('Group not found');
    }

    // Update group (validation happens in entity method)
    group.update(dto.name, dto.color);

    // Persist
    await this.groupRepository.update(group, userId);

    // Return DTO
    return FixedExpenseGroupMapper.toDTO(group);
  }
}
