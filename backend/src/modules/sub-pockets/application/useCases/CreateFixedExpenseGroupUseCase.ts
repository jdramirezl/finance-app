/**
 * CreateFixedExpenseGroupUseCase
 * 
 * Use case for creating a new fixed expense group.
 * Requirements: 9.1
 */

import { inject, injectable } from 'tsyringe';
import { FixedExpenseGroup } from '../../domain/FixedExpenseGroup';
import type { IFixedExpenseGroupRepository } from '../../infrastructure/IFixedExpenseGroupRepository';
import type { CreateGroupDTO, GroupResponseDTO } from '../dtos/FixedExpenseGroupDTO';
import { FixedExpenseGroupMapper } from '../mappers/FixedExpenseGroupMapper';
import { generateId } from '../../../../shared/utils/idGenerator';

@injectable()
export class CreateFixedExpenseGroupUseCase {
  constructor(
    @inject('FixedExpenseGroupRepository')
    private groupRepository: IFixedExpenseGroupRepository
  ) {}

  async execute(dto: CreateGroupDTO, userId: string): Promise<GroupResponseDTO> {
    // Create domain entity (validation happens in constructor)
    const group = new FixedExpenseGroup(
      generateId(),
      dto.name,
      dto.color
    );

    // Persist
    await this.groupRepository.save(group, userId);

    // Return DTO
    return FixedExpenseGroupMapper.toDTO(group);
  }
}
