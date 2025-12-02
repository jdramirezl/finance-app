/**
 * GetAllGroupsUseCase
 * 
 * Use case for retrieving all fixed expense groups for a user.
 * Requirements: 9.1
 */

import { inject, injectable } from 'tsyringe';
import type { IFixedExpenseGroupRepository } from '../../infrastructure/IFixedExpenseGroupRepository';
import type { GroupResponseDTO } from '../dtos/FixedExpenseGroupDTO';
import { FixedExpenseGroupMapper } from '../mappers/FixedExpenseGroupMapper';

@injectable()
export class GetAllGroupsUseCase {
  constructor(
    @inject('FixedExpenseGroupRepository')
    private groupRepository: IFixedExpenseGroupRepository
  ) {}

  async execute(userId: string): Promise<GroupResponseDTO[]> {
    // Fetch all groups for the user
    const groups = await this.groupRepository.findAllByUserId(userId);

    // Convert to DTOs
    return groups.map(group => FixedExpenseGroupMapper.toDTO(group));
  }
}
