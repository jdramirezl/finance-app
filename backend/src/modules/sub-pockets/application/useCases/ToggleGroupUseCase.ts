/**
 * ToggleGroupUseCase
 * 
 * Use case for toggling all sub-pockets in a fixed expense group.
 * When a group is toggled, all sub-pockets in that group have their enabled status toggled.
 * Requirements: 9.4
 */

import { inject, injectable } from 'tsyringe';
import type { IFixedExpenseGroupRepository } from '../../infrastructure/IFixedExpenseGroupRepository';
import type { ISubPocketRepository } from '../../infrastructure/ISubPocketRepository';
import type { GroupResponseDTO } from '../dtos/FixedExpenseGroupDTO';
import { FixedExpenseGroupMapper } from '../mappers/FixedExpenseGroupMapper';
import { NotFoundError } from '../../../../shared/errors/AppError';

@injectable()
export class ToggleGroupUseCase {
  constructor(
    @inject('FixedExpenseGroupRepository')
    private groupRepository: IFixedExpenseGroupRepository,
    @inject('SubPocketRepository')
    private subPocketRepository: ISubPocketRepository
  ) {}

  async execute(id: string, userId: string): Promise<GroupResponseDTO> {
    // Verify group exists
    const group = await this.groupRepository.findById(id, userId);
    if (!group) {
      throw new NotFoundError('Group not found');
    }

    // Get all sub-pockets in this group
    const subPockets = await this.subPocketRepository.findByGroupId(id, userId);

    // Determine the new enabled state based on the first sub-pocket
    // If any sub-pocket is disabled, enable all; otherwise disable all
    const shouldEnable = subPockets.some(sp => !sp.enabled);

    // Toggle all sub-pockets
    for (const subPocket of subPockets) {
      subPocket.setEnabled(shouldEnable);
      await this.subPocketRepository.update(subPocket, userId);
    }

    // Return group DTO
    return FixedExpenseGroupMapper.toDTO(group);
  }
}
