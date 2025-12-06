/**
 * Reorder Fixed Expense Groups Use Case
 * 
 * Business logic for reordering fixed expense groups.
 * Updates display order for all specified groups.
 */

import { injectable, inject } from 'tsyringe';
import type { IFixedExpenseGroupRepository } from '../../infrastructure/IFixedExpenseGroupRepository';
import { ValidationError, NotFoundError } from '../../../../shared/errors/AppError';

@injectable()
export class ReorderFixedExpenseGroupsUseCase {
    constructor(
        @inject('FixedExpenseGroupRepository') private groupRepo: IFixedExpenseGroupRepository
    ) { }

    async execute(groupIds: string[], userId: string): Promise<void> {
        // Validation
        if (!groupIds || groupIds.length === 0) {
            throw new ValidationError('Group IDs are required');
        }

        // Verify all groups exist and belong to user
        const groups = await Promise.all(
            groupIds.map(id => this.groupRepo.findById(id, userId))
        );

        // Check if any group was not found
        const notFoundIndex = groups.findIndex(g => g === null);
        if (notFoundIndex !== -1) {
            throw new NotFoundError(`Fixed Expense Group with ID ${groupIds[notFoundIndex]} not found`);
        }

        // Update display order for each group in memory (optional, but good for consistency)
        groups.forEach((group, index) => {
            group!.displayOrder = index;
        });

        // Persist changes using repository batch update
        await this.groupRepo.updateDisplayOrders(groupIds, userId);
    }
}
