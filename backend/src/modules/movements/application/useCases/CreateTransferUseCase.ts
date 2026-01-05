/**
 * Create Transfer Use Case
 * 
 * Business logic for creating a transfer between two pockets.
 * Creates an expense in the source pocket and an income in the target pocket.
 */

import { injectable, inject } from 'tsyringe';
import type { IMovementRepository } from '../../infrastructure/IMovementRepository';
import type { IPocketRepository } from '../../../pockets/infrastructure/IPocketRepository';
import { Movement } from '../../domain/Movement';
import { ValidationError, NotFoundError } from '../../../../shared/errors/AppError';

export interface CreateTransferDTO {
    sourceAccountId: string;
    sourcePocketId: string;
    targetAccountId: string;
    targetPocketId: string;
    amount: number;
    displayedDate: string;
    notes?: string;
}

@injectable()
export class CreateTransferUseCase {
    constructor(
        @inject('MovementRepository') private movementRepo: IMovementRepository,
        @inject('PocketRepository') private pocketRepo: IPocketRepository
    ) { }

    async execute(dto: CreateTransferDTO, userId: string): Promise<{ expense: Movement; income: Movement }> {
        // 1. Validate input
        if (dto.amount < 0) {
            throw new ValidationError('Amount cannot be negative');
        }
        if (dto.sourceAccountId === dto.targetAccountId && dto.sourcePocketId === dto.targetPocketId) {
            throw new ValidationError('Source and target pockets must be different');
        }

        // 2. Verify ownership of pockets
        const [sourcePocket, targetPocket] = await Promise.all([
            this.pocketRepo.findById(dto.sourcePocketId, userId),
            this.pocketRepo.findById(dto.targetPocketId, userId)
        ]);

        if (!sourcePocket) {
            throw new NotFoundError(`Source pocket not found: ${dto.sourcePocketId}`);
        }
        if (!targetPocket) {
            throw new NotFoundError(`Target pocket not found: ${dto.targetPocketId}`);
        }

        // Verify accounts match (optional, but good practice)
        if (sourcePocket.accountId !== dto.sourceAccountId) {
            throw new ValidationError('Source pocket does not belong to source account');
        }
        if (targetPocket.accountId !== dto.targetAccountId) {
            throw new ValidationError('Target pocket does not belong to target account');
        }

        // 3. Create Expense Movement (Source)
        const expense = new Movement(
            crypto.randomUUID(),
            'EgresoNormal',
            dto.sourceAccountId,
            dto.sourcePocketId,
            dto.amount,
            new Date(dto.displayedDate),
            dto.notes ? `Transfer to ${targetPocket.name}: ${dto.notes}` : `Transfer to ${targetPocket.name}`,
            undefined, // subPocketId
            false // isPending
        );

        // 4. Create Income Movement (Target)
        const income = new Movement(
            crypto.randomUUID(),
            'IngresoNormal',
            dto.targetAccountId,
            dto.targetPocketId,
            dto.amount,
            new Date(dto.displayedDate),
            dto.notes ? `Transfer from ${sourcePocket.name}: ${dto.notes}` : `Transfer from ${sourcePocket.name}`,
            undefined, // subPocketId
            false // isPending
        );

        // 5. Save both movements
        // TODO: Wrap in transaction if supported by repository/infrastructure
        await this.movementRepo.save(expense, userId);
        await this.movementRepo.save(income, userId);

        return { expense, income };
    }
}
