/**
 * Get Orphaned Movements Use Case
 * 
 * Fetches all orphaned movements for a user.
 * 
 * Requirements: 12.1
 */

import { injectable, inject } from 'tsyringe';
import type { IMovementRepository } from '../../infrastructure/IMovementRepository';
import type { MovementResponseDTO } from '../dtos/MovementDTO';
import { MovementMapper } from '../mappers/MovementMapper';

@injectable()
export class GetOrphanedMovementsUseCase {
  constructor(
    @inject('MovementRepository') private movementRepo: IMovementRepository
  ) {}

  async execute(userId: string): Promise<MovementResponseDTO[]> {
    // Fetch orphaned movements
    const movements = await this.movementRepo.findOrphaned(userId);

    // Convert to DTOs
    return MovementMapper.toDTOArray(movements);
  }
}
