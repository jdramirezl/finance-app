/**
 * DeleteGroupUseCase
 * 
 * Use case for deleting a fixed expense group.
 * When a group is deleted, all sub-pockets in that group are moved to the default group (null groupId).
 * Requirements: 9.3
 */

import { inject, injectable } from 'tsyringe';
import type { IFixedExpenseGroupRepository } from '../../infrastructure/IFixedExpenseGroupRepository';
import type { ISubPocketRepository } from '../../infrastructure/ISubPocketRepository';
import { NotFoundError } from '../../../../shared/errors/AppError';

@injectable()
export class DeleteGroupUseCase {
  constructor(
    @inject('FixedExpenseGroupRepository')
    private groupRepository: IFixedExpenseGroupRepository,
    @inject('SubPocketRepository')
    private subPocketRepository: ISubPocketRepository
  ) {}

  async execute(id: string, userId: string): Promise<void> {
    // Verify group exists
    const group = await this.groupRepository.findById(id, userId);
    if (!group) {
      throw new NotFoundError('Group not found');
    }

    // Get all sub-pockets in this group
    const subPockets = await this.subPocketRepository.findByGroupId(id, userId);

    // Move all sub-pockets to default group (null groupId)
    for (const subPocket of subPockets) {
      subPocket.updateGroupId(undefined);
      await this.subPocketRepository.update(subPocket, userId);
    }

    // Delete the group
    await this.groupRepository.delete(id, userId);
  }
}
