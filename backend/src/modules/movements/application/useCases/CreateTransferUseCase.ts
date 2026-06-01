/**
 * Create Transfer Use Case
 * 
 * Business logic for creating a transfer between two pockets.
 * Uses the atomic create_transfer RPC to ensure both movements
 * are created in a single transaction.
 */

import { injectable, inject } from 'tsyringe';
import type { IMovementRepository } from '../../infrastructure/IMovementRepository';
import type { IPocketRepository } from '../../../pockets/infrastructure/IPocketRepository';
import { Movement } from '../../domain/Movement';
import { ValidationError, NotFoundError } from '../../../../shared/errors/AppError';
import { generateId } from '../../../../shared/utils/idGenerator';

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

        if (sourcePocket.accountId !== dto.sourceAccountId) {
            throw new ValidationError('Source pocket does not belong to source account');
        }
        if (targetPocket.accountId !== dto.targetAccountId) {
            throw new ValidationError('Target pocket does not belong to target account');
        }

        // 3. Generate transfer pair ID and auto-notes
        const transferPairId = generateId();
        const sourceNotes = dto.notes || `Transfer to ${targetPocket.name}`;
        const targetNotes = dto.notes || `Transfer from ${sourcePocket.name}`;

        // 4. Create transfer atomically via RPC
        return this.movementRepo.createTransferAtomic({
            userId,
            sourceAccountId: dto.sourceAccountId,
            sourcePocketId: dto.sourcePocketId,
            targetAccountId: dto.targetAccountId,
            targetPocketId: dto.targetPocketId,
            amount: dto.amount,
            displayedDate: dto.displayedDate,
            notes: dto.notes,
            transferPairId,
            sourceNotes,
            targetNotes,
        });
    }
}
